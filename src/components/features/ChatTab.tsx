import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Plus, History, Trash2, Volume2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import type { Message } from '@/types';

export default function ChatTab() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { messages, setMessages } = useMessages(currentConversationId);
  const { conversations, createConversation, deleteConversation } = useConversations();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    setUserId(user?.id || null);
    
    // Initialize with welcome message
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Hi! I'm DANI, your sweet and supportive AI assistant! 💕 How can I help you today?",
        timestamp: new Date()
      }]);
    }
  };

  const speakText = async (text: string) => {
    try {
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      setIsSpeaking(true);
      
      const pitch = 1.2;
      const ttsUrl = `https://apis.prexzyvilla.site/tts/tts-adult-female--1-american-english-truvoice?text=${encodeURIComponent(text)}&pitch=${pitch}`;
      
      const response = await fetch(ttsUrl);
      
      if (!response.ok) {
        throw new Error('TTS API request failed');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      await audio.play();
    } catch (error) {
      console.error('TTS Error:', error);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startNewConversation = async () => {
    if (!isAuthenticated) {
      // For anonymous users, just reset messages
      setCurrentConversationId(null);
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Hi! I'm DANI, your sweet and supportive AI assistant! 💕 How can I help you today?",
        timestamp: new Date()
      }]);
      return;
    }

    try {
      const title = `Chat ${new Date().toLocaleDateString()}`;
      const conversation = await createConversation(title);
      setCurrentConversationId(conversation.id);
      setMessages([{
        id: '1',
        role: 'assistant',
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
        setMessages([]);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    try {
      // Prepare message history for AI
      const messageHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          messages: messageHistory,
          conversationId: currentConversationId
        }
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Auto-play TTS for assistant response
      speakText(data.message);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again! 💕",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <button
            onClick={startNewConversation}
            className="w-full mb-4 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
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
        {/* Top Controls */}
        {isAuthenticated && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 glass rounded-lg hover:bg-white/80 transition-all flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              History
            </button>
            <button
              onClick={startNewConversation}
              className="px-4 py-2 glass rounded-lg hover:bg-white/80 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-6 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                    : 'glass border-2 border-white/30 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-pink-100' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="glass border-2 border-white/30 rounded-2xl px-6 py-3">
                <div className="flex gap-2 items-center">
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="glass rounded-3xl p-2 border-2 border-white/30">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-4">
              <Sparkles className="w-5 h-5 text-pink-500" />
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
                className="px-4 py-3 bg-purple-600 text-white rounded-2xl font-medium hover:bg-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <Volume2 className="w-5 h-5 animate-pulse" />
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          DANI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
}
