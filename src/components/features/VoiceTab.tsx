import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, VolumeX, Square, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

// ─── Advanced Animated Orb ─────────────────────────────────────────────────────
function AdvancedOrb({ isListening, isSpeaking, isProcessing }: {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const state = isListening ? 'listening' : isSpeaking ? 'speaking' : isProcessing ? 'processing' : 'idle';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const size = 220;
    canvas.width = size;
    canvas.height = size;
    const cx = size / 2;
    const cy = size / 2;

    const draw = (t: number) => {
      timeRef.current = t;
      ctx.clearRect(0, 0, size, size);

      const speed = state === 'listening' ? 0.003 : state === 'speaking' ? 0.005 : state === 'processing' ? 0.004 : 0.001;
      const baseRadius = state === 'idle' ? 55 : 60;
      const amplitude = state === 'listening' ? 18 : state === 'speaking' ? 22 : state === 'processing' ? 12 : 4;
      const pts = 180;
      const tVal = t * speed;

      // Outer glow ring
      const glowRadius = baseRadius + amplitude * 1.8;
      const glowGrad = ctx.createRadialGradient(cx, cy, glowRadius * 0.6, cx, cy, glowRadius * 1.4);
      const alpha = state === 'idle' ? 0.06 : 0.12;
      glowGrad.addColorStop(0, `rgba(236,72,153,${alpha})`);
      glowGrad.addColorStop(0.5, `rgba(168,85,247,${alpha * 0.6})`);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Wobbly orb shape
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const angle = (i / pts) * Math.PI * 2;
        const noise1 = Math.sin(angle * 3 + tVal * 1.7) * amplitude * 0.4;
        const noise2 = Math.sin(angle * 5 - tVal * 2.3) * amplitude * 0.3;
        const noise3 = Math.cos(angle * 7 + tVal * 1.1) * amplitude * 0.2;
        const r = baseRadius + noise1 + noise2 + noise3;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Fill gradient
      const fillGrad = ctx.createRadialGradient(cx - 12, cy - 12, 0, cx, cy, baseRadius + amplitude);
      if (state === 'listening') {
        fillGrad.addColorStop(0, '#f9a8d4');
        fillGrad.addColorStop(0.4, '#ec4899');
        fillGrad.addColorStop(0.8, '#a855f7');
        fillGrad.addColorStop(1, '#7c3aed');
      } else if (state === 'speaking') {
        fillGrad.addColorStop(0, '#a5f3fc');
        fillGrad.addColorStop(0.4, '#06b6d4');
        fillGrad.addColorStop(0.8, '#6366f1');
        fillGrad.addColorStop(1, '#4f46e5');
      } else if (state === 'processing') {
        fillGrad.addColorStop(0, '#fbbf24');
        fillGrad.addColorStop(0.4, '#f59e0b');
        fillGrad.addColorStop(0.8, '#ec4899');
        fillGrad.addColorStop(1, '#a855f7');
      } else {
        fillGrad.addColorStop(0, 'rgba(236,72,153,0.7)');
        fillGrad.addColorStop(0.5, 'rgba(168,85,247,0.7)');
        fillGrad.addColorStop(1, 'rgba(124,58,237,0.7)');
      }
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Specular highlight
      const hiGrad = ctx.createRadialGradient(cx - 14, cy - 16, 2, cx - 8, cy - 10, 28);
      hiGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
      hiGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hiGrad;
      ctx.fill();

      // Orbiting ring (listening/speaking)
      if (state !== 'idle') {
        const ringRadius = baseRadius + amplitude + 14;
        const ringAngle = tVal * (state === 'speaking' ? 2.5 : 1.8);
        const particles = state === 'speaking' ? 6 : 4;
        for (let i = 0; i < particles; i++) {
          const a = ringAngle + (i / particles) * Math.PI * 2;
          const px = cx + ringRadius * Math.cos(a);
          const py = cy + ringRadius * Math.sin(a);
          const pSize = state === 'speaking' ? 3.5 : 2.5;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 === 0 ? 'rgba(236,72,153,0.8)' : 'rgba(168,85,247,0.8)';
          ctx.fill();
        }
      }

      // Waveform bars (speaking state)
      if (state === 'speaking') {
        const barCount = 20;
        const barMaxH = 28;
        for (let i = 0; i < barCount; i++) {
          const barAngle = (i / barCount) * Math.PI * 2;
          const barH = barMaxH * (0.3 + 0.7 * Math.abs(Math.sin(tVal * 4 + i * 0.8)));
          const innerR = baseRadius + amplitude + 18;
          const x1 = cx + innerR * Math.cos(barAngle);
          const y1 = cy + innerR * Math.sin(barAngle);
          const x2 = cx + (innerR + barH) * Math.cos(barAngle);
          const y2 = cy + (innerR + barH) * Math.sin(barAngle);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(6,182,212,${0.4 + 0.5 * Math.abs(Math.sin(tVal * 3 + i))})`;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [state]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      {/* Center icon */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: 44, height: 44 }}>
        {isProcessing ? (
          <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
        ) : isListening ? (
          <Mic className="w-7 h-7 text-white drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6))' }} />
        ) : isSpeaking ? (
          <Sparkles className="w-7 h-7 text-white drop-shadow-lg animate-pulse" />
        ) : (
          <Mic className="w-6 h-6 text-white/70" />
        )}
      </div>
    </div>
  );
}

export default function VoiceTab() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserSupport, setBrowserSupport] = useState(true);
  const [emotion, setEmotion] = useState<string>('neutral');
  const [conversationContext, setConversationContext] = useState<Array<{role: string, content: string}>>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition
      || (window as Window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition || !window.speechSynthesis) { setBrowserSupport(false); return; }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interimTranscript += t;
      }
      setTranscript(finalTranscript || interimTranscript);
      if (finalTranscript) handleVoiceInput(finalTranscript);
    };
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);

    return () => { recognitionRef.current?.stop(); };
  }, []);

  const speakTextWithAPI = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      const { data, error } = await supabase.functions.invoke('tts-elevenlabs', {
        body: { text: text.slice(0, 400) }
      });
      if (error) throw error;
      const audioUrl = URL.createObjectURL(data);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.0;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); };
      await audio.play();
    } catch {
      setIsSpeaking(false);
      // Browser fallback
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9; utterance.pitch = 1.2;
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria'));
        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  }, []);

  const handleVoiceInput = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const updatedContext = [...conversationContext, { role: 'user', content: text }];
      setConversationContext(updatedContext);
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { messages: updatedContext, conversationId: null }
      });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { const t = await error.context?.text(); msg = t || msg; } catch { /* ignore */ }
        }
        throw new Error(msg);
      }
      const aiResponse = data.message;
      setEmotion(data.emotion || 'neutral');
      setConversationContext([...updatedContext, { role: 'assistant', content: aiResponse }]);
      setResponse(aiResponse);
      setIsProcessing(false);
      await speakTextWithAPI(aiResponse);
    } catch {
      const err = "Sorry, I had trouble. Please try again! 💕";
      setResponse(err);
      setIsProcessing(false);
      await speakTextWithAPI(err);
    }
  }, [conversationContext, speakTextWithAPI]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      if (isSpeaking) window.speechSynthesis.cancel();
      setTranscript(''); setResponse(''); setIsProcessing(false);
      try { recognitionRef.current.start(); setIsListening(true); } catch { /* ignore */ }
    }
  };

  if (!browserSupport) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 surface-0">
        <div className="rounded-3xl p-12 border text-center max-w-md" style={{ background: 'var(--glass-card)' }}>
          <MicOff className="w-12 h-12 mx-auto mb-4 text-purple-400" />
          <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Voice Not Supported</h3>
          <p style={{ color: 'var(--text-muted)' }}>Please use Chrome, Edge, or Safari for voice features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 surface-0">
      <div className="w-full max-w-xl">
        <div className="rounded-3xl p-8 md:p-12 border text-center"
          style={{ background: 'var(--glass-card)', borderColor: 'var(--border-normal)' }}>

          {/* Orb */}
          <div className="mb-8 flex justify-center">
            <AdvancedOrb isListening={isListening} isSpeaking={isSpeaking} isProcessing={isProcessing} />
          </div>

          {/* Emotion */}
          {emotion !== 'neutral' && (
            <div className="mb-4 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-muted)' }}>Sensing: {emotion}</span>
            </div>
          )}

          {/* Status */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2 shimmer-text">
              {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : isProcessing ? 'Thinking...' : 'Voice Mode'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {isListening ? 'Say something to DANI' : isSpeaking ? 'DANI is responding' : 'Click the mic to start talking'}
            </p>
          </div>

          {/* Transcript / Response */}
          {(transcript || response) && (
            <div className="mb-6 space-y-4 text-left">
              {transcript && (
                <div className="rounded-2xl p-4" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)' }}>
                  <p className="text-xs font-semibold text-pink-400 mb-1">You</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{transcript}</p>
                </div>
              )}
              {response && (
                <div className="rounded-2xl p-4 border" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
                  <p className="text-xs font-semibold text-purple-400 mb-1">DANI</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{response}</p>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-4 justify-center">
            <button onClick={toggleListening} disabled={isSpeaking || isProcessing}
              className="px-8 py-4 rounded-2xl font-bold text-white transition-all disabled:opacity-40 flex items-center gap-2"
              style={isListening
                ? { background: 'linear-gradient(135deg,#dc2626,#ec4899)' }
                : { background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
              {isListening ? <><Square className="w-5 h-5" />Stop</> : <><Mic className="w-5 h-5" />Start Talking</>}
            </button>
            {isSpeaking && (
              <button onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false); }}
                className="px-8 py-4 rounded-2xl font-bold flex items-center gap-2 border"
                style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>
                <VolumeX className="w-5 h-5" />Stop
              </button>
            )}
          </div>

          <p className="text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
            Speak naturally — DANI responds with emotional intelligence
          </p>
          {conversationContext.length > 0 && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {conversationContext.length} messages in memory ·
              <button onClick={() => setConversationContext([])} className="ml-1 text-pink-400 hover:underline">Clear</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
