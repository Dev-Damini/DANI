import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, Globe, FileCode, Loader2, AlertCircle, Eye, Code2,
  Zap, Cpu, Crown, X, Copy, Check, Plus, Trash2, Download,
  Share2, ChevronRight, Coins, CheckCircle,
  Menu, ArrowLeft, Wand2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Tech Presets ─────────────────────────────────────────────────────────────
const TECH_PRESETS = [
  {
    id: 'react-ts',
    label: 'TypeScript · React · Vite',
    short: 'React TS',
    emoji: '⚡',
    desc: 'Type-safe, modern, scalable',
    color: 'from-cyan-400 to-blue-500',
    ring: 'ring-cyan-400/40',
    stack: ['react', 'typescript', 'vite'],
  },
  {
    id: 'react-js',
    label: 'JavaScript · React · Vite',
    short: 'React JS',
    emoji: '⚛️',
    desc: 'Fast, flexible, familiar',
    color: 'from-yellow-400 to-orange-500',
    ring: 'ring-yellow-400/40',
    stack: ['react', 'javascript', 'vite'],
  },
  {
    id: 'vanilla',
    label: 'HTML · CSS · JavaScript',
    short: 'HTML / CSS / JS',
    emoji: '🌐',
    desc: 'Pure, lightweight, universal',
    color: 'from-orange-400 to-pink-500',
    ring: 'ring-orange-400/40',
    stack: ['html', 'css', 'javascript'],
  },
] as const;

type TechPresetId = typeof TECH_PRESETS[number]['id'];

