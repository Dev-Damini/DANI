import { useState, useRef } from 'react';
import {
  Video, Play, Download, Sparkles, Loader2, X, Film,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface GeneratedVideo {
  id: string;
  prompt: string;
  videoUrl: string;
  createdAt: Date;
}

const SUGGESTIONS = [
  'A cinematic sunset over a neon-lit city skyline',
  'A magical forest with glowing butterflies and fireflies',
  'An astronaut floating through colorful nebulae in space',
  'A futuristic car racing through a cyberpunk city at night',
  'Ocean waves crashing on a beautiful tropical beach',
  'A time-lapse of cherry blossoms blooming in spring',
];

const PHASES = [
  { label: 'Interpreting your scene...', icon: '🎬' },
  { label: 'Building visual frames...', icon: '🖼️' },
  { label: 'Generating motion sequences...', icon: '⚡' },
  { label: 'Rendering final output...', icon: '✨' },
  { label: 'Almost ready...', icon: '🌟' },
];

// ─── Cinematic Progress Overlay ───────────────────────────────────────────────
function VideoProgress({ prompt, progress, phase }: { prompt: string; progress: number; phase: number }) {
  return (
    <div className="glass-card rounded-2xl border border-white/08 overflow-hidden animate-fade-in">
      {/* Film strip header */}
      <div className="flex items-center gap-0 h-8 overflow-hidden" style={{ background: '#111' }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-1 h-full border-r border-black"
            style={{ background: i % 2 === 0 ? '#1a1a1a' : '#111' }} />
        ))}
      </div>

      <div className="p-6">
        {/* Animated cinema screen */}
        <div className="relative rounded-xl overflow-hidden mb-6" style={{ background: '#000', aspectRatio: '16/9', maxHeight: '160px' }}>
          {/* Scan lines effect */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
            zIndex: 2,
          }} />
          {/* Color bars animation */}
          <div className="absolute inset-0 flex" style={{ opacity: 0.6 }}>
            {['#ec4899','#a855f7','#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444'].map((c, i) => (
              <div key={i} className="flex-1 animate-pulse" style={{
                background: c,
                animationDelay: `${i * 150}ms`,
                animationDuration: `${0.8 + i * 0.1}s`,
              }} />
            ))}
          </div>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="text-3xl mb-2 animate-bounce">{PHASES[phase]?.icon || '🎬'}</div>
            <p className="text-white/90 text-xs font-bold tracking-widest uppercase">RENDERING</p>
          </div>
          {/* Progress stripe */}
          <div className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#ec4899,#a855f7,#3b82f6)' }} />
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative w-12 h-12 flex-shrink-0">
            <div className="absolute inset-0 rounded-2xl animate-pulse"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#a855f7,#ec4899)' }} />
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white mb-0.5">Rendering your video...</p>
            <p className="text-xs text-gray-600 truncate">"{prompt.slice(0, 55)}{prompt.length > 55 ? '...' : ''}"</p>
          </div>
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
        </div>

        {/* Phase + progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 animate-pulse">{PHASES[phase]?.label}</p>
            <p className="text-xs font-mono text-blue-400 font-bold">{Math.round(progress)}%</p>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#3b82f6,#a855f7,#ec4899)' }}>
              <div className="absolute inset-0 animate-pulse" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)' }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{ background: i <= phase ? 'linear-gradient(90deg,#ec4899,#a855f7)' : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
          <p className="text-[11px] text-gray-700 text-center">High quality rendering takes 60–120 seconds</p>
        </div>
      </div>

      {/* Bottom film strip */}
      <div className="flex items-center gap-0 h-8 overflow-hidden" style={{ background: '#111' }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-1 h-full border-r border-black"
            style={{ background: i % 2 === 0 ? '#1a1a1a' : '#111' }} />
        ))}
      </div>
    </div>
  );
}

