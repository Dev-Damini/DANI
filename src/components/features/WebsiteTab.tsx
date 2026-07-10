import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, Globe, FileCode, Loader2, AlertCircle, Eye, Code2,
  Crown, X, Copy, Check, Plus, Trash2, Download,
  Share2, ChevronRight, Coins, CheckCircle,
  Menu, ArrowLeft, Wand2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useTheme } from '@/App';

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
  { id: 'react-ts', label: 'TypeScript · React', short: 'React TS', emoji: '⚡', desc: 'Modern, type-safe', color: 'from-cyan-400 to-blue-500', stack: ['react', 'typescript'] },
  { id: 'react-js', label: 'JavaScript · React', short: 'React JS', emoji: '⚛️', desc: 'Fast and flexible', color: 'from-yellow-400 to-orange-500', stack: ['react', 'javascript'] },
  { id: 'vanilla', label: 'HTML · CSS · JS', short: 'HTML/JS', emoji: '🌐', desc: 'Pure, universal', color: 'from-orange-400 to-pink-500', stack: ['html', 'css', 'javascript'] },
] as const;
type TechPresetId = typeof TECH_PRESETS[number]['id'];

// ─── Single Model ─────────────────────────────────────────────────────────────
const MODEL = { id: 'dani-aq', name: 'DANI AQ', tagline: 'Powered by Gemini', cost: 10 };

// ─── Date grouping ────────────────────────────────────────────────────────────
function groupProjectsByDate(projects: Project[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);
  const groups: { label: string; items: Project[] }[] = [
    { label: 'Today', items: [] }, { label: 'Yesterday', items: [] },
    { label: 'Last 7 days', items: [] }, { label: 'Older', items: [] },
  ];
  projects.forEach(p => {
    const d = new Date(p.createdAt);
    if (d >= today) groups[0].items.push(p);
    else if (d >= yesterday) groups[1].items.push(p);
    else if (d >= sevenDaysAgo) groups[2].items.push(p);
    else groups[3].items.push(p);
  });
  return groups.filter(g => g.items.length > 0);
}

