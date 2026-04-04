import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Code, Download, Sparkles, Globe, FileCode, Loader2, CheckCircle,
  AlertCircle, Eye, Edit, Zap, Cpu, Star, Crown, Coins,
  ChevronRight, Play, RotateCcw, X, ExternalLink, Copy, Check,
  Package, Menu, Plus, Trash2, History
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
  files: GeneratedFile[];
  createdAt: Date;
}

// ─── Model Config ─────────────────────────────────────────────────────────────
const MODELS = [
  {
    id: 'dani-1.15',
    name: 'DANI 1.15',
    desc: 'Fast & capable — great for most projects',
    cost: 10,
    badge: 'Free Tier',
    badgeColor: 'from-green-400 to-emerald-500',
    icon: Zap,
    iconColor: 'text-green-500',
    gradient: 'from-green-400/10 to-emerald-400/10',
    border: 'border-green-300/50',
    activeBorder: 'border-green-400',
    tier: 'free',
  },
  {
    id: 'primis-1.20',
    name: 'Primis 1.20',
    desc: 'Advanced reasoning — complex apps & features',
    cost: 30,
    badge: 'Pro',
    badgeColor: 'from-blue-400 to-indigo-500',
    icon: Cpu,
    iconColor: 'text-blue-500',
    gradient: 'from-blue-400/10 to-indigo-400/10',
    border: 'border-blue-300/50',
    activeBorder: 'border-blue-400',
    tier: 'pro',
  },
  {
    id: 'lumi-5.3',
    name: 'Lumi 5.3',
    desc: 'Most powerful — production-grade masterpieces',
    cost: 75,
    badge: 'Premium',
    badgeColor: 'from-yellow-400 to-orange-500',
    icon: Crown,
    iconColor: 'text-yellow-500',
    gradient: 'from-yellow-400/10 to-orange-400/10',
    border: 'border-yellow-300/50',
    activeBorder: 'border-yellow-400',
    tier: 'premium',
  },
];

const TECH_OPTIONS = [
  { id: 'html', label: 'HTML5', color: 'text-orange-600' },
  { id: 'css', label: 'CSS3', color: 'text-blue-600' },
  { id: 'javascript', label: 'JavaScript', color: 'text-yellow-600' },
  { id: 'typescript', label: 'TypeScript', color: 'text-blue-700' },
  { id: 'react', label: 'React', color: 'text-cyan-600' },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    coins: 100,
    coinLabel: '100 coins/month',
    features: ['DANI 1.15 only', 'Basic website generation', 'ZIP download', '10 coins/generation'],
    gradient: 'from-gray-400 to-gray-500',
    cta: 'Current Plan',
    disabled: true,
  },
  {
    name: 'Starter',
    price: '$4.99',
    period: '/month',
    coins: 500,
    coinLabel: '500 coins/month',
    features: ['All 3 models', 'Priority generation', 'ZIP download', 'Chat history'],
    gradient: 'from-pink-500 to-purple-600',
    cta: 'Upgrade — Coming Soon',
    disabled: true,
  },
  {
    name: 'Pro',
    price: '$14.99',
    period: '/month',
    coins: 2000,
    coinLabel: '2,000 coins/month',
    features: ['All 3 models', 'Fastest generation', 'ZIP download', 'Priority support', 'Early access features'],
    gradient: 'from-blue-500 to-indigo-600',
    cta: 'Go Pro — Coming Soon',
    disabled: true,
    popular: true,
  },
  {
    name: 'Unlimited',
    price: '$29.99',
    period: '/month',
    coins: 99999,
    coinLabel: 'Unlimited coins',
    features: ['Unlimited generation', 'All models', 'Custom domains (soon)', 'White-label export', 'API access'],
    gradient: 'from-yellow-400 to-orange-500',
    cta: 'Go Unlimited — Coming Soon',
    disabled: true,
  },
];