export default function VideoTab() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const phaseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startProgress = () => {
    let p = 0; let ph = 0;
    setProgress(0); setPhase(0);
    phaseIntervalRef.current = setInterval(() => {
      p = Math.min(p + Math.random() * 1.0 + 0.2, 88);
      ph = Math.min(Math.floor(p / 20), PHASES.length - 1);
      setProgress(p); setPhase(ph);
    }, 600);
  };

  const stopProgress = (success: boolean) => {
    if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    if (success) { setProgress(100); setPhase(PHASES.length - 1); }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    const p = prompt.trim();
    setCurrentPrompt(p);
    setPrompt('');
    setIsGenerating(true);
    setError('');
    startProgress();

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-video-ai', {
        body: { prompt: p }
      });
      if (fnErr) {
        let msg = fnErr.message;
        if (fnErr instanceof FunctionsHttpError) {
          try { const t = await fnErr.context?.text(); msg = t || msg; } catch { /* ignore */ }
        }
        throw new Error(msg);
      }
      const videoUrl = data?.video_url;
      if (!videoUrl) throw new Error('No video returned');
      stopProgress(true);
      setVideos(prev => [{ id: Date.now().toString(), prompt: p, videoUrl, createdAt: new Date() }, ...prev]);
    } catch (err) {
      stopProgress(false);
      setError(err instanceof Error ? err.message : 'Video generation failed');
    } finally {
      setIsGenerating(false);
      setTimeout(() => { setProgress(0); setPhase(0); }, 1500);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto surface-0">
      <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#a855f7,#ec4899)' }}>
              <Film className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">AI Video Generator</h1>
          <p className="text-sm text-gray-600">Describe a scene — DANI renders it as video 🎬</p>
        </div>

        {/* Input */}
        <div className="glass-card rounded-2xl border border-white/08 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-gray-300">Describe your video</span>
            </div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
              placeholder="e.g. A cinematic drone shot flying over a misty mountain valley at golden hour, 4K quality..."
              rows={3} disabled={isGenerating}
              className="w-full bg-transparent text-white placeholder-gray-700 text-sm leading-relaxed resize-none focus:outline-none disabled:opacity-50" />
          </div>

          {error && (
            <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400 flex-1">{error}</p>
              <button onClick={() => setError('')}><X className="w-3 h-3 text-red-500" /></button>
            </div>
          )}

          <div className="flex items-center justify-between px-5 pb-5 gap-3">
            <div className="flex items-center gap-2 text-[11px] text-gray-700">
              <Clock className="w-3.5 h-3.5" />
              <span>~60–120 seconds</span>
            </div>
            <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: !prompt.trim() || isGenerating ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#3b82f6,#a855f7)' }}>
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Rendering...</> : <><Video className="w-4 h-4" />Generate</>}
            </button>
          </div>
        </div>

        {/* Suggestions */}
        <div>
          <p className="text-[11px] text-gray-700 font-semibold uppercase tracking-wider mb-2">Scene ideas</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.slice(0, 4).map(s => (
              <button key={s} onClick={() => setPrompt(s)} disabled={isGenerating}
                className="text-xs px-3 py-2 glass-card rounded-full border border-white/08 text-gray-600 hover:text-gray-300 hover:border-blue-500/25 transition-all font-medium disabled:opacity-40">
                {s.length > 40 ? s.slice(0, 40) + '...' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Progress */}
        {isGenerating && <VideoProgress prompt={currentPrompt} progress={progress} phase={phase} />}

        {/* Gallery */}
        {videos.length > 0 && !isGenerating && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-600 font-bold uppercase tracking-wider">Generated ({videos.length})</p>
              {videos.length > 1 && (
                <button onClick={() => setVideos([])} className="text-[11px] text-gray-700 hover:text-red-400 transition-all flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            {videos.map(vid => (
              <div key={vid.id} className="glass-card rounded-2xl border border-white/08 overflow-hidden">
                <div className="relative bg-black">
                  <video src={vid.videoUrl} controls className="w-full max-h-[400px] object-contain block" />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full pointer-events-none">
                    <span className="text-xs font-black tracking-widest shimmer-text">DANI</span>
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <p className="flex-1 text-xs text-gray-500 italic truncate">🎬 "{vid.prompt.slice(0, 70)}{vid.prompt.length > 70 ? '...' : ''}"</p>
                  <button onClick={() => { const a = document.createElement('a'); a.href = vid.videoUrl; a.download = `dani-video-${vid.id}.mp4`; a.click(); }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#3b82f6,#a855f7)' }}>
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button onClick={() => setVideos(prev => prev.filter(v => v.id !== vid.id))}
                    className="flex-shrink-0 p-2 rounded-xl glass-card border border-white/08 text-gray-600 hover:text-red-400 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {videos.length === 0 && !isGenerating && (
          <div className="text-center py-14">
            <div className="w-16 h-16 rounded-3xl glass-card border border-white/08 flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-gray-700" />
            </div>
            <p className="text-sm text-gray-600">Your generated videos appear here</p>
            <p className="text-xs text-gray-700 mt-1">Describe any scene above ↑</p>
          </div>
        )}
      </div>
    </div>
  );
}
