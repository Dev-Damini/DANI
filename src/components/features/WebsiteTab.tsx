import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Code, Download, Sparkles, Globe, FileCode, Loader2, CheckCircle,
  AlertCircle, Eye, Edit, Zap, Cpu, Crown, Coins,
  X, Copy, Check,
  Package, Plus, Trash2, FolderOpen, Clock, ChevronRight, Share2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeneratedFile { path: string; content: string; }
interface Project {
  id: string;
  name: string;
  description: string;
  model: string;
  techStack: string[];
  files: GeneratedFile[];
  createdAt: string;
}

// ─── Model Config ─────────────────────────────────────────────────────────────
const MODELS = [
  {
    id: 'dani-5.0',
    name: 'DANI 5.0',
    desc: 'Fast & capable — great for most projects',
    cost: 10,
    badge: 'Free Tier',
    badgeColor: 'from-green-400 to-emerald-500',
    icon: Zap,
    iconColor: 'text-green-400',
    gradient: 'from-green-400/10 to-emerald-400/10',
    border: 'border-green-300/30',
    activeBorder: 'border-green-400',
  },
  {
    id: 'primis-1.20',
    name: 'Primis 1.20',
    desc: 'Advanced reasoning — complex apps & features',
    cost: 30,
    badge: 'Pro',
    badgeColor: 'from-blue-400 to-indigo-500',
    icon: Cpu,
    iconColor: 'text-blue-400',
    gradient: 'from-blue-400/10 to-indigo-400/10',
    border: 'border-blue-300/30',
    activeBorder: 'border-blue-400',
  },
  {
    id: 'lumi-5.3',
    name: 'Lumi 5.3',
    desc: 'Most powerful — production-grade masterpieces',
    cost: 75,
    badge: 'Premium',
    badgeColor: 'from-yellow-400 to-orange-500',
    icon: Crown,
    iconColor: 'text-yellow-400',
    gradient: 'from-yellow-400/10 to-orange-400/10',
    border: 'border-yellow-300/30',
    activeBorder: 'border-yellow-400',
  },
];

const TECH_OPTIONS = [
  { id: 'html', label: 'HTML5' },
  { id: 'css', label: 'CSS3' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'react', label: 'React' },
];

