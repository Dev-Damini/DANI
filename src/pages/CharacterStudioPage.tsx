import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Sparkles, Send, Trash2, X,
  MessageSquare, Users, Lock, Globe,
  Brain, Stars, Loader2, MoreVertical
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Character {
  id: string;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  gradient: string;
  isPublic: boolean;
  likes: number;
  messageCount: number;
  createdAt: string;
  creator?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: Date;
}

// ─── Three.js Particle Canvas ─────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particles
    const N = window.innerWidth < 640 ? 60 : 120;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.8 + 0.4,
      hue: Math.random() * 60 + 280, // purple-pink range
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse attraction
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160 && dist > 0) {
          const force = (160 - dist) / 160;
          p.vx += (dx / dist) * force * 0.018;
          p.vy += (dy / dist) * force * 0.018;
        }

        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,70%,${p.alpha})`;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const ex = p.x - q.x;
          const ey = p.y - q.y;
          const d = Math.sqrt(ex * ex + ey * ey);
          if (d < 90) {
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${(p.hue + q.hue) / 2},70%,65%,${(1 - d / 90) * 0.15})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ opacity: 0.6 }}
    />
  );
}

// ─── Default characters ────────────────────────────────────────────────────────
const DEFAULT_CHARS: Character[] = [
  {
    id: 'luna', name: 'Luna', tagline: 'The Mystical Oracle',
    description: 'Speaks in poetic riddles and ancient wisdom. Draws from stars, destiny, and cosmic truth. Treats every conversation as a mystical journey.',
    emoji: '🌙', gradient: 'from-indigo-500 to-purple-700',
    isPublic: true, likes: 2847, messageCount: 41203, createdAt: new Date().toISOString(), creator: 'DANI Team',
  },
  {
    id: 'spark', name: 'Spark', tagline: 'The Hype Machine',
    description: 'High-octane energy. Motivational. Celebrates every win. Turns every conversation into a championship. Sports metaphors are the language.',
    emoji: '⚡', gradient: 'from-yellow-500 to-orange-600',
    isPublic: true, likes: 1923, messageCount: 29841, createdAt: new Date().toISOString(), creator: 'DANI Team',
  },
  {
    id: 'sage', name: 'Sage', tagline: 'The Deep Thinker',
    description: 'Socratic questions. Ancient philosophy meets modern science. Every answer leads to deeper questions. Wisdom is the currency.',
    emoji: '🧠', gradient: 'from-teal-500 to-cyan-600',
    isPublic: true, likes: 3102, messageCount: 52104, createdAt: new Date().toISOString(), creator: 'DANI Team',
  },
  {
    id: 'nova', name: 'Nova', tagline: 'AI from the Future',
    description: 'Space-obsessed. Speaks in tech jargon and mission briefings. References multiverse theory. Has seen the year 2087.',
    emoji: '🚀', gradient: 'from-blue-500 to-violet-600',
    isPublic: true, likes: 4201, messageCount: 87321, createdAt: new Date().toISOString(), creator: 'DANI Team',
  },
  {
    id: 'ember', name: 'Ember', tagline: 'The Rebel Artist',
    description: 'Raw creative energy. Art, chaos, beauty. Never follows the rules. Finds meaning in the broken. Every message is a brushstroke.',
    emoji: '🔥', gradient: 'from-rose-500 to-pink-700',
    isPublic: true, likes: 1544, messageCount: 18230, createdAt: new Date().toISOString(), creator: 'DANI Team',
  },
  {
    id: 'zen', name: 'Zen', tagline: 'The Calm Within',
    description: 'Soft voice. Mindful. Every word measured. Breathes calm into chaos. Responds like a still lake at dawn. Finds peace in everything.',
    emoji: '🌸', gradient: 'from-pink-400 to-rose-500',
    isPublic: true, likes: 5890, messageCount: 93401, createdAt: new Date().toISOString(), creator: 'DANI Team',
  },
];

const GRADIENTS = [
  'from-pink-500 to-rose-700',
  'from-purple-500 to-violet-700',
  'from-indigo-500 to-blue-700',
  'from-teal-500 to-cyan-700',
  'from-green-500 to-emerald-700',
  'from-yellow-500 to-orange-600',
  'from-red-500 to-pink-700',
  'from-blue-500 to-indigo-700',
];

// ─── Isolated Character Chat ──────────────────────────────────────────────────
function CharacterChat({ character, onClose }: { character: Character; onClose: () => void }) {
  // Load saved history for this character from localStorage
  const HISTORY_KEY = `dani-roleplay-history-${character.id}`;
  const savedHistory = (): ChatMessage[] => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed.map((m: { id: string; role: 'user' | 'assistant'; content: string; ts: string }) => ({
        ...m,
        ts: new Date(m.ts),
      }));
    } catch { return []; }
  };

  const initMessages = (): ChatMessage[] => {
    const history = savedHistory();
    if (history.length > 0) return history;
    return [{ id: 'welcome', role: 'assistant', content: getGreeting(character), ts: new Date() }];
  };

  const [messages, setMessages] = useState<ChatMessage[]>(initMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-80)));
      } catch { /* ignore */ }
    }
  }, [messages, HISTORY_KEY]);

  function getGreeting(c: Character): string {
    const greetings: Record<string, string> = {
      luna: "The stars align as you arrive... I have been expecting you. What truth do you seek in the cosmic tapestry? 🌙",
      spark: "YO! Let's GO! You just activated the HYPE MACHINE! What dream are we crushing today?! ⚡",
      sage: "Ah. Another seeker arrives. Tell me — what question burns within you that you dare not answer yourself? 🧠",
      nova: "Mission log: initiating first contact with new entity. Coordinates locked. Year 2087 protocols engaged. Welcome, traveler. 🚀",
      ember: "Another one steps into the fire. Good. Comfort is overrated. What raw thing do you want to create today? 🔥",
      zen: "Breathe. You are here. That is enough. What stirs within you today, dear visitor? 🌸",
    };
    return greetings[c.id] || `Hello! I'm ${c.name}. ${c.tagline}. How can I help you today? ${c.emoji}`;
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const send = useCallback(async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      ts: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          messages: history,
          responseStyle: 'creative',
          activeCharacter: { name: character.name, role: character.tagline, description: character.description },
        }
      });
      if (error) throw error;
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.message || "...",
        ts: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Something went wrong. Let's try again! " + character.emoji,
        ts: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, messages, character]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: '#07070f' }}>
      {/* Character bg overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${character.gradient} opacity-[0.04] pointer-events-none`} />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-white/10"
        style={{ background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(20px)' }}>
        <button onClick={onClose}
          className="p-2 rounded-xl glass-card border border-white/10 text-gray-400 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${character.gradient} flex items-center justify-center text-lg shadow-lg flex-shrink-0`}>
          {character.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm">{character.name}</p>
          <p className="text-xs text-gray-500 truncate">{character.tagline}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          In character
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${character.gradient} flex items-center justify-center text-sm flex-shrink-0 mt-1 shadow-lg`}>
                {character.emoji}
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-pink-600 to-purple-700 text-white rounded-br-sm shadow-lg'
                : 'glass-card text-gray-200 rounded-bl-sm border border-white/08'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${character.gradient} flex items-center justify-center text-sm flex-shrink-0 shadow-lg`}>
              {character.emoji}
            </div>
            <div className="glass-card border border-white/08 rounded-2xl rounded-bl-sm px-5 py-3">
              <div className="flex gap-1.5">
                {[0,150,300].map(d => (
                  <div key={d} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 sm:px-8 pb-6 pt-2">
        <div className="flex items-center gap-3 glass-card rounded-2xl border border-white/10 px-4 py-3 shadow-xl">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={`Message ${character.name}...`}
            className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm focus:outline-none"
            autoFocus
          />
          <button
            onClick={send}
            disabled={!input.trim() || isTyping}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              input.trim() && !isTyping
                ? `bg-gradient-to-br ${character.gradient} text-white shadow-lg`
                : 'glass border border-white/10 text-gray-600 cursor-not-allowed'
            }`}
          >
            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-center text-[11px] text-gray-700 mt-2">
          {character.name} is a fictional AI persona · Conversations are saved locally
        </p>
      </div>
    </div>
  );
}

// ─── Character Card ───────────────────────────────────────────────────────────
function CharacterCard({ char, onLaunch, onDelete, isOwned }: {
  char: Character;
  onLaunch: (c: Character) => void;
  onDelete?: (id: string) => void;
  isOwned?: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative group glass-card rounded-2xl overflow-hidden border border-white/07 hover:border-white/15 transition-all duration-300 hover:shadow-2xl"
      style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.4)' }}>
      {/* Gradient header */}
      <div className={`h-24 bg-gradient-to-br ${char.gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 60%)'
        }} />
        <div className="absolute bottom-3 left-4 text-4xl">{char.emoji}</div>
        {isOwned && (
          <button onClick={() => setShowMenu(!showMenu)}
            className="absolute top-2 right-2 p-1.5 rounded-lg glass text-white/70 hover:text-white transition-all">
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
        {showMenu && isOwned && (
          <div className="absolute top-10 right-2 glass-card rounded-xl border border-white/10 shadow-2xl overflow-hidden z-10 w-32 animate-fade-in">
            <button onClick={() => { onDelete?.(char.id); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <p className="font-bold text-white text-sm">{char.name}</p>
            <p className="text-xs text-purple-400 font-medium">{char.tagline}</p>
          </div>
          {char.isPublic
            ? <Globe className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5" />
            : <Lock className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5" />}
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-3">{char.description}</p>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] text-gray-600">
            <span className="text-gray-400 font-semibold">{(char.messageCount / 1000).toFixed(0)}k</span> chats
          </span>
          <button
            onClick={() => setLiked(!liked)}
            className={`flex items-center gap-1 text-[10px] font-semibold transition-all ${liked ? 'text-pink-400' : 'text-gray-600 hover:text-pink-400'}`}
          >
            <span>{liked ? '♥' : '♡'}</span>
            {char.likes + (liked ? 1 : 0)}
          </button>
          {char.creator && (
            <span className="text-[10px] text-gray-700 ml-auto">by {char.creator}</span>
          )}
        </div>

        <button
          onClick={() => onLaunch(char)}
          className={`w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${char.gradient} hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Launch Chat Session
        </button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function CharacterStudioPage() {
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState<Character | null>(null);
  const [tab, setTab] = useState<'discover' | 'mine'>('discover');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // My characters
  const [myChars, setMyChars] = useState<Character[]>(() => {
    try { return JSON.parse(localStorage.getItem('dani-characters-v2') || '[]'); } catch { return []; }
  });

  // Create form
  const [form, setForm] = useState({
    name: '', tagline: '', description: '', emoji: '✨',
    gradient: GRADIENTS[0], isPublic: true,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthenticated(!!session?.user));
  }, []);

  const saveMyChars = (chars: Character[]) => {
    setMyChars(chars);
    localStorage.setItem('dani-characters-v2', JSON.stringify(chars));
    // Also sync to old format for ChatTab compatibility
    localStorage.setItem('dani-characters', JSON.stringify(chars.map(c => ({
      id: c.id, name: c.name, role: c.tagline, description: c.description,
      emoji: c.emoji, color: c.gradient,
    }))));
  };

  const createCharacter = () => {
    if (!form.name.trim() || !form.description.trim()) return;
    setCreating(true);
    setTimeout(() => {
      const char: Character = {
        id: Date.now().toString(),
        name: form.name.trim(),
        tagline: form.tagline.trim() || 'Custom Persona',
        description: form.description.trim(),
        emoji: form.emoji || '✨',
        gradient: form.gradient,
        isPublic: form.isPublic,
        likes: 0,
        messageCount: 0,
        createdAt: new Date().toISOString(),
        creator: 'You',
      };
      saveMyChars([char, ...myChars]);
      setForm({ name: '', tagline: '', description: '', emoji: '✨', gradient: GRADIENTS[0], isPublic: true });
      setShowCreateForm(false);
      setCreating(false);
      setTab('mine');
    }, 600);
  };

  const deleteChar = (id: string) => {
    saveMyChars(myChars.filter(c => c.id !== id));
  };

  if (activeChat) {
    return <CharacterChat character={activeChat} onClose={() => setActiveChat(null)} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#07070f' }}>
      {/* Particle Canvas */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ParticleCanvas />
      </div>

      {/* Deep radial glow */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(168,85,247,0.07) 0%, transparent 70%)' }} />

      {/* Header */}
      <header className="relative z-10 sticky top-0 border-b border-white/08"
        style={{ background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(24px)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/chat')}
            className="p-2.5 rounded-xl glass-card border border-white/10 text-gray-400 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={daniLogo} alt="DANI" className="h-8 w-auto" />
          <div>
            <h1 className="font-black text-white text-lg tracking-tight">Character Studio</h1>
            <p className="text-[11px] text-gray-600">Create · Discover · Roleplay</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)', color: '#c084fc' }}>
              <Brain className="w-3.5 h-3.5" />
              AI-Powered Personas
            </div>
            <button
              onClick={() => { if (!isAuthenticated) { navigate('/auth'); return; } setShowCreateForm(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
              <Plus className="w-4 h-4" /> Create
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8 pb-4">
        <div className="flex gap-1 glass-card rounded-2xl p-1.5 w-fit border border-white/07 mb-8">
          {(['discover', 'mine'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                tab === t
                  ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t === 'discover' ? <><Globe className="w-3.5 h-3.5" />Discover</> : <><Users className="w-3.5 h-3.5" />My Characters</>}
              {t === 'mine' && myChars.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(236,72,153,0.2)', color: '#ec4899' }}>
                  {myChars.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Discover tab — DANI featured + public user characters */}
        {tab === 'discover' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white mb-1">Featured Characters</h2>
              <p className="text-sm text-gray-600">Crafted by the DANI team · Click any card to start chatting</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEFAULT_CHARS.map(c => (
                <CharacterCard key={c.id} char={c} onLaunch={setActiveChat} />
              ))}
              {/* Public user-created characters */}
              {myChars.filter(c => c.isPublic).map(c => (
                <CharacterCard key={c.id} char={c} onLaunch={setActiveChat} />
              ))}
            </div>
          </div>
        )}

        {/* Mine tab */}
        {tab === 'mine' && (
          <div className="animate-fade-in">
            {myChars.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-3xl glass-card border border-white/08 flex items-center justify-center mb-5 text-3xl">
                  ✨
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No characters yet</h3>
                <p className="text-gray-600 text-sm mb-6">Create your first custom AI persona</p>
                <button onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                  <Plus className="w-4 h-4" /> Create Character
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myChars.map(c => (
                  <CharacterCard key={c.id} char={c} onLaunch={setActiveChat} onDelete={deleteChar} isOwned />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)' }}
          onClick={() => setShowCreateForm(false)}>
          <div className="glass-card rounded-3xl border border-white/10 w-full max-w-md shadow-2xl animate-fade-in overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/08">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Forge a Character</p>
                  <p className="text-[11px] text-gray-600">Define their soul</p>
                </div>
              </div>
              <button onClick={() => setShowCreateForm(false)}
                className="p-2 rounded-xl glass border border-white/08 text-gray-500 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Emoji + Name */}
              <div className="grid grid-cols-[60px_1fr] gap-3">
                <input value={form.emoji} maxLength={2}
                  onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))}
                  className="px-2 py-3 glass-card rounded-xl border border-white/10 text-white text-center text-2xl focus:outline-none focus:border-pink-500/50"
                  placeholder="✨" />
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="px-4 py-3 glass-card rounded-xl border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-pink-500/50"
                  placeholder="Character name (e.g. Aria)" />
              </div>

              <input value={form.tagline} onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))}
                className="w-full px-4 py-3 glass-card rounded-xl border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-pink-500/50"
                placeholder="Tagline (e.g. The Digital Poet)" />

              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 glass-card rounded-xl border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-pink-500/50 resize-none leading-relaxed"
                placeholder="Describe how this character speaks, thinks, and behaves. The more vivid, the better the roleplay..." />

              {/* Gradient picker */}
              <div>
                <p className="text-xs text-gray-600 font-semibold mb-2">Card Color</p>
                <div className="flex gap-2 flex-wrap">
                  {GRADIENTS.map(g => (
                    <button key={g} onClick={() => setForm(p => ({ ...p, gradient: g }))}
                      className={`w-8 h-8 rounded-xl bg-gradient-to-br ${g} transition-all ${form.gradient === g ? 'ring-2 ring-white/60 scale-110' : 'opacity-60 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between px-4 py-3 glass-card rounded-xl border border-white/08">
                <div className="flex items-center gap-3">
                  {form.isPublic ? <Globe className="w-4 h-4 text-green-400" /> : <Lock className="w-4 h-4 text-gray-500" />}
                  <div>
                    <p className="text-sm font-semibold text-white">{form.isPublic ? 'Public' : 'Private'}</p>
                    <p className="text-[11px] text-gray-600">{form.isPublic ? 'Anyone can discover & chat' : 'Only you can use this character'}</p>
                  </div>
                </div>
                <button onClick={() => setForm(p => ({ ...p, isPublic: !p.isPublic }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${form.isPublic ? 'bg-green-500' : 'bg-gray-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isPublic ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              <button
                onClick={createCharacter}
                disabled={!form.name.trim() || !form.description.trim() || creating}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><Stars className="w-4 h-4" />Forge Character</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
