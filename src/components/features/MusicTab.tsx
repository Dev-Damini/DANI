import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Music, Play, Pause, Download, Sparkles, Loader2, X, Mic2,
  Volume2, VolumeX, SkipBack, RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface Track {
  id: string;
  prompt: string;
  audioUrl: string;
  title: string;
  createdAt: Date;
  duration?: number;
}

const SUGGESTIONS = [
  'Upbeat electronic dance with funky synths',
  'Lo-fi hip hop for late night coding',
  'Epic cinematic orchestral battle theme',
  'Acoustic chill vibes with soft piano',
  'Dark ambient atmospheric soundscape',
  'Pop song about chasing your dreams',
];

// ─── Waveform Visualizer ──────────────────────────────────────────────────────
function WaveformVisualizer({ isPlaying, barCount = 40 }: { isPlaying: boolean; barCount?: number }) {
  const heights = useRef<number[]>(
    Array.from({ length: barCount }, (_, i) => {
      const v = [30, 55, 75, 60, 40, 85, 55, 35, 65, 78, 48, 58, 72, 42, 62, 82, 38, 58, 48, 68,
                  52, 70, 45, 78, 35, 55, 70, 40, 65, 80, 42, 60, 75, 45, 65, 88, 32, 55, 45, 68];
      return v[i % v.length];
    })
  );

  return (
    <div className="flex items-center gap-[2px] h-10 overflow-hidden">
      {heights.current.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-full min-w-[2px]"
          style={{
            height: `${h}%`,
            background: `linear-gradient(to top, #ec4899, #a855f7)`,
            transformOrigin: 'bottom',
            animation: isPlaying ? `waveBar ${0.4 + (i % 6) * 0.08}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 25}ms`,
            opacity: isPlaying ? 1 : 0.35,
            transition: 'opacity 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

// ─── Generation Progress ──────────────────────────────────────────────────────
function GenerationProgress({ prompt }: { prompt: string }) {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  const phases = [
    'Analyzing your prompt...',
    'Generating melody structure...',
    'Composing instruments...',
    'Mixing & mastering...',
    'Finalizing audio...',
  ];

  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + Math.random() * 3 + 0.5, 92);
      setProgress(p);
      setPhase(Math.min(Math.floor(p / 20), phases.length - 1));
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card rounded-2xl border border-white/08 p-6 animate-fade-in">
      {/* Animated music orb */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-14 h-14 flex-shrink-0">
          <div className="absolute inset-0 rounded-2xl animate-pulse-glow"
            style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }} />
          <div className="absolute inset-0 rounded-2xl flex items-center justify-center">
            <Music className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white mb-0.5">DANI is composing...</p>
          <p className="text-xs text-gray-600 truncate">"{prompt.slice(0, 55)}{prompt.length > 55 ? '...' : ''}"</p>
        </div>
      </div>

      {/* Live waveform */}
      <div className="mb-5">
        <WaveformVisualizer isPlaying={true} barCount={50} />
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 animate-pulse">{phases[phase]}</p>
          <p className="text-xs font-mono text-pink-400">{Math.round(progress)}%</p>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg,#ec4899,#a855f7,#3b82f6)',
            }}
          />
        </div>
        <p className="text-[11px] text-gray-700 text-center">This usually takes 30–90 seconds</p>
      </div>
    </div>
  );
}

