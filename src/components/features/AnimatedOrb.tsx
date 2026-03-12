import { useEffect, useRef } from 'react';

interface AnimatedOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
}

interface EnergyRibbon {
  points: Array<{ x: number; y: number; vx: number; vy: number }>;
  color: string;
  alpha: number;
  width: number;
}

export default function AnimatedOrb({ isListening, isSpeaking, isProcessing }: AnimatedOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const ribbonsRef = useRef<EnergyRibbon[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size - smaller orb
    const size = 240;
    canvas.width = size;
    canvas.height = size;
    const centerX = size / 2;
    const centerY = size / 2;

    // Initialize energy ribbons
    if (ribbonsRef.current.length === 0) {
      const numRibbons = 5;
      for (let i = 0; i < numRibbons; i++) {
        const points = [];
        const baseAngle = (Math.PI * 2 * i) / numRibbons;
        for (let j = 0; j < 20; j++) {
          const angle = baseAngle + (j / 20) * Math.PI * 2;
          const radius = 50 + Math.random() * 20;
          points.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5
          });
        }
        ribbonsRef.current.push({
          points,
          color: i % 2 === 0 ? '#ec4899' : '#f472b6',
          alpha: 0.6 + Math.random() * 0.3,
          width: 2 + Math.random() * 2
        });
      }
    }

    let frame = 0;
    const baseRadius = 55;

    const animate = () => {
      // Clear with black background for better contrast
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, size, size);
      frame++;

      // Determine state
      const isActive = isListening || isSpeaking || isProcessing;
      const intensity = isSpeaking ? 1.8 : isListening ? 1.3 : isProcessing ? 1.1 : 0.5;
      
      // Draw outer glow aura - pink focused
      for (let i = 0; i < 4; i++) {
        const glowRadius = baseRadius + 25 + i * 20 + Math.sin(frame * 0.04 + i) * 8;
        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, glowRadius);
        
        gradient.addColorStop(0, 'rgba(236, 72, 153, 0)');
        gradient.addColorStop(0.5, `rgba(236, 72, 153, ${(0.12 - i * 0.03) * intensity})`);
        gradient.addColorStop(0.8, `rgba(168, 85, 247, ${(0.08 - i * 0.02) * intensity})`);
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update and draw energy ribbons
      if (isActive) {
        ribbonsRef.current.forEach((ribbon, ribbonIndex) => {
          const movementSpeed = isSpeaking ? 0.8 : isListening ? 0.5 : 0.3;
          
          // Update ribbon points with fluid motion
          ribbon.points.forEach((point, i) => {
            const angle = Math.atan2(point.y - centerY, point.x - centerX);
            const currentRadius = Math.sqrt(
              Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2)
            );
            
            // Orbital movement with wave
            const targetRadius = baseRadius + 8 + Math.sin(frame * 0.08 + i * 0.3 + ribbonIndex) * 15 * intensity;
            const radiusDiff = targetRadius - currentRadius;
            
            point.vx = Math.cos(angle) * radiusDiff * 0.02;
            point.vy = Math.sin(angle) * radiusDiff * 0.02;
            
            // Add tangential velocity for rotation
            const tangentAngle = angle + Math.PI / 2;
            point.vx += Math.cos(tangentAngle) * movementSpeed * 0.015;
            point.vy += Math.sin(tangentAngle) * movementSpeed * 0.015;
            
            // Add noise
            point.vx += (Math.random() - 0.5) * 0.2 * intensity;
            point.vy += (Math.random() - 0.5) * 0.2 * intensity;
            
            // Apply velocity with damping
            point.x += point.vx;
            point.y += point.vy;
            point.vx *= 0.95;
            point.vy *= 0.95;
          });
          
          // Draw smooth ribbon with glow
          ctx.save();
          ctx.globalAlpha = ribbon.alpha * intensity;
          ctx.strokeStyle = ribbon.color;
          ctx.lineWidth = ribbon.width * intensity;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Add glow effect
          ctx.shadowColor = ribbon.color;
          ctx.shadowBlur = 15 * intensity;
          
          ctx.beginPath();
          ctx.moveTo(ribbon.points[0].x, ribbon.points[0].y);
          
          // Draw smooth curves through points
          for (let i = 1; i < ribbon.points.length - 2; i++) {
            const xc = (ribbon.points[i].x + ribbon.points[i + 1].x) / 2;
            const yc = (ribbon.points[i].y + ribbon.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(ribbon.points[i].x, ribbon.points[i].y, xc, yc);
          }
          
          // Connect back to start for closed loop
          const lastPoint = ribbon.points[ribbon.points.length - 1];
          const firstPoint = ribbon.points[0];
          ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, firstPoint.x, firstPoint.y);
          
          ctx.stroke();
          ctx.restore();
        });
      }

      // Draw central glow sphere with hollow center
      const innerRadius = baseRadius * 0.4;
      const outerRadius = baseRadius + (isActive ? Math.sin(frame * 0.1) * 5 : 0);
      
      // Outer glow
      const glowGradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
      glowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
      glowGradient.addColorStop(0.3, `rgba(236, 72, 153, ${0.4 * intensity})`);
      glowGradient.addColorStop(0.6, `rgba(244, 114, 182, ${0.6 * intensity})`);
      glowGradient.addColorStop(0.85, `rgba(236, 72, 153, ${0.3 * intensity})`);
      glowGradient.addColorStop(1, 'rgba(236, 72, 153, 0)');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Add shimmer highlights when speaking
      if (isSpeaking) {
        for (let i = 0; i < 8; i++) {
          const angle = (frame * 0.05 + i * Math.PI / 4);
          const highlightRadius = baseRadius * 0.7;
          const x = centerX + Math.cos(angle) * highlightRadius;
          const y = centerY + Math.sin(angle) * highlightRadius;
          
          const highlightGradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
          highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
          highlightGradient.addColorStop(0.5, 'rgba(244, 114, 182, 0.3)');
          highlightGradient.addColorStop(1, 'rgba(236, 72, 153, 0)');
          
          ctx.fillStyle = highlightGradient;
          ctx.beginPath();
          ctx.arc(x, y, 15, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening, isSpeaking, isProcessing]);

  return (
    <div className="relative w-[240px] h-[240px] flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ background: '#000' }}
      />
    </div>
  );
}