// ─── React CDN Preview ────────────────────────────────────────────────────────
function stripTypeScript(code: string): string {
  return code
    .replace(/^import\s+type\s+.*?;?\s*$/gm, '')
    .replace(/^interface\s+\w+[^{]*\{[^}]*\}/gm, '')
    .replace(/^type\s+\w+\s*=\s*[^;]+;/gm, '')
    .replace(/:\s*(string|number|boolean|void|null|undefined|React\.FC|React\.ReactNode|any|unknown|never)\b(\s*\[\])?/g, '')
    .replace(/\s+as\s+\w+(\[\])?/g, '')
    .replace(/:\s*React\.\w+(?:<[^>]*>)?/g, '')
    .replace(/!(?=[.\[(])/g, '')
    .trim();
}

function buildReactPreviewHTML(files: GeneratedFile[], editedContents: Record<string, string>, preset: TechPresetId): string {
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
  const appFile = files.find(f => f.path.endsWith('App.tsx') || f.path.endsWith('App.jsx') || f.path.endsWith('App.js'));
  const cssFile = files.find(f => f.path.endsWith('index.css') || f.path.endsWith('.css'));
  const appContent = editedContents[appFile?.path ?? ''] ?? appFile?.content ?? '';
  const cssContent = editedContents[cssFile?.path ?? ''] ?? cssFile?.content ?? '';

  // Check if the index.html already has CDN scripts (Gemini might generate a complete HTML)
  const indexHtml = files.find(f => f.path === 'index.html');
  if (indexHtml) {
    const htmlContent = editedContents['index.html'] ?? indexHtml.content;
    if (htmlContent.includes('react.development.js') || htmlContent.includes('unpkg.com/react')) {
      // Already has CDN — inject CSS and return as-is
      let h = htmlContent;
      if (cssFile && !htmlContent.includes(cssContent.slice(0, 30))) {
        h = h.replace('</head>', `<style>${cssContent}</style></head>`);
      }
      return h;
    }
  }

  let jsxCode = appContent
    .replace(/^import\s+.*?from\s+['"]react['"]\s*;?\s*$/gm, '')
    .replace(/^import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '');
  if (preset === 'react-ts') jsxCode = stripTypeScript(jsxCode);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview</title><style>*{box-sizing:border-box}body{margin:0}${cssContent}</style></head><body><div id="root"></div><script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script><script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script><script type="text/babel" data-presets="react">const{useState,useEffect,useCallback,useRef,useMemo,useContext,createContext,useReducer}=React;${jsxCode}
try{ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));}catch(e){document.getElementById('root').innerHTML='<div style="padding:20px;color:red;font-family:monospace">Preview error: '+e.message+'</div>';}</script></body></html>`;
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyBtn({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`p-1.5 rounded-lg hover:opacity-80 transition-all border ${className}`}
      style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-muted)' }}>
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" onClick={onClose}>
      <div className="rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in border"
        style={{ background: 'var(--bg-2)', borderColor: 'var(--border-normal)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Share2 className="w-4 h-4 text-pink-500" /> Share Your Build
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg border"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="rounded-xl px-3 py-2.5 flex items-center gap-2 mb-3 border"
          style={{ background: 'var(--glass-bg)', borderColor: 'rgba(236,72,153,0.3)' }}>
          <Globe className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
          <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{url}</span>
          <button onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex-shrink-0 px-2.5 py-1 text-white rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
            {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
        <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>Anyone with this link can view your website 🌸</p>
      </div>
    </div>
  );
}

// ─── Streaming animation ──────────────────────────────────────────────────────
function useCodeStream(targetContent: string, isActive: boolean) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (!isActive || !targetContent) { setDisplayed(''); setDone(false); return; }
    setDisplayed(''); setDone(false);
    let idx = 0;
    const CHUNK = 28;
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function WebsiteTab() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [techPreset, setTechPreset] = useState<TechPresetId>('react-ts');
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
  const [shareUrl, setShareUrl] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [dailyBonus, setDailyBonus] = useState(0);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const genStreamRef = useRef<HTMLPreElement>(null);
  const selectedPreset = TECH_PRESETS.find(t => t.id === techPreset)!;
  const hasFiles = generatedFiles.length > 0;
  const currentFile = generatedFiles[selectedFileIdx];
  const currentContent = currentFile ? (editedContents[currentFile.path] ?? currentFile.content) : '';
  const { displayed: streamDisplayed, done: streamDone } = useCodeStream(genStreamContent, isGenerating && genStreamContent.length > 0);

  useEffect(() => {
    if (genStreamRef.current) genStreamRef.current.scrollTop = genStreamRef.current.scrollHeight;
  }, [streamDisplayed]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase.from('user_credits').select('balance').eq('user_id', session.user.id).single();
        setCoins(data?.balance ?? 500);
      }
    });
    try {
      const saved = localStorage.getItem('dani-vibe-projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setProjects(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const saveProject = useCallback((name: string, desc: string, preset: string, files: GeneratedFile[]): string => {
    const id = Date.now().toString();
    const project: Project = { id, name, description: desc, model: MODEL.id, techPreset: preset, files, createdAt: new Date().toISOString() };
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

  const handleGenerate = async () => {
    const p = prompt.trim();
    if (!p) return;
    if (coins !== null && coins < MODEL.cost) { setError(`Need ${MODEL.cost} coins — you have ${coins}.`); return; }
    setStep(3); setIsGenerating(true); setError('');
    setGeneratedFiles([]); setEditedContents({}); setShareUrl('');

    const phases = [
      `▸ Starting DANI AQ...\n`,
      `▸ Reading: "${p.slice(0, 55)}${p.length > 55 ? '...' : ''}"\n`,
      `▸ Stack: ${selectedPreset.label}\n`,
      `▸ Planning architecture...\n`,
      `▸ Writing ${selectedPreset.stack.includes('react') ? 'React components' : 'HTML/CSS/JS'}...\n`,
      `▸ Adding styles & animations...\n`,
      `▸ Building interactivity...\n`,
      `▸ Final polish...\n`,
    ];
    let builtPhases = phases[0];
    setGenStreamContent(builtPhases);
    let phaseIdx = 0;
    const interval = setInterval(() => {
      phaseIdx = Math.min(phaseIdx + 1, phases.length - 1);
      builtPhases += phases[phaseIdx];
      setGenStreamContent(builtPhases);
    }, 2000);

    try {
      const techStack = selectedPreset.stack as unknown as string[];
      const { data, error: fnErr } = await supabase.functions.invoke('create-website', {
        body: { description: p, techStack, model: MODEL.id }
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
      if (files.length > 0) setGenStreamContent(`▸ Done! ✓\n\n// ${files[0].path}\n\n${files[0].content.slice(0, 400)}`);
      setGeneratedFiles(files);
      setProjectName(name);
      if (data.newBalance != null) setCoins(data.newBalance);
      if (data.dailyRefreshGranted > 0) setDailyBonus(data.dailyRefreshGranted);
      const newId = saveProject(name, p, techPreset, files);
      setActiveProjectId(newId);
      setSelectedFileIdx(0);
      setViewMode('preview');
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!hasFiles) return;
    setIsSharing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const htmlContent = buildReactPreviewHTML(generatedFiles, editedContents, techPreset);
      const { data, error } = await supabase.from('shared_websites').insert({
        user_id: session?.user?.id ?? null, project_name: projectName, html_content: htmlContent, model: MODEL.id,
      }).select('id').single();
      if (error) throw error;
      setShareUrl(`${window.location.origin}/share?id=${data.id}`);
      setShowShare(true);
    } catch { setError('Failed to generate share link'); }
    finally { setIsSharing(false); }
  };

  const handleDownload = () => {
    const enc = new TextEncoder();
    const chunks: Uint8Array[] = []; const cd: Uint8Array[] = []; let offset = 0;
    generatedFiles.forEach(f => {
      const content = enc.encode(editedContents[f.path] ?? f.content);
      const name = enc.encode(f.path);
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
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, generatedFiles.length, true);
    ev.setUint16(10, generatedFiles.length, true); ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
    const blob = new Blob([...chunks, ...cd, eocd], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${projectName || 'project'}.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  const previewHTML = useMemo(() => {
    if (!hasFiles) return '';
    return buildReactPreviewHTML(generatedFiles, editedContents, techPreset);
  }, [generatedFiles, editedContents, hasFiles, techPreset]);

  const groupedProjects = groupProjectsByDate(projects);
  const bgColor = isDark ? '#09090f' : '#f8f8ff';
  const sidebarBg = isDark ? '#0c0c18' : '#ffffff';
  const terminalBg = isDark ? '#0a0a0a' : '#1a1a2e';

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: bgColor }}>
      {showShare && shareUrl && <ShareModal url={shareUrl} onClose={() => setShowShare(false)} />}

      {dailyBonus > 0 && (
        <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <span className="text-xl">🎉</span>
          <div><p className="font-bold text-sm">Daily refresh!</p><p className="text-xs text-green-100">+{dailyBonus} coins</p></div>
          <button onClick={() => setDailyBonus(0)}><X className="w-4 h-4 text-green-200" /></button>
        </div>
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <aside className="relative z-50 w-72 flex flex-col border-r shadow-2xl animate-fade-in h-full"
            style={{ background: sidebarBg, borderColor: 'var(--border-normal)' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-6 pb-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Vibe Code</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Your projects</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg border transition-all"
                style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl border"
                style={{ background: 'var(--glass-bg)', borderColor: 'rgba(234,179,8,0.25)' }}>
                <span className="text-lg">🪙</span>
                <div className="flex-1 text-left">
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Balance</p>
                  <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                    {coins === null ? '—' : coins.toLocaleString()} <span className="text-yellow-500 text-xs">coins</span>
                  </p>
                </div>
              </div>
              <button onClick={startNew}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-white text-sm font-bold shadow-md"
                style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                <Plus className="w-4 h-4" /> New Project
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
              {projects.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Globe className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No projects yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Build something to see it here</p>
                </div>
              ) : (
                groupedProjects.map(group => (
                  <div key={group.label}>
                    <p className="text-[10px] font-bold uppercase tracking-wider px-2 mb-2" style={{ color: 'var(--text-muted)' }}>{group.label}</p>
                    <div className="space-y-1">
                      {group.items.map(p => (
                        <div key={p.id} onClick={() => loadProject(p)}
                          className="group relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-80"
                          style={{
                            background: activeProjectId === p.id ? 'rgba(236,72,153,0.1)' : 'transparent',
                            border: `1px solid ${activeProjectId === p.id ? 'rgba(236,72,153,0.3)' : 'transparent'}`,
                          }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: activeProjectId === p.id ? '#ec4899' : 'var(--text-secondary)' }}>
                              {p.name.replace(/-/g, ' ')}
                            </p>
                            <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.description.slice(0, 45)}…</p>
                          </div>
                          <button onClick={e => deleteProject(p.id, e)}
                            className="flex-shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                            style={{ color: 'var(--text-muted)' }}>
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

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: isDark ? 'rgba(12,12,24,0.95)' : 'rgba(255,255,255,0.95)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => setSidebarOpen(true)}
          className="p-2.5 rounded-xl hover:opacity-80 transition-all border flex-shrink-0"
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-black text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>Vibe Code</span>
          {step === 3 && hasFiles && (
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
              {projectName.replace(/-/g, ' ')}
            </span>
          )}
        </div>
        <div className="flex-1" />

        {/* Tech preset selector */}
        {step < 3 && (
          <div className="hidden sm:flex items-center gap-1 rounded-xl p-1 border"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
            {TECH_PRESETS.map(t => (
              <button key={t.id} onClick={() => setTechPreset(t.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                style={techPreset === t.id
                  ? { background: 'linear-gradient(135deg,#ec4899,#a855f7)', color: 'white' }
                  : { color: 'var(--text-muted)' }}>
                <span>{t.emoji}</span>
                <span className="hidden md:inline">{t.short}</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && hasFiles && (
          <div className="flex items-center gap-2">
            <button onClick={handleShare} disabled={isSharing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>
              <Share2 className="w-3.5 h-3.5 text-pink-500" />{isSharing ? '…' : 'Share'}
            </button>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-xl text-xs font-bold shadow-md"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
              <Download className="w-3.5 h-3.5" />ZIP
            </button>
          </div>
        )}

        <button onClick={() => {}} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all"
          style={{ background: 'var(--glass-bg)', borderColor: 'rgba(234,179,8,0.3)' }}>
          <span className="text-sm">🪙</span>
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{coins === null ? '—' : coins.toLocaleString()}</span>
        </button>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* STEP 0: Prompt */}
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-fade-in">
            <div className="w-full max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 shadow-2xl"
                  style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                  <Wand2 className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black mb-2 shimmer-text">What are we building?</h1>
                <p className="text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>Describe your website or app — DANI writes every line ✨</p>
              </div>

              <div className="rounded-3xl shadow-xl overflow-hidden border-2"
                style={{ background: 'var(--glass-light-bg)', borderColor: 'var(--border-normal)' }}>
                <textarea ref={promptRef} value={prompt} onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && prompt.trim()) setStep(1); }}
                  placeholder="e.g. A beautiful e-commerce store with product grid, shopping cart, and smooth animations..."
                  rows={5} autoFocus
                  className="w-full bg-transparent text-base sm:text-lg leading-relaxed p-6 resize-none focus:outline-none font-medium"
                  style={{ color: 'var(--text-primary)' }} />
                <div className="flex items-center justify-between px-5 pb-5 pt-1 gap-3 flex-wrap">
                  <p className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>⌘↵ to continue</p>
                  <div className="flex gap-2 flex-wrap">
                    {['Portfolio site', 'SaaS dashboard', 'Landing page'].map(s => (
                      <button key={s} onClick={() => setPrompt(s + ' — modern, responsive design with animations')}
                        className="text-xs px-3 py-1.5 rounded-full border font-medium transition-all hover:border-pink-400/50"
                        style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { if (prompt.trim()) setStep(1); }} disabled={!prompt.trim()}
                    className="flex items-center gap-2.5 px-7 py-3.5 text-white rounded-2xl font-black text-base shadow-xl transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                    Next <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: '🛒', label: 'E-commerce', desc: 'Product grid & cart' },
                  { icon: '💼', label: 'Portfolio', desc: 'Projects & contact' },
                  { icon: '📊', label: 'Dashboard', desc: 'Stats & analytics' },
                  { icon: '🎨', label: 'Creative', desc: 'Bold animations' },
                ].map(s => (
                  <button key={s.label}
                    onClick={() => { setPrompt(`${s.label} website — ${s.desc}, modern responsive design with smooth animations`); setTimeout(() => setStep(1), 50); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all group text-center"
                    style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
                    <span className="text-2xl">{s.icon}</span>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{s.label}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Tech + Generate (combined) */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto px-4 py-8 animate-fade-in">
            <div className="w-full max-w-xl mx-auto">
              <button onClick={() => setStep(0)} className="flex items-center gap-1.5 text-sm mb-6 font-medium hover:text-pink-400 transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <ArrowLeft className="w-4 h-4" /> Edit prompt
              </button>

              <div className="rounded-2xl px-4 py-3 mb-8 flex items-start gap-3 border"
                style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
                <span className="text-lg flex-shrink-0 mt-0.5">💬</span>
                <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{prompt}</p>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>Pick your tech stack</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>What framework should DANI use?</p>
              </div>

              <div className="space-y-3">
                {TECH_PRESETS.map(preset => (
                  <button key={preset.id} onClick={() => setTechPreset(preset.id)}
                    className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all"
                    style={{
                      background: 'var(--glass-bg)',
                      borderColor: techPreset === preset.id ? '#ec4899' : 'var(--border-normal)',
                    }}>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${preset.color} flex items-center justify-center text-xl shadow-md flex-shrink-0`}>{preset.emoji}</div>
                    <div className="flex-1 text-left">
                      <p className="font-black" style={{ color: 'var(--text-primary)' }}>{preset.short}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{preset.label} · {preset.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${techPreset === preset.id ? 'border-pink-400' : ''}`}
                      style={techPreset === preset.id ? { background: 'linear-gradient(135deg,#ec4899,#a855f7)' } : { borderColor: 'var(--border-normal)' }}>
                      {techPreset === preset.id && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Model info (single model) */}
              <div className="mt-6 p-4 rounded-2xl border-2 border-pink-400/30 flex items-center gap-4"
                style={{ background: 'rgba(236,72,153,0.06)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-black" style={{ color: 'var(--text-primary)' }}>{MODEL.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-bold"
                      style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>⭐ Only Model</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{MODEL.tagline} · {MODEL.cost} coins per generation</p>
                </div>
                <CheckCircle className="w-5 h-5 text-pink-500 flex-shrink-0" />
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-2xl border"
                  style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400 flex-1">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Balance: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{coins === null ? '—' : coins.toLocaleString()} coins</span>
                </p>
              </div>

              <button onClick={handleGenerate}
                disabled={coins !== null && coins < MODEL.cost}
                className="w-full mt-6 flex items-center justify-center gap-3 py-4 text-white rounded-2xl font-black text-base shadow-xl transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                <Sparkles className="w-5 h-5" />
                Build with {MODEL.name} · {MODEL.cost} 🪙
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Results */}
        {step === 3 && (
          <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">

            {/* Generating */}
            {isGenerating && (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden" style={{ background: terminalBg }}>
                  <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ background: isDark ? '#111' : '#1e1e2e', borderBottom: `1px solid ${isDark ? '#222' : '#2d2d3e'}` }}>
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                    </div>
                    <span className="text-xs font-mono ml-2" style={{ color: '#666' }}>dani — generating your site</span>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse inline-block" />
                      <span className="text-xs font-mono" style={{ color: '#444' }}>{selectedPreset.label}</span>
                    </div>
                  </div>
                  <pre ref={genStreamRef}
                    className="flex-1 overflow-y-auto p-6 text-sm font-mono leading-6 whitespace-pre-wrap break-words"
                    style={{ color: '#e2e8f0', scrollbarWidth: 'none' }}>
                    {streamDisplayed}
                    {!streamDone && <span className="inline-block w-2 h-4 bg-white ml-0.5 align-text-bottom animate-pulse opacity-80" />}
                  </pre>
                </div>
                <div className="lg:w-72 flex-shrink-0 border-t lg:border-t-0 lg:border-l flex flex-col items-center justify-center gap-6 p-8"
                  style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full animate-pulse shadow-2xl"
                      style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7,#3b82f6)' }} />
                    <div className="absolute inset-4 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(10px)' }}>
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Building... ✨</p>
                    <p className="text-sm font-semibold shimmer-text mt-1">{MODEL.name}</p>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{selectedPreset.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{MODEL.cost} coins · ~30–60s</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {!isGenerating && hasFiles && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
                  style={{ background: isDark ? 'rgba(12,12,24,0.9)' : 'rgba(255,255,255,0.9)', borderColor: 'var(--border-subtle)' }}>
                  <button onClick={startNew} className="flex items-center gap-1.5 text-xs font-medium mr-1 hover:text-pink-400 transition-colors"
                    style={{ color: 'var(--text-muted)' }}>
                    <Plus className="w-3.5 h-3.5" /> New
                  </button>
                  <div className="flex items-center gap-1 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {generatedFiles.map((f, i) => (
                      <button key={i} onClick={() => setSelectedFileIdx(i)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex-shrink-0"
                        style={selectedFileIdx === i
                          ? { background: 'rgba(236,72,153,0.15)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.3)' }
                          : { color: 'var(--text-muted)' }}>
                        <FileCode className="w-3 h-3" />{f.path}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center rounded-lg p-0.5 gap-0.5 flex-shrink-0 border"
                    style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
                    {(['code', 'split', 'preview'] as const).map(v => (
                      <button key={v} onClick={() => setViewMode(v)}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1"
                        style={viewMode === v
                          ? { background: 'linear-gradient(135deg,#ec4899,#a855f7)', color: 'white' }
                          : { color: 'var(--text-muted)' }}>
                        {v === 'code' ? <><Code2 className="w-3 h-3" />Code</> : v === 'preview' ? <><Eye className="w-3 h-3" />Preview</> : 'Split'}
                      </button>
                    ))}
                  </div>
                  {currentFile && <CopyBtn text={currentContent} />}
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {(viewMode === 'code' || viewMode === 'split') && (
                    <div className={`flex flex-col overflow-hidden ${viewMode === 'split' ? 'w-1/2 border-r' : 'flex-1'}`}
                      style={{ background: terminalBg, borderColor: 'var(--border-normal)' }}>
                      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0" style={{ background: isDark ? '#111' : '#1e1e2e', borderBottom: `1px solid ${isDark ? '#222' : '#2d2d3e'}` }}>
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
                        </div>
                        <span className="text-xs font-mono ml-1" style={{ color: '#555' }}>{currentFile?.path}</span>
                      </div>
                      <textarea value={currentContent}
                        onChange={e => { if (currentFile) setEditedContents(prev => ({ ...prev, [currentFile.path]: e.target.value })); }}
                        className="flex-1 bg-transparent font-mono text-xs sm:text-[13px] p-5 resize-none focus:outline-none leading-relaxed w-full"
                        style={{ color: '#e2e8f0', caretColor: '#fff' }}
                        spellCheck={false} />
                    </div>
                  )}
                  {(viewMode === 'preview' || viewMode === 'split') && (
                    <div className={`flex flex-col overflow-hidden ${viewMode === 'split' ? 'w-1/2' : 'flex-1'}`}>
                      <div className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0"
                        style={{ background: isDark ? 'rgba(12,12,24,0.9)' : 'white', borderColor: 'var(--border-subtle)' }}>
                        <div className="flex gap-1">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
                        </div>
                        <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-1 border"
                          style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
                          <Globe className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                          <span className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{projectName.replace(/-/g, ' ')}</span>
                        </div>
                        <button onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(previewHTML); w.document.close(); } }}
                          className="p-1.5 rounded-lg border transition-all" title="Open in new tab"
                          style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
                          <Globe className="w-3.5 h-3.5 text-pink-500" />
                        </button>
                      </div>
                      <iframe srcDoc={previewHTML} className="flex-1 w-full border-0 bg-white" title="Preview"
                        sandbox="allow-scripts allow-forms allow-same-origin" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isGenerating && !hasFiles && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="rounded-3xl border p-10 text-center max-w-sm"
                  style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Something went wrong</h3>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{error || 'Generation failed. Please try again.'}</p>
                  <button onClick={() => { setStep(1); setError(''); }}
                    className="px-6 py-3 text-white rounded-2xl font-bold shadow-lg"
                    style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
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
