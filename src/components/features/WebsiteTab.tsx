import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, Globe, FileCode, Loader2, AlertCircle, Eye, Code2,
  Zap, Cpu, Crown, X, Copy, Check, Plus, Trash2, Download,
  Share2, ChevronLeft, ChevronRight, SendHorizonal, SquareDot,
  PanelLeftOpen, PanelLeftClose, Coins, CheckCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface GeneratedFile { path: string; content: string }
interface Project {
  id: string;
  name: string;
  description: string;
  model: string;
  techPreset: string;
  files: GeneratedFile[];
  createdAt: string;
}

// ─── Tech Presets ──────────────────────────────────────────────────────────────
const TECH_PRESETS = [
  {
    id: 'react-ts',
    label: 'TypeScript · React · Vite',
    short: 'React TS',
    color: 'text-cyan-400',
    stack: ['react', 'typescript', 'vite'],
    default: true,
  },
  {
    id: 'react-js',
    label: 'JavaScript · React · Vite',
    short: 'React JS',
    color: 'text-yellow-400',
    stack: ['react', 'javascript', 'vite'],
  },
  {
    id: 'vanilla',
    label: 'HTML · CSS · JavaScript',
    short: 'HTML/CSS/JS',
    color: 'text-orange-400',
    stack: ['html', 'css', 'javascript'],
  },
] as const;

type TechPresetId = typeof TECH_PRESETS[number]['id'];

// ─── Models ────────────────────────────────────────────────────────────────────
const MODELS = [
  {
    id: 'dani-5.0',
    name: 'DANI 5.0',
    tagline: 'Fast & smart',
    cost: 10,
    badge: 'Free',
    icon: Zap,
    ring: 'ring-green-500/60',
    pill: 'bg-green-500/15 text-green-400 border-green-500/30',
    activePill: 'bg-green-500 text-white',
    dot: 'bg-green-400',
  },
  {
    id: 'primis-1.20',
    name: 'Primis 1.20',
    tagline: 'Advanced reasoning',
    cost: 30,
    badge: 'Pro',
    icon: Cpu,
    ring: 'ring-blue-500/60',
    pill: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    activePill: 'bg-blue-500 text-white',
    dot: 'bg-blue-400',
  },
  {
    id: 'lumi-5.3',
    name: 'Lumi 5.3',
    tagline: 'Most powerful',
    cost: 75,
    badge: 'Premium',
    icon: Crown,
    ring: 'ring-yellow-500/60',
    pill: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    activePill: 'bg-yellow-400 text-gray-900',
    dot: 'bg-yellow-400',
  },
] as const;

type ModelId = typeof MODELS[number]['id'];

// ─── Plans ─────────────────────────────────────────────────────────────────────
const PLANS = [
  { name: 'Free', price: '$0', sub: '/mo', coins: '500 coins/day', features: ['DANI 5.0', 'ZIP download', '10 coins/gen'], grad: 'from-gray-500 to-gray-600', cta: 'Current plan', off: true },
  { name: 'Starter', price: '$4.99', sub: '/mo', coins: '2k coins/mo', features: ['All 3 models', 'Priority gen', 'Chat history'], grad: 'from-pink-500 to-purple-600', cta: 'Coming soon', off: true },
  { name: 'Pro', price: '$14.99', sub: '/mo', coins: '10k coins/mo', features: ['All models', 'Fastest gen', 'Priority support'], grad: 'from-blue-500 to-indigo-600', cta: 'Coming soon', off: true, popular: true },
  { name: 'Unlimited', price: '$29.99', sub: '/mo', coins: '∞ coins', features: ['Unlimited gen', 'All models', 'API access'], grad: 'from-yellow-400 to-orange-500', cta: 'Coming soon', off: true },
];

