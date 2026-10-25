import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';

interface WaveformTimelineProps {
  duration: number;
  currentTime: number;
  onSeek: (seconds: number) => void;
  songId: string;
  songTitle: string;
  isPlaying: boolean;
}

// Deterministic audio waveform profile seeded by song ID & title
function generateSongWaveform(songId: string, title: string, barCount: number = 64): number[] {
  let seed = 0;
  const str = `${songId}-${title}`;
  for (let i = 0; i < str.length; i++) {
    seed = (seed << 5) - seed + str.charCodeAt(i);
    seed |= 0;
  }

  const bars: number[] = [];
  const absSeed = Math.abs(seed) || 12345;

  for (let i = 0; i < barCount; i++) {
    const progress = i / barCount;
    let envelope = Math.sin(progress * Math.PI);
    if (progress > 0.28 && progress < 0.78) {
      envelope = Math.min(1, envelope * 1.32);
    }

    const freq1 = Math.sin(i * 0.75 + (absSeed % 17)) * 0.3;
    const freq2 = Math.cos(i * 1.6 + (absSeed % 23)) * 0.22;
    const freq3 = Math.sin(i * 3.1 + (absSeed % 31)) * 0.14;
    const noise = Math.abs(freq1 + freq2 + freq3);

    const rawHeight = envelope * 0.58 + noise * 0.42;
    const clamped = Math.max(0.18, Math.min(0.96, rawHeight));
    bars.push(clamped);
  }

  return bars;
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = ({
  duration,
  currentTime,
  onSeek,
  songId,
  songTitle,
  isPlaying
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubPercent, setScrubPercent] = useState<number>(0);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);

  // Deterministic master curve for this song
  const bars = useMemo(() => {
    return generateSongWaveform(songId, songTitle, 64);
  }, [songId, songTitle]);

  const activeProgress = isScrubbing
    ? scrubPercent
    : duration > 0
    ? Math.min(1, Math.max(0, currentTime / duration))
    : 0;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // High-performance canvas loop: Merges real-time frequency reactivity + waveform timeline!
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let active = true;

    // Smooth heights array for organic frequency bouncing
    const currentBars = [...bars];

    const render = () => {
      if (!active) return;

      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const freqData = audioEngine.getFrequencyData();
      const count = bars.length;
      const barWidth = Math.max(2, (displayWidth / count) * 0.62);
      const gap = (displayWidth - barWidth * count) / (count - 1);

      for (let i = 0; i < count; i++) {
        const baseHeight = bars[i];
        const binIndex = Math.min(freqData.length - 1, Math.floor((i / count) * freqData.length));
        const rawByte = isPlaying ? (freqData[binIndex] || 0) : 0;
        const liveMod = (rawByte / 255) * 0.4;
        const targetHeight = Math.max(0.14, Math.min(1.0, baseHeight * 0.65 + liveMod));

        // Smooth physics interpolation
        currentBars[i] += (targetHeight - currentBars[i]) * 0.28;

        const barProgress = i / (count - 1);
        const isPlayed = barProgress <= activeProgress;
        const isHovered = hoverPercent !== null && barProgress <= hoverPercent;

        const x = i * (barWidth + gap);
        // Anchor bottom baseline: bottom line stays perfectly flat, top edges bounce/jump upwards!
        const bottomMargin = 6;
        const maxBarH = displayHeight - bottomMargin - 12;
        const barH = Math.max(4, currentBars[i] * maxBarH);
        const y = displayHeight - bottomMargin - barH;
        const radius = Math.min(barWidth / 2, 2.5);

        // Color styling: Played = Neon Green (#39FF14), Unplayed = Muted Dark Emerald
        if (isPlayed) {
          ctx.fillStyle = '#39FF14';
          ctx.shadowColor = '#39FF14';
          ctx.shadowBlur = isPlaying ? 6 : 2;
        } else if (isHovered) {
          ctx.fillStyle = 'rgba(57, 255, 20, 0.48)';
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = 'rgba(57, 255, 20, 0.2)';
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        // Rounded tops with flat bottom anchored to baseline
        ctx.roundRect(x, y, barWidth, barH, [radius, radius, 1, 1]);
        ctx.fill();
      }

      // Draw active playhead needle
      const playheadX = activeProgress * displayWidth;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#39FF14';
      ctx.shadowBlur = 10;
      ctx.fillRect(Math.max(0, playheadX - 1), 4, 2, displayHeight - 8);

      // Top beacon dot
      ctx.beginPath();
      ctx.arc(playheadX, 6, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#39FF14';
      ctx.fill();

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      active = false;
      if (animId) cancelAnimationFrame(animId);
    };
  }, [bars, activeProgress, hoverPercent, isPlaying]);

  const getPositionFromEvent = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Stop parent horizontal swipe from triggering
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    const pos = getPositionFromEvent(e.clientX);
    setScrubPercent(pos);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      e.stopPropagation();
      const pos = getPositionFromEvent(e.clientX);
      setScrubPercent(pos);
    } else {
      const pos = getPositionFromEvent(e.clientX);
      setHoverPercent(pos);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      e.stopPropagation();
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsScrubbing(false);
      const targetTime = scrubPercent * duration;
      onSeek(targetTime);
    }
  };

  const handlePointerLeave = () => {
    if (!isScrubbing) {
      setHoverPercent(null);
    }
  };

  const currentDisplayTime = isScrubbing ? scrubPercent * duration : currentTime;
  const remainingTime = Math.max(0, duration - currentDisplayTime);

  return (
    <div className="unified-waveform-wrapper" onClick={(e) => e.stopPropagation()}>
      {/* Waveform Scrubber Surface with Inside Times */}
      <div
        ref={containerRef}
        className={`unified-waveform-track ${isScrubbing ? 'is-scrubbing' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        role="slider"
        aria-label="Audio waveform progress timeline"
        aria-valuemin={0}
        aria-valuemax={duration || 100}
        aria-valuenow={currentDisplayTime}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
          if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
        }}
      >
        {/* Real-time Frequency + Waveform Canvas */}
        <canvas ref={canvasRef} className="waveform-live-canvas" />

        {/* Normal Elapsed Time Badge INSIDE Left */}
        <div className="waveform-inside-badge time-normal">
          <span className="inside-badge-dot" />
          <span>{formatTime(currentDisplayTime)}</span>
        </div>

        {/* Reverse Remaining Time Badge INSIDE Right */}
        <div className="waveform-inside-badge time-reverse">
          <span>-{formatTime(remainingTime)}</span>
        </div>

        {/* Hover Scrubbing Needle Tooltip */}
        {hoverPercent !== null && !isScrubbing && (
          <div
            className="waveform-hover-needle"
            style={{ left: `${hoverPercent * 100}%` }}
          >
            <div className="hover-time-tag">
              {formatTime(hoverPercent * duration)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
