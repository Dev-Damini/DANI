// Rotating 3D Feature Cube showcasing DANI capabilities
import { useState, useEffect, useRef } from 'react';

const FEATURES = [
  {
    icon: '💬',
    title: 'AI Chat',
    desc: 'Smart conversations with emotional intelligence',
    color: 'from-pink-500 to-rose-500',
    glow: 'rgba(236,72,153,0.4)',
  },
  {
    icon: '🎨',
    title: 'Image Gen',
    desc: 'Flux 2 Pro realistic AI image creation',
    color: 'from-purple-500 to-violet-600',
    glow: 'rgba(168,85,247,0.4)',
  },
  {
    icon: '🎵',
    title: 'Music AI',
    desc: 'Generate original songs from text',
    color: 'from-blue-500 to-cyan-500',
    glow: 'rgba(59,130,246,0.4)',
  },
  {
    icon: '🔊',
    title: 'Voice',
    desc: 'Speak & listen with DANI\'s female voice',
    color: 'from-green-500 to-emerald-500',
    glow: 'rgba(34,197,94,0.4)',
  },
  {
    icon: '⚡',
    title: 'Vibe Code',
    desc: 'Full websites generated in seconds',
    color: 'from-orange-500 to-amber-500',
    glow: 'rgba(249,115,22,0.4)',
  },
  {
    icon: '🎬',
    title: 'Video AI',
    desc: 'Text-to-video with WAN model',
    color: 'from-red-500 to-pink-500',
    glow: 'rgba(239,68,68,0.4)',
  },
];

export default function FeatureCube() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveIdx(prev => (prev + 1) % FEATURES.length);
        setIsTransitioning(false);
      }, 300);
    }, 2800);
    return () => clearInterval(intervalRef.current);
  }, []);

  const goTo = (i: number) => {
    clearInterval(intervalRef.current);
    setIsTransitioning(true);
    setTimeout(() => { setActiveIdx(i); setIsTransitioning(false); }, 200);
  };

  const feature = FEATURES[activeIdx];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Cube card */}
      <div
        className={`relative w-52 h-52 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all duration-500 cursor-default select-none`}
        style={{
          background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`,
          boxShadow: isTransitioning ? 'none' : `0 0 40px ${feature.glow}, 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`,
          transform: isTransitioning ? 'rotateY(90deg) scale(0.8)' : 'rotateY(0deg) scale(1)',
          transformStyle: 'preserve-3d',
          perspective: '1000px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Animated corner accents */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 rounded-tl-lg opacity-40"
          style={{ borderColor: feature.glow.replace('0.4)', '0.9)') }} />
        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 rounded-tr-lg opacity-40"
          style={{ borderColor: feature.glow.replace('0.4)', '0.9)') }} />
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 rounded-bl-lg opacity-40"
          style={{ borderColor: feature.glow.replace('0.4)', '0.9)') }} />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 rounded-br-lg opacity-40"
          style={{ borderColor: feature.glow.replace('0.4)', '0.9)') }} />

        {/* Glow orb */}
        <div className="absolute inset-0 rounded-3xl opacity-10"
          style={{ background: `radial-gradient(circle at 50% 40%, ${feature.glow.replace('0.4)', '0.8)')}, transparent 70%)` }} />

        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-3xl shadow-xl`}
          style={{
            boxShadow: `0 8px 32px ${feature.glow}`,
            transition: 'all 0.3s ease',
          }}
        >
          {feature.icon}
        </div>

        {/* Text */}
        <div className="text-center px-4">
          <p className={`font-black text-base text-transparent bg-clip-text bg-gradient-to-r ${feature.color}`}>
            {feature.title}
          </p>
          <p className="text-xs text-gray-400 mt-1 leading-snug">{feature.desc}</p>
        </div>

        {/* Scanning line animation */}
        <div
          className="absolute inset-x-0 h-px opacity-20"
          style={{
            background: `linear-gradient(90deg, transparent, ${feature.glow.replace('0.4)', '1)')}, transparent)`,
            animation: 'scanLine 2.5s linear infinite',
          }}
        />
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2">
        {FEATURES.map((f, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="transition-all duration-300"
            style={{
              width: i === activeIdx ? '20px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: i === activeIdx
                ? `linear-gradient(90deg, ${f.glow.replace('0.4)', '1)')}, ${FEATURES[(i + 1) % FEATURES.length].glow.replace('0.4)', '1)')})`
                : 'rgba(156,163,175,0.4)',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}