// ─── Date grouping (ChatGPT style) ─────────────────────────────────────────────
function groupProjectsByDate(projects: Project[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);
  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30);

  const groups: { label: string; items: Project[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 days', items: [] },
    { label: 'Last 30 days', items: [] },
    { label: 'Older', items: [] },
  ];

  projects.forEach(p => {
    const d = new Date(p.createdAt);
    if (d >= today) groups[0].items.push(p);
    else if (d >= yesterday) groups[1].items.push(p);
    else if (d >= sevenDaysAgo) groups[2].items.push(p);
    else if (d >= thirtyDaysAgo) groups[3].items.push(p);
    else groups[4].items.push(p);
  });

  return groups.filter(g => g.items.length > 0);
}

// ─── Streaming animation hook ──────────────────────────────────────────────────
function useCodeStream(targetContent: string, isActive: boolean) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive || !targetContent) { setDisplayed(''); setDone(false); return; }
    setDisplayed('');
    setDone(false);
    let idx = 0;
    const CHUNK = 18; // chars per frame
    const animate = () => {
      idx = Math.min(idx + CHUNK, targetContent.length);
      setDisplayed(targetContent.slice(0, idx));
      if (idx < targetContent.length) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDone(true);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetContent, isActive]);

  return { displayed, done };
}

// ─── Inline Copy Button ────────────────────────────────────────────────────────
function CopyBtn({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`p-1.5 rounded-lg bg-white/8 hover:bg-white/20 text-gray-400 hover:text-white transition-all ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Plans Modal ───────────────────────────────────────────────────────────────
function PlansModal({ coins, onClose }: { coins: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className="bg-[#0d0d14] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-white">Power Up 💎</h2>
              <p className="text-gray-500 text-sm mt-0.5">500 free coins every single day</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2">
                <span className="text-yellow-400 font-black text-lg">{coins.toLocaleString()}</span>
                <span className="text-yellow-600 text-sm">coins</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/8 rounded-xl transition-all">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PLANS.map(p => (
              <div key={p.name} className={`relative bg-white/4 border border-white/8 rounded-2xl p-5 flex flex-col ${p.popular ? 'ring-1 ring-purple-500/60' : ''}`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">⭐ Most Popular</div>}
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.grad} flex items-center justify-center mb-3`}>
                  <Coins className="w-4 h-4 text-white" />
                </div>
                <p className="font-black text-white text-lg">{p.name}</p>
                <p className="text-2xl font-black text-white mt-1">{p.price}<span className="text-sm text-gray-600">{p.sub}</span></p>
                <p className="text-xs font-semibold text-pink-400 mt-1 mb-3">{p.coins}</p>
                <ul className="space-y-1.5 flex-1 mb-4">
                  {p.features.map(f => <li key={f} className="flex items-center gap-2 text-xs text-gray-500"><CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{f}</li>)}
                </ul>
                <button disabled={p.off} className={`w-full py-2 rounded-xl text-xs font-bold ${p.off ? 'bg-white/5 text-gray-700 cursor-not-allowed' : `bg-gradient-to-r ${p.grad} text-white`}`}>{p.cta}</button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-700 mt-5">Payment plans launching soon · Your coins never expire 🌸</p>
        </div>
      </div>
    </div>
  );
}

