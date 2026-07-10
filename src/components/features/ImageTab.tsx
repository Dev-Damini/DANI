import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Wand2, Download, Sparkles, Trash2, Upload, Brush, Layers,
  Palette, X, ImagePlus, ChevronDown, Loader2, RefreshCw,
  Scissors, Sliders, Check, ZoomIn
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { GeneratedImage } from '@/types';

type EditMode = 'generate' | 'inpaint' | 'background' | 'style';

const STYLES = [
  { id: 'realistic', label: 'Realistic', icon: '📸', desc: 'Photographic' },
  { id: 'artistic', label: 'Artistic', icon: '🎨', desc: 'Fine Art' },
  { id: 'anime', label: 'Anime', icon: '✨', desc: 'Japanese Anime' },
  { id: 'abstract', label: 'Abstract', icon: '🌈', desc: 'Abstract Art' },
  { id: 'fantasy', label: 'Fantasy', icon: '🔮', desc: 'Fantasy World' },
] as const;

const STYLE_OVERLAYS = [
  { id: 'neon', label: 'Neon Glow', filter: 'hue-rotate(180deg) saturate(200%) brightness(0.8)' },
  { id: 'vintage', label: 'Vintage', filter: 'sepia(80%) contrast(120%) brightness(90%)' },
  { id: 'cold', label: 'Cold Tone', filter: 'hue-rotate(200deg) saturate(120%)' },
  { id: 'warm', label: 'Warm Tone', filter: 'hue-rotate(-20deg) saturate(140%) brightness(105%)' },
  { id: 'bw', label: 'Black & White', filter: 'grayscale(100%)' },
  { id: 'vivid', label: 'Vivid', filter: 'saturate(220%) contrast(110%)' },
  { id: 'none', label: 'Original', filter: 'none' },
];

const PRESETS = [
  { id: 'portrait', label: 'Portrait', icon: '👤', prompt: 'professional portrait photography, studio lighting, high quality', style: 'realistic' as const },
  { id: 'landscape', label: 'Landscape', icon: '🏞️', prompt: 'beautiful landscape, golden hour, ultra high resolution', style: 'realistic' as const },
  { id: 'fantasy', label: 'Fantasy', icon: '🔮', prompt: 'fantasy art illustration, magical atmosphere, epic composition', style: 'artistic' as const },
  { id: 'anime', label: 'Anime', icon: '🌸', prompt: 'anime character design, vibrant colors, expressive eyes', style: 'anime' as const },
];