// ─── Code Copy Button ─────────────────────────────────────────────────────────
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
      <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-3xl border-2 border-white/40 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Power Up with Coins 💎
              </h2>
              <p className="text-gray-600 mt-1">Choose a plan to unlock more generations</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-xl transition-all">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Current balance */}
          <div className="glass rounded-2xl px-6 py-4 border border-white/40 mb-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-2xl">💰</div>
            <div>
              <p className="text-sm text-gray-500">Your current balance</p>
              <p className="text-2xl font-black text-gray-800">{coins.toLocaleString()} <span className="text-lg font-semibold text-pink-600">coins</span></p>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div key={plan.name}
                className={`relative glass rounded-3xl border-2 border-white/30 p-6 flex flex-col ${plan.popular ? 'ring-2 ring-purple-400 shadow-lg shadow-purple-200' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      ⭐ Most Popular
                    </span>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4`}>
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-black text-xl text-gray-800">{plan.name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-black text-gray-800">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="text-sm font-semibold text-pink-600 mb-4">{plan.coinLabel}</p>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button disabled={plan.disabled}
                  className={`w-full py-2.5 rounded-2xl font-bold text-sm transition-all ${
                    plan.disabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : `bg-gradient-to-r ${plan.gradient} text-white hover:shadow-lg`
                  }`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Payment plans coming soon 🌸 — Your coins never expire
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main WebsiteTab ──────────────────────────────────────────────────────────
export default function WebsiteTab() {
  const [description, setDescription] = useState('');
  const [techStack, setTechStack] = useState(['html', 'css', 'javascript']);
  const [selectedModel, setSelectedModel] = useState('dani-1.15');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [coins, setCoins] = useState<number | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [generationPhase, setGenerationPhase] = useState('');
  const [promptSuggestions] = useState([
    'A sleek portfolio site with a hero section, project gallery, and contact form',
    'An e-commerce landing page for a handmade jewelry brand with a pink theme',
    'A restaurant website with a menu, booking section, and photo gallery',
    'A SaaS landing page with pricing table, features, and testimonials',
    'A personal blog with dark mode, categories, and a newsletter signup',
  ]);

  const selectedModelConfig = MODELS.find(m => m.id === selectedModel)!;

  // ── Load auth + credits ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setIsAuthenticated(!!user);
      if (user) {
        const { data } = await supabase.from('user_credits').select('balance').eq('user_id', user.id).single();
        setCoins(data?.balance ?? 100);
      }
    });
    // Load projects from localStorage
    try {
      const saved = localStorage.getItem('dani-website-projects');
      if (saved) setProjects(JSON.parse(saved).map((p: Project) => ({ ...p, createdAt: new Date(p.createdAt) })));
    } catch { /* ignore */ }
  }, []);

  const saveProject = useCallback((name: string, desc: string, model: string, files: GeneratedFile[]) => {
    const project: Project = {
      id: Date.now().toString(),
      name, description: desc, model, files,
      createdAt: new Date(),
    };
    setProjects(prev => {
      const updated = [project, ...prev].slice(0, 20);
      localStorage.setItem('dani-website-projects', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleTech = (id: string) => {
    setTechStack(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  // ── Generate Website ───────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!description.trim()) { setError('Describe the website you want to build'); return; }
    if (techStack.length === 0) { setError('Select at least one technology'); return; }

    if (coins !== null && coins < selectedModelConfig.cost) {
      setError(`Not enough coins! Need ${selectedModelConfig.cost}, you have ${coins}. Upgrade your plan.`);
      setShowPlans(true);
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedFiles([]);
    setEditedContents({});

    const phases = [
      `Initializing ${selectedModelConfig.name}...`,
      'Analyzing your requirements...',
      'Designing component architecture...',
      'Writing HTML structure...',
      'Styling with CSS...',
      'Adding JavaScript logic...',
      'Optimizing and finalizing...',
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
        // Parse JSON error if available
        try { const parsed = JSON.parse(msg); msg = parsed.error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }

      setGeneratedFiles(data.files || []);
      setProjectName(data.projectName || 'my-website');
      if (data.newBalance !== null && data.newBalance !== undefined) setCoins(data.newBalance);
      saveProject(data.projectName || 'my-website', description, selectedModel, data.files || []);
      setViewMode('preview');

    } catch (err: unknown) {
      clearInterval(phaseInterval);
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setError(msg);
    } finally {
      setIsGenerating(false);
      setGenerationPhase('');
    }
  };

  // ── ZIP Download ───────────────────────────────────────────────────────────
  const createZipFile = (files: GeneratedFile[]): Blob => {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const centralDirectory: Uint8Array[] = [];
    let offset = 0;

    files.forEach(file => {
      const content = encoder.encode(editedContents[file.path] ?? file.content);
      const name    = encoder.encode(file.path);

      const header = new Uint8Array(30 + name.length);
      const hv = new DataView(header.buffer);
      hv.setUint32(0, 0x04034b50, true);
      hv.setUint16(4, 10, true);
      hv.setUint16(26, name.length, true);
      header.set(name, 30);
      chunks.push(header, content);

      const cd = new Uint8Array(46 + name.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 10, true);
      cv.setUint16(6, 10, true);
      cv.setUint32(20, content.length, true);
      cv.setUint32(24, content.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      cd.set(name, 46);
      centralDirectory.push(cd);
      offset += header.length + content.length;
    });

    const cdSize = centralDirectory.reduce((s, c) => s + c.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);

    return new Blob([...chunks, ...centralDirectory, eocd], { type: 'application/zip' });
  };

  const handleDownload = () => {
    const blob = createZipFile(generatedFiles);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'website'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Preview HTML ───────────────────────────────────────────────────────────
  const previewHTML = useMemo(() => {
    if (!generatedFiles.length) return '';
    const html = generatedFiles.find(f => f.path === 'index.html');
    const css  = generatedFiles.find(f => f.path.endsWith('.css'));
    const js   = generatedFiles.find(f => f.path.endsWith('.js') && !f.path.endsWith('.jsx'));
    if (!html) return '';
    let h = editedContents['index.html'] ?? html.content;
    if (css)  h = h.replace('</head>', `<style>${editedContents[css.path] ?? css.content}</style></head>`);
    if (js)   h = h.replace('</body>', `<script>${editedContents[js.path] ?? js.content}</script></body>`);
    return h;
  }, [generatedFiles, editedContents]);

  const currentFileContent = generatedFiles[selectedFileIndex]
    ? (editedContents[generatedFiles[selectedFileIndex].path] ?? generatedFiles[selectedFileIndex].content)
    : '';

  const loadProject = (project: Project) => {
    setGeneratedFiles(project.files);
    setProjectName(project.name);
    setDescription(project.description);
    setSelectedModel(project.model);
    setEditedContents({});
    setShowHistory(false);
    setViewMode('preview');
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      {/* ── History Panel ── */}
      {showHistory && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setShowHistory(false)} />
          <aside className="fixed top-0 left-0 h-full w-72 z-40 bg-gray-900/95 border-r border-white/10 flex flex-col">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-pink-400" /> Project History
              </h3>
              <button onClick={() => setShowHistory(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No projects yet
                </div>
              ) : projects.map(p => (
                <button key={p.id} onClick={() => loadProject(p)}
                  className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-all border border-white/10 hover:border-pink-400/40 group">
                  <p className="font-semibold text-white text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{p.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400">{p.model}</span>
                    <span className="text-[10px] text-gray-600">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-white/10">
              <button onClick={() => { setProjects([]); localStorage.removeItem('dani-website-projects'); }}
                className="w-full py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Clear History
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── Plans Modal ── */}
      {showPlans && <PlansModal onClose={() => setShowPlans(false)} coins={coins ?? 0} />}

      {/* ── Left Sidebar: Prompt + Config ── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-white/10 bg-black/20 overflow-y-auto">

        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <button onClick={() => setShowHistory(true)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Project history">
            <History className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Vibe Coder</p>
            <p className="text-[10px] text-gray-600">by DANI</p>
          </div>
          <button onClick={() => { setGeneratedFiles([]); setDescription(''); setEditedContents({}); }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="New project">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Coin Balance */}
        <div className="mx-4 mt-4">
          <button onClick={() => setShowPlans(true)}
            className="w-full glass rounded-2xl px-4 py-3 border border-white/10 hover:border-pink-400/40 transition-all flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-sm">💰</div>
            <div className="flex-1 text-left">
              <p className="text-xs text-gray-500">Coin Balance</p>
              <p className="font-black text-white text-sm">
                {coins === null ? '—' : `${coins.toLocaleString()} coins`}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-pink-400 transition-colors" />
          </button>
        </div>

        {/* Model Selection */}
        <div className="px-4 pt-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Select Model</p>
          <div className="space-y-2">
            {MODELS.map(m => {
              const Icon = m.icon;
              const active = selectedModel === m.id;
              return (
                <button key={m.id} onClick={() => setSelectedModel(m.id)}
                  className={`w-full p-3 rounded-2xl border-2 text-left transition-all bg-gradient-to-r ${m.gradient} ${active ? m.activeBorder + ' shadow-lg' : m.border + ' hover:border-opacity-80'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${m.iconColor}`} />
                    <span className="font-bold text-white text-sm">{m.name}</span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${m.badgeColor} text-white`}>{m.badge}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{m.desc}</p>
                  <p className="text-xs font-bold text-yellow-400 mt-1.5">⚡ {m.cost} coins/generation</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="px-4 pt-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tech Stack</p>
          <div className="flex flex-wrap gap-2">
            {TECH_OPTIONS.map(t => (
              <button key={t.id} onClick={() => toggleTech(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  techStack.includes(t.id)
                    ? 'bg-white text-gray-900 border-white shadow-lg'
                    : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/30 hover:text-gray-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div className="px-4 pt-5 flex-1 flex flex-col">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Describe Your Website</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your dream website in detail…"
            className="flex-1 min-h-[120px] w-full bg-white/5 border border-white/10 focus:border-pink-400/60 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none transition-all"
          />
        </div>

        {/* Suggestions */}
        <div className="px-4 pt-3">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Quick Ideas</p>
          <div className="space-y-1">
            {promptSuggestions.slice(0, 3).map((s, i) => (
              <button key={i} onClick={() => setDescription(s)}
                className="w-full text-left text-xs text-gray-500 hover:text-gray-300 py-1 px-2 rounded-lg hover:bg-white/5 transition-all truncate">
                → {s}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-red-400 leading-relaxed">{error}</p>
              {error.includes('coin') && (
                <button onClick={() => setShowPlans(true)} className="text-xs font-bold text-pink-400 hover:underline mt-1">
                  View Plans →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="p-4 mt-4">
          <button onClick={handleGenerate}
            disabled={isGenerating || !description.trim() || techStack.length === 0}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black text-base hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isGenerating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Building...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Generate · {selectedModelConfig.cost} coins</>
            )}
          </button>
          <p className="text-center text-[10px] text-gray-600 mt-2">Ctrl+Enter to generate quickly</p>
        </div>
      </div>

      {/* ── Right: Editor / Preview ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/20 flex-shrink-0">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>

          {/* Project name */}
          <div className="flex-1 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-400 font-mono">
              {generatedFiles.length > 0 ? projectName : 'new-project'}
            </span>
          </div>

          {/* View toggle */}
          {generatedFiles.length > 0 && (
            <div className="flex bg-white/5 rounded-xl p-0.5 gap-0.5">
              {(['editor', 'preview'] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    viewMode === v ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}>
                  {v === 'editor' ? <Edit className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          )}

          {generatedFiles.length > 0 && (
            <button onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-green-500/25 transition-all">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download ZIP</span>
            </button>
          )}
        </div>

        {/* Content */}
        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {/* Animated orb */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-blue-600 animate-pulse shadow-2xl shadow-purple-500/40" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 animate-ping opacity-30" />
              <div className="absolute inset-4 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Code className="w-10 h-10 text-white animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white mb-2">Generating your website...</p>
              <p className="text-pink-400 font-semibold animate-pulse">{generationPhase}</p>
              <p className="text-gray-600 text-sm mt-2">Using {selectedModelConfig.name} · {selectedModelConfig.cost} coins</p>
            </div>
            {/* Progress bar */}
            <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-[loading_15s_linear_forwards]"
                style={{ animation: 'width 15s linear forwards', width: '0%' }} />
            </div>
          </div>
        ) : generatedFiles.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-500/30">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-black text-white mb-2">Vibe Code with DANI</h2>
              <p className="text-gray-400 max-w-sm mx-auto leading-relaxed">
                Describe any website, pick your model, and DANI builds it — complete, styled, and ready to ship.
              </p>
            </div>

            {/* Model cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
              {MODELS.map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.id} onClick={() => setSelectedModel(m.id)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all bg-gradient-to-br ${m.gradient} ${selectedModel === m.id ? m.activeBorder + ' shadow-lg' : m.border}`}>
                    <Icon className={`w-7 h-7 ${m.iconColor} mb-3`} />
                    <p className="font-bold text-white">{m.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{m.desc}</p>
                    <p className="text-xs font-bold text-yellow-400 mt-2">⚡ {m.cost} coins</p>
                  </button>
                );
              })}
            </div>

            {/* Feature chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {['HTML + CSS + JS', 'React Apps', 'TypeScript', 'Live Preview', 'ZIP Export', 'Responsive Design'].map(f => (
                <span key={f} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 font-medium">
                  ✦ {f}
                </span>
              ))}
            </div>
          </div>
        ) : viewMode === 'preview' ? (
          <iframe srcDoc={previewHTML} className="flex-1 w-full border-0 bg-white" title="Preview" sandbox="allow-scripts" />
        ) : (
          /* Code Editor */
          <div className="flex-1 flex overflow-hidden">
            {/* File tabs sidebar */}
            <div className="w-44 flex-shrink-0 bg-gray-900/60 border-r border-white/10 overflow-y-auto">
              <div className="p-3">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2 px-1">Files</p>
                {generatedFiles.map((f, i) => (
                  <button key={i} onClick={() => setSelectedFileIndex(i)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all mb-1 flex items-center gap-2 ${
                      selectedFileIndex === i
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}>
                    <FileCode className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{f.path}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-900/80 border-b border-white/10">
                <span className="text-xs font-mono text-gray-500">{generatedFiles[selectedFileIndex]?.path}</span>
                <CopyBtn text={currentFileContent} />
              </div>
              <textarea
                value={currentFileContent}
                onChange={e => {
                  const path = generatedFiles[selectedFileIndex]?.path;
                  if (path) setEditedContents(prev => ({ ...prev, [path]: e.target.value }));
                }}
                className="flex-1 bg-gray-950 text-green-300 font-mono text-xs p-4 resize-none focus:outline-none leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