const PLANS = [
  {
    name: 'Free', price: '$0', period: '/month',
    coinLabel: '500 coins/day',
    features: ['DANI 5.0 only', 'Basic website generation', 'ZIP download', '10 coins/gen'],
    gradient: 'from-gray-400 to-gray-500', cta: 'Current Plan', disabled: true,
  },
  {
    name: 'Starter', price: '$4.99', period: '/month',
    coinLabel: '2,000 coins/month',
    features: ['All 3 models', 'Priority generation', 'ZIP download', 'Chat history'],
    gradient: 'from-pink-500 to-purple-600', cta: 'Upgrade — Coming Soon', disabled: true,
  },
  {
    name: 'Pro', price: '$14.99', period: '/month',
    coinLabel: '10,000 coins/month',
    features: ['All 3 models', 'Fastest generation', 'ZIP download', 'Priority support'],
    gradient: 'from-blue-500 to-indigo-600', cta: 'Go Pro — Coming Soon', disabled: true, popular: true,
  },
  {
    name: 'Unlimited', price: '$29.99', period: '/month',
    coinLabel: 'Unlimited coins',
    features: ['Unlimited generation', 'All models', 'Custom domains (soon)', 'API access'],
    gradient: 'from-yellow-400 to-orange-500', cta: 'Go Unlimited — Coming Soon', disabled: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-gray-300 hover:text-white transition-all"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Plans Modal ──────────────────────────────────────────────────────────────
function PlansModal({ onClose, coins }: { onClose: () => void; coins: number }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 rounded-3xl border border-white/10 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Power Up with Coins 💎</h2>
              <p className="text-gray-400 mt-1">500 free coins every day — no credit card needed</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          <div className="glass rounded-2xl px-6 py-4 border border-white/10 mb-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl">💰</div>
            <div>
              <p className="text-sm text-gray-500">Your current balance</p>
              <p className="text-2xl font-black text-white">{coins.toLocaleString()} <span className="text-lg font-semibold text-yellow-400">coins</span></p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-500">Daily refresh</p>
              <p className="text-sm font-bold text-green-400">+500 coins/day</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div key={plan.name}
                className={`relative bg-white/5 rounded-3xl border border-white/10 p-6 flex flex-col ${plan.popular ? 'ring-2 ring-purple-400 shadow-lg shadow-purple-500/20' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">⭐ Most Popular</span>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4`}>
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-black text-xl text-white">{plan.name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="text-sm font-semibold text-pink-400 mb-4">{plan.coinLabel}</p>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <button disabled={plan.disabled}
                  className={`w-full py-2.5 rounded-2xl font-bold text-sm transition-all ${plan.disabled ? 'bg-white/5 text-gray-600 cursor-not-allowed' : `bg-gradient-to-r ${plan.gradient} text-white hover:shadow-lg`}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-6">Payment plans coming soon 🌸 — Your coins never expire</p>
        </div>
      </div>
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ shareUrl, onClose }: { shareUrl: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 rounded-3xl border border-white/10 w-full max-w-md p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-pink-400" /> Share Website
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4">
          <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-300 font-mono flex-1 truncate">{shareUrl}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex-shrink-0 px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center">Anyone with this link can view your website</p>
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, isActive, onLoad, onDelete }: {
  project: Project; isActive: boolean; onLoad: (p: Project) => void; onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const modelConfig = MODELS.find(m => m.id === project.model);
  const ModelIcon = modelConfig?.icon ?? Zap;
  return (
    <div onClick={() => onLoad(project)}
      className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${isActive
        ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/40 shadow-md'
        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}>
      <div className="flex items-start gap-2">
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${modelConfig?.gradient ?? 'from-pink-400/10 to-purple-400/10'} border ${modelConfig?.border ?? 'border-pink-300/30'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <ModelIcon className={`w-3.5 h-3.5 ${modelConfig?.iconColor ?? 'text-pink-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-xs truncate">{project.name}</p>
          <p className="text-[10px] text-gray-500 truncate mt-0.5">{project.description}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Clock className="w-2.5 h-2.5 text-gray-600" />
            <span className="text-[10px] text-gray-600">{new Date(project.createdAt).toLocaleDateString()}</span>
            {isActive && <span className="text-[10px] text-pink-400 font-semibold ml-auto">● Active</span>}
          </div>
        </div>
      </div>
      <button onClick={(e) => onDelete(project.id, e)}
        className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WebsiteTab() {
  const [description, setDescription] = useState('');
  const [techStack, setTechStack] = useState(['html', 'css', 'javascript']);
  const [selectedModel, setSelectedModel] = useState('dani-5.0');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('preview');
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [coins, setCoins] = useState<number | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [generationPhase, setGenerationPhase] = useState('');
  const [dailyBonus, setDailyBonus] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<'config' | 'history'>('config');
  const [shareUrl, setShareUrl] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const selectedModelConfig = MODELS.find(m => m.id === selectedModel)!;

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase.from('user_credits').select('balance').eq('user_id', session.user.id).single();
        setCoins(data?.balance ?? 500);
      }
    });
    try {
      const saved = localStorage.getItem('dani-website-projects');
      if (saved) setProjects(JSON.parse(saved) as Project[]);
    } catch { /* ignore */ }
  }, []);

  const saveProject = useCallback((name: string, desc: string, model: string, tech: string[], files: GeneratedFile[]): string => {
    const id = Date.now().toString();
    const project: Project = { id, name, description: desc, model, techStack: tech, files, createdAt: new Date().toISOString() };
    setProjects(prev => {
      const updated = [project, ...prev].slice(0, 30);
      localStorage.setItem('dani-website-projects', JSON.stringify(updated));
      return updated;
    });
    return id;
  }, []);

  const loadProject = useCallback((project: Project) => {
    setGeneratedFiles(project.files);
    setProjectName(project.name);
    setDescription(project.description);
    setSelectedModel(project.model);
    setTechStack(project.techStack || ['html', 'css', 'javascript']);
    setEditedContents({});
    setActiveProjectId(project.id);
    setSelectedFileIndex(0);
    setViewMode('preview');
    setSidebarTab('config');
    setError('');
    setShareUrl('');
  }, []);

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('dani-website-projects', JSON.stringify(updated));
      return updated;
    });
    if (activeProjectId === id) { setActiveProjectId(null); setGeneratedFiles([]); setProjectName(''); }
  };

  const toggleTech = (id: string) => setTechStack(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const startNewProject = () => {
    setGeneratedFiles([]); setDescription(''); setProjectName('');
    setEditedContents({}); setActiveProjectId(null); setError('');
    setSidebarTab('config'); setShareUrl('');
  };

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!description.trim()) { setError('Describe the website you want to build'); return; }
    if (techStack.length === 0) { setError('Select at least one technology'); return; }
    if (coins !== null && coins < selectedModelConfig.cost) {
      setError(`Not enough coins! Need ${selectedModelConfig.cost}, you have ${coins}.`);
      setShowPlans(true);
      return;
    }
    setIsGenerating(true); setError(''); setGeneratedFiles([]); setEditedContents({}); setShareUrl('');

    const phases = [
      `Initializing ${selectedModelConfig.name}...`,
      'Analyzing requirements...',
      'Designing architecture...',
      'Writing HTML structure...',
      'Styling with CSS...',
      'Adding JavaScript logic...',
      'Optimizing code...',
    ];
    let phaseIdx = 0;
    setGenerationPhase(phases[0]);
    const phaseInterval = setInterval(() => {
      phaseIdx = Math.min(phaseIdx + 1, phases.length - 1);
      setGenerationPhase(phases[phaseIdx]);
    }, 2200);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-website', {
        body: { description, techStack, model: selectedModel }
      });
      clearInterval(phaseInterval);
      if (fnError) {
        let msg = fnError.message;
        if (fnError instanceof FunctionsHttpError) {
          try { const t = await fnError.context?.text(); msg = t || msg; } catch { /* ignore */ }
        }
        try { const parsed = JSON.parse(msg); msg = parsed.error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const files: GeneratedFile[] = data.files || [];
      const name: string = data.projectName || 'my-website';
      setGeneratedFiles(files);
      setProjectName(name);
      if (data.newBalance !== null && data.newBalance !== undefined) setCoins(data.newBalance);
      if (data.dailyRefreshGranted > 0) setDailyBonus(data.dailyRefreshGranted);
      const newId = saveProject(name, description, selectedModel, techStack, files);
      setActiveProjectId(newId);
      setViewMode('preview');
    } catch (err: unknown) {
      clearInterval(phaseInterval);
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false); setGenerationPhase('');
    }
  };

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!generatedFiles.length) return;
    setIsSharing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const htmlFile = generatedFiles.find(f => f.path === 'index.html');
      const cssFile = generatedFiles.find(f => f.path.endsWith('.css'));
      const jsFile = generatedFiles.find(f => f.path.endsWith('.js') && !f.path.endsWith('.jsx'));
      // Inline all assets into a single HTML
      let html = editedContents['index.html'] ?? htmlFile?.content ?? '';
      if (cssFile) html = html.replace('</head>', `<style>${editedContents[cssFile.path] ?? cssFile.content}</style></head>`);
      if (jsFile) html = html.replace('</body>', `<script>${editedContents[jsFile.path] ?? jsFile.content}</script></body>`);

      const { data, error } = await supabase
        .from('shared_websites')
        .insert({
          user_id: session?.user?.id ?? null,
          project_name: projectName,
          html_content: html,
          model: selectedModel,
        })
        .select('id')
        .single();
      if (error) throw error;
      const url = `${window.location.origin}/share?id=${data.id}`;
      setShareUrl(url);
      setShowShare(true);
    } catch (err) {
      setError('Failed to generate share link');
    } finally {
      setIsSharing(false);
    }
  };

  // ── Download ZIP ───────────────────────────────────────────────────────────
  const handleDownload = () => {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const centralDirectory: Uint8Array[] = [];
    let offset = 0;
    generatedFiles.forEach(file => {
      const content = encoder.encode(editedContents[file.path] ?? file.content);
      const name = encoder.encode(file.path);
      const header = new Uint8Array(30 + name.length);
      const hv = new DataView(header.buffer);
      hv.setUint32(0, 0x04034b50, true); hv.setUint16(4, 10, true);
      hv.setUint16(26, name.length, true); header.set(name, 30);
      chunks.push(header, content);
      const cd = new Uint8Array(46 + name.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 10, true); cv.setUint16(6, 10, true);
      cv.setUint32(20, content.length, true); cv.setUint32(24, content.length, true);
      cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true);
      cd.set(name, 46); centralDirectory.push(cd);
      offset += header.length + content.length;
    });
    const cdSize = centralDirectory.reduce((s, c) => s + c.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, generatedFiles.length, true);
    ev.setUint16(10, generatedFiles.length, true); ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    const blob = new Blob([...chunks, ...centralDirectory, eocd], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${projectName || 'website'}.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Preview HTML ───────────────────────────────────────────────────────────
  const previewHTML = useMemo(() => {
    if (!generatedFiles.length) return '';
    const html = generatedFiles.find(f => f.path === 'index.html');
    const css = generatedFiles.find(f => f.path.endsWith('.css'));
    const js = generatedFiles.find(f => f.path.endsWith('.js') && !f.path.endsWith('.jsx'));
    if (!html) return '';
    let h = editedContents['index.html'] ?? html.content;
    if (css) h = h.replace('</head>', `<style>${editedContents[css.path] ?? css.content}</style></head>`);
    if (js) h = h.replace('</body>', `<script>${editedContents[js.path] ?? js.content}</script></body>`);
    return h;
  }, [generatedFiles, editedContents]);

  const currentFile = generatedFiles[selectedFileIndex];
  const currentFileContent = currentFile ? (editedContents[currentFile.path] ?? currentFile.content) : '';

  return (
    <div className="flex-1 flex overflow-hidden bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      {showPlans && <PlansModal onClose={() => setShowPlans(false)} coins={coins ?? 0} />}
      {showShare && shareUrl && <ShareModal shareUrl={shareUrl} onClose={() => setShowShare(false)} />}

      {dailyBonus > 0 && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <div>
            <p className="font-bold text-sm">Daily coins refreshed!</p>
            <p className="text-xs text-green-100">+{dailyBonus} coins added</p>
          </div>
          <button onClick={() => setDailyBonus(0)} className="ml-2 text-green-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══ LEFT SIDEBAR ═══════════════════════════════════════════════════ */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-white/10 bg-black/20">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <div className="flex-1">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Vibe Coder</p>
            <p className="text-[10px] text-gray-600">by DANI ✨</p>
          </div>
          <button onClick={startNewProject}
            className="p-2 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 text-pink-400 hover:text-pink-300 transition-all border border-pink-500/20"
            title="New project">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Coins */}
        <div className="mx-3 mt-3">
          <button onClick={() => setShowPlans(true)}
            className="w-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl px-3 py-2.5 flex items-center gap-2.5 hover:border-yellow-400/40 transition-all group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-base flex-shrink-0">💰</div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[10px] text-gray-500">Daily Coins</p>
              <p className="font-black text-white text-sm">
                {coins === null ? '—' : `${coins.toLocaleString()}`}
                <span className="text-yellow-400 text-xs font-semibold ml-1">coins</span>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-green-400 font-semibold">+500/day</p>
              <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-yellow-400 transition-colors ml-auto" />
            </div>
          </button>
        </div>

        {/* Tab toggle */}
        <div className="flex mx-3 mt-3 bg-white/5 rounded-xl p-0.5 border border-white/10">
          <button onClick={() => setSidebarTab('config')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${sidebarTab === 'config' ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            ⚙️ Config
          </button>
          <button onClick={() => setSidebarTab('history')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${sidebarTab === 'history' ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <FolderOpen className="w-3 h-3" />
            Projects {projects.length > 0 && <span className="bg-pink-500/80 text-white text-[9px] px-1.5 py-0.5 rounded-full">{projects.length}</span>}
          </button>
        </div>

        {/* Config Tab */}
        {sidebarTab === 'config' && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 pt-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Model</p>
              <div className="space-y-1.5">
                {MODELS.map(m => {
                  const Icon = m.icon;
                  const active = selectedModel === m.id;
                  return (
                    <button key={m.id} onClick={() => setSelectedModel(m.id)}
                      className={`w-full p-2.5 rounded-xl border-2 text-left transition-all bg-gradient-to-r ${m.gradient} ${active ? m.activeBorder + ' shadow-md' : m.border + ' hover:border-opacity-60'}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Icon className={`w-3.5 h-3.5 ${m.iconColor}`} />
                        <span className="font-bold text-white text-xs">{m.name}</span>
                        <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r ${m.badgeColor} text-white`}>{m.badge}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">{m.desc}</p>
                      <p className="text-[10px] font-bold text-yellow-400 mt-1">⚡ {m.cost} coins</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-3 pt-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Tech Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {TECH_OPTIONS.map(t => (
                  <button key={t.id} onClick={() => toggleTech(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${techStack.includes(t.id)
                      ? 'bg-white text-gray-900 border-white shadow-sm'
                      : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/30 hover:text-gray-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-3 pt-4 pb-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Describe Your Website</p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your dream website in detail…"
                className="w-full min-h-[110px] bg-white/5 border border-white/10 focus:border-pink-400/60 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 resize-none focus:outline-none transition-all"
              />
            </div>

            <div className="px-3 pb-2">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Quick Ideas</p>
              {[
                'A sleek portfolio site with hero, projects, and contact form',
                'An e-commerce landing page for a jewelry brand',
                'A dark SaaS landing page with pricing table',
              ].map((s, i) => (
                <button key={i} onClick={() => setDescription(s)}
                  className="w-full text-left text-[10px] text-gray-600 hover:text-gray-400 py-1 px-2 rounded hover:bg-white/5 transition-all truncate">
                  → {s}
                </button>
              ))}
            </div>

            {error && (
              <div className="mx-3 mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-red-400 leading-relaxed">{error}</p>
                  {error.includes('coin') && (
                    <button onClick={() => setShowPlans(true)} className="text-[11px] font-bold text-pink-400 hover:underline mt-1">View Plans →</button>
                  )}
                </div>
              </div>
            )}

            <div className="px-3 pb-4">
              <button onClick={handleGenerate}
                disabled={isGenerating || !description.trim() || techStack.length === 0}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-black text-sm hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Building...</>
                  : <><Sparkles className="w-4 h-4" /> Generate · {selectedModelConfig.cost} coins</>}
              </button>
            </div>
          </div>
        )}

        {/* History Tab */}
        {sidebarTab === 'history' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="w-10 h-10 text-gray-700 mb-3" />
                  <p className="text-sm font-semibold text-gray-600">No projects yet</p>
                  <p className="text-xs text-gray-700 mt-1">Generate your first website to see it here</p>
                  <button onClick={() => setSidebarTab('config')}
                    className="mt-4 px-4 py-2 bg-pink-500/20 text-pink-400 text-xs font-semibold rounded-xl hover:bg-pink-500/30 transition-all border border-pink-500/20">
                    Start Building →
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold px-1 mb-2">
                    {projects.length} project{projects.length !== 1 ? 's' : ''} saved
                  </p>
                  {projects.map(p => (
                    <ProjectCard key={p.id} project={p} isActive={activeProjectId === p.id} onLoad={loadProject} onDelete={deleteProject} />
                  ))}
                </>
              )}
            </div>
            {projects.length > 0 && (
              <div className="p-3 border-t border-white/10">
                <button onClick={() => { if (!confirm('Clear all project history?')) return; setProjects([]); localStorage.removeItem('dani-website-projects'); setActiveProjectId(null); }}
                  className="w-full py-2 rounded-xl text-xs text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Clear all history
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ RIGHT: OUTPUT AREA ═════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/20 flex-shrink-0">
          <div className="flex gap-1.5 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Globe className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="text-sm text-gray-400 font-mono truncate">
              {generatedFiles.length > 0 ? projectName : 'new-project'}
            </span>
            {generatedFiles.length > 0 && activeProjectId && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/20 flex-shrink-0">ready</span>
            )}
          </div>

          {generatedFiles.length > 0 && (
            <>
              {/* View toggle — Preview / Code */}
              <div className="flex bg-white/5 rounded-xl p-0.5 gap-0.5 flex-shrink-0">
                <button onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${viewMode === 'preview' ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button onClick={() => setViewMode('editor')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${viewMode === 'editor' ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  <Edit className="w-3.5 h-3.5" /> Code
                </button>
              </div>

              {/* Share */}
              <button onClick={handleShare} disabled={isSharing}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-all flex-shrink-0 disabled:opacity-50">
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">{isSharing ? 'Sharing...' : 'Share'}</span>
              </button>

              {/* Download */}
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-green-500/20 transition-all flex-shrink-0">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </>
          )}
        </div>

        {/* Content */}
        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-blue-600 animate-pulse shadow-2xl shadow-purple-500/40" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 animate-ping opacity-20" />
              <div className="absolute inset-4 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Code className="w-9 h-9 text-white animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white mb-2">Building your website...</p>
              <p className="text-pink-400 font-semibold animate-pulse">{generationPhase}</p>
              <p className="text-gray-600 text-sm mt-2">Using {selectedModelConfig.name} · {selectedModelConfig.cost} coins</p>
            </div>
          </div>

        ) : generatedFiles.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-500/30">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-black text-white mb-2">Vibe Code with DANI</h2>
              <p className="text-gray-400 max-w-sm mx-auto leading-relaxed">
                Describe any website, pick your model, and DANI builds it — complete, styled, and ready to ship.
              </p>
              {projects.length > 0 && (
                <button onClick={() => setSidebarTab('history')}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-pink-400/40 text-gray-400 hover:text-pink-400 text-sm rounded-xl transition-all">
                  <FolderOpen className="w-4 h-4" />
                  View {projects.length} saved project{projects.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
              {MODELS.map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.id} onClick={() => { setSelectedModel(m.id); setSidebarTab('config'); }}
                    className={`p-5 rounded-2xl border-2 text-left transition-all bg-gradient-to-br ${m.gradient} ${selectedModel === m.id ? m.activeBorder + ' shadow-lg' : m.border}`}>
                    <Icon className={`w-7 h-7 ${m.iconColor} mb-3`} />
                    <p className="font-bold text-white">{m.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{m.desc}</p>
                    <p className="text-xs font-bold text-yellow-400 mt-2">⚡ {m.cost} coins</p>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {['HTML5 + CSS3', 'JavaScript', 'TypeScript', 'React', 'Live Preview', 'ZIP Export', 'Share Link'].map(f => (
                <span key={f} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-500 font-medium">✦ {f}</span>
              ))}
            </div>
          </div>

        ) : viewMode === 'preview' ? (
          /* Full-width preview */
          <iframe srcDoc={previewHTML} className="flex-1 w-full border-0 bg-white" title="Preview" sandbox="allow-scripts allow-forms" />

        ) : (
          /* Code editor — file tabs across top, editor below */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* File tabs at top */}
            <div className="flex items-center gap-1 px-4 py-2 bg-gray-900/80 border-b border-white/10 overflow-x-auto flex-shrink-0">
              {generatedFiles.map((f, i) => (
                <button key={i} onClick={() => setSelectedFileIndex(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex-shrink-0 ${
                    selectedFileIndex === i
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}>
                  <FileCode className="w-3 h-3 flex-shrink-0" />
                  {f.path}
                </button>
              ))}
              <div className="ml-auto flex-shrink-0">
                <CopyBtn text={currentFileContent} />
              </div>
            </div>
            {/* Editor full-width */}
            <textarea
              value={currentFileContent}
              onChange={e => {
                const path = currentFile?.path;
                if (path) setEditedContents(prev => ({ ...prev, [path]: e.target.value }));
              }}
              className="flex-1 bg-gray-950 text-green-300 font-mono text-xs p-5 resize-none focus:outline-none leading-relaxed w-full"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