// ─── Share Modal ───────────────────────────────────────────────────────────────
function ShareModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className="bg-[#0d0d14] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white flex items-center gap-2"><Share2 className="w-4 h-4 text-pink-400" /> Share</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/8 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-3">
          <Globe className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <span className="text-xs font-mono text-gray-400 flex-1 truncate">{url}</span>
          <button onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex-shrink-0 px-2.5 py-1 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
            {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
        <p className="text-[11px] text-gray-700 text-center">Anyone with this link can view your website</p>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function WebsiteTab() {
  // State
  const [prompt, setPrompt] = useState('');
  const [techPreset, setTechPreset] = useState<TechPresetId>('react-ts');
  const [model, setModel] = useState<ModelId>('dani-5.0');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genPhase, setGenPhase] = useState('');
  const [genStreamContent, setGenStreamContent] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('split');
  const [projectName, setProjectName] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [dailyBonus, setDailyBonus] = useState(0);

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const genStreamRef = useRef<HTMLPreElement>(null);

  const selectedModel = MODELS.find(m => m.id === model)!;
  const selectedPreset = TECH_PRESETS.find(t => t.id === techPreset)!;
  const hasFiles = generatedFiles.length > 0;
  const currentFile = generatedFiles[selectedFileIdx];
  const currentContent = currentFile ? (editedContents[currentFile.path] ?? currentFile.content) : '';

  // ── Streaming animation for live code ──────────────────────────────────────
  const { displayed: streamDisplayed, done: streamDone } = useCodeStream(genStreamContent, isGenerating && genStreamContent.length > 0);

  // Auto-scroll the stream view
  useEffect(() => {
    if (genStreamRef.current) {
      genStreamRef.current.scrollTop = genStreamRef.current.scrollHeight;
    }
  }, [streamDisplayed]);

  // ── Load data on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase.from('user_credits').select('balance').eq('user_id', session.user.id).single();
        setCoins(data?.balance ?? 500);
      }
    });
    try {
      const saved = localStorage.getItem('dani-vibe-projects');
      if (saved) setProjects(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // ── Project management ──────────────────────────────────────────────────────
  const saveProject = useCallback((name: string, desc: string, mod: string, preset: string, files: GeneratedFile[]): string => {
    const id = Date.now().toString();
    const project: Project = { id, name, description: desc, model: mod, techPreset: preset, files, createdAt: new Date().toISOString() };
    setProjects(prev => {
      const updated = [project, ...prev].slice(0, 50);
      localStorage.setItem('dani-vibe-projects', JSON.stringify(updated));
      return updated;
    });
    return id;
  }, []);

  const loadProject = useCallback((p: Project) => {
    setGeneratedFiles(p.files);
    setProjectName(p.name);
    setPrompt(p.description);
    setModel(p.model as ModelId);
    setTechPreset((p.techPreset as TechPresetId) || 'vanilla');
    setEditedContents({});
    setSelectedFileIdx(0);
    setViewMode('split');
    setActiveProjectId(p.id);
    setError('');
    setShareUrl('');
  }, []);

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('dani-vibe-projects', JSON.stringify(updated));
      return updated;
    });
    if (activeProjectId === id) { setActiveProjectId(null); setGeneratedFiles([]); setProjectName(''); }
  };

  const newProject = () => {
    setGeneratedFiles([]); setPrompt(''); setProjectName('');
    setEditedContents({}); setActiveProjectId(null); setError('');
    setShareUrl(''); setGenStreamContent('');
    promptRef.current?.focus();
  };

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const p = prompt.trim();
    if (!p) { setError('Describe the website you want to build'); promptRef.current?.focus(); return; }
    if (coins !== null && coins < selectedModel.cost) {
      setError(`Need ${selectedModel.cost} coins, you have ${coins}.`);
      setShowPlans(true);
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedFiles([]);
    setEditedContents({});
    setShareUrl('');

    // Animated phases for the stream panel
    const phases = [
      `// ✦ Initializing ${selectedModel.name}...\n`,
      `// ✦ Analyzing: "${p.slice(0, 60)}${p.length > 60 ? '...' : ''}"\n`,
      `// ✦ Tech stack: ${selectedPreset.label}\n`,
      `// ✦ Designing component architecture...\n`,
      `// ✦ Writing ${selectedPreset.stack.includes('react') ? 'React components' : 'HTML structure'}...\n`,
      `// ✦ Applying styles & animations...\n`,
      `// ✦ Adding interactivity...\n`,
      `// ✦ Polishing & optimizing...\n`,
    ];

    let phaseIdx = 0;
    let builtPhases = '';
    setGenStreamContent(phases[0]);
    const interval = setInterval(() => {
      phaseIdx = Math.min(phaseIdx + 1, phases.length - 1);
      builtPhases += phases[phaseIdx];
      setGenStreamContent(builtPhases);
    }, 1800);

    try {
      const techStack = selectedPreset.stack as unknown as string[];
      const { data, error: fnErr } = await supabase.functions.invoke('create-website', {
        body: { description: p, techStack, model }
      });

      clearInterval(interval);

      if (fnErr) {
        let msg = fnErr.message;
        if (fnErr instanceof FunctionsHttpError) {
          try { const t = await fnErr.context?.text(); msg = t || msg; } catch { /* ignore */ }
        }
        try { const parsed = JSON.parse(msg); msg = parsed.error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }

      const files: GeneratedFile[] = data.files || [];
      const name: string = data.projectName || 'my-project';

      // Show first file streaming in
      if (files.length > 0) {
        const firstFileContent = `// ✅ Generation complete!\n\n// File: ${files[0].path}\n\n${files[0].content}`;
        setGenStreamContent(firstFileContent);
      }

      setGeneratedFiles(files);
      setProjectName(name);
      if (data.newBalance != null) setCoins(data.newBalance);
      if (data.dailyRefreshGranted > 0) setDailyBonus(data.dailyRefreshGranted);

      const newId = saveProject(name, p, model, techPreset, files);
      setActiveProjectId(newId);
      setSelectedFileIdx(0);
      setViewMode('split');
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Share ───────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!hasFiles) return;
    setIsSharing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const htmlFile = generatedFiles.find(f => f.path === 'index.html');
      const cssFile = generatedFiles.find(f => f.path.endsWith('.css'));
      const jsFile = generatedFiles.find(f => f.path.endsWith('.js') && !f.path.endsWith('.jsx'));
      let html = editedContents['index.html'] ?? htmlFile?.content ?? '';
      if (cssFile) html = html.replace('</head>', `<style>${editedContents[cssFile.path] ?? cssFile.content}</style></head>`);
      if (jsFile) html = html.replace('</body>', `<script>${editedContents[jsFile.path] ?? jsFile.content}</script></body>`);
      const { data, error } = await supabase.from('shared_websites').insert({
        user_id: session?.user?.id ?? null,
        project_name: projectName,
        html_content: html,
        model,
      }).select('id').single();
      if (error) throw error;
      setShareUrl(`${window.location.origin}/share?id=${data.id}`);
      setShowShare(true);
    } catch { setError('Failed to generate share link'); }
    finally { setIsSharing(false); }
  };

  // ── Download ZIP ────────────────────────────────────────────────────────────
  const handleDownload = () => {
    const enc = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const cd: Uint8Array[] = [];
    let offset = 0;
    generatedFiles.forEach(f => {
      const content = enc.encode(editedContents[f.path] ?? f.content);
      const name = enc.encode(f.path);
      const hdr = new Uint8Array(30 + name.length);
      const hv = new DataView(hdr.buffer);
      hv.setUint32(0, 0x04034b50, true); hv.setUint16(4, 10, true);
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
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, generatedFiles.length, true);
    ev.setUint16(10, generatedFiles.length, true); ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    const blob = new Blob([...chunks, ...cd, eocd], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${projectName || 'project'}.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Preview HTML ────────────────────────────────────────────────────────────
  const previewHTML = useMemo(() => {
    if (!hasFiles) return '';
    const html = generatedFiles.find(f => f.path === 'index.html');
    const css = generatedFiles.find(f => f.path.endsWith('.css'));
    const js = generatedFiles.find(f => f.path.endsWith('.js') && !f.path.endsWith('.jsx'));
    if (!html) return '';
    let h = editedContents['index.html'] ?? html.content;
    if (css) h = h.replace('</head>', `<style>${editedContents[css.path] ?? css.content}</style></head>`);
    if (js) h = h.replace('</body>', `<script>${editedContents[js.path] ?? js.content}</script></body>`);
    return h;
  }, [generatedFiles, editedContents, hasFiles]);

  // ── Keyboard shortcut ───────────────────────────────────────────────────────
  const handlePromptKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleGenerate(); }
  };

  const groupedProjects = groupProjectsByDate(projects);

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 flex overflow-hidden bg-[#080810] text-white">
      {showPlans && <PlansModal coins={coins ?? 0} onClose={() => setShowPlans(false)} />}
      {showShare && shareUrl && <ShareModal url={shareUrl} onClose={() => setShowShare(false)} />}

      {/* Daily bonus toast */}
      {dailyBonus > 0 && (
        <div className="fixed top-16 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
          <span className="text-xl">🎉</span>
          <div><p className="font-bold text-sm">Daily refresh!</p><p className="text-xs text-green-100">+{dailyBonus} coins added</p></div>
          <button onClick={() => setDailyBonus(0)} className="ml-1 text-green-200 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ════ LEFT HISTORY SIDEBAR ═════════════════════════════════════════════ */}
      <aside className={`flex-shrink-0 flex flex-col bg-[#0c0c18] border-r border-white/6 transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-60' : 'w-0'}`}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-sm text-white tracking-tight whitespace-nowrap">Vibe Code</span>
          </div>
          <button onClick={newProject}
            className="p-1.5 rounded-lg hover:bg-white/8 text-gray-500 hover:text-white transition-all flex-shrink-0"
            title="New project">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Coins pill */}
        <div className="px-3 pb-3 flex-shrink-0">
          <button onClick={() => setShowPlans(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-yellow-500/8 border border-yellow-500/15 hover:border-yellow-500/30 transition-all group">
            <span className="text-base flex-shrink-0">💰</span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[10px] text-gray-600">Balance</p>
              <p className="text-sm font-black text-white truncate">
                {coins === null ? '—' : coins.toLocaleString()}
                <span className="text-yellow-500 text-[10px] font-semibold ml-1">coins</span>
              </p>
            </div>
            <ChevronRight className="w-3 h-3 text-gray-700 group-hover:text-yellow-500 transition-colors flex-shrink-0" />
          </button>
        </div>

        {/* Project history — ChatGPT style */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4 scrollbar-thin">
          {projects.length === 0 ? (
            <div className="text-center py-10 px-4">
              <SquareDot className="w-8 h-8 text-gray-800 mx-auto mb-3" />
              <p className="text-xs text-gray-700 leading-relaxed">Your projects will appear here</p>
            </div>
          ) : (
            groupedProjects.map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider px-2 mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map(p => (
                    <div key={p.id} onClick={() => loadProject(p)}
                      className={`group relative flex items-start gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all ${
                        activeProjectId === p.id
                          ? 'bg-white/10 text-white'
                          : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                      }`}>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-xs font-medium truncate leading-snug">{p.name.replace(/-/g, ' ')}</p>
                        <p className="text-[10px] text-gray-700 truncate mt-0.5">{p.description.slice(0, 40)}…</p>
                      </div>
                      <button onClick={e => deleteProject(p.id, e)}
                        className="flex-shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all mt-0.5">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ════ MAIN IDE AREA ════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/6 bg-[#0a0a15] flex-shrink-0">
          {/* Sidebar toggle */}
          <button onClick={() => setSidebarOpen(v => !v)}
            className="p-1.5 rounded-lg hover:bg-white/8 text-gray-600 hover:text-white transition-all flex-shrink-0">
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          {/* macOS dots */}
          <div className="flex gap-1.5 mr-1 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>

          {/* Project name / breadcrumb */}
          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            <Globe className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
            <span className="text-xs font-mono text-gray-500 truncate">
              {hasFiles ? projectName : 'new-project'}
            </span>
            {hasFiles && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 flex-shrink-0">ready</span>}
          </div>

          {/* View mode toggle — only when files exist */}
          {hasFiles && (
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
              <button onClick={() => setViewMode('code')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${viewMode === 'code' ? 'bg-white/15 text-white' : 'text-gray-600 hover:text-gray-400'}`}>
                <Code2 className="w-3 h-3" />Code
              </button>
              <button onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'split' ? 'bg-white/15 text-white' : 'text-gray-600 hover:text-gray-400'}`}>
                Split
              </button>
              <button onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${viewMode === 'preview' ? 'bg-white/15 text-white' : 'text-gray-600 hover:text-gray-400'}`}>
                <Eye className="w-3 h-3" />Preview
              </button>
            </div>
          )}

          {/* Action buttons */}
          {hasFiles && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={handleShare} disabled={isSharing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 text-gray-400 hover:text-white text-xs font-medium transition-all disabled:opacity-40">
                <Share2 className="w-3.5 h-3.5" />{isSharing ? '…' : 'Share'}
              </button>
              <button onClick={handleDownload}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400 hover:text-green-300 text-xs font-bold transition-all">
                <Download className="w-3.5 h-3.5" />ZIP
              </button>
            </div>
          )}
        </div>

        {/* ── Workspace ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── IDLE / EMPTY STATE ── */}
          {!isGenerating && !hasFiles && (
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-700 flex items-center justify-center mb-6 shadow-2xl shadow-purple-700/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">DANI Vibe Code</h1>
              <p className="text-gray-600 text-sm max-w-xs text-center leading-relaxed mb-10">
                Describe any app or website. DANI writes every line of code — live, in your workspace.
              </p>
              {/* Quick starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
                {[
                  { icon: '🛒', label: 'E-commerce store', desc: 'Product grid, cart, checkout flow' },
                  { icon: '💼', label: 'Portfolio site', desc: 'Hero, projects, contact form' },
                  { icon: '📊', label: 'SaaS dashboard', desc: 'Stats, charts, sidebar nav' },
                  { icon: '🎨', label: 'Creative agency', desc: 'Bold animations, dark theme' },
                ].map(s => (
                  <button key={s.label} onClick={() => { setPrompt(`${s.label} — ${s.desc}`); promptRef.current?.focus(); }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-white/3 border border-white/8 hover:border-pink-500/30 hover:bg-white/6 transition-all text-left group">
                    <span className="text-xl flex-shrink-0">{s.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">{s.label}</p>
                      <p className="text-xs text-gray-700">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── GENERATING STATE — Live code stream ── */}
          {isGenerating && (
            <div className="flex-1 flex overflow-hidden">
              {/* Stream panel */}
              <div className="flex-1 flex flex-col bg-[#050508] overflow-hidden">
                {/* Stream top bar */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-black/30 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                    <span className="text-xs text-gray-500 font-mono">DANI is writing...</span>
                  </div>
                  <div className="flex-1" />
                  <span className="text-xs text-gray-700 font-mono">{selectedPreset.label}</span>
                </div>
                {/* Code stream */}
                <pre
                  ref={genStreamRef}
                  className="flex-1 overflow-y-auto p-5 text-xs font-mono leading-relaxed text-green-300/80 whitespace-pre-wrap break-all"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {streamDisplayed}
                  {!streamDone && <span className="inline-block w-2 h-4 bg-green-400 ml-0.5 align-text-bottom animate-pulse" />}
                </pre>
              </div>
              {/* Loading indicator panel */}
              <div className="w-72 flex-shrink-0 border-l border-white/5 bg-[#08080f] flex flex-col items-center justify-center gap-5 p-8">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-600 via-purple-700 to-blue-700 animate-pulse shadow-2xl shadow-purple-700/40" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 animate-ping opacity-15" />
                  <div className="absolute inset-3 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Building...</p>
                  <p className="text-xs text-pink-400 animate-pulse mt-1">{genPhase}</p>
                  <p className="text-[10px] text-gray-700 mt-2">{selectedModel.name} · {selectedModel.cost} coins</p>
                </div>
              </div>
            </div>
          )}

          {/* ── DONE STATE — Code + Preview ── */}
          {!isGenerating && hasFiles && (
            <div className="flex-1 flex overflow-hidden">

              {/* ── Code panel ── */}
              {(viewMode === 'code' || viewMode === 'split') && (
                <div className={`flex flex-col overflow-hidden bg-[#050508] ${viewMode === 'split' ? 'w-1/2 border-r border-white/6' : 'flex-1'}`}>
                  {/* File tabs */}
                  <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/6 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
                    {generatedFiles.map((f, i) => (
                      <button key={i} onClick={() => setSelectedFileIdx(i)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex-shrink-0 ${
                          selectedFileIdx === i
                            ? 'bg-pink-500/15 text-pink-300 border border-pink-500/25'
                            : 'text-gray-600 hover:text-gray-400 hover:bg-white/4'
                        }`}>
                        <FileCode className="w-3 h-3" />
                        {f.path}
                      </button>
                    ))}
                    <div className="ml-auto flex-shrink-0 pl-2">
                      <CopyBtn text={currentContent} />
                    </div>
                  </div>
                  {/* Editor */}
                  <textarea
                    value={currentContent}
                    onChange={e => {
                      if (currentFile) setEditedContents(prev => ({ ...prev, [currentFile.path]: e.target.value }));
                    }}
                    className="flex-1 bg-transparent text-green-200/80 font-mono text-[11px] p-4 resize-none focus:outline-none leading-relaxed w-full"
                    spellCheck={false}
                  />
                </div>
              )}

              {/* ── Preview panel ── */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className={`flex flex-col overflow-hidden ${viewMode === 'split' ? 'w-1/2' : 'flex-1'}`}>
                  {/* Preview chrome bar */}
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/6 bg-[#0a0a15] flex-shrink-0">
                    <Eye className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                    <span className="text-xs text-gray-700 font-mono truncate flex-1">{projectName}</span>
                    <button onClick={() => {
                      const w = window.open('', '_blank');
                      if (w) { w.document.write(previewHTML); w.document.close(); }
                    }} className="flex-shrink-0 p-1 hover:bg-white/8 rounded text-gray-700 hover:text-gray-400 transition-all" title="Open in new tab">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <iframe
                    srcDoc={previewHTML}
                    className="flex-1 w-full border-0 bg-white"
                    title="Preview"
                    sandbox="allow-scripts allow-forms"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════ BOTTOM PROMPT BAR ════════════════════════════════════════════ */}
        <div className="flex-shrink-0 border-t border-white/6 bg-[#0a0a15] px-4 py-3">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 mb-2.5 px-3 py-2 bg-red-500/8 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 flex-1">{error}</p>
              {error.includes('coin') && (
                <button onClick={() => setShowPlans(true)} className="text-[11px] font-bold text-pink-400 hover:underline flex-shrink-0">Plans →</button>
              )}
              <button onClick={() => setError('')} className="flex-shrink-0 text-gray-600 hover:text-gray-400"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {/* Controls row — tech preset + model + coins */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tech preset chips */}
              <div className="flex items-center gap-1 bg-white/4 rounded-lg p-0.5">
                {TECH_PRESETS.map(t => (
                  <button key={t.id} onClick={() => setTechPreset(t.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                      techPreset === t.id ? `bg-white/15 ${t.color}` : 'text-gray-700 hover:text-gray-500'
                    }`}>
                    {t.short}
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-white/10" />

              {/* Model chips */}
              <div className="flex items-center gap-1">
                {MODELS.map(m => {
                  const Icon = m.icon;
                  const active = model === m.id;
                  return (
                    <button key={m.id} onClick={() => setModel(m.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap ${
                        active ? m.activePill : m.pill + ' hover:opacity-80'
                      }`}>
                      <Icon className="w-3 h-3" />
                      {m.name}
                      <span className={`text-[9px] ${active ? 'text-inherit opacity-70' : 'text-gray-700'}`}>· {m.cost}🪙</span>
                    </button>
                  );
                })}
              </div>

              <div className="ml-auto flex items-center gap-1.5">
                {coins !== null && (
                  <button onClick={() => setShowPlans(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/8 border border-yellow-500/15 hover:border-yellow-500/30 transition-all text-[11px] text-yellow-500 font-semibold">
                    {coins.toLocaleString()} 🪙
                  </button>
                )}
              </div>
            </div>

            {/* Prompt input row */}
            <div className="flex items-end gap-2.5 bg-white/4 border border-white/8 focus-within:border-pink-500/40 rounded-2xl px-4 py-3 transition-all">
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handlePromptKey}
                placeholder="Describe the website or app you want to build… (⌘↵ to send)"
                rows={2}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-700 resize-none focus:outline-none leading-relaxed min-h-[44px] max-h-32"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg shadow-pink-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Generate (⌘↵)"
              >
                {isGenerating
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <SendHorizonal className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