// ─── Canvas Inpainting ─────────────────────────────────────────────────────────
function InpaintCanvas({ imageUrl, onMaskReady }: { imageUrl: string; onMaskReady: (mask: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [brushSize, setBrushSize] = useState(30);
  const [hasMask, setHasMask] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
  }, [imageUrl]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    draw(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const { x, y } = getPos(e, canvas);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(236,72,153,0.6)';
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
    setHasMask(true);
  };

  const endDraw = () => {
    isDrawing.current = false;
    if (hasMask && canvasRef.current) {
      onMaskReady(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearMask = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      setHasMask(false);
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Brush className="w-4 h-4 text-pink-400 flex-shrink-0" />
          <span className="text-xs text-gray-400">Brush size</span>
          <input type="range" min={5} max={80} value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            className="w-24" />
          <span className="text-xs text-gray-500 w-6">{brushSize}</span>
        </div>
        <button onClick={clearMask}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card border border-white/08 text-xs text-gray-400 hover:text-white transition-all">
          <X className="w-3.5 h-3.5" /> Clear mask
        </button>
      </div>
      <div className="relative rounded-2xl overflow-hidden border border-white/08"
        style={{ background: '#111' }}>
        <canvas
          ref={canvasRef}
          className="w-full brush-cursor select-none touch-none"
          style={{ maxHeight: '400px', objectFit: 'contain' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        <div className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-semibold"
          style={{ background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.3)', color: '#f9a8d4' }}>
          Paint the area to modify
        </div>
      </div>
      {hasMask && (
        <p className="text-xs text-pink-400 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> Mask ready — describe what to replace below
        </p>
      )}
    </div>
  );
}

// ─── Image lightbox ────────────────────────────────────────────────────────────
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}>
      <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
        <img src={src} alt={alt} className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
        <button onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-xl glass-card border border-white/10 text-gray-300 hover:text-white transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ImageTab() {
  const [editMode, setEditMode] = useState<EditMode>('generate');

  // Generate state
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<typeof STYLES[number]['id']>('realistic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Edit/Inpaint state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [inpaintMask, setInpaintMask] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedResult, setEditedResult] = useState<string | null>(null);

  // Background isolation state
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgProcessing, setBgProcessing] = useState(false);
  const [bgResult, setBgResult] = useState<string | null>(null);

  // Style swap state
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [activeStyleOverlay, setActiveStyleOverlay] = useState('none');
  const [stylePrompt, setStylePrompt] = useState('');
  const [styleProcessing, setStyleProcessing] = useState(false);
  const [styleResult, setStyleResult] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('generated_images').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setImages(data || []));
  }, []);

  const handleFileRead = (file: File, setter: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = e => setter(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image-ai', {
        body: { prompt, style: selectedStyle }
      });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { const t = await error.context?.text(); msg = t || msg; } catch { /**/ }
        }
        throw new Error(msg);
      }
      if (data?.image_url) {
        const newImg: GeneratedImage = {
          id: crypto.randomUUID(), user_id: 'local', prompt,
          style: selectedStyle, image_url: data.image_url, file_path: '',
          created_at: new Date().toISOString(),
        };
        setImages(prev => [newImg, ...prev]);
        setPrompt('');
      }
    } catch (e) {
      console.error('Generate error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Inpaint ──────────────────────────────────────────────────────────────
  const handleInpaint = async () => {
    if (!uploadedImageUrl || !editPrompt.trim()) return;
    setIsEditing(true);
    setEditedResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image-ai', {
        body: { prompt: editPrompt, style: 'realistic', editImageUrl: uploadedImageUrl }
      });
      if (error) throw error;
      if (data?.image_url) setEditedResult(data.image_url);
    } catch (e) {
      console.error('Inpaint error:', e);
    } finally {
      setIsEditing(false);
    }
  };

  // ── Background Removal (mock — call edit endpoint with bg removal prompt) ─
  const handleBgRemoval = async () => {
    if (!bgImage) return;
    setBgProcessing(true);
    setBgResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image-ai', {
        body: { prompt: 'remove background completely, transparent background, isolated subject only', style: 'realistic', editImageUrl: bgImage }
      });
      if (error) throw error;
      if (data?.image_url) setBgResult(data.image_url);
    } catch (e) {
      console.error('BG removal error:', e);
    } finally {
      setBgProcessing(false);
    }
  };

  // ── Style Swap ────────────────────────────────────────────────────────────
  const handleStyleSwap = async () => {
    if (!styleImage) return;
    setStyleProcessing(true);
    setStyleResult(null);
    const sp = stylePrompt.trim() || `Apply ${STYLE_OVERLAYS.find(o => o.id === activeStyleOverlay)?.label || 'artistic'} style transformation`;
    try {
      const { data, error } = await supabase.functions.invoke('generate-image-ai', {
        body: { prompt: sp, style: 'artistic', editImageUrl: styleImage }
      });
      if (error) throw error;
      if (data?.image_url) setStyleResult(data.image_url);
    } catch (e) {
      console.error('Style swap error:', e);
    } finally {
      setStyleProcessing(false);
    }
  };

  const handleDelete = async (img: GeneratedImage) => {
    if (!confirm('Delete this image?')) return;
    setImages(prev => prev.filter(i => i.id !== img.id));
    supabase.from('generated_images').delete().eq('id', img.id).then(() => {});
  };

  const downloadUrl = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
  };

  const MODES: { id: EditMode; label: string; Icon: React.ElementType; desc: string }[] = [
    { id: 'generate', label: 'Generate', Icon: Sparkles, desc: 'Text to Image' },
    { id: 'inpaint', label: 'Inpainting', Icon: Brush, desc: 'Edit by brush' },
    { id: 'background', label: 'BG Isolate', Icon: Scissors, desc: 'Remove background' },
    { id: 'style', label: 'Style Swap', Icon: Palette, desc: 'Color & texture' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden surface-0">
      {lightboxSrc && <ImageLightbox src={lightboxSrc} alt="Image" onClose={() => setLightboxSrc(null)} />}

      {/* Mode Tabs */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-3 border-b border-white/06"
        style={{ background: '#0c0c18' }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setEditMode(m.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
              editMode === m.id
                ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-300 glass-card border border-white/06 hover:border-white/12'
            }`}>
            <m.Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">{m.label}</span>
            <span className="hidden md:inline text-[10px] opacity-70">{m.desc}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

          {/* ── GENERATE MODE ── */}
          {editMode === 'generate' && (
            <div className="space-y-5 animate-fade-in">
              {/* Presets */}
              <div className="flex gap-2 flex-wrap">
                {PRESETS.map(p => (
                  <button key={p.id} onClick={() => { setPrompt(p.prompt); setSelectedStyle(p.style); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-card border border-white/08 text-xs font-medium text-gray-400 hover:text-white hover:border-pink-500/30 transition-all">
                    <span>{p.icon}</span>{p.label}
                  </button>
                ))}
              </div>

              {/* Style selector */}
              <div className="flex gap-2 flex-wrap">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setSelectedStyle(s.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                      selectedStyle === s.id
                        ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white border-transparent shadow-lg'
                        : 'glass-card border-white/08 text-gray-500 hover:text-gray-300'
                    }`}>
                    <span>{s.icon}</span>{s.label}
                  </button>
                ))}
              </div>

              {/* Prompt input */}
              <div className="glass-card rounded-2xl border border-white/08 overflow-hidden">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleGenerate()}
                  placeholder="Describe the image... e.g. 'a cyberpunk city at night with neon lights reflecting on rain'"
                  rows={3}
                  className="w-full bg-transparent text-white placeholder-gray-700 text-sm leading-relaxed p-5 resize-none focus:outline-none"
                />
                <div className="flex items-center justify-between px-5 pb-4 pt-1">
                  <p className="text-[11px] text-gray-700">Ctrl+↵ to generate</p>
                  <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}
                    className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                    style={{ background: isGenerating || !prompt.trim() ? '#1a1a28' : 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                    {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Wand2 className="w-4 h-4" />Generate</>}
                  </button>
                </div>
              </div>

              {/* Generating skeleton — improved */}
              {isGenerating && (
                <div className="glass-card rounded-2xl border border-pink-500/20 p-6 animate-fade-in">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <div className="absolute inset-0 rounded-xl animate-pulse" style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }} />
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Painting your image...</p>
                      <p className="text-xs text-gray-600">Hold tight — creating something beautiful 🎨</p>
                    </div>
                    <div className="ml-auto w-6 h-6 border-[3px] border-pink-500/30 border-t-pink-500 rounded-full animate-spin flex-shrink-0" />
                  </div>
                  {/* Animated canvas placeholder */}
                  <div className="relative aspect-square max-w-xs rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 animate-pulse" style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.08),rgba(168,85,247,0.08),rgba(59,130,246,0.08))' }} />
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, rgba(236,72,153,0.04) 0px, rgba(236,72,153,0.04) 2px, transparent 2px, transparent 12px)',
                    }} />
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full border-[3px] border-pink-500/20 border-t-pink-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-600 animate-pulse">AI is painting...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Gallery */}
              {images.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Gallery ({images.length})</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {images.map(img => (
                      <div key={img.id} className="group relative glass-card rounded-2xl overflow-hidden border border-white/06 hover:border-white/12 transition-all aspect-square cursor-pointer"
                        onClick={() => setLightboxSrc(img.image_url)}>
                        <img src={img.image_url} alt={img.prompt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-3">
                          <p className="text-[11px] text-gray-300 line-clamp-2 mb-2">{img.prompt}</p>
                          <div className="flex gap-2">
                            <button onClick={e => { e.stopPropagation(); downloadUrl(img.image_url, `dani-${img.id}.png`); }}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold text-white"
                              style={{ background: 'rgba(236,72,153,0.4)' }}>
                              <Download className="w-3 h-3" /> Save
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(img); }}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {/* DANI badge */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ background: 'rgba(0,0,0,0.7)', color: '#f9a8d4', border: '1px solid rgba(236,72,153,0.3)' }}>
                          DANI
                        </div>
                        {/* Zoom hint */}
                        <div className="absolute top-2 left-2 p-1.5 rounded-lg glass opacity-0 group-hover:opacity-100 transition-all">
                          <ZoomIn className="w-3 h-3 text-white/70" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── INPAINTING MODE ── */}
          {editMode === 'inpaint' && (
            <div className="space-y-5 animate-fade-in">
              <div className="glass-card rounded-2xl border border-white/08 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Brush className="w-4 h-4 text-pink-400" />
                  <p className="text-sm font-bold text-white">Inpainting Studio</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full text-purple-400"
                    style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)' }}>
                    Paint to modify
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-4">Upload an image, paint over the area you want to change, then describe the replacement.</p>

                {!uploadedImageUrl ? (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-3 py-12 rounded-2xl border-2 border-dashed border-white/10 text-gray-600 hover:text-gray-400 hover:border-pink-500/30 transition-all">
                    <Upload className="w-8 h-8" />
                    <p className="text-sm font-semibold">Upload image to edit</p>
                    <p className="text-xs opacity-60">JPG, PNG, WebP</p>
                  </button>
                ) : (
                  <div className="space-y-4">
                    <InpaintCanvas imageUrl={uploadedImageUrl} onMaskReady={setInpaintMask} />
                    <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)}
                      placeholder="Describe what to replace the painted area with..."
                      rows={2}
                      className="w-full px-4 py-3 glass-card rounded-xl border border-white/10 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-pink-500/50 resize-none leading-relaxed" />
                    <div className="flex gap-3">
                      <button onClick={handleInpaint} disabled={!editPrompt.trim() || isEditing}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                        {isEditing ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <><Wand2 className="w-4 h-4" />Apply Inpaint</>}
                      </button>
                      <button onClick={() => { setUploadedImageUrl(null); setEditedResult(null); setInpaintMask(null); }}
                        className="px-4 py-3 rounded-xl glass-card border border-white/10 text-gray-400 hover:text-white text-sm font-semibold transition-all">
                        Reset
                      </button>
                    </div>
                    {editedResult && (
                      <div className="space-y-2">
                        <p className="text-xs text-green-400 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />Edit complete!</p>
                        <div className="relative rounded-2xl overflow-hidden">
                          <img src={editedResult} alt="Edited" className="w-full rounded-2xl" />
                          <button onClick={() => downloadUrl(editedResult, 'dani-edited.png')}
                            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                            style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileRead(f, setUploadedImageUrl); }} />
            </div>
          )}

          {/* ── BACKGROUND ISOLATION MODE ── */}
          {editMode === 'background' && (
            <div className="space-y-5 animate-fade-in">
              <div className="glass-card rounded-2xl border border-white/08 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Scissors className="w-4 h-4 text-green-400" />
                  <p className="text-sm font-bold text-white">Background Isolation</p>
                </div>
                <p className="text-xs text-gray-600 mb-5">One-click foreground extraction and background removal from any image.</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Upload zone */}
                  <div>
                    <p className="text-[11px] text-gray-600 font-semibold mb-2 uppercase tracking-wider">Original</p>
                    {!bgImage ? (
                      <button onClick={() => bgFileInputRef.current?.click()}
                        className="w-full flex flex-col items-center gap-3 py-16 rounded-2xl border-2 border-dashed border-white/10 text-gray-600 hover:text-gray-400 hover:border-green-500/30 transition-all">
                        <Upload className="w-7 h-7" />
                        <p className="text-sm font-semibold">Upload image</p>
                      </button>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden">
                        <img src={bgImage} alt="Original" className="w-full rounded-2xl" />
                        <button onClick={() => { setBgImage(null); setBgResult(null); }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg glass-card border border-white/10 text-gray-400 hover:text-white transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Result */}
                  <div>
                    <p className="text-[11px] text-gray-600 font-semibold mb-2 uppercase tracking-wider">Processed</p>
                    {bgProcessing ? (
                      <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-white/08 glass-card gap-3">
                        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                        <p className="text-xs text-gray-500">Isolating foreground...</p>
                        <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 progress-pulse rounded-full"
                            style={{ width: '70%' }} />
                        </div>
                      </div>
                    ) : bgResult ? (
                      <div className="relative">
                        <img src={bgResult} alt="Result" className="w-full rounded-2xl"
                          style={{ background: 'repeating-conic-gradient(#333 0% 25%, #1a1a1a 0% 50%) 0 0 / 20px 20px' }} />
                        <button onClick={() => downloadUrl(bgResult, 'dani-bg-removed.png')}
                          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                          style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}>
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-16 rounded-2xl border border-white/06 glass-card text-gray-700 text-sm">
                        Result appears here
                      </div>
                    )}
                  </div>
                </div>

                {bgImage && !bgProcessing && (
                  <button onClick={handleBgRemoval}
                    className="mt-4 w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold text-white transition-all"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    <Scissors className="w-4 h-4" /> Remove Background
                  </button>
                )}
              </div>
              <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { handleFileRead(f, setBgImage); setBgResult(null); } }} />
            </div>
          )}

          {/* ── STYLE SWAP MODE ── */}
          {editMode === 'style' && (
            <div className="space-y-5 animate-fade-in">
              <div className="glass-card rounded-2xl border border-white/08 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-blue-400" />
                  <p className="text-sm font-bold text-white">Style Swap</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full text-blue-400"
                    style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    Filters · Color Grading · Art Styles
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-5">Apply instant style overlays, color grading filters, and artistic transformations.</p>

                {/* Style overlays */}
                <div className="mb-5">
                  <p className="text-[11px] text-gray-600 font-semibold mb-2 uppercase tracking-wider">Quick Filters</p>
                  <div className="flex gap-2 flex-wrap">
                    {STYLE_OVERLAYS.map(o => (
                      <button key={o.id} onClick={() => setActiveStyleOverlay(o.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                          activeStyleOverlay === o.id
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-transparent shadow-lg'
                            : 'glass-card border-white/08 text-gray-500 hover:text-gray-300'
                        }`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Upload */}
                  <div>
                    <p className="text-[11px] text-gray-600 font-semibold mb-2 uppercase tracking-wider">Source Image</p>
                    {!styleImage ? (
                      <button onClick={() => styleFileInputRef.current?.click()}
                        className="w-full flex flex-col items-center gap-3 py-16 rounded-2xl border-2 border-dashed border-white/10 text-gray-600 hover:text-gray-400 hover:border-blue-500/30 transition-all">
                        <Upload className="w-7 h-7" />
                        <p className="text-sm font-semibold">Upload image</p>
                      </button>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden">
                        <img src={styleImage} alt="Source" className="w-full rounded-2xl"
                          style={{ filter: STYLE_OVERLAYS.find(o => o.id === activeStyleOverlay)?.filter || 'none' }} />
                        <button onClick={() => { setStyleImage(null); setStyleResult(null); }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg glass-card border border-white/10 text-gray-400 hover:text-white transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {activeStyleOverlay !== 'none' && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-[10px] font-semibold"
                            style={{ background: 'rgba(0,0,0,0.7)', color: '#93c5fd' }}>
                            Preview: {STYLE_OVERLAYS.find(o => o.id === activeStyleOverlay)?.label}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Result */}
                  <div>
                    <p className="text-[11px] text-gray-600 font-semibold mb-2 uppercase tracking-wider">Transformed</p>
                    {styleProcessing ? (
                      <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-white/08 glass-card gap-3">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        <p className="text-xs text-gray-500">Applying style...</p>
                        <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 progress-pulse rounded-full"
                            style={{ width: '60%' }} />
                        </div>
                      </div>
                    ) : styleResult ? (
                      <div className="relative">
                        <img src={styleResult} alt="Styled" className="w-full rounded-2xl" />
                        <button onClick={() => downloadUrl(styleResult, 'dani-styled.png')}
                          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                          style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}>
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-16 rounded-2xl border border-white/06 glass-card text-gray-700 text-sm">
                        Result appears here
                      </div>
                    )}
                  </div>
                </div>

                {styleImage && (
                  <div className="mt-4 space-y-3">
                    <input value={stylePrompt} onChange={e => setStylePrompt(e.target.value)}
                      placeholder="Optional: describe the artistic style (e.g. 'oil painting impressionism')"
                      className="w-full px-4 py-3 glass-card rounded-xl border border-white/10 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-blue-500/50" />
                    <button onClick={handleStyleSwap} disabled={styleProcessing}
                      className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                      {styleProcessing ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <><Sliders className="w-4 h-4" />Apply Style Swap</>}
                    </button>
                  </div>
                )}
              </div>
              <input ref={styleFileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { handleFileRead(f, setStyleImage); setStyleResult(null); } }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
