import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Sparkles, Plus, Search, Trash2, Volume2, Heart, Frown,
  Smile, Zap, Download, ImageIcon, Copy, Check, Menu, X, MessageCircle,
  VideoIcon, Play, Paperclip, Wand2, FileText, Archive
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import type { Message } from '@/types';

// ─── Copy Button ─────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/25 rounded-lg transition-all text-gray-300 hover:text-white">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── ZIP helper ──────────────────────────────────────────────────────────────
function buildSimpleZip(files: { name: string; content: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const cd: Uint8Array[] = [];
  let offset = 0;
  files.forEach(f => {
    const content = enc.encode(f.content);
    const name = enc.encode(f.name);
    const hdr = new Uint8Array(30 + name.length);
    const hv = new DataView(hdr.buffer);
    hv.setUint32(0, 0x04034b50, true); hv.setUint16(4, 10, true);
    hv.setUint32(18, content.length, true); hv.setUint32(22, content.length, true);
    hv.setUint16(26, name.length, true); hdr.set(name, 30);
    chunks.push(hdr, content);
    const cde = new Uint8Array(46 + name.length);
    const cv = new DataView(cde.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 10, true); cv.setUint16(6, 10, true);
    cv.setUint32(20, content.length, true); cv.setUint32(24, content.length, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true);
    cde.set(name, 46); cd.push(cde);
    offset += hdr.length + content.length;
  });
  const cdSize = cd.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true); ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
  const all = [...chunks, ...cd, eocd];
  const total = all.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  all.forEach(a => { out.set(a, pos); pos += a.length; });
  return out;
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────
function renderMarkdown(text: string, onDownload?: (filename: string, content: string) => void): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  const inlineFormat = (line: string, key: string): React.ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <span key={key}>
        {parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={idx} className="font-semibold">{part.slice(2, -2)}</strong>;
          if (part.startsWith('`') && part.endsWith('`'))
            return <code key={idx} className="bg-pink-100 text-pink-800 px-1.5 py-0.5 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
          return part;
        })}
      </span>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // Download tag detection [DOWNLOAD:filename.ext]
    const dlMatch = line.match(/\[DOWNLOAD:([^\]]+)\]/);
    const dlZipMatch = line.match(/\[DOWNLOAD_ZIP:([^\]]+)\]/);
    if (dlMatch || dlZipMatch) {
      const filename = dlMatch ? dlMatch[1] : `${dlZipMatch![1]}.zip`;
      nodes.push(
        <button key={`dl-${i}`}
          onClick={() => onDownload?.(filename, '')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white my-2"
          style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
          <Download className="w-4 h-4" /> Download {filename}
        </button>
      );
      i++; continue;
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3);
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]); i++;
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
          {/* Download file button */}
          {lang && onDownload && (
            <button onClick={() => {
              const ext = lang === 'typescript' ? 'ts' : lang === 'javascript' ? 'js' : lang === 'html' ? 'html' : lang === 'css' ? 'css' : lang === 'python' ? 'py' : lang;
              onDownload(`code.${ext}`, codeText);
            }}
              className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white opacity-0 group/code:opacity-100 transition-all"
              style={{ background: 'rgba(236,72,153,0.6)' }}>
              <Download className="w-3 h-3" /> Save file
            </button>
          )}
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) { nodes.push(<h3 key={`h3-${i}`} className="font-bold text-base mt-3 mb-1">{inlineFormat(line.slice(4), `h3c-${i}`)}</h3>); i++; continue; }
    if (line.startsWith('## ')) { nodes.push(<h2 key={`h2-${i}`} className="font-bold text-lg mt-3 mb-1">{inlineFormat(line.slice(3), `h2c-${i}`)}</h2>); i++; continue; }
    if (line.startsWith('# ')) { nodes.push(<h1 key={`h1-${i}`} className="font-bold text-xl mt-3 mb-1">{inlineFormat(line.slice(2), `h1c-${i}`)}</h1>); i++; continue; }

    // Lists
    if (line.match(/^[-*] /)) { nodes.push(<li key={`li-${i}`} className="ml-5 list-disc leading-relaxed">{inlineFormat(line.slice(2), `lic-${i}`)}</li>); i++; continue; }
    if (line.match(/^\d+\. /)) { nodes.push(<li key={`oli-${i}`} className="ml-5 list-decimal leading-relaxed">{inlineFormat(line.replace(/^\d+\. /, ''), `olic-${i}`)}</li>); i++; continue; }

    if (line.trim() === '') { nodes.push(<div key={`br-${i}`} className="h-2" />); i++; continue; }
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
  videoUrl?: string;
  videoPrompt?: string;
  isGeneratingVideo?: boolean;
  codeFiles?: { name: string; content: string }[];
}

