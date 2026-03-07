import { useEffect, useRef } from 'react';

interface ImageWatermarkProps {
  imageUrl: string;
  onWatermarked: (watermarkedUrl: string) => void;
}

export default function ImageWatermark({ imageUrl, onWatermarked }: ImageWatermarkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Add watermark
      const fontSize = Math.max(img.width * 0.03, 20);
      ctx.font = `bold ${fontSize}px Arial`;
      
      // Semi-transparent background for watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      const text = 'DANI';
      const metrics = ctx.measureText(text);
      const padding = 10;
      const x = img.width - metrics.width - padding * 2;
      const y = img.height - fontSize - padding;
      
      ctx.fillRect(x - padding, y - fontSize, metrics.width + padding * 2, fontSize + padding * 2);
      
      // Draw text
      ctx.fillStyle = '#a855f7';
      ctx.fillText(text, x, y);

      // Convert to blob and create URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          onWatermarked(url);
        }
      }, 'image/png');
    };

    img.src = imageUrl;
  }, [imageUrl, onWatermarked]);

  return <canvas ref={canvasRef} style={{ display: 'none' }} />;
}