// ─── Track Player ─────────────────────────────────────────────────────────────
function TrackPlayer({
  track, isPlaying, currentTime, duration,
  onToggle, onDownload, onDelete, onSeek,
}: {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onToggle: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onSeek: (t: number) => void;
}) {
  const formatTime = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`glass-card rounded-2xl border transition-all overflow-hidden ${
      isPlaying ? 'border-pink-500/25 shadow-lg' : 'border-white/07 hover:border-white/12'
    }`} style={isPlaying ? { boxShadow: '0 0 40px rgba(236,72,153,0.08)' } : {}}>

      {/* Waveform (when playing) */}
      {isPlaying && (
        <div className="px-5 pt-4 pb-1">
          <WaveformVisualizer isPlaying={isPlaying} barCount={60} />
        </div>
      )}

      <div className="px-5 py-4 flex items-center gap-4">
        {/* Play button */}
        <button onClick={onToggle}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-all flex-shrink-0 ${
            isPlaying
              ? 'text-white neon-pink'
              : 'glass-card border border-white/10 text-gray-500 hover:text-pink-400 hover:border-pink-500/30'
          }`}
          style={isPlaying ? { background: 'linear-gradient(135deg,#ec4899,#a855f7)' } : {}}>
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        {/* Track info + progress */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{track.title}</p>
          <p className="text-[11px] text-gray-600 truncate mt-0.5">{track.prompt}</p>

          {/* Seekable progress bar */}
          {isPlaying && duration > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[10px] text-gray-600 font-mono w-8 flex-shrink-0">{formatTime(currentTime)}</span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min={0} max={duration} step={0.1}
                  value={currentTime}
                  onChange={e => onSeek(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <span className="text-[10px] text-gray-600 font-mono w-8 flex-shrink-0 text-right">{formatTime(duration)}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isPlaying && <Volume2 className="w-4 h-4 text-pink-400 animate-pulse" />}
          <button onClick={onDownload}
            className="p-2 rounded-xl glass-card border border-white/08 text-gray-600 hover:text-white hover:border-white/15 transition-all"
            title="Download">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={onDelete}
            className="p-2 rounded-xl glass-card border border-white/08 text-gray-600 hover:text-red-400 hover:border-red-500/20 transition-all"
            title="Remove">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom progress strip (always visible, subtle) */}
      {!isPlaying && duration > 0 && (
        <div className="h-0.5 w-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="h-full rounded-full"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#ec4899,#a855f7)' }} />
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function MusicTab() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrent = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingId(null);
    setCurrentTime(0);
  }, []);

  const playTrack = useCallback((track: Track) => {
    stopCurrent();
    const audio = new Audio(track.audioUrl);
    audio.volume = muted ? 0 : volume;
    audioRef.current = audio;
    audio.play().catch(() => {});
    setPlayingId(track.id);
    setCurrentTime(0);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.ondurationchange = () => {
      setDuration(audio.duration);
      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, duration: audio.duration } : t));
    };
    audio.onended = () => { setPlayingId(null); setCurrentTime(0); };
  }, [stopCurrent, volume, muted]);

  const togglePlay = (track: Track) => {
    if (playingId === track.id) {
      if (audioRef.current?.paused) {
        audioRef.current.play();
        setPlayingId(track.id);
      } else {
        audioRef.current?.pause();
        setPlayingId(null);
      }
    } else {
      playTrack(track);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Volume control
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError('');
    const p = prompt.trim();
    setPrompt('');

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-music-ai', {
        body: { prompt: p }
      });
      if (fnErr) {
        let msg = fnErr.message;
        if (fnErr instanceof FunctionsHttpError) {
          try { const t = await fnErr.context?.text(); msg = t || msg; } catch { /**/ }
        }
        throw new Error(msg);
      }
      const audioUrl = data?.audio_url;
      if (!audioUrl) throw new Error('No audio returned');
      const track: Track = {
        id: Date.now().toString(), prompt: p, audioUrl,
        title: data?.title || p.slice(0, 50), createdAt: new Date(),
      };
      setTracks(prev => [track, ...prev]);
      setTimeout(() => playTrack(track), 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Music generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (track: Track) => {
    const a = document.createElement('a');
    a.href = track.audioUrl;
    a.download = `dani-music-${track.id}.mp3`;
    a.click();
  };

  const removeTrack = (id: string) => {
    if (playingId === id) stopCurrent();
    setTracks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto surface-0">
      <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7,#3b82f6)' }}>
              <Music className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">AI Music Composer</h1>
          <p className="text-sm text-gray-600">Describe a song — DANI composes it for you 🎵</p>
        </div>

        {/* Composer input */}
        <div className="glass-card rounded-2xl border border-white/08 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Mic2 className="w-4 h-4 text-pink-400" />
              <span className="text-sm font-semibold text-gray-300">Describe your music</span>
            </div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
              placeholder="e.g. A chill lo-fi beat with jazz piano, rain sounds, and smooth bass for late night sessions..."
              rows={3}
              disabled={isGenerating}
              className="w-full bg-transparent text-white placeholder-gray-700 text-sm leading-relaxed resize-none focus:outline-none disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400 flex-1">{error}</p>
              <button onClick={() => setError('')}><X className="w-3 h-3 text-red-500" /></button>
            </div>
          )}

          <div className="flex items-center justify-between px-5 pb-5 gap-3 flex-wrap">
            <p className="text-[11px] text-gray-700 hidden sm:block">⌘↵ to generate</p>
            <div className="flex items-center gap-2 ml-auto">
              {/* Volume */}
              <div className="hidden sm:flex items-center gap-2">
                <button onClick={() => setMuted(!muted)}
                  className="p-2 rounded-xl glass-card border border-white/08 text-gray-600 hover:text-white transition-all">
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                  onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
                  className="w-20" />
              </div>
              <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: !prompt.trim() || isGenerating ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Composing...</> : <><Music className="w-4 h-4" />Generate</>}
              </button>
            </div>
          </div>
        </div>

        {/* Quick suggestion chips */}
        <div>
          <p className="text-[11px] text-gray-700 font-semibold uppercase tracking-wider mb-2">Quick ideas</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.slice(0, 4).map(s => (
              <button key={s} onClick={() => setPrompt(s)} disabled={isGenerating}
                className="text-xs px-3 py-2 glass-card rounded-full border border-white/08 text-gray-600 hover:text-gray-300 hover:border-pink-500/25 transition-all font-medium disabled:opacity-40">
                {s.length > 38 ? s.slice(0, 38) + '...' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Generation progress */}
        {isGenerating && <GenerationProgress prompt={prompt || 'your music'} />}

        {/* Track library */}
        {tracks.length > 0 && !isGenerating && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-600 font-bold uppercase tracking-wider">
                Library ({tracks.length})
              </p>
              {tracks.length > 1 && (
                <button onClick={() => { stopCurrent(); setTracks([]); }}
                  className="text-[11px] text-gray-700 hover:text-red-400 transition-all flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            {tracks.map(track => (
              <TrackPlayer
                key={track.id}
                track={track}
                isPlaying={playingId === track.id}
                currentTime={playingId === track.id ? currentTime : 0}
                duration={track.duration || duration}
                onToggle={() => togglePlay(track)}
                onDownload={() => handleDownload(track)}
                onDelete={() => removeTrack(track.id)}
                onSeek={seek}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {tracks.length === 0 && !isGenerating && (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <WaveformVisualizer isPlaying={false} barCount={30} />
            </div>
            <p className="text-sm text-gray-600">Your generated tracks appear here</p>
            <p className="text-xs text-gray-700 mt-1">Describe any musical style above ↑</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.25); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
