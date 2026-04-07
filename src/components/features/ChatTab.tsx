import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Sparkles, Plus, Search, Trash2, Volume2, Heart, Frown,
  Smile, Zap, Download, ImageIcon, Copy, Check, Menu, X, MessageCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import type { Message } from '@/types';

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/25 rounded-lg transition-all text-gray-300 hover:text-white"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  const inlineFormat = (line: string, key: string): React.ReactNode => {
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

    // Table detection
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter(l => !l.match(/^\|[\s\-|]+\|$/))
        .map(l =>
          l.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        );
      if (rows.length > 0) {
        nodes.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3 rounded-xl">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                  {rows[0].map((cell, ci) => (
                    <th key={ci} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white/70' : 'bg-pink-50/70'}>
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
      i++;
      const codeText = codeLines.join('\n');
      nodes.push(
        <div key={`code-${i}`} className="relative my-3 group/code">
          <pre className="bg-gray-900 text-green-300 p-4 pt-8 rounded-xl overflow-x-auto text-sm font-mono">
            {lang && <div className="absolute top-2 left-4 text-gray-500 text-xs font-mono">{lang}</div>}
            <CopyButton text={codeText} />
            <code>{codeText}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      nodes.push(<h3 key={`h3-${i}`} className="font-bold text-base mt-3 mb-1 text-gray-800">{inlineFormat(line.slice(4), `h3c-${i}`)}</h3>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(<h2 key={`h2-${i}`} className="font-bold text-lg mt-3 mb-1 text-gray-800">{inlineFormat(line.slice(3), `h2c-${i}`)}</h2>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      nodes.push(<h1 key={`h1-${i}`} className="font-bold text-xl mt-3 mb-1 text-gray-800">{inlineFormat(line.slice(2), `h1c-${i}`)}</h1>);
      i++; continue;
    }

    // Bullet list
    if (line.match(/^[-*] /)) {
      nodes.push(<li key={`li-${i}`} className="ml-5 list-disc leading-relaxed">{inlineFormat(line.slice(2), `lic-${i}`)}</li>);
      i++; continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      nodes.push(<li key={`oli-${i}`} className="ml-5 list-decimal leading-relaxed">{inlineFormat(line.replace(/^\d+\. /, ''), `olic-${i}`)}</li>);
      i++; continue;
    }

    // Empty line
    if (line.trim() === '') {
      nodes.push(<div key={`br-${i}`} className="h-2" />);
      i++; continue;
    }

    nodes.push(<span key={`p-${i}`} className="block leading-relaxed">{inlineFormat(line, `pc-${i}`)}</span>);
    i++;
  }

  return nodes;
}

// ─── Types ────────────────────────────────────────────────────────────────────
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
    a.download = `dani-${(msg.imagePrompt || 'image').substring(0, 30).replace(/[^a-z0-9]/gi, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-3">
      <p className="text-base font-medium flex items-center gap-2">
        🎨 I&apos;ve generated an image for you!
      </p>
      {msg.isGeneratingImage ? (
        <div className="flex flex-col items-start gap-3 py-4 px-1">
          <div className="flex gap-2 items-center">
            <div className="flex gap-1.5">
              {[0, 120, 240].map(delay => (
                <div
                  key={delay}
                  className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500 italic animate-pulse">Generating your image...</span>
          </div>
          <div className="w-full max-w-xs h-48 rounded-2xl bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 animate-pulse" />
        </div>
      ) : msg.imageUrl ? (
        <div className="rounded-2xl overflow-hidden max-w-xs shadow-lg border border-white/30 bg-black/5">
          {/* Image with watermark overlay */}
          <div className="relative group/img">
            <img
              src={msg.imageUrl}
              alt={msg.imagePrompt}
              className="w-full object-cover block transition-transform duration-300 group-hover/img:scale-[1.02]"
            />
            {/* DANI watermark — bottom right */}
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full pointer-events-none z-10">
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{
                  background: 'linear-gradient(135deg, #ff69b4, #c084fc, #f9a8d4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                DANI
              </span>
            </div>
            {/* Download button — bottom left, visible on hover */}
            <button
              onClick={handleDownload}
              className="absolute bottom-3 left-3 w-9 h-9 bg-black/60 backdrop-blur-sm hover:bg-pink-500/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-200 z-10"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          {/* Caption bar */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-3 border-t border-white/20 bg-white/30 backdrop-blur-sm">
            <p className="text-xs text-gray-500 italic truncate flex-1">
              ✨ &quot;{(msg.imagePrompt || '').substring(0, 80)}{(msg.imagePrompt || '').length > 80 ? '...' : ''}&quot;
            </p>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-700 whitespace-nowrap flex-shrink-0">
              AI by DANI
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <ImageIcon className="w-4 h-4" />
          <span>Image generation failed. Try again!</span>
        </div>
      )}
    </div>
  );
}

// ─── Conversation date grouping ──────────────────────────────────────────────
function groupConversationsByDate(convs: import('@/types').Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sevenAgo = new Date(today); sevenAgo.setDate(today.getDate() - 7);
  const thirtyAgo = new Date(today); thirtyAgo.setDate(today.getDate() - 30);

  const groups: { label: string; items: import('@/types').Conversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 Days', items: [] },
    { label: 'Previous 30 Days', items: [] },
    { label: 'Older', items: [] },
  ];

  convs.forEach(c => {
    const d = new Date(c.updated_at);
    if (d >= today) groups[0].items.push(c);
    else if (d >= yesterday) groups[1].items.push(c);
    else if (d >= sevenAgo) groups[2].items.push(c);
    else if (d >= thirtyAgo) groups[3].items.push(c);
    else groups[4].items.push(c);
  });

  return groups.filter(g => g.items.length > 0);
}

function formatConvTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Main ChatTab ─────────────────────────────────────────────────────────────
export default function ChatTab({ responseStyle = 'educational' }: { responseStyle?: string }) {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { messages: dbMessages } = useMessages(currentConversationId);
  const [messages, setLocalMessages] = useState<ChatMessage[]>([]);
  const { conversations, createConversation, deleteConversation } = useConversations();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const initialized = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: "Hi! I'm DANI, your sweet and supportive AI assistant! 💕 How can I help you today?",
    timestamp: new Date(),
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthenticated(!!session?.user));
    if (!initialized.current) {
      initialized.current = true;
      setLocalMessages([welcomeMessage]);
    }
  }, []);

  useEffect(() => {
    if (dbMessages.length > 0) setLocalMessages(dbMessages);
  }, [dbMessages]);

  const speakText = useCallback(async (text: string) => {
    try {
      if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
      setIsSpeaking(true);
      const voiceId = localStorage.getItem('dani-voice') || 'EXAVITQu4vr4xnSDxMaL';
      const { data, error } = await supabase.functions.invoke('tts-elevenlabs', { body: { text, voiceId } });
      if (error) throw error;
      const audioUrl = URL.createObjectURL(data);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.05;
      currentAudioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); currentAudioRef.current = null; };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); currentAudioRef.current = null; };
      await audio.play();
    } catch { setIsSpeaking(false); }
  }, []);

  const stopSpeaking = () => {
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; setIsSpeaking(false); }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const startNewConversation = async () => {
    setNavOpen(false);
    setCurrentConversationId(null);
    setLocalMessages([welcomeMessage]);
    setCurrentEmotion('neutral');
    setMessageCount(0);
    inputRef.current?.focus();
  };

  const loadConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setNavOpen(false);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    await deleteConversation(id);
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setLocalMessages([welcomeMessage]);
    }
  };

  const isImageRequest = (text: string): boolean => {
    const lower = text.toLowerCase();
    return /\b(generate|create|make|draw|design|show me|paint|produce|render)\b.{0,40}\b(image|photo|picture|illustration|artwork|drawing|portrait|wallpaper|visual|art)\b/.test(lower)
      || /\b(image|picture|photo|art)\b.{0,30}\b(of|showing|with|about|featuring)\b/.test(lower);
  };

  const generateImageInChat = async (prompt: string, messageId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-image-ai', {
        body: { prompt, style: 'realistic' }
      });
      if (error) throw error;
      const imgUrl = data?.image_url;
      if (!imgUrl) throw new Error('No image returned');
      setLocalMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isGeneratingImage: false, imageUrl: imgUrl, imagePrompt: prompt } : m
      ));
    } catch (err) {
      console.error('Image generation error:', err);
      setLocalMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isGeneratingImage: false, imageUrl: undefined } : m
      ));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setLocalMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    // Auto-create conversation on first real message
    let convId = currentConversationId;
    if (!convId && isAuthenticated) {
      try {
        const title = userInput.slice(0, 50) + (userInput.length > 50 ? '...' : '');
        const conv = await createConversation(title);
        convId = conv.id;
        setCurrentConversationId(convId);
      } catch (e) { console.error('Conv create error:', e); }
    }

    try {
      const history = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { messages: history, conversationId: convId, responseStyle }
      });

      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { const t = await error.context?.text(); msg = t || msg; } catch { /* ignore */ }
        }
        throw new Error(msg);
      }

      if (data.emotion) setCurrentEmotion(data.emotion);
      if (data.context?.messageCount) setMessageCount(data.context.messageCount);

      // Update conversation title after first exchange if it's a new one
      if (convId && isAuthenticated && messages.filter(m => m.role === 'user').length === 0) {
        try {
          await supabase.from('conversations').update({ title: userInput.slice(0, 60) }).eq('id', convId);
        } catch { /* non-fatal */ }
      }

      let aiText: string = data.message || '';
      let imageRequest: { prompt: string } | null = null;

      // Check if AI returned a JSON image_request
      try {
        const trimmed = aiText.trim();
        if (trimmed.startsWith('{') && trimmed.includes('"type":"image_request"')) {
          const parsed = JSON.parse(trimmed);
          if (parsed.type === 'image_request' && parsed.prompt) {
            imageRequest = { prompt: parsed.prompt };
          }
        }
      } catch { /* not JSON */ }

      // Frontend fallback detection
      if (!imageRequest && isImageRequest(userInput)) {
        const cleaned = userInput
          .replace(/\b(generate|create|make|draw|design|show me|paint|produce|render)\b/gi, '')
          .replace(/\b(an?|the)\s+(image|photo|picture|illustration|artwork|drawing|portrait|wallpaper|visual|art)(\s+(of|showing|with|about|featuring))?\s*/gi, '')
          .trim() || userInput;
        imageRequest = { prompt: cleaned };
      }

      const msgId = (Date.now() + 1).toString();

      if (imageRequest) {
        const imageMsg: ChatMessage = {
          id: msgId,
          role: 'assistant',
          content: '🎨 image',
          imagePrompt: imageRequest.prompt,
          isGeneratingImage: true,
          timestamp: new Date(),
        };
        setLocalMessages(prev => [...prev, imageMsg]);
        setIsTyping(false);
        generateImageInChat(imageRequest!.prompt, msgId);
      } else {
        setLocalMessages(prev => [...prev, {
          id: msgId, role: 'assistant', content: aiText, timestamp: new Date()
        }]);
        speakText(aiText);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setLocalMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again! 💕",
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* ── Side Nav Overlay ── */}
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* ── Side Nav Panel ── */}
      <aside
        className={`fixed lg:relative top-0 left-0 h-full z-40 lg:z-auto flex flex-col w-72 glass border-r border-white/20 transition-transform duration-300 ease-in-out
          ${navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'}`}
        style={{ minHeight: '100%' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-pink-500" /> Chats
          </h3>
          <button onClick={() => setNavOpen(false)} className="p-1.5 rounded-lg hover:bg-white/60 transition-all lg:hidden">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-4 pb-3">
          <button
            onClick={startNewConversation}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        {/* Search */}
        {isAuthenticated && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2 border border-white/40">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search chats..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
              />
              {historySearch && (
                <button onClick={() => setHistorySearch('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {!isAuthenticated ? (
            <div className="text-center py-8 text-sm text-gray-500 px-4">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              History is available when logged in
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              {historySearch ? 'No chats match your search' : 'No chats yet'}
            </div>
          ) : (
                groupConversationsByDate(filteredConversations).map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1 mt-2">{group.label}</p>
                {group.items.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      currentConversationId === conv.id
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                        : 'hover:bg-white/70 text-gray-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{conv.title}</p>
                      <p className={`text-xs truncate ${currentConversationId === conv.id ? 'text-pink-100' : 'text-gray-400'}`}>
                        {formatConvTime(conv.updated_at)}
                      </p>
                    </div>
                    <button
                      onClick={e => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/20 rounded-lg transition-all ml-1 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Main Chat ── */}
      <div className="flex-1 flex flex-col min-w-0 max-w-4xl mx-auto w-full px-4 py-4">

        {/* Top Bar */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setNavOpen(true)}
            className="p-2.5 glass rounded-xl hover:bg-white/80 transition-all border border-white/30 flex-shrink-0"
            title="Open chat history"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 glass rounded-xl px-4 py-2 border border-white/30 text-sm text-gray-500 truncate">
            {currentConversationId ? conversations.find(c => c.id === currentConversationId)?.title || 'Current Chat' : 'New Chat'}
          </div>
          <button
            onClick={startNewConversation}
            className="p-2.5 glass rounded-xl hover:bg-white/80 transition-all border border-white/30 flex-shrink-0"
            title="New chat"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-2 scrollbar-thin">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'user' ? (
                <div className="max-w-[72%] bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-2xl rounded-br-sm px-5 py-3 shadow-lg">
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-xs mt-1.5 text-pink-100/80">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : (
                <div className="max-w-[78%] glass border border-white/40 rounded-2xl rounded-bl-sm px-5 py-4 shadow-md text-gray-800">
                  {/* DANI avatar badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-semibold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">DANI</span>
                  </div>

                  {message.content === '🎨 image' ? (
                    <ImageMessage msg={message} />
                  ) : (
                    <div className="leading-relaxed">{renderMarkdown(message.content)}</div>
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
              <div className="glass border border-white/40 rounded-2xl rounded-bl-sm px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 italic">DANI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Emotion Bar */}
        {currentEmotion !== 'neutral' && (
          <div className="mb-3 glass rounded-2xl px-4 py-2 border border-white/30 flex items-center gap-3">
            {currentEmotion === 'happy' && <Smile className="w-4 h-4 text-yellow-500" />}
            {currentEmotion === 'sad' && <Frown className="w-4 h-4 text-blue-500" />}
            {(currentEmotion === 'anxious' || currentEmotion === 'angry') && <Zap className="w-4 h-4 text-orange-500" />}
            <span className="text-xs text-gray-600">
              I sense you&apos;re feeling <span className="font-semibold capitalize">{currentEmotion}</span>
            </span>
            <Heart className="w-4 h-4 text-pink-500 ml-auto" />
          </div>
        )}

        {/* Input */}
        <div className="glass rounded-2xl border-2 border-white/30 shadow-lg overflow-hidden">
          <div className="flex items-end gap-2 p-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2">
              <Sparkles className="w-4 h-4 text-pink-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message DANI..."
                className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 text-base"
              />
            </div>
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="p-2.5 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-all"
                title="Stop speaking"
              >
                <Volume2 className="w-5 h-5 animate-pulse" />
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-center mt-2 space-y-0.5">
          <p className="text-xs text-gray-400">DANI can make mistakes. Consider checking important information.</p>
          {messageCount > 0 && (
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Memory: {messageCount} messages
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
