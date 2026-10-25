import React, { useState, useRef, useMemo, useCallback } from 'react';

interface WaveformTimelineProps {
  duration: number;
  currentTime: number;
  onSeek: (seconds: number) => void;
  songId: string;
  songTitle: string;
  isPlaying: boolean;
}

// Generate realistic, deterministic waveform bars seeded by song ID & title
function generateSongWaveform(songId: string, title: string, barCount: number = 60): number[] {
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
    // Macro envelope: lower at start and end, energetic peaks in chorus (35% - 75%)
    let envelope = Math.sin(progress * Math.PI);
    if (progress > 0.3 && progress < 0.75) {
      envelope = Math.min(1, envelope * 1.35);
    }

    // Micro pseudo-random harmonic oscillation
    const freq1 = Math.sin(i * 0.75 + (absSeed % 17)) * 0.3;
    const freq2 = Math.cos(i * 1.6 + (absSeed % 23)) * 0.25;
    const freq3 = Math.sin(i * 3.2 + (absSeed % 31)) * 0.15;
    const noise = Math.abs(freq1 + freq2 + freq3);

    const rawHeight = envelope * 0.55 + noise * 0.45;
    const clamped = Math.max(0.18, Math.min(1.0, rawHeight));
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
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubPercent, setScrubPercent] = useState<number>(0);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);

  // Memoized deterministic waveform for this exact song
  const bars = useMemo(() => {
    return generateSongWaveform(songId, songTitle, 62);
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

  const getPositionFromEvent = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Prevent parent swipe handler
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
    <div className="waveform-timeline-container" onClick={(e) => e.stopPropagation()}>
      {/* Waveform Scrubber Surface */}
      <div
        ref={containerRef}
        className={`waveform-track-area ${isScrubbing ? 'is-scrubbing' : ''}`}
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
        {/* Sequence of Vertical Waveform Bars */}
        <div className="waveform-bars-wrapper">
          {bars.map((heightMultiplier, index) => {
            const barProgress = index / (bars.length - 1);
            const isPlayed = barProgress <= activeProgress;
            const isHovered = hoverPercent !== null && barProgress <= hoverPercent;

            return (
              <div
                key={index}
                className={`wave-bar ${isPlayed ? 'bar-played' : 'bar-unplayed'} ${
                  isHovered && !isPlayed ? 'bar-hovered' : ''
                } ${isPlaying && isPlayed ? 'bar-alive' : ''}`}
                style={{
                  height: `${Math.round(heightMultiplier * 100)}%`
                }}
              />
            );
          })}
        </div>

        {/* Neon Glow Playhead Indicator */}
        <div
          className="waveform-playhead"
          style={{ left: `${activeProgress * 100}%` }}
        >
          <div className="playhead-line" />
          <div className="playhead-glow-dot" />
        </div>

        {/* Hover Scrubbing Timestamp Tooltip */}
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

      {/* Time Display Bar */}
      <div className="waveform-time-row">
        <span className="time-metric elapsed-time">{formatTime(currentDisplayTime)}</span>
        <div className="waveform-center-badge">
          <span className="live-wave-dot" />
          <span>WAVEFORM TIMELINE</span>
        </div>
        <span className="time-metric remaining-time">-{formatTime(remainingTime)}</span>
      </div>
    </div>
  );
};
