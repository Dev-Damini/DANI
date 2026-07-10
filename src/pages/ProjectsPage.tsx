import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Trash2, Globe, Calendar, Cpu, Crown, Zap,
  FolderOpen, Plus, Search, X, ExternalLink, Clock, Code2,
  ChevronRight, Sparkles, Filter, Edit3, Link, Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';

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

// ─── Tech Preset config ───────────────────────────────────────────────────────
const TECH_CONFIG: Record<string, { label: string; short: string; emoji: string; color: string }> = {
  'react-ts': { label: 'TypeScript · React · Vite', short: 'React TS', emoji: '⚡', color: 'from-cyan-400 to-blue-500' },
  'react-js': { label: 'JavaScript · React · Vite', short: 'React JS', emoji: '⚛️', color: 'from-yellow-400 to-orange-500' },
  'vanilla':  { label: 'HTML · CSS · JS',          short: 'HTML/CSS/JS', emoji: '🌐', color: 'from-orange-400 to-pink-500' },
};

// ─── Model config ─────────────────────────────────────────────────────────────
const MODEL_CONFIG: Record<string, { name: string; color: string; badge: string; Icon: typeof Crown }> = {
  'dani-5.0':    { name: 'DANI 5.0',    color: 'from-pink-500 to-purple-600',  badge: 'Best',    Icon: Crown },
  'primis-1.20': { name: 'Primis 1.20', color: 'from-blue-500 to-indigo-600',  badge: 'Pro',     Icon: Cpu },
  'lumi-5.3':    { name: 'Lumi 5.3',    color: 'from-yellow-400 to-orange-500',badge: 'Premium', Icon: Zap },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 60) return `${mins || 1}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function groupByDate(projects: Project[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sevenAgo = new Date(today); sevenAgo.setDate(today.getDate() - 7);
  const thirtyAgo = new Date(today); thirtyAgo.setDate(today.getDate() - 30);

  const groups: { label: string; items: Project[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 Days', items: [] },
    { label: 'Last 30 Days', items: [] },
    { label: 'Older', items: [] },
  ];

  projects.forEach(p => {
    const d = new Date(p.createdAt);
    if (d >= today)      groups[0].items.push(p);
    else if (d >= yesterday) groups[1].items.push(p);
    else if (d >= sevenAgo)  groups[2].items.push(p);
    else if (d >= thirtyAgo) groups[3].items.push(p);
    else                     groups[4].items.push(p);
  });

  return groups.filter(g => g.items.length > 0);
}

// ─── Iframe thumbnail preview ─────────────────────────────────────────────────
function ProjectThumbnail({ project }: { project: Project }) {
  const [loaded, setLoaded] = useState(false);

  // Build preview HTML inline (simple vanilla-only approach for thumbnails)
  const previewHTML = (() => {
    const isReact = project.techPreset === 'react-ts' || project.techPreset === 'react-js';
    if (isReact) {
      const appFile = project.files.find(f => f.path.includes('App.'));
      const cssFile = project.files.find(f => f.path.endsWith('.css'));
      const appContent = appFile?.content || '';
      const cssContent = cssFile?.content || '';

      // Strip TS types and imports for CDN preview
      let jsxCode = appContent
        .replace(/^import\s+type\s+.*?;?\s*$/gm, '')
        .replace(/^interface\s+\w+[^{]*\{[^}]*\}/gm, '')
        .replace(/^import\s+.*?from\s+['"]react['"]\s*;?\s*$/gm, '')
        .replace(/^import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
        .replace(/^export\s+default\s+/gm, '')
        .replace(/:\s*(string|number|boolean|void|null|undefined|React\.FC|React\.ReactNode|React\.JSX\.Element|JSX\.Element|any|unknown|never)\b(\s*\[\])?/g, '')
        .replace(/\s+as\s+\w+(\[\])?/g, '')
        .replace(/!(?=[.\[(])/g, '');

      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;overflow:hidden}${cssContent}</style></head><body><div id="root"></div><script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script><script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script><script type="text/babel" data-presets="react">const{useState,useEffect,useCallback,useRef,useMemo}=React;${jsxCode}try{ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App))}catch(e){document.body.innerHTML='<div style="padding:20px;color:red;font-size:12px">'+e.message+'</div>'}</script></body></html>`;
    }

    // Vanilla
    const html = project.files.find(f => f.path === 'index.html');
    const css = project.files.find(f => f.path.endsWith('.css'));
    const js = project.files.find(f => f.path.endsWith('.js') && !f.path.endsWith('.jsx'));
    if (!html) return '';
    let h = html.content;
    if (css) h = h.replace('</head>', `<style>${css.content}</style></head>`);
    if (js) h = h.replace('</body>', `<script>${js.content}</script></body>`);
    return h;
  })();

  return (
    <div className="relative w-full bg-gray-100 overflow-hidden" style={{ height: '180px' }}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-gray-400">Loading preview...</span>
          </div>
        </div>
      )}
      {previewHTML && (
        <iframe
          srcDoc={previewHTML}
          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
          style={{
            width: '300%',
            height: '300%',
            transform: 'scale(0.333)',
            transformOrigin: 'top left',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          onLoad={() => setLoaded(true)}
          sandbox="allow-scripts allow-same-origin"
          title={`Preview: ${project.name}`}
        />
      )}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  onOpen,
  onDelete,
  onDownload,
  onRename,
  onPublicLink,
}: {
  project: Project;
  onOpen: (p: Project) => void;
  onDelete: (id: string) => void;
  onDownload: (p: Project) => void;
  onRename: (id: string, newName: string) => void;
  onPublicLink: (p: Project) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(project.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== project.name) onRename(project.id, trimmed);
    else setNameVal(project.name);
    setEditingName(false);
  };
  const tech = TECH_CONFIG[project.techPreset] || TECH_CONFIG['vanilla'];
  const mdl = MODEL_CONFIG[project.model] || MODEL_CONFIG['dani-5.0'];
  const ModelIcon = mdl.Icon;

  return (
    <div className="group glass border border-white/40 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:border-pink-200/60 transition-all duration-300 flex flex-col">
      {/* Thumbnail */}
      <div className="relative overflow-hidden">
        <ProjectThumbnail project={project} />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onOpen(project)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg hover:from-pink-600 hover:to-purple-700 transition-all transform hover:scale-105"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open in IDE
          </button>
          <button
            onClick={() => onDownload(project)}
            className="p-2 glass border border-white/50 text-white rounded-xl hover:bg-white/30 transition-all"
            title="Download ZIP"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        {/* Tech badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r ${tech.color} text-white text-[10px] font-bold shadow-md`}>
            {tech.emoji} {tech.short}
          </span>
        </div>
        {/* Delete button */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(project.id); }}
          className="absolute top-2 right-2 p-1.5 bg-red-500/80 backdrop-blur-sm text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
          title="Delete project"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col">
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setNameVal(project.name); setEditingName(false); } }}
            className="text-sm font-black text-gray-800 bg-white/80 border border-pink-300 rounded-lg px-2 py-0.5 outline-none w-full mb-1 focus:border-pink-500"
            autoFocus
          />
        ) : (
          <h3
            className="font-black text-gray-800 text-sm truncate leading-tight mb-1 cursor-text group/name flex items-center gap-1"
            onClick={() => { setEditingName(true); setNameVal(project.name); setTimeout(() => nameInputRef.current?.select(), 50); }}
            title="Click to rename"
          >
            {project.name.replace(/-/g, ' ')}
            <Edit3 className="w-3 h-3 text-gray-300 group-hover/name:text-pink-400 transition-colors opacity-0 group-hover/name:opacity-100 flex-shrink-0" />
          </h3>
        )}
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">
          {project.description}
        </p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/40">
          {/* Model pill */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r ${mdl.color} shadow-sm`}>
            <ModelIcon className="w-3 h-3 text-white" />
            <span className="text-[10px] font-bold text-white">{mdl.name}</span>
          </div>
          {/* Date */}
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Clock className="w-3 h-3" />
            {formatDate(project.createdAt)}
          </div>
        </div>

        {/* File count + actions */}
        <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
          <Code2 className="w-3 h-3" />
          {project.files.length} file{project.files.length !== 1 ? 's' : ''}
          <span className="mx-1">·</span>
          {project.files.reduce((sum, f) => sum + f.content.length, 0).toLocaleString()} chars
        </div>
        {/* Quick action row */}
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/30">
          <button onClick={() => onPublicLink(project)}
            className="flex items-center gap-1 px-2 py-1 glass border border-white/40 text-gray-500 hover:text-pink-500 hover:border-pink-300/50 rounded-lg text-[10px] font-semibold transition-all">
            <Link className="w-3 h-3" /> Preview Link
          </button>
          <button onClick={() => onDownload(project)}
            className="flex items-center gap-1 px-2 py-1 glass border border-white/40 text-gray-500 hover:text-purple-500 hover:border-purple-300/50 rounded-lg text-[10px] font-semibold transition-all">
            <Download className="w-3 h-3" /> ZIP
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'react-ts' | 'react-js' | 'vanilla'>('all');
  const [modelFilter, setModelFilter] = useState<'all' | string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [publicLinkCopied, setPublicLinkCopied] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { navigate('/auth'); return; }
      setIsAuthenticated(true);
    });
    // Load from localStorage
    try {
      const saved = localStorage.getItem('dani-vibe-projects');
      if (saved) setProjects(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [navigate]);

  const handleOpen = useCallback((project: Project) => {
    // Store the project to load in Vibe Code, then navigate to chat
    localStorage.setItem('dani-open-project', JSON.stringify(project));
    navigate('/chat', { state: { openVibeCode: true, project } });
  }, [navigate]);

  const handleDelete = useCallback((id: string) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('dani-vibe-projects', JSON.stringify(updated));
      return updated;
    });
    setDeleteConfirm(null);
  }, []);

  const handleRename = useCallback((id: string, newName: string) => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, name: newName } : p);
      localStorage.setItem('dani-vibe-projects', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handlePublicLink = useCallback((project: Project) => {
    // Build a preview URL using base64-encoded HTML
    try {
      const isReact = project.techPreset === 'react-ts' || project.techPreset === 'react-js';
      let previewHTML = '';
      if (isReact) {
        const appFile = project.files.find(f => f.path.includes('App.'));
        const cssFile = project.files.find(f => f.path.endsWith('.css'));
        const appContent = appFile?.content || '';
        const cssContent = cssFile?.content || '';
        let jsxCode = appContent
          .replace(/^import\s+type\s+.*?;?\s*$/gm, '')
          .replace(/^import\s+.*?from\s+['"](react|\.[^'"]+)['"]\s*;?\s*$/gm, '')
          .replace(/^export\s+default\s+/gm, '')
          .replace(/:\s*(string|number|boolean|void|null|undefined|React\.FC|any|unknown|never)\b(\s*\[\])?/g, '')
          .replace(/!(?=[.\[(])/g, '');
        previewHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0}${cssContent}</style></head><body><div id="root"></div><script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script><script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script><script type="text/babel" data-presets="react">const{useState,useEffect,useCallback,useRef}=React;${jsxCode}try{ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App))}catch(e){document.body.innerHTML='<p style="color:red;padding:20px">'+e.message+'</p>'}</script></body></html>`;
      } else {
        const html = project.files.find(f => f.path === 'index.html');
        const css = project.files.find(f => f.path.endsWith('.css'));
        const js = project.files.find(f => f.path.endsWith('.js') && !f.path.endsWith('.jsx'));
        if (!html) return;
        let h = html.content;
        if (css) h = h.replace('</head>', `<style>${css.content}</style></head>`);
        if (js) h = h.replace('</body>', `<script>${js.content}</script></body>`);
        previewHTML = h;
      }
      const b64 = btoa(unescape(encodeURIComponent(previewHTML)));
      const url = `data:text/html;base64,${b64}`;
      // Copy a shareable data URL to clipboard
      navigator.clipboard.writeText(url).then(() => {
        setPublicLinkCopied(project.id);
        setTimeout(() => setPublicLinkCopied(null), 3000);
      });
    } catch (e) {
      console.error('Public link error:', e);
    }
  }, []);

  const handleDownload = useCallback((project: Project) => {
    const enc = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const cd: Uint8Array[] = [];
    let offset = 0;
    project.files.forEach(f => {
      const content = enc.encode(f.content);
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
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, project.files.length, true);
    ev.setUint16(10, project.files.length, true); ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    const blob = new Blob([...chunks, ...cd, eocd], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${project.name || 'project'}.zip`; a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Filtered & searched projects
  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchTech = filter === 'all' || p.techPreset === filter;
    const matchModel = modelFilter === 'all' || p.model === modelFilter;
    return matchSearch && matchTech && matchModel;
  });

  const grouped = groupByDate(filtered);
  const totalChars = projects.reduce((sum, p) => sum + p.files.reduce((s, f) => s + f.content.length, 0), 0);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* ── Header ── */}
      <header className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="p-2.5 glass rounded-xl hover:bg-white/80 transition-all border border-white/30 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <img src={daniLogo} alt="DANI" className="h-8 w-auto" />
          <div className="flex-1">
            <h1 className="font-black text-gray-800 text-base leading-none">My Projects</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Vibe Code history</p>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-black text-gray-800">{projects.length}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Projects</p>
            </div>
            <div className="w-px h-8 bg-white/40" />
            <div className="text-center">
              <p className="text-lg font-black text-gray-800">{(totalChars / 1000).toFixed(0)}k</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Lines</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/chat', { state: { openVibeCode: true } })}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:from-pink-600 hover:to-purple-700 transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Build</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">

        {/* ── Stats row ── */}
        {projects.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Projects', value: projects.length.toString(), icon: FolderOpen, color: 'from-pink-400 to-rose-500' },
              { label: 'React Projects', value: projects.filter(p => p.techPreset?.includes('react')).length.toString(), icon: Code2, color: 'from-cyan-400 to-blue-500' },
              { label: 'DANI 5.0 Builds', value: projects.filter(p => p.model === 'dani-5.0').length.toString(), icon: Crown, color: 'from-purple-400 to-pink-500' },
              { label: 'Code Written', value: `${(totalChars / 1000).toFixed(0)}k chars`, icon: Sparkles, color: 'from-yellow-400 to-orange-500' },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="glass border border-white/40 rounded-2xl p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-800 leading-none">{stat.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Filters ── */}
        {projects.length > 0 && (
          <div className="glass border border-white/40 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 border border-white/40 flex-1">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tech filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {(['all', 'react-ts', 'react-js', 'vanilla'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    filter === f
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                      : 'glass border border-white/40 text-gray-500 hover:text-gray-700'
                  }`}>
                  {f === 'all' ? 'All' : TECH_CONFIG[f]?.short || f}
                </button>
              ))}
            </div>

            {/* View mode */}
            <div className="flex items-center gap-1 bg-white/60 rounded-xl p-1 border border-white/40 self-start flex-shrink-0">
              <button onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'text-gray-500'}`}>
                Grid
              </button>
              <button onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'text-gray-500'}`}>
                List
              </button>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-100 to-purple-100 border border-pink-200/50 flex items-center justify-center mx-auto mb-6">
              <Globe className="w-12 h-12 text-pink-300" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-3">No projects yet</h2>
            <p className="text-gray-500 text-sm max-w-sm mb-8 leading-relaxed">
              Start building with Vibe Code — describe your website and DANI writes every line of code for you ✨
            </p>
            <button
              onClick={() => navigate('/chat', { state: { openVibeCode: true } })}
              className="flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black text-base shadow-xl shadow-pink-400/30 hover:from-pink-600 hover:to-purple-700 transition-all"
            >
              <Sparkles className="w-5 h-5" /> Start Building
            </button>
          </div>
        )}

        {/* ── No results ── */}
        {projects.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No projects match your search</p>
            <button onClick={() => { setSearch(''); setFilter('all'); setModelFilter('all'); }}
              className="mt-3 text-pink-500 text-sm font-semibold hover:underline">Clear filters</button>
          </div>
        )}

        {/* ── Grid/List view ── */}
        {filtered.length > 0 && (
          <div className="space-y-8">
            {grouped.map(group => (
              <div key={group.label}>
                {/* Date group header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-pink-500" />
                    <h2 className="font-black text-gray-800">{group.label}</h2>
                    <span className="text-xs text-gray-400 font-normal">({group.items.length})</span>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-pink-200/60 to-transparent" />
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.items.map(project => (
                      <div key={project.id} className="relative">
                        {publicLinkCopied === project.id && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-bold shadow-lg whitespace-nowrap animate-fade-in">
                            <Check className="w-3 h-3" /> Preview link copied!
                          </div>
                        )}
                        <ProjectCard
                        project={project}
                        onOpen={handleOpen}
                        onDelete={(id) => setDeleteConfirm(id)}
                        onDownload={handleDownload}
                        onRename={handleRename}
                        onPublicLink={handlePublicLink}
                      /></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {group.items.map((project) => {  // list view
                      const tech = TECH_CONFIG[project.techPreset] || TECH_CONFIG['vanilla'];
                      const mdl = MODEL_CONFIG[project.model] || MODEL_CONFIG['dani-5.0'];
                      const ModelIcon = mdl.Icon;
                      return (
                        <div key={project.id}
                          className="glass border border-white/40 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-pink-200/60 hover:shadow-md transition-all group">
                          {/* Tech icon */}
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tech.color} flex items-center justify-center text-lg flex-shrink-0 shadow-md`}>
                            {tech.emoji}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-gray-800 text-sm truncate">{project.name.replace(/-/g, ' ')}</p>
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${mdl.color} flex-shrink-0`}>
                                <ModelIcon className="w-2.5 h-2.5 text-white" />
                                <span className="text-[9px] font-bold text-white">{mdl.name}</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{project.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Code2 className="w-3 h-3" />{project.files.length} files
                              </span>
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{formatDate(project.createdAt)}
                              </span>
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                            <button onClick={() => handleOpen(project)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:from-pink-600 hover:to-purple-700 transition-all">
                              <ExternalLink className="w-3.5 h-3.5" /> Open
                            </button>
                            <button onClick={() => handlePublicLink(project)}
                              className="p-2 glass border border-white/40 text-gray-500 hover:text-blue-500 rounded-xl transition-all" title="Copy preview link">
                              <Link className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDownload(project)}
                              className="p-2 glass border border-white/40 text-gray-500 hover:text-pink-500 rounded-xl transition-all" title="Download ZIP">
                              <Download className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteConfirm(project.id)}
                              className="p-2 glass border border-white/40 text-gray-500 hover:text-red-500 rounded-xl transition-all" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── CTA at bottom if there are projects ── */}
        {projects.length > 0 && (
          <div className="mt-12 glass border border-white/40 rounded-3xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-pink-400/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Build something new?</h3>
            <p className="text-gray-500 text-sm mb-6">DANI's ready to write your next website from scratch ✨</p>
            <button
              onClick={() => navigate('/chat', { state: { openVibeCode: true } })}
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black text-base shadow-xl shadow-pink-400/30 hover:from-pink-600 hover:to-purple-700 transition-all"
            >
              <Plus className="w-5 h-5" /> Start New Build <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="glass border border-white/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-black text-gray-800 text-lg mb-2">Delete Project?</h3>
              <p className="text-sm text-gray-500 mb-6">This project will be permanently removed from your history.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 glass border border-white/40 rounded-xl text-gray-600 font-semibold text-sm hover:bg-white/80 transition-all">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold text-sm shadow-md hover:from-red-600 hover:to-red-700 transition-all">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