// ─── Models ───────────────────────────────────────────────────────────────────
const MODELS = [
  {
    id: 'dani-5.0',
    name: 'DANI 5.0',
    tagline: 'Our smartest model',
    desc: 'Top-tier intelligence, beautiful code, fast results',
    cost: 10,
    badge: 'Best',
    icon: Crown,
    color: 'from-pink-500 to-purple-600',
    ring: 'ring-pink-400/50',
    textColor: 'text-pink-500',
    badgeColor: 'bg-pink-500/15 text-pink-500 border-pink-500/30',
    dot: 'bg-pink-400',
  },
  {
    id: 'primis-1.20',
    name: 'Primis 1.20',
    tagline: 'Advanced reasoning',
    desc: 'Deep analysis, complex apps, detailed output',
    cost: 30,
    badge: 'Pro',
    icon: Cpu,
    color: 'from-blue-500 to-indigo-600',
    ring: 'ring-blue-400/50',
    textColor: 'text-blue-500',
    badgeColor: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    dot: 'bg-blue-400',
  },
  {
    id: 'lumi-5.3',
    name: 'Lumi 5.3',
    tagline: 'Ultrawide intelligence',
    desc: 'Most powerful, complex systems, production-ready',
    cost: 75,
    badge: 'Premium',
    icon: Zap,
    color: 'from-yellow-400 to-orange-500',
    ring: 'ring-yellow-400/50',
    textColor: 'text-yellow-500',
    badgeColor: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
] as const;

type ModelId = typeof MODELS[number]['id'];

// ─── Plans ────────────────────────────────────────────────────────────────────
const PLANS = [
  { name: 'Free', price: '$0', sub: '/mo', coins: '500 coins/day', features: ['DANI 5.0', 'ZIP download', '10 coins/gen'], grad: 'from-gray-400 to-gray-500', cta: 'Current plan', off: true },
  { name: 'Starter', price: '$4.99', sub: '/mo', coins: '2k coins/mo', features: ['All 3 models', 'Priority gen', 'Chat history'], grad: 'from-pink-500 to-purple-600', cta: 'Coming soon', off: true },
  { name: 'Pro', price: '$14.99', sub: '/mo', coins: '10k coins/mo', features: ['All models', 'Fastest gen', 'Priority support'], grad: 'from-blue-500 to-indigo-600', cta: 'Coming soon', off: true, popular: true },
  { name: 'Unlimited', price: '$29.99', sub: '/mo', coins: '∞ coins', features: ['Unlimited gen', 'All models', 'API access'], grad: 'from-yellow-400 to-orange-500', cta: 'Coming soon', off: true },
];

// ─── Date grouping ────────────────────────────────────────────────────────────
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

// ─── TypeScript Stripper (for CDN React preview) ──────────────────────────────
function stripTypeScript(code: string): string {
  return code
    .replace(/^import\s+type\s+.*?;?\s*$/gm, '')
    .replace(/^interface\s+\w+[^{]*\{[^}]*\}/gm, '')
    .replace(/^type\s+\w+\s*=\s*[^;]+;/gm, '')
    .replace(/:\s*(string|number|boolean|void|null|undefined|React\.FC|React\.ReactNode|React\.JSX\.Element|JSX\.Element|any|unknown|never)\b(\s*\[\])?/g, '')
    .replace(/\s+as\s+\w+(\[\])?/g, '')
    .replace(/:\s*React\.\w+(?:<[^>]*>)?/g, '')
    .replace(/!(?=[.\[(])/g, '')
    .replace(/\)\s*:\s*JSX\.Element\s*\{/g, ') {')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── React CDN Preview Builder ────────────────────────────────────────────────
function buildReactPreviewHTML(
  files: GeneratedFile[],
  editedContents: Record<string, string>,
  preset: TechPresetId
): string {
  if (preset === 'vanilla') {
    const html = files.find(f => f.path === 'index.html');
    const css = files.find(f => f.path.endsWith('.css'));
    const js = files.find(f => f.path.endsWith('.js') && !f.path.endsWith('.jsx'));
    if (!html) return '';
    let h = editedContents['index.html'] ?? html.content;
    if (css) h = h.replace('</head>', `<style>${editedContents[css.path] ?? css.content}</style></head>`);
    if (js) h = h.replace('</body>', `<script>${editedContents[js.path] ?? js.content}</script></body>`);
    return h;
  }

  // React (JS or TS) — use CDN + Babel standalone for in-browser transpilation
  const appFile = files.find(f =>
    f.path.endsWith('App.tsx') || f.path.endsWith('App.jsx') ||
    f.path === 'src/App.tsx' || f.path === 'src/App.jsx'
  );
  const cssFile = files.find(f => f.path.endsWith('index.css') || f.path.endsWith('.css'));
  const appContent = editedContents[appFile?.path ?? ''] ?? appFile?.content ?? '';
  const cssContent = editedContents[cssFile?.path ?? ''] ?? cssFile?.content ?? '';

  // Strip imports and export default, then strip TS if needed
  let jsxCode = appContent
    .replace(/^import\s+.*?from\s+['"]react['"]\s*;?\s*$/gm, '')
    .replace(/^import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '');

  if (preset === 'react-ts') {
    jsxCode = stripTypeScript(jsxCode);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useCallback, useRef, useMemo, useContext, createContext, useReducer } = React;
    ${jsxCode}
    try {
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
    } catch(e) {
      document.getElementById('root').innerHTML = '<div style="padding:20px;color:red;font-family:monospace">Preview error: ' + e.message + '</div>';
    }
  </script>
</body>
</html>`;
}

// ─── Streaming animation hook ─────────────────────────────────────────────────
function useCodeStream(targetContent: string, isActive: boolean) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive || !targetContent) { setDisplayed(''); setDone(false); return; }
    setDisplayed('');
    setDone(false);
    let idx = 0;
    const CHUNK = 22;
    const animate = () => {
      idx = Math.min(idx + CHUNK, targetContent.length);
      setDisplayed(targetContent.slice(0, idx));
      if (idx < targetContent.length) rafRef.current = requestAnimationFrame(animate);
      else setDone(true);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetContent, isActive]);

  return { displayed, done };
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyBtn({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`p-1.5 rounded-lg glass hover:bg-white/60 text-gray-500 hover:text-gray-800 transition-all border border-white/30 ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Plans Modal ──────────────────────────────────────────────────────────────
function PlansModal({ coins, onClose }: { coins: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" onClick={onClose}>
      <div className="glass border border-white/30 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Power Up 💎</h2>
              <p className="text-gray-500 text-sm mt-0.5">500 free coins every single day</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
                <span className="text-yellow-600 font-black text-lg">{coins.toLocaleString()}</span>
                <span className="text-yellow-500 text-sm">🪙</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-xl transition-all glass border border-white/30">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PLANS.map(p => (
              <div key={p.name} className={`relative glass border border-white/30 rounded-2xl p-5 flex flex-col ${p.popular ? 'ring-2 ring-purple-400/50' : ''}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                    ⭐ Most Popular
                  </div>
                )}
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.grad} flex items-center justify-center mb-3 shadow-md`}>
                  <Coins className="w-4 h-4 text-white" />
                </div>
                <p className="font-black text-gray-800 text-lg">{p.name}</p>
                <p className="text-2xl font-black text-gray-800 mt-1">{p.price}<span className="text-sm text-gray-400">{p.sub}</span></p>
                <p className="text-xs font-semibold text-pink-500 mt-1 mb-3">{p.coins}</p>
                <ul className="space-y-1.5 flex-1 mb-4">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <button disabled={p.off} className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${p.off ? 'glass text-gray-400 cursor-not-allowed border border-white/30' : `bg-gradient-to-r ${p.grad} text-white shadow-md`}`}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-5">Payment plans launching soon · Your coins never expire 🌸</p>
        </div>
      </div>
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" onClick={onClose}>
      <div className="glass border border-white/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-pink-500" /> Share Your Build
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/60 rounded-lg glass border border-white/30">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="glass border border-pink-200/50 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-3">
          <Globe className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
          <span className="text-xs font-mono text-gray-600 flex-1 truncate">{url}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex-shrink-0 px-2.5 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md"
          >
            {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 text-center">Anyone with this link can view your website 🌸</p>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function WebsiteTab() {
  // Wizard step: 0=prompt, 1=tech, 2=model, 3=results/generating
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [techPreset, setTechPreset] = useState<TechPresetId>('react-ts');
  const [model, setModel] = useState<ModelId>('dani-5.0');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStreamContent, setGenStreamContent] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('preview');
  const [projectName, setProjectName] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const { displayed: streamDisplayed, done: streamDone } = useCodeStream(genStreamContent, isGenerating && genStreamContent.length > 0);

  useEffect(() => {
    if (genStreamRef.current) genStreamRef.current.scrollTop = genStreamRef.current.scrollHeight;
  }, [streamDisplayed]);

  // Load data
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

  // Project management
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
    setTechPreset((p.techPreset as TechPresetId) || 'react-ts');
    setEditedContents({});
    setSelectedFileIdx(0);
    setViewMode('preview');
    setActiveProjectId(p.id);
    setError('');
    setShareUrl('');
    setStep(3);
    setSidebarOpen(false);
  }, []);

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('dani-vibe-projects', JSON.stringify(updated));
      return updated;
    });
    if (activeProjectId === id) { setActiveProjectId(null); setGeneratedFiles([]); setProjectName(''); setStep(0); }
  };

  const startNew = () => {
    setGeneratedFiles([]); setPrompt(''); setProjectName('');
    setEditedContents({}); setActiveProjectId(null); setError('');
    setShareUrl(''); setGenStreamContent(''); setStep(0);
    setSidebarOpen(false);
    setTimeout(() => promptRef.current?.focus(), 100);
  };

  // Generate
  const handleGenerate = async () => {
    const p = prompt.trim();
    if (!p) return;
    if (coins !== null && coins < selectedModel.cost) {
      setError(`Need ${selectedModel.cost} coins — you have ${coins}.`);
      setShowPlans(true);
      return;
    }

    setStep(3);
    setIsGenerating(true);
    setError('');
    setGeneratedFiles([]);
    setEditedContents({});
    setShareUrl('');

    const phases = [
      `▸ Initializing ${selectedModel.name}...\n`,
      `▸ Reading prompt...\n  "${p.slice(0, 60)}${p.length > 60 ? '...' : ''}"\n`,
      `▸ Stack: ${selectedPreset.label}\n`,
      `▸ Planning architecture...\n`,
      `▸ Writing ${selectedPreset.stack.includes('react') ? 'React components' : 'HTML structure'}...\n`,
      `▸ Adding styles & animations...\n`,
      `▸ Wiring up interactivity...\n`,
      `▸ Final polish & optimization...\n`,
    ];

    let builtPhases = phases[0];
    setGenStreamContent(builtPhases);
    let phaseIdx = 0;
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

      if (files.length > 0) {
        setGenStreamContent(`▸ Done! Your website is ready ✓\n\n// ${files[0].path}\n\n${files[0].content}`);
      }

      setGeneratedFiles(files);
      setProjectName(name);
      if (data.newBalance != null) setCoins(data.newBalance);
      if (data.dailyRefreshGranted > 0) setDailyBonus(data.dailyRefreshGranted);

      const newId = saveProject(name, p, model, techPreset, files);
      setActiveProjectId(newId);
      setSelectedFileIdx(0);
      setViewMode('preview');
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  // Share
  const handleShare = async () => {
    if (!hasFiles) return;
    setIsSharing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const htmlContent = buildReactPreviewHTML(generatedFiles, editedContents, techPreset);
      const { data, error } = await supabase.from('shared_websites').insert({
        user_id: session?.user?.id ?? null,
        project_name: projectName,
        html_content: htmlContent,
        model,
      }).select('id').single();
      if (error) throw error;
      setShareUrl(`${window.location.origin}/share?id=${data.id}`);
      setShowShare(true);
    } catch { setError('Failed to generate share link'); }
    finally { setIsSharing(false); }
  };

  // Download ZIP
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

  // Preview HTML — handles both vanilla and React (CDN mode)
  const previewHTML = useMemo(() => {
    if (!hasFiles) return '';
    return buildReactPreviewHTML(generatedFiles, editedContents, techPreset);
  }, [generatedFiles, editedContents, hasFiles, techPreset]);

  const handlePromptKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (prompt.trim()) setStep(1); }
  };

  const groupedProjects = groupProjectsByDate(projects);

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #faf5ff 50%, #eff6ff 100%)' }}>
      {showPlans && <PlansModal coins={coins ?? 0} onClose={() => setShowPlans(false)} />}
      {showShare && shareUrl && <ShareModal url={shareUrl} onClose={() => setShowShare(false)} />}

      {/* Daily bonus toast */}
      {dailyBonus > 0 && (
        <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <span className="text-xl">🎉</span>
          <div><p className="font-bold text-sm">Daily refresh!</p><p className="text-xs text-green-100">+{dailyBonus} coins added</p></div>
          <button onClick={() => setDailyBonus(0)} className="ml-1 text-green-200 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── History Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <aside
            className="relative z-50 w-72 flex flex-col glass border-r border-white/40 shadow-2xl animate-fade-in h-full"
            onClick={e => e.stopPropagation()}
          >
            {/* Sidebar header */}
            <div className="px-5 pt-6 pb-4 border-b border-white/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-md">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-black text-gray-800 text-sm">Vibe Code</p>
                  <p className="text-[10px] text-gray-400">Your projects</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-white/60 rounded-lg glass border border-white/30 transition-all">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Coins + New */}
            <div className="px-4 py-3 space-y-2 border-b border-white/20">
              <button onClick={() => { setShowPlans(true); setSidebarOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 glass rounded-2xl border border-yellow-200/60 hover:border-yellow-400/50 transition-all">
                <span className="text-lg">💰</span>
                <div className="flex-1 text-left">
                  <p className="text-[10px] text-gray-400">Coin Balance</p>
                  <p className="font-black text-gray-800 text-sm">
                    {coins === null ? '—' : coins.toLocaleString()}
                    <span className="text-yellow-500 text-xs ml-1">coins</span>
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button onClick={startNew}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-bold shadow-md hover:from-pink-600 hover:to-purple-700 transition-all">
                <Plus className="w-4 h-4" /> New Project
              </button>
            </div>

            {/* Project list */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
              {projects.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-6 h-6 text-pink-300" />
                  </div>
                  <p className="text-sm text-gray-400">Projects you build will appear here</p>
                </div>
              ) : (
                groupedProjects.map(group => (
                  <div key={group.label}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">{group.label}</p>
                    <div className="space-y-1">
                      {group.items.map(p => (
                        <div key={p.id} onClick={() => loadProject(p)}
                          className={`group relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                            activeProjectId === p.id
                              ? 'bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-pink-300/40 shadow-sm'
                              : 'hover:glass hover:border hover:border-white/40'
                          }`}>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${activeProjectId === p.id ? 'text-pink-700' : 'text-gray-700'}`}>
                              {p.name.replace(/-/g, ' ')}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{p.description.slice(0, 45)}…</p>
                          </div>
                          <button onClick={e => deleteProject(p.id, e)}
                            className="flex-shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── Top bar (always visible) ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 glass border-b border-white/40">
        <button onClick={() => setSidebarOpen(true)}
          className="p-2.5 glass rounded-xl hover:bg-white/80 transition-all border border-white/40 flex-shrink-0"
          title="Project history">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-black text-gray-800 text-sm tracking-tight">Vibe Code</span>
          {step === 3 && hasFiles && (
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 border border-green-200 font-semibold">{projectName.replace(/-/g, ' ')}</span>
          )}
        </div>

        <div className="flex-1" />

        {/* Tech preset quick switch in top bar (steps 0-2) */}
        {step < 3 && (
          <div className="hidden sm:flex items-center gap-1 bg-white/60 rounded-xl p-1 border border-white/40">
            {TECH_PRESETS.map(t => (
              <button key={t.id} onClick={() => setTechPreset(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  techPreset === t.id
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                <span>{t.emoji}</span>
                <span className="hidden md:inline">{t.short}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step indicator */}
        {step < 3 && (
          <div className="hidden lg:flex items-center gap-1.5">
            {['Prompt', 'Stack', 'Model'].map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  step === i ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' :
                  step > i ? 'bg-green-100 text-green-600 border border-green-200' :
                  'glass text-gray-400 border border-white/40'
                }`}>
                  {step > i ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                  {label}
                </div>
                {i < 2 && <ChevronRight className="w-3 h-3 text-gray-300" />}
              </div>
            ))}
          </div>
        )}

        {/* Result actions */}
        {step === 3 && hasFiles && (
          <div className="flex items-center gap-2">
            <button onClick={handleShare} disabled={isSharing}
              className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl border border-white/40 hover:bg-white/80 text-gray-600 text-xs font-semibold transition-all disabled:opacity-50">
              <Share2 className="w-3.5 h-3.5 text-pink-500" />{isSharing ? '…' : 'Share'}
            </button>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:from-pink-600 hover:to-purple-700 transition-all">
              <Download className="w-3.5 h-3.5" />ZIP
            </button>
          </div>
        )}

        {/* Coins pill */}
        <button onClick={() => setShowPlans(true)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl border border-yellow-200/60 hover:border-yellow-400/50 transition-all">
          <span className="text-sm">🪙</span>
          <span className="text-xs font-bold text-gray-700">{coins === null ? '—' : coins.toLocaleString()}</span>
        </button>
      </div>

      {/* ═══════════════════ STEP CONTENT ═══════════════════ */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ── STEP 0: Big Prompt Input ── */}
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-fade-in">
            <div className="w-full max-w-2xl mx-auto">
              {/* Hero */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 mb-5 shadow-2xl shadow-pink-500/30">
                  <Wand2 className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  What are we building?
                </h1>
                <p className="text-gray-500 text-sm sm:text-base">Describe your website or app — DANI writes every line of code for you ✨</p>
              </div>

              {/* Big prompt box */}
              <div className="glass border-2 border-white/50 rounded-3xl shadow-xl shadow-pink-200/30 overflow-hidden">
                <textarea
                  ref={promptRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handlePromptKey}
                  placeholder="e.g. A beautiful e-commerce store with a hero section, product grid, shopping cart, and smooth animations..."
                  rows={5}
                  autoFocus
                  className="w-full bg-transparent text-gray-800 placeholder-gray-400 text-base sm:text-lg leading-relaxed p-6 resize-none focus:outline-none font-medium"
                />
                <div className="flex items-center justify-between px-5 pb-5 pt-1 gap-3 flex-wrap">
                  <p className="text-xs text-gray-400 hidden sm:block">⌘↵ to continue</p>
                  {/* Quick starters */}
                  <div className="flex gap-2 flex-wrap">
                    {['Portfolio site', 'SaaS dashboard', 'Landing page'].map(s => (
                      <button key={s} onClick={() => setPrompt(s + ' — modern, responsive design with animations')}
                        className="text-xs px-3 py-1.5 glass rounded-full border border-white/50 text-gray-600 hover:text-pink-600 hover:border-pink-300/50 transition-all font-medium">
                        {s}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { if (prompt.trim()) setStep(1); }}
                    disabled={!prompt.trim()}
                    className="flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black text-base shadow-xl shadow-pink-400/30 hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Next <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quick ideas */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: '🛒', label: 'E-commerce', desc: 'Product grid & cart' },
                  { icon: '💼', label: 'Portfolio', desc: 'Projects & contact' },
                  { icon: '📊', label: 'Dashboard', desc: 'Stats & analytics' },
                  { icon: '🎨', label: 'Creative', desc: 'Bold animations' },
                ].map(s => (
                  <button key={s.label}
                    onClick={() => { setPrompt(`${s.label} — ${s.desc}, modern responsive design with smooth animations and professional look`); setTimeout(() => setStep(1), 50); }}
                    className="flex flex-col items-center gap-2 p-4 glass rounded-2xl border border-white/40 hover:border-pink-300/50 hover:shadow-md transition-all group text-center">
                    <span className="text-2xl">{s.icon}</span>
                    <p className="text-xs font-bold text-gray-700 group-hover:text-pink-600 transition-colors">{s.label}</p>
                    <p className="text-[10px] text-gray-400">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Tech Stack ── */}
        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-fade-in">
            <div className="w-full max-w-xl mx-auto">
              <button onClick={() => setStep(0)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-pink-500 transition-colors mb-6 font-medium">
                <ArrowLeft className="w-4 h-4" /> Edit prompt
              </button>
              <div className="glass border border-white/40 rounded-2xl px-4 py-3 mb-8 flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">💬</span>
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{prompt}</p>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-2">Pick your tech stack</h2>
                <p className="text-gray-500 text-sm">What framework should DANI use?</p>
              </div>

              <div className="space-y-3">
                {TECH_PRESETS.map(preset => (
                  <button key={preset.id} onClick={() => setTechPreset(preset.id)}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                      techPreset === preset.id
                        ? 'glass border-pink-400/60 shadow-lg shadow-pink-200/30'
                        : 'glass border-white/40 hover:border-pink-200/60'
                    }`}>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${preset.color} flex items-center justify-center text-xl shadow-md flex-shrink-0`}>
                      {preset.emoji}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black text-gray-800">{preset.short}</p>
                      <p className="text-xs text-gray-500">{preset.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{preset.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      techPreset === preset.id ? 'bg-gradient-to-br from-pink-500 to-purple-600 border-pink-400' : 'border-gray-300'
                    }`}>
                      {techPreset === preset.id && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              <button onClick={() => setStep(2)}
                className="w-full mt-6 flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black text-base shadow-xl shadow-pink-400/30 hover:from-pink-600 hover:to-purple-700 transition-all">
                Next — Choose Model <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Model Selection ── */}
        {step === 2 && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-fade-in">
            <div className="w-full max-w-xl mx-auto">
              <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-pink-500 transition-colors mb-6 font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to stack
              </button>

              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-2">Choose your AI model</h2>
                <p className="text-gray-500 text-sm">Different models, different powers 💫</p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 mb-4 px-4 py-3 glass border border-red-200 rounded-2xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 flex-1">{error}</p>
                  <button onClick={() => setError('')}><X className="w-4 h-4 text-gray-400" /></button>
                </div>
              )}

              <div className="space-y-3">
                {MODELS.map((m, idx) => {
                  const Icon = m.icon;
                  const active = model === m.id;
                  return (
                    <button key={m.id} onClick={() => setModel(m.id)}
                      className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                        active ? 'glass shadow-lg border-pink-400/60 shadow-pink-200/30' : 'glass border-white/40 hover:border-pink-200/60'
                      }`}>
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-black text-gray-800">{m.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${m.badgeColor}`}>{m.badge}</span>
                          {idx === 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold">⭐ Top</span>}
                        </div>
                        <p className="text-xs font-semibold text-gray-600">{m.tagline}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-sm font-black text-gray-700">{m.cost} 🪙</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          active ? 'bg-gradient-to-br from-pink-500 to-purple-600 border-pink-400' : 'border-gray-300'
                        }`}>
                          {active && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-xs text-gray-400">
                  Balance: <span className="font-bold text-gray-700">{coins === null ? '—' : coins.toLocaleString()} coins</span>
                </p>
                <button onClick={() => setShowPlans(true)} className="text-xs font-bold text-pink-500 hover:underline">
                  Get more coins →
                </button>
              </div>

              <button
                onClick={handleGenerate}
                disabled={coins !== null && coins < selectedModel.cost}
                className="w-full mt-6 flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black text-base shadow-xl shadow-pink-400/30 hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5" />
                Build with {selectedModel.name} · {selectedModel.cost} 🪙
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Generating + Results ── */}
        {step === 3 && (
          <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">

            {/* Generating state */}
            {isGenerating && (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Live code stream — clean monochrome terminal */}
                <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0a0a0a' }}>
                  {/* Terminal chrome */}
                  <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ background: '#111', borderBottom: '1px solid #222' }}>
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                    </div>
                    <span className="text-xs font-mono ml-2" style={{ color: '#666' }}>dani — writing your code</span>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse inline-block" />
                      <span className="text-xs font-mono" style={{ color: '#444' }}>{selectedPreset.label}</span>
                    </div>
                  </div>
                  <pre
                    ref={genStreamRef}
                    className="flex-1 overflow-y-auto p-6 text-sm font-mono leading-6 whitespace-pre-wrap break-words"
                    style={{ color: '#e2e8f0', scrollbarWidth: 'none' }}
                  >
                    {streamDisplayed}
                    {!streamDone && <span className="inline-block w-2 h-4 bg-white ml-0.5 align-text-bottom animate-pulse" style={{ opacity: 0.8 }} />}
                  </pre>
                </div>

                {/* Status sidebar */}
                <div className="lg:w-72 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-white/30 glass flex flex-col items-center justify-center gap-6 p-8">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 animate-pulse shadow-2xl shadow-purple-400/40" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 animate-ping opacity-20" />
                    <div className="absolute inset-4 rounded-full glass flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-black text-gray-800 text-lg">Building... ✨</p>
                    <p className="text-sm font-semibold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mt-1">
                      {selectedModel.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">{selectedPreset.label}</p>
                    <p className="text-xs text-gray-400">{selectedModel.cost} coins · ~15 seconds</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results state */}
            {!isGenerating && hasFiles && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-2 glass border-b border-white/30 flex-shrink-0">
                  <button onClick={() => setStep(0)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-pink-500 transition-colors font-medium mr-1">
                    <Plus className="w-3.5 h-3.5" /> New
                  </button>

                  {/* File tabs */}
                  <div className="flex items-center gap-1 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {generatedFiles.map((f, i) => (
                      <button key={i} onClick={() => setSelectedFileIdx(i)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex-shrink-0 ${
                          selectedFileIdx === i
                            ? 'bg-gradient-to-r from-pink-500/15 to-purple-500/15 text-pink-700 border border-pink-300/40'
                            : 'text-gray-500 hover:text-gray-700 hover:glass hover:border hover:border-white/40'
                        }`}>
                        <FileCode className="w-3 h-3" />
                        {f.path}
                      </button>
                    ))}
                  </div>

                  {/* View mode */}
                  <div className="flex items-center bg-white/60 rounded-lg p-0.5 gap-0.5 flex-shrink-0 border border-white/40">
                    {(['code', 'split', 'preview'] as const).map(v => (
                      <button key={v} onClick={() => setViewMode(v)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                          viewMode === v ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        {v === 'code' && <Code2 className="w-3 h-3" />}
                        {v === 'preview' && <Eye className="w-3 h-3" />}
                        {v === 'code' ? 'Code' : v === 'split' ? 'Split' : 'Preview'}
                      </button>
                    ))}
                  </div>

                  {currentFile && <CopyBtn text={currentContent} />}
                </div>

                {/* Editor + Preview */}
                <div className="flex-1 flex overflow-hidden">
                  {(viewMode === 'code' || viewMode === 'split') && (
                    <div
                      className={`flex flex-col overflow-hidden ${viewMode === 'split' ? 'w-1/2 border-r border-white/20' : 'flex-1'}`}
                      style={{ background: '#0a0a0a' }}
                    >
                      {/* Editor chrome */}
                      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0" style={{ background: '#111', borderBottom: '1px solid #222' }}>
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
                        </div>
                        <span className="text-xs font-mono ml-1" style={{ color: '#555' }}>{currentFile?.path}</span>
                      </div>
                      <textarea
                        value={currentContent}
                        onChange={e => { if (currentFile) setEditedContents(prev => ({ ...prev, [currentFile.path]: e.target.value })); }}
                        className="flex-1 bg-transparent font-mono text-xs sm:text-[13px] p-5 resize-none focus:outline-none leading-relaxed w-full"
                        style={{ color: '#e2e8f0', caretColor: '#fff' }}
                        spellCheck={false}
                      />
                    </div>
                  )}

                  {(viewMode === 'preview' || viewMode === 'split') && (
                    <div className={`flex flex-col overflow-hidden ${viewMode === 'split' ? 'w-1/2' : 'flex-1'}`}>
                      <div className="flex items-center gap-2 px-3 py-2 glass border-b border-white/30 flex-shrink-0">
                        <div className="flex gap-1">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
                        </div>
                        <div className="flex-1 flex items-center gap-2 bg-white/60 rounded-lg px-3 py-1 border border-white/40">
                          <Globe className="w-3 h-3 text-gray-400" />
                          <span className="text-[11px] font-mono text-gray-500 truncate">{projectName.replace(/-/g, ' ')}</span>
                        </div>
                        <button
                          onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(previewHTML); w.document.close(); } }}
                          className="p-1.5 glass rounded-lg hover:bg-white/60 transition-all border border-white/30"
                          title="Open in new tab">
                          <Globe className="w-3.5 h-3.5 text-pink-500" />
                        </button>
                      </div>
                      <iframe
                        srcDoc={previewHTML}
                        className="flex-1 w-full border-0 bg-white"
                        title="Preview"
                        sandbox="allow-scripts allow-forms allow-same-origin"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* If error on step 3 (no files) */}
            {!isGenerating && !hasFiles && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="glass rounded-3xl border border-white/40 p-10 text-center max-w-sm">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-800 mb-2">Something went wrong</h3>
                  <p className="text-sm text-gray-500 mb-6">{error || 'Generation failed. Please try again.'}</p>
                  <button onClick={() => { setStep(2); setError(''); }}
                    className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold shadow-lg">
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