// ─── Video Message ─────────────────────────────────────────────────────────────
function VideoMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="space-y-3">
      {msg.isGeneratingVideo ? (
        <div className="flex flex-col gap-3 py-3">
          <div className="flex gap-2 items-center">
            <div className="flex gap-1.5">
              {[0, 120, 240].map(d => (
                <div key={d} className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
            <span className="text-sm text-gray-500 italic animate-pulse">Generating video... ✨</span>
          </div>
          <div className="w-full max-w-xs h-40 rounded-2xl animate-pulse flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(168,85,247,0.15))' }}>
            <Play className="w-10 h-10" style={{ color: 'rgba(168,85,247,0.4)' }} />
          </div>
        </div>
      ) : msg.videoUrl ? (
        <div className="rounded-2xl overflow-hidden max-w-xs shadow-lg">
          <video src={msg.videoUrl} controls className="w-full rounded-t-2xl block" style={{ maxHeight: '280px' }} />
          <div className="px-4 py-2.5 flex items-center justify-between gap-3"
            style={{ background: 'rgba(255,255,255,0.08)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs text-gray-300 italic truncate flex-1">🎬 "{(msg.videoPrompt || '').slice(0, 50)}"</p>
            <button onClick={() => { const a = document.createElement('a'); a.href = msg.videoUrl!; a.download = 'dani-video.mp4'; a.click(); }}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-all"><Download className="w-3.5 h-3.5 text-white" /></button>
          </div>
        </div>
      ) : (
        <p className="text-red-400 text-sm flex items-center gap-2"><VideoIcon className="w-4 h-4" />Video generation failed.</p>
      )}
    </div>
  );
}

// ─── Image Message ─────────────────────────────────────────────────────────────
function ImageMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="space-y-3">
      {msg.isGeneratingImage ? (
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="flex gap-1.5">
              {[0, 120, 240].map(d => (
                <div key={d} className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
            <span className="text-sm text-gray-500 italic animate-pulse">Painting your image... 🎨</span>
          </div>
          {/* Better spinner */}
          <div className="relative w-48 h-48 rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.1),rgba(168,85,247,0.1))' }}>
            <div className="absolute inset-0 animate-pulse" style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.08),rgba(168,85,247,0.08),rgba(59,130,246,0.08))' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-[3px] border-pink-500/30 border-t-pink-500 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-pink-400 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ) : msg.imageUrl ? (
        <div className="rounded-2xl overflow-hidden max-w-xs shadow-lg">
          <div className="relative group/img">
            <img src={msg.imageUrl} alt={msg.imagePrompt} className="w-full object-cover block" />
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="text-xs font-bold tracking-widest shimmer-text">DANI</span>
            </div>
            <button onClick={() => { const a = document.createElement('a'); a.href = msg.imageUrl!; a.download = 'dani-image.png'; a.click(); }}
              className="absolute bottom-3 left-3 w-9 h-9 bg-black/60 hover:bg-pink-500/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-red-400 text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" />Image generation failed.</p>
      )}
    </div>
  );
}

// ─── Date grouping ─────────────────────────────────────────────────────────────
function groupConversationsByDate(convs: import('@/types').Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sevenAgo = new Date(today); sevenAgo.setDate(today.getDate() - 7);
  const groups = [
    { label: 'Today', items: [] as import('@/types').Conversation[] },
    { label: 'Yesterday', items: [] as import('@/types').Conversation[] },
    { label: 'Previous 7 Days', items: [] as import('@/types').Conversation[] },
    { label: 'Older', items: [] as import('@/types').Conversation[] },
  ];
  convs.forEach(c => {
    const d = new Date(c.updated_at);
    if (d >= today) groups[0].items.push(c);
    else if (d >= yesterday) groups[1].items.push(c);
    else if (d >= sevenAgo) groups[2].items.push(c);
    else groups[3].items.push(c);
  });
  return groups.filter(g => g.items.length > 0);
}

function formatConvTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Gemini Greetings ─────────────────────────────────────────────────────────
const GREETINGS = [
  (name: string) => `Hey ${name}! ✨ What are we building today?`,
  (name: string) => `Hi ${name}! 💕 What's on your mind?`,
  (name: string) => `Hey ${name}! 🌸 Ready to create something amazing?`,
  (name: string) => `What's up ${name}! ⚡ How can I help you today?`,
  (name: string) => `Good to see you, ${name}! 🚀 What are we doing today?`,
  (name: string) => `Hey ${name}! 🎨 Feeling creative? Let's go!`,
  (name: string) => `Hi ${name}! ✨ I'm here — what do you need?`,
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ChatTab({
  responseStyle = 'educational',
  isGuest = false,
  username,
}: {
  responseStyle?: string;
  isGuest?: boolean;
  username?: string | null;
}) {
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
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState<string>('');
  const [imageMode, setImageMode] = useState<'vision' | 'edit'>('vision');
  const [pendingCodeFiles, setPendingCodeFiles] = useState<{ name: string; content: string }[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const initialized = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pick a consistent greeting per session
  const greetingRef = useRef<string>('');
  if (!greetingRef.current) {
    const idx = Math.floor(Math.random() * GREETINGS.length);
    greetingRef.current = GREETINGS[idx](username || 'there');
  }

  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: greetingRef.current,
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
      const { data, error } = await supabase.functions.invoke('tts-elevenlabs', { body: { text: text.slice(0, 300) } });
      if (error) throw error;
      const audioUrl = URL.createObjectURL(data);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.0;
      currentAudioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); currentAudioRef.current = null; };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); };
      await audio.play();
    } catch { setIsSpeaking(false); }
  }, []);

  const stopSpeaking = () => {
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; setIsSpeaking(false); }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const startNewConversation = () => {
    setNavOpen(false);
    setCurrentConversationId(null);
    // Refresh greeting
    const idx = Math.floor(Math.random() * GREETINGS.length);
    greetingRef.current = GREETINGS[idx](username || 'there');
    setLocalMessages([{ ...welcomeMessage, content: greetingRef.current, id: Date.now().toString() }]);
    setCurrentEmotion('neutral');
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
    if (currentConversationId === id) { setCurrentConversationId(null); setLocalMessages([welcomeMessage]); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImageUrl(ev.target?.result as string);
      setUploadedImageName(file.name);
      setImageMode('vision');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearUploadedImage = () => {
    setUploadedImageUrl(null);
    setUploadedImageName('');
    setImageMode('vision');
  };

  // Detect intents
  const isVideoRequest = (text: string): boolean =>
    /\b(generate|create|make|produce|render|show me)\b.{0,50}\b(video|clip|animation|movie|reel|short film)\b/i.test(text)
    || /\bmake.{0,10}(a|an)?\s+video\b/i.test(text);

  const isImageRequest = (text: string): boolean =>
    /\b(generate|create|make|draw|design|show me|paint|produce|render)\b.{0,40}\b(image|photo|picture|illustration|artwork|drawing|portrait|wallpaper|visual|art)\b/i.test(text)
    || /\b(image|picture|photo|art)\b.{0,30}\b(of|showing|with|about)\b/i.test(text);

  // Extract code files from AI response for ZIP download
  const extractCodeFiles = (text: string): { name: string; content: string }[] => {
    const files: { name: string; content: string }[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let fileIdx = 1;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const lang = match[1] || 'txt';
      const content = match[2];
      const extMap: Record<string, string> = {
        typescript: 'ts', javascript: 'js', python: 'py', html: 'html',
        css: 'css', json: 'json', tsx: 'tsx', jsx: 'jsx', bash: 'sh',
        sql: 'sql', rust: 'rs', go: 'go', java: 'java',
      };
      const ext = extMap[lang] || lang || 'txt';
      files.push({ name: `file${fileIdx}.${ext}`, content });
      fileIdx++;
    }
    return files;
  };

  const handleDownload = (filename: string, content: string, allFiles?: { name: string; content: string }[]) => {
    if (filename.endsWith('.zip') && allFiles && allFiles.length > 0) {
      const zipData = buildSimpleZip(allFiles);
      const blob = new Blob([zipData], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } else if (content) {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } else if (pendingCodeFiles) {
      const zipData = buildSimpleZip(pendingCodeFiles);
      const blob = new Blob([zipData], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const generateVideoInChat = async (prompt: string, messageId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-ai', { body: { prompt } });
      if (error) throw error;
      const videoUrl = data?.video_url;
      if (!videoUrl) throw new Error('No video returned');
      setLocalMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isGeneratingVideo: false, videoUrl, videoPrompt: prompt } : m
      ));
    } catch {
      setLocalMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isGeneratingVideo: false } : m
      ));
    }
  };

  const generateImageInChat = async (prompt: string, messageId: string, editImageUrl?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-image-ai', {
        body: { prompt, style: 'realistic', ...(editImageUrl ? { editImageUrl } : {}) }
      });
      if (error) throw error;
      const imgUrl = data?.image_url;
      if (!imgUrl) throw new Error('No image returned');
      setLocalMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isGeneratingImage: false, imageUrl: imgUrl, imagePrompt: prompt } : m
      ));
    } catch {
      setLocalMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isGeneratingImage: false } : m
      ));
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !uploadedImageUrl) || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: uploadedImageUrl && imageMode === 'vision' && !input.trim()
        ? 'What do you see in this image?'
        : input,
      timestamp: new Date(),
    };

    setLocalMessages(prev => [...prev, userMessage]);
    const userInput = userMessage.content;
    const attachedImage = uploadedImageUrl;
    const attachedImageMode = imageMode;
    setInput('');
    setUploadedImageUrl(null);
    setUploadedImageName('');
    setIsTyping(true);

    let convId = currentConversationId;
    if (!convId && isAuthenticated) {
      try {
        const title = userInput.slice(0, 50) + (userInput.length > 50 ? '...' : '');
        const conv = await createConversation(title);
        convId = conv.id;
        setCurrentConversationId(convId);
      } catch { /* non-fatal */ }
    }

    try {
      const history = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
      const activeCharId = localStorage.getItem('dani-active-character');
      let activeCharacter = null;
      if (activeCharId) {
        try {
          const charsV2 = JSON.parse(localStorage.getItem('dani-characters-v2') || '[]');
          const charsLegacy = JSON.parse(localStorage.getItem('dani-characters') || '[]');
          const allChars = [...charsV2, ...charsLegacy.filter((c: { id: string }) => !['luna','spark','sage','nova','ember','zen'].includes(c.id))];
          const found = allChars.find((c: { id: string }) => c.id === activeCharId) || null;
          if (found) activeCharacter = { name: found.name, role: found.role || found.tagline || 'Character', description: found.description };
        } catch { /* ignore */ }
      }

      const body: Record<string, unknown> = {
        messages: history,
        conversationId: convId,
        responseStyle,
        activeCharacter,
      };

      // Send image as imageBase64 for Gemini vision
      if (attachedImage) {
        body.imageBase64 = attachedImage;
        if (attachedImageMode === 'vision') {
          body.fileType = 'image';
        }
      }

      const { data, error } = await supabase.functions.invoke('chat-ai', { body });

      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { const t = await error.context?.text(); msg = t || msg; } catch { /* ignore */ }
        }
        throw new Error(msg);
      }

      if (data.emotion) setCurrentEmotion(data.emotion);

      let aiText: string = data.message || '';
      let imageRequest: { prompt: string; editImageUrl?: string } | null = null;
      let videoRequest: { prompt: string } | null = null;

      // Parse JSON special responses
      try {
        const trimmed = aiText.trim();
        if (trimmed.startsWith('{')) {
          const parsed = JSON.parse(trimmed);
          if (parsed.type === 'image_request' && parsed.prompt) { imageRequest = { prompt: parsed.prompt }; aiText = ''; }
          else if (parsed.type === 'video_request' && parsed.prompt) { videoRequest = { prompt: parsed.prompt }; aiText = ''; }
        }
      } catch { /* not JSON */ }

      // Video detection
      if (!videoRequest && !imageRequest && isVideoRequest(userInput)) {
        const cleaned = userInput.replace(/\b(generate|create|make|produce|render|show me)\b/gi, '')
          .replace(/\b(a|an|the)?\s*(video|clip|animation|movie|reel)(\s+(of|showing|about|featuring|with))?\s*/gi, '').trim() || userInput;
        videoRequest = { prompt: cleaned };
      }

      // Image in edit mode
      if (!imageRequest && !videoRequest && attachedImage && attachedImageMode === 'edit') {
        imageRequest = { prompt: userInput || 'enhance this image', editImageUrl: attachedImage };
      }

      // Frontend image detection
      if (!imageRequest && !videoRequest && isImageRequest(userInput)) {
        const cleaned = userInput
          .replace(/\b(generate|create|make|draw|design|show me|paint|produce|render)\b/gi, '')
          .replace(/\b(an?|the)\s+(image|photo|picture|illustration|artwork|drawing|portrait|wallpaper|visual|art)(\s+(of|showing|with|about))?\s*/gi, '')
          .trim() || userInput;
        imageRequest = { prompt: cleaned };
      }

      // Extract code files for potential ZIP download
      const codeFiles = extractCodeFiles(aiText);
      if (codeFiles.length > 0) setPendingCodeFiles(codeFiles);

      const msgId = (Date.now() + 1).toString();

      if (videoRequest) {
        const videoMsg: ChatMessage = {
          id: msgId, role: 'assistant', content: '🎬 video',
          videoPrompt: videoRequest.prompt, isGeneratingVideo: true, timestamp: new Date(),
        };
        setLocalMessages(prev => [...prev, videoMsg]);
        setIsTyping(false);
        generateVideoInChat(videoRequest!.prompt, msgId);
      } else if (imageRequest) {
        const imageMsg: ChatMessage = {
          id: msgId, role: 'assistant', content: '🎨 image',
          imagePrompt: imageRequest.prompt, editImageUrl: imageRequest.editImageUrl,
          isGeneratingImage: true, timestamp: new Date(),
        };
        setLocalMessages(prev => [...prev, imageMsg]);
        setIsTyping(false);
        generateImageInChat(imageRequest!.prompt, msgId, imageRequest.editImageUrl);
      } else {
        setLocalMessages(prev => [...prev, {
          id: msgId, role: 'assistant', content: aiText,
          codeFiles: codeFiles.length > 0 ? codeFiles : undefined,
          timestamp: new Date(),
        }]);
        speakText(aiText);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setLocalMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: "I'm sorry, I hit an error. Please try again! 💕", timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filteredConvs = conversations.filter(c =>
    c.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden relative surface-0">

      {/* Side Nav Overlay */}
      {navOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setNavOpen(false)} />
      )}

      {/* Side Nav */}
      <aside className={`
        fixed lg:relative top-0 left-0 h-full z-40 lg:z-auto flex flex-col w-72
        border-r transition-transform duration-300 ease-in-out
        ${navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'}
      `} style={{ background: 'var(--bg-1)', borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <MessageCircle className="w-4 h-4 text-pink-500" /> Chats
          </h3>
          <button onClick={() => setNavOpen(false)} className="p-1.5 rounded-lg transition-all lg:hidden" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <button onClick={startNewConversation}
            className="w-full py-2.5 px-4 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-md"
            style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        {isAuthenticated && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 border"
              style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search chats..." value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder-gray-400"
                style={{ color: 'var(--text-primary)' }} />
              {historySearch && <button onClick={() => setHistorySearch('')}><X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} /></button>}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {!isAuthenticated ? (
            <div className="text-center py-8 text-sm px-4" style={{ color: 'var(--text-muted)' }}>
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              History available when logged in
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
              {historySearch ? 'No chats match' : 'No chats yet'}
            </div>
          ) : (
            groupConversationsByDate(filteredConvs).map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1 mt-2" style={{ color: 'var(--text-muted)' }}>{group.label}</p>
                {group.items.map(conv => (
                  <div key={conv.id} onClick={() => loadConversation(conv.id)}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      currentConversationId === conv.id ? 'text-white' : ''
                    }`}
                    style={currentConversationId === conv.id
                      ? { background: 'linear-gradient(135deg,#ec4899,#a855f7)' }
                      : { color: 'var(--text-secondary)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{conv.title}</p>
                      <p className="text-xs truncate opacity-60">{formatConvTime(conv.updated_at)}</p>
                    </div>
                    <button onClick={e => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/20 rounded-lg transition-all ml-1 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0 max-w-4xl mx-auto w-full px-4 py-4">

        {/* Top bar */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setNavOpen(true)}
            className="p-2.5 rounded-xl hover:opacity-80 transition-all border flex-shrink-0"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 rounded-xl px-4 py-2 border text-sm truncate"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-muted)' }}>
            {currentConversationId ? conversations.find(c => c.id === currentConversationId)?.title || 'Current Chat' : 'New Chat'}
          </div>
          <button onClick={startNewConversation}
            className="p-2.5 rounded-xl hover:opacity-80 transition-all border flex-shrink-0"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-2 scrollbar-thin">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'user' ? (
                <div className="max-w-[72%] text-white rounded-2xl rounded-br-sm px-5 py-3 shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#be185d,#7e22ce)' }}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  {/* Show uploaded image preview */}
                  {message.content.includes('image') && uploadedImageUrl && (
                    <img src={uploadedImageUrl} alt="" className="mt-2 rounded-xl max-w-[200px] object-cover" />
                  )}
                  <p className="text-xs mt-1.5 text-pink-100/80">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : (
                <div className="max-w-[78%] rounded-2xl rounded-bl-sm px-5 py-4 shadow-md border"
                  style={{ background: 'var(--glass-light-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-primary)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-semibold shimmer-text">DANI</span>
                  </div>

                  {message.content === '🎬 video' ? (
                    <VideoMessage msg={message} />
                  ) : message.content === '🎨 image' ? (
                    <ImageMessage msg={message} />
                  ) : (
                    <>
                      <div className="leading-relaxed">
                        {renderMarkdown(message.content, (filename, content) => {
                          handleDownload(filename, content, message.codeFiles);
                        })}
                      </div>
                      {/* ZIP download button if multiple code files */}
                      {message.codeFiles && message.codeFiles.length > 1 && (
                        <button onClick={() => handleDownload('dani-code.zip', '', message.codeFiles)}
                          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white"
                          style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                          <Archive className="w-3.5 h-3.5" /> Download all as ZIP
                        </button>
                      )}
                      {message.codeFiles && message.codeFiles.length === 1 && (
                        <button onClick={() => handleDownload(message.codeFiles![0].name, message.codeFiles![0].content)}
                          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white"
                          style={{ background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.3)' }}>
                          <FileText className="w-3.5 h-3.5" /> Download {message.codeFiles[0].name}
                        </button>
                      )}
                    </>
                  )}
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm px-5 py-3 border"
                style={{ background: 'var(--glass-light-bg)', borderColor: 'var(--border-normal)' }}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 animate-bounce"
                        style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>DANI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Emotion */}
        {currentEmotion !== 'neutral' && (
          <div className="mb-3 rounded-2xl px-4 py-2 border flex items-center gap-3"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
            {currentEmotion === 'happy' && <Smile className="w-4 h-4 text-yellow-500" />}
            {currentEmotion === 'sad' && <Frown className="w-4 h-4 text-blue-500" />}
            {(currentEmotion === 'anxious' || currentEmotion === 'angry') && <Zap className="w-4 h-4 text-orange-500" />}
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              I sense you're feeling <span className="font-semibold capitalize">{currentEmotion}</span>
            </span>
            <Heart className="w-4 h-4 text-pink-500 ml-auto" />
          </div>
        )}

        {/* Image preview */}
        {uploadedImageUrl && (
          <div className="mb-2 flex items-center gap-3 px-4 py-2 rounded-2xl border"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
            <img src={uploadedImageUrl} alt="Upload" className="w-10 h-10 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{uploadedImageName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <button onClick={() => setImageMode('vision')}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all ${imageMode === 'vision' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:text-blue-400'}`}>
                  👁 Vision
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>|</span>
                <button onClick={() => setImageMode('edit')}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all flex items-center gap-0.5 ${imageMode === 'edit' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'text-gray-500 hover:text-pink-400'}`}>
                  <Wand2 className="w-2.5 h-2.5" />Edit
                </button>
              </div>
            </div>
            <button onClick={clearUploadedImage} className="p-1.5 hover:text-red-400 transition-all rounded-lg" style={{ color: 'var(--text-muted)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="rounded-2xl border-2 shadow-lg overflow-hidden"
          style={{ background: 'var(--glass-light-bg)', borderColor: 'var(--border-normal)' }}>
          <div className="flex items-end gap-2 p-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 border ${
                uploadedImageUrl ? 'text-pink-400 border-pink-500/30' : 'border-transparent'
              }`}
              style={{ color: uploadedImageUrl ? undefined : 'var(--text-muted)', background: 'var(--glass-bg)' }}
              title="Upload image">
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="flex-1 flex items-center gap-2 px-3 py-2">
              <Sparkles className="w-4 h-4 text-pink-400 flex-shrink-0" />
              <input ref={inputRef} type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  uploadedImageUrl
                    ? imageMode === 'edit' ? 'Describe how to edit...' : 'Ask about this image...'
                    : 'Message DANI...'
                }
                className="flex-1 bg-transparent border-none outline-none text-base"
                style={{ color: 'var(--text-primary)' }} />
            </div>

            {isSpeaking && (
              <button onClick={stopSpeaking}
                className="p-2.5 bg-purple-100/20 text-purple-400 rounded-xl hover:bg-purple-100/30 transition-all border border-purple-500/20">
                <Volume2 className="w-5 h-5 animate-pulse" />
              </button>
            )}

            <button onClick={handleSend}
              disabled={(!input.trim() && !uploadedImageUrl) || isTyping}
              className="px-5 py-2.5 text-white rounded-xl font-medium transition-all disabled:opacity-40 shadow-md flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-center mt-2">
          {isGuest && (
            <p className="text-xs text-amber-600 font-medium">
              Guest mode — not saved · <button onClick={() => window.location.href='/auth'} className="underline">Sign up free</button>
            </p>
          )}
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>DANI can make mistakes. Verify important information.</p>
        </div>
      </div>
    </div>
  );
}
