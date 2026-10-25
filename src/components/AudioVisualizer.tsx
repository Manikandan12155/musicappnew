import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying, barCount = 28 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const smoothedHeights = useRef<number[]>(new Array(barCount).fill(4));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;

    const render = () => {
      if (!active) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const freqData = audioEngine.getFrequencyData();
      const currentBars = smoothedHeights.current;

      const barWidth = (width / barCount) * 0.6;
      const barGap = (width - barWidth * barCount) / (barCount - 1);

      // Create neon gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#10b981');   // emerald
      gradient.addColorStop(0.6, '#39FF14'); // neon lime
      gradient.addColorStop(1, '#ffffff');   // bright peak

      for (let i = 0; i < barCount; i++) {
        // Map bar index to frequency bin
        const binIndex = Math.min(freqData.length - 1, Math.floor((i / barCount) * freqData.length));
        const rawByte = isPlaying ? (freqData[binIndex] || 0) : 0;
        const targetHeight = Math.max(3, (rawByte / 255) * height * 0.92);

        // Exponential smoothing for snappy yet organic physics
        currentBars[i] += (targetHeight - currentBars[i]) * 0.28;

        const x = i * (barWidth + barGap);
        const barH = currentBars[i];
        const y = height - barH;
        const radius = Math.min(barWidth / 2, 2.5);

        // Draw rounded bar
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, [radius, radius, 0, 0]);
        ctx.fill();

        // Neon Glow on peak
        if (isPlaying && rawByte > 140) {
          ctx.shadowColor = '#39FF14';
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, barCount]);

  return (
    <div className="audio-visualizer-box">
      <canvas
        ref={canvasRef}
        width={340}
        height={38}
        className="visualizer-canvas"
      />
    </div>
  );
};
