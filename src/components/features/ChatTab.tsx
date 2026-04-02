import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Plus, History, Trash2, Volume2, Heart, Frown, Smile, Zap, Download, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import type { Message } from '@/types';

// ─── Markdown Renderer ───────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  const inlineFormat = (line: string, key: string): React.ReactNode => {
    // bold + code inline
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <span key={key}>
        {parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx} className="font-semibold">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={idx} className="bg-pink-100 text-pink-800 px-1.5 py-0.5 rounded text-sm font-mono">
                {part.slice(1, -1)}
              </code>
            );
          }
          return part;
        })}
      </span>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // Table detection: lines that start with |
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // parse table
      const rows = tableLines
        .filter(l => !l.match(/^\|[\s\-|]+\|$/)) // skip separator rows
        .map(l =>
          l.split('|')
            .map(c => c.trim())
            .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1)
        );
      if (rows.length > 0) {
        nodes.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3">
            <table className="min-w-full border-collapse rounded-xl overflow-hidden text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                  {rows[0].map((cell, ci) => (
                    <th key={ci} className="px-4 py-2 text-left font-semibold whitespace-nowrap">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white/60' : 'bg-pink-50/60'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2 border-t border-white/40">{inlineFormat(cell, `${ri}-${ci}`)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3);
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push(
        <pre key={`code-${i}`} className="bg-gray-900 text-green-300 p-4 rounded-xl my-3 overflow-x-auto text-sm font-mono">
          {lang && <div className="text-gray-500 text-xs mb-2">{lang}</div>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Heading
    if (line.startsWith('### ')) {
      nodes.push(<h3 key={`h3-${i}`} className="font-bold text-base mt-3 mb-1">{inlineFormat(line.slice(4), `h3c-${i}`)}</h3>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(<h2 key={`h2-${i}`} className="font-bold text-lg mt-3 mb-1">{inlineFormat(line.slice(3), `h2c-${i}`)}</h2>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      nodes.push(<h1 key={`h1-${i}`} className="font-bold text-xl mt-3 mb-1">{inlineFormat(line.slice(2), `h1c-${i}`)}</h1>);
      i++; continue;
    }

    // Bullet list
    if (line.match(/^[-*] /)) {
      nodes.push(
        <li key={`li-${i}`} className="ml-4 list-disc">{inlineFormat(line.slice(2), `lic-${i}`)}</li>
      );
      i++; continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      nodes.push(
        <li key={`oli-${i}`} className="ml-4 list-decimal">{inlineFormat(line.replace(/^\d+\. /, ''), `olic-${i}`)}</li>
      );
      i++; continue;
    }

    // Empty line
    if (line.trim() === '') {
      nodes.push(<br key={`br-${i}`} />);
      i++; continue;
    }

    // Normal paragraph line
    nodes.push(<span key={`p-${i}`} className="block leading-relaxed">{inlineFormat(line, `pc-${i}`)}</span>);
    i++;
  }

  return nodes;
}

// ─── Message Types ────────────────────────────────────────────────────────────
interface ChatMessage extends Message {
  imageUrl?: string;
  imagePrompt?: string;
  isGeneratingImage?: boolean;
}

// ─── Image Message Bubble ─────────────────────────────────────────────────────
function ImageMessage({ msg }: { msg: ChatMessage }) {
  const handleDownload = () => {
    if (!msg.imageUrl) return;
    const a = document.createElement('a');
    a.href = msg.imageUrl;
    a.download = `dani-image-${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="space-y-2">
      <p className="text-base font-medium flex items-center gap-2">
        🎨 I&apos;ve generated an image for you!
      </p>
      {msg.isGeneratingImage ? (
        <div className="flex items-center gap-3 py-4 px-2">
          <div className="flex gap-1.5">
            {[0, 150, 300].map(delay => (
              <div
                key={delay}
                className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500 italic animate-pulse">Generating image...</span>
        </div>
      ) : msg.imageUrl ? (
        <div className="relative group">
          <img
            src={msg.imageUrl}
            alt={msg.imagePrompt}
            className="rounded-2xl w-full max-w-xs object-cover shadow-lg border-2 border-white/30 transition-transform group-hover:scale-[1.02]"
          />
          <button
            onClick={handleDownload}
            className="absolute bottom-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <ImageIcon className="w-4 h-4" />
          <span>Image generation failed. Try again!</span>
        </div>
      )}
      {msg.imagePrompt && (
        <p className="text-xs text-gray-400 italic">✨ "{msg.imagePrompt}"</p>
      )}
    </div>
  );
}

// ─── Main ChatTab ─────────────────────────────────────────────────────────────
export default function ChatTab() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { messages: dbMessages, setMessages } = useMessages(currentConversationId);
  const [messages, setLocalMessages] = useState<ChatMessage[]>([]);
  const { conversations, createConversation, deleteConversation } = useConversations();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
    if (!initialized.current) {
      initialized.current = true;
      setLocalMessages([{
        id: '1',
        role: 'assistant',
        content: "Hi! I'm DANI, your sweet and supportive AI assistant! 💕 How can I help you today?",
        timestamp: new Date()
      }]);
    }
  }, []);

  // Sync db messages when conversation changes
  useEffect(() => {
    if (dbMessages.length > 0) {
      setLocalMessages(dbMessages);
    }
  }, [dbMessages]);

  const speakText = async (text: string) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setIsSpeaking(true);
      const { data, error } = await supabase.functions.invoke('tts-elevenlabs', {
        body: { text }
      });
      if (error) throw error;
      const audioUrl = URL.createObjectURL(data);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.05;
      currentAudioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); currentAudioRef.current = null; };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); currentAudioRef.current = null; };
      await audio.play();
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const startNewConversation = async () => {
    if (!isAuthenticated) {
      setCurrentConversationId(null);
      setLocalMessages([{
        id: '1', role: 'assistant',
        content: "Hi! I'm DANI, your sweet and supportive AI assistant! 💕 How can I help you today?",
        timestamp: new Date()
      }]);
      return;
    }
    try {
      const conversation = await createConversation(`Chat ${new Date().toLocaleDateString()}`);
      setCurrentConversationId(conversation.id);
      setLocalMessages([{
        id: '1', role: 'assistant',
        content: "Hi! I'm DANI, your sweet and supportive AI assistant! 💕 How can I help you today?",
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const loadConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setShowHistory(false);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      await deleteConversation(id);
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setLocalMessages([]);
      }
    }
  };

  // ─── Detect Image Request ──────────────────────────────────────────────────
  const isImageRequest = (text: string): boolean => {
    const lower = text.toLowerCase();
    return /\b(generate|create|make|draw|design|show me|paint|produce)\b.{0,30}\b(image|photo|picture|illustration|artwork|drawing|portrait|wallpaper|visual)\b/.test(lower)
      || /\b(image|picture|photo)\b.{0,30}\b(of|showing|with|about)\b/.test(lower);
  };

  // ─── Generate image in chat ────────────────────────────────────────────────
  const generateImageInChat = async (prompt: string, messageId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-image-ai', {
        body: { prompt, style: 'realistic' }
      });

      if (error) throw error;

      setLocalMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, isGeneratingImage: false, imageUrl: data.image_url || data.url, imagePrompt: prompt }
          : m
      ));
    } catch (err) {
      console.error('Image generation error:', err);
      setLocalMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, isGeneratingImage: false, imageUrl: undefined }
          : m
      ));
    }
  };

  // ─── Send Message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setLocalMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const messageHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { messages: messageHistory, conversationId: currentConversationId }
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message}`;
          } catch { /* ignore */ }
        }
        throw new Error(errorMessage);
      }

      if (data.emotion) setCurrentEmotion(data.emotion);
      if (data.context?.messageCount) setMessageCount(data.context.messageCount);

      // Check if AI returned an image_request JSON
      let aiText = data.message as string;
      let imageRequest: { prompt: string } | null = null;

      try {
        const trimmed = aiText.trim();
        if (trimmed.startsWith('{') && trimmed.includes('"type":"image_request"')) {
          const parsed = JSON.parse(trimmed);
          if (parsed.type === 'image_request' && parsed.prompt) {
            imageRequest = { prompt: parsed.prompt };
          }
        }
      } catch { /* not JSON */ }

      // Also detect if user directly asked for image (frontend fallback)
      if (!imageRequest && isImageRequest(userInput)) {
        // Extract prompt from user message
        const cleaned = userInput
          .replace(/\b(generate|create|make|draw|design|show me|paint|produce)\b/gi, '')
          .replace(/\b(an?|the)\s+\b(image|photo|picture|illustration|artwork|drawing|portrait|wallpaper|visual)\s+(of\s+)?/gi, '')
          .trim();
        imageRequest = { prompt: cleaned || userInput };
      }

      const msgId = (Date.now() + 1).toString();

      if (imageRequest) {
        const imageMsg: ChatMessage = {
          id: msgId,
          role: 'assistant',
          content: '🎨 image',
          imagePrompt: imageRequest.prompt,
          isGeneratingImage: true,
          timestamp: new Date()
        };
        setLocalMessages(prev => [...prev, imageMsg]);
        setIsTyping(false);
        generateImageInChat(imageRequest!.prompt, msgId);
      } else {
        const assistantMessage: ChatMessage = {
          id: msgId,
          role: 'assistant',
          content: aiText,
          timestamp: new Date()
        };
        setLocalMessages(prev => [...prev, assistantMessage]);
        speakText(aiText);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again! 💕",
        timestamp: new Date()
      };
      setLocalMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex max-w-7xl mx-auto w-full">
      {/* History Sidebar */}
      {isAuthenticated && showHistory && (
        <div className="w-80 border-r border-white/20 glass p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Chat History</h3>
            <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <button
            onClick={startNewConversation}
            className="w-full mb-4 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
          <div className="space-y-2">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between group ${
                  currentConversationId === conv.id
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                    : 'bg-white/60 hover:bg-white/80 text-gray-700'
                }`}
              >
                <div className="flex-1 truncate">
                  <p className="font-medium truncate">{conv.title}</p>
                  <p className={`text-xs ${currentConversationId === conv.id ? 'text-pink-100' : 'text-gray-500'}`}>
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/20 rounded transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col p-4">
        {isAuthenticated && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 glass rounded-lg hover:bg-white/80 transition-all flex items-center gap-2"
            >
              <History className="w-4 h-4" /> History
            </button>
            <button
              onClick={startNewConversation}
              className="px-4 py-2 glass rounded-lg hover:bg-white/80 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Chat
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              {message.role === 'user' ? (
                <div className="max-w-[70%] rounded-2xl px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg">
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-xs mt-1 text-pink-100">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : (
                <div className="max-w-[75%] glass border-2 border-white/30 rounded-2xl px-6 py-4 shadow-md text-gray-800">
                  {message.content === '🎨 image' ? (
                    <ImageMessage msg={message} />
                  ) : (
                    <div className="leading-relaxed">
                      {renderMarkdown(message.content)}
                    </div>
                  )}
                  <p className="text-xs mt-2 text-gray-400">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="glass border-2 border-white/30 rounded-2xl px-6 py-3">
                <div className="flex gap-2 items-center">
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Emotional Context Bar */}
        {currentEmotion !== 'neutral' && (
          <div className="mb-3 glass rounded-2xl px-4 py-2 border border-white/30 flex items-center gap-3">
            {currentEmotion === 'happy' && <Smile className="w-5 h-5 text-yellow-500" />}
            {currentEmotion === 'sad' && <Frown className="w-5 h-5 text-blue-500" />}
            {(currentEmotion === 'anxious' || currentEmotion === 'angry') && <Zap className="w-5 h-5 text-orange-500" />}
            <span className="text-sm text-gray-600">
              I sense you&apos;re feeling <span className="font-semibold capitalize">{currentEmotion}</span>
            </span>
            <Heart className="w-4 h-4 text-pink-500 ml-auto" />
          </div>
        )}

        {/* Input Area */}
        <div className="glass rounded-3xl p-2 border-2 border-white/30 shadow-lg">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-4">
              <Sparkles className="w-5 h-5 text-pink-500 flex-shrink-0" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message DANI..."
                className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 text-base"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <Send className="w-5 h-5" />
            </button>
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-4 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all shadow-md"
              >
                <Volume2 className="w-5 h-5 animate-pulse" />
              </button>
            )}
          </div>
        </div>

        <div className="text-center mt-3 space-y-1">
          <p className="text-xs text-gray-400">
            DANI can make mistakes. Consider checking important information.
          </p>
          {messageCount > 0 && (
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Conversational Memory: {messageCount} messages remembered
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
