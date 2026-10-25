import React, { useState, useEffect, useRef } from 'react';
import { useMusic } from '../context/MusicContext';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  Sliders,
  AlignLeft,
  Dna,
  Disc3,
  Share2,
  ListMusic,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SyncedLyrics } from './SyncedLyrics';
import { SongDNA } from './SongDNA';
import { WaveformTimeline } from './WaveformTimeline';
import { audioEngine } from '../services/audioEngine';

export const FullPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextSong,
    prevSong,
    seekTo,
    isFullPlayerOpen,
    setIsFullPlayerOpen,
    activePlayerTab,
    setActivePlayerTab,
    playerMode,
    repeatMode,
    toggleRepeat,
    isShuffle,
    toggleShuffle,
    likedSongIds,
    toggleLikeSong,
    setIsEqualizerOpen,
    queue,
    queueIndex,
    playSong,
    removeFromQueue,
    clearQueue
  } = useMusic();

  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVolOpen, setIsVolOpen] = useState<boolean>(false);
  const [artViewMode, setArtViewMode] = useState<'vinyl' | 'glass'>('vinyl');

  // Swipeable gesture state for horizontal song navigation
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [slideTransition, setSlideTransition] = useState<string>('none');
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Live beat-reactive scale metric for ambient aura
  const [beatScale, setBeatScale] = useState<number>(1);

  // Real-time beat-reactive pulse hook
  useEffect(() => {
    if (!isPlaying || !isFullPlayerOpen || activePlayerTab !== 'player') {
      setBeatScale(1);
      return;
    }
    let animId: number;
    const updateBeat = () => {
      const metrics = audioEngine.getAudioMetrics();
      const target = 1 + (metrics.bass || 0) * 0.16 + (metrics.energy || 0) * 0.08;
      setBeatScale((prev) => prev + (target - prev) * 0.25);
      animId = requestAnimationFrame(updateBeat);
    };
    animId = requestAnimationFrame(updateBeat);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isFullPlayerOpen, activePlayerTab]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullPlayerOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        setIsFullPlayerOpen(false);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        if (e.shiftKey) seekTo(Math.min(duration, currentTime + 10));
        else nextSong();
      } else if (e.key === 'ArrowLeft') {
        if (e.shiftKey) seekTo(Math.max(0, currentTime - 10));
        else prevSong();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullPlayerOpen, setIsFullPlayerOpen, togglePlay, nextSong, prevSong, seekTo, duration, currentTime]);

  if (!isFullPlayerOpen || !currentSong) return null;

  const isLiked = likedSongIds.includes(currentSong.id);

  // Swipe gesture handlers
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, .art-mode-switch-btn')) return;
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsDragging(true);
    setSlideTransition('none');
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || !isDragging) return;
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
      setDragOffset(dx * 0.42);
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || !isDragging) return;
    const dx = e.clientX - touchStartRef.current.x;
    const dt = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(dx) / Math.max(1, dt);

    setIsDragging(false);
    touchStartRef.current = null;

    if (dx < -55 || (dx < -25 && velocity > 0.35)) {
      // Swiped Left -> Next Song
      setSlideTransition('transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease');
      setDragOffset(-100);
      setTimeout(() => {
        nextSong();
        setDragOffset(60);
        setTimeout(() => {
          setSlideTransition('transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.2)');
          setDragOffset(0);
        }, 30);
      }, 180);
    } else if (dx > 55 || (dx > 25 && velocity > 0.35)) {
      // Swiped Right -> Previous Song
      setSlideTransition('transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease');
      setDragOffset(100);
      setTimeout(() => {
        prevSong();
        setDragOffset(-60);
        setTimeout(() => {
          setSlideTransition('transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.2)');
          setDragOffset(0);
        }, 30);
      }, 180);
    } else {
      // Spring back to center
      setSlideTransition('transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275)');
      setDragOffset(0);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolumeState(val);
    setIsMuted(val === 0);
    audioEngine.setVolume(val);
  };

  const toggleMute = () => {
    if (isMuted) {
      audioEngine.setVolume(volume || 0.85);
      setIsMuted(false);
    } else {
      audioEngine.setVolume(0);
      setIsMuted(true);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: currentSong.title,
        text: `Listening to ${currentSong.title} by ${currentSong.artist} on Space Music`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${currentSong.title} - ${currentSong.artist}`);
      alert(`Copied song name to clipboard: ${currentSong.title}`);
    }
  };

  return (
    <div className={`full-player-overlay mode-${playerMode}`}>
      {/* Dynamic Ambient Mesh Backdrop */}
      <div
        className={`ambient-backdrop-blur ${isPlaying ? 'ambient-live' : ''}`}
        style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, rgba(29, 185, 84, 0.45) 0%, transparent 60%),
                            radial-gradient(circle at 80% 80%, rgba(57, 255, 20, 0.35) 0%, transparent 60%),
                            url(${currentSong.coverUrl})`
        }}
      >
        <div className="cosmic-canvas-aurora" />
        <div className="cosmic-canvas-dust" />
      </div>

      <div className="full-player-container">
        {/* Top Header Bar */}
        <div className="player-top-bar">
          <button
            className="player-icon-btn minimize-btn"
            onClick={() => setIsFullPlayerOpen(false)}
            title="Minimize Player"
            aria-label="Minimize Player"
          >
            <ChevronDown size={28} />
          </button>

          <div className="player-top-info">
            <span className="player-top-eyebrow">NOW PLAYING</span>
            <span className="player-top-album">{currentSong.album || 'Space Stream'}</span>
          </div>

          <div className="player-top-actions">
            <button
              className="player-icon-btn"
              onClick={() => setIsEqualizerOpen(true)}
              title="Open Equalizer"
              aria-label="Open Equalizer"
            >
              <Sliders size={20} />
            </button>
            <button
              className="player-icon-btn"
              onClick={handleShare}
              title="Share Track"
              aria-label="Share Track"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigator: Cover Player / Synced Lyrics / Song DNA / Queue */}
        <div className="player-nav-tabs">
          <button
            className={`player-tab-pill ${activePlayerTab === 'player' ? 'active' : ''}`}
            onClick={() => setActivePlayerTab('player')}
          >
            <Disc3 size={16} />
            <span>Player</span>
          </button>

          <button
            className={`player-tab-pill ${activePlayerTab === 'lyrics' ? 'active' : ''}`}
            onClick={() => setActivePlayerTab('lyrics')}
          >
            <AlignLeft size={16} />
            <span>Synced Lyrics</span>
          </button>

          <button
            className={`player-tab-pill ${activePlayerTab === 'dna' ? 'active' : ''}`}
            onClick={() => setActivePlayerTab('dna')}
          >
            <Dna size={16} />
            <span>Music DNA</span>
          </button>

          <button
            className={`player-tab-pill ${activePlayerTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActivePlayerTab('queue')}
          >
            <ListMusic size={16} />
            <span>Queue ({queue.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="player-body">
          {activePlayerTab === 'player' && (
            <div className="player-view-main">
              {/* Center-Focused Artwork Stage with Horizontal Swipe Support */}
              <div
                className="artwork-stage"
                onPointerDown={handleStagePointerDown}
                onPointerMove={handleStagePointerMove}
                onPointerUp={handleStagePointerUp}
                onPointerCancel={handleStagePointerUp}
                style={{
                  touchAction: 'pan-y'
                }}
              >
                {/* Swipe Direction Cues */}
                <div className={`swipe-cue cue-left ${dragOffset > 25 ? 'visible' : ''}`}>
                  <ChevronLeft size={22} />
                  <span>PREV</span>
                </div>
                <div className={`swipe-cue cue-right ${dragOffset < -25 ? 'visible' : ''}`}>
                  <span>NEXT</span>
                  <ChevronRight size={22} />
                </div>

                {/* Animated Transform Container for smooth swiping */}
                <div
                  className="artwork-swipe-transform"
                  style={{
                    transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.04}deg)`,
                    transition: slideTransition,
                    opacity: 1 - Math.min(0.4, Math.abs(dragOffset) / 300)
                  }}
                >
                  {artViewMode === 'vinyl' ? (
                    <div className={`vinyl-turntable-box ${isPlaying ? 'active-playing' : 'is-paused'}`}>
                      {/* Beat-Reactive Pulsing Rings in Neon Green */}
                      <div
                        className="vinyl-pulse-ring ring-1 pulsing"
                        style={{
                          transform: `scale(${beatScale})`,
                          borderColor: isPlaying ? 'rgba(57, 255, 20, 0.45)' : 'rgba(255, 255, 255, 0.15)',
                          boxShadow: isPlaying ? `0 0 25px rgba(57, 255, 20, ${0.25 * beatScale})` : 'none'
                        }}
                      />
                      <div
                        className="vinyl-pulse-ring ring-2 pulsing"
                        style={{
                          transform: `scale(${1 + (beatScale - 1) * 1.5})`
                        }}
                      />

                      {/* Continuous spinning vinyl disc */}
                      <div className={`vinyl-record-disc ${isPlaying ? 'spinning' : 'paused'}`}>
                        <div className="vinyl-grooves-layer" />
                        <div className="vinyl-conic-sheen" />
                        <div className="vinyl-center-label">
                          <img
                            src={currentSong.coverUrl}
                            alt={currentSong.title}
                            className="vinyl-artwork-image"
                          />
                          <div className="vinyl-center-hole" />
                        </div>
                      </div>

                      {/* Realistic Tonearm Needle */}
                      <div className={`turntable-tonearm ${isPlaying ? 'arm-on-record' : 'arm-rest'}`}>
                        <div className="tonearm-pivot" />
                        <div className="tonearm-rod" />
                        <div className="tonearm-cartridge" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`artwork-glass-card ${isPlaying ? 'artwork-floating' : ''}`}
                      style={{
                        boxShadow: isPlaying
                          ? `0 20px 50px rgba(0, 0, 0, 0.8), 0 0 ${Math.round(25 * beatScale)}px rgba(57, 255, 20, 0.35)`
                          : '0 20px 50px rgba(0, 0, 0, 0.7)'
                      }}
                    >
                      <img
                        src={currentSong.coverUrl}
                        alt={currentSong.title}
                        className="artwork-image"
                      />
                      <div className="artwork-sheen-overlay" />
                    </div>
                  )}
                </div>

                {/* Switch between Vinyl Turntable & Glass Card view */}
                <div className="stage-action-bar">
                  <button
                    className="art-mode-switch-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArtViewMode((prev) => (prev === 'vinyl' ? 'glass' : 'vinyl'));
                    }}
                    title={artViewMode === 'vinyl' ? 'Switch to Glass Cover Art' : 'Switch to Cosmic Vinyl'}
                  >
                    <span>{artViewMode === 'vinyl' ? '📀 Vinyl Turntable' : '🔲 Cover Card'}</span>
                  </button>
                  <span className="swipe-instruction-tag">Swipe left/right to change track</span>
                </div>
              </div>

              {/* Title & Artist & Favorite row */}
              <div className="meta-and-like-row">
                <div className="meta-text-block">
                  <h2 className="song-title-main">{currentSong.title}</h2>
                  <p className="song-artist-main">{currentSong.artist}</p>
                </div>
                <button
                  className={`full-like-btn ${isLiked ? 'liked' : ''}`}
                  onClick={() => toggleLikeSong(currentSong.id)}
                  title={isLiked ? 'Favorited' : 'Add to Favorites'}
                  aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart
                    size={26}
                    fill={isLiked ? '#ff2a5f' : 'none'}
                    color={isLiked ? '#ff2a5f' : 'currentColor'}
                  />
                </button>
              </div>

              {/* Merged Live Audio-Reactive Waveform Timeline with Inside Normal & Reverse Times */}
              <WaveformTimeline
                duration={duration}
                currentTime={currentTime}
                onSeek={seekTo}
                songId={currentSong.id}
                songTitle={currentSong.title}
                isPlaying={isPlaying}
              />

              {/* Futuristic Cyber-Control Capsule with Integrated Smart Volume Alternative */}
              <div className="futuristic-control-console">
                <button
                  className={`console-btn sub-btn ${isShuffle ? 'active-neon' : ''}`}
                  onClick={toggleShuffle}
                  title={isShuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                  aria-label="Toggle shuffle"
                >
                  <Shuffle size={19} />
                  {isShuffle && <span className="active-dot" />}
                </button>

                <button
                  className="console-btn step-btn"
                  onClick={prevSong}
                  title="Previous Track (Swipe Right on Artwork)"
                  aria-label="Previous track"
                >
                  <SkipBack size={24} />
                </button>

                <button
                  className={`console-btn primary-holo-play ${isPlaying ? 'is-playing' : ''}`}
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  <div className="holo-ripple-ring" />
                  {isPlaying ? (
                    <Pause size={28} fill="currentColor" />
                  ) : (
                    <Play size={28} fill="currentColor" style={{ marginLeft: '3px' }} />
                  )}
                </button>

                <button
                  className="console-btn step-btn"
                  onClick={nextSong}
                  title="Next Track (Swipe Left on Artwork)"
                  aria-label="Next track"
                >
                  <SkipForward size={24} />
                </button>

                <button
                  className={`console-btn sub-btn ${repeatMode !== 'none' ? 'active-neon' : ''}`}
                  onClick={toggleRepeat}
                  title={`Repeat: ${repeatMode}`}
                  aria-label={`Toggle repeat: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? <Repeat1 size={19} /> : <Repeat size={19} />}
                  {repeatMode !== 'none' && <span className="active-dot" />}
                </button>

                {/* Smart Volume Alternative: Compact Trigger with Expandable Neon Popover */}
                <div className={`console-vol-wrapper ${isVolOpen ? 'open' : ''}`}>
                  <button
                    className={`console-btn vol-trigger-btn ${isMuted || volume === 0 ? 'muted' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVolOpen(!isVolOpen);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    title={isMuted ? 'Volume: Muted (Click to open slider)' : `Volume: ${Math.round(volume * 100)}% (Click to open slider)`}
                    aria-label="Volume setting"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>

                  {/* Expandable Neon Volume Popover */}
                  {isVolOpen && (
                    <div className="vol-popover-card" onClick={(e) => e.stopPropagation()}>
                      <div className="vol-popover-header">
                        <span>VOLUME</span>
                        <span className="vol-percent-text">{isMuted ? 'MUTED' : `${Math.round(volume * 100)}%`}</span>
                      </div>
                      <div className="vol-popover-slider-row">
                        <button className="vol-pop-mute-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                          {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="vol-pop-range"
                          style={{
                            background: `linear-gradient(to right, #39FF14 ${
                              (isMuted ? 0 : volume) * 100
                            }%, rgba(255,255,255,0.18) ${(isMuted ? 0 : volume) * 100}%)`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activePlayerTab === 'lyrics' && <SyncedLyrics />}

          {activePlayerTab === 'dna' && <SongDNA />}

          {activePlayerTab === 'queue' && (
            <div className="player-queue-view">
              <div className="queue-header-row">
                <span className="queue-eyebrow">NOW PLAYING</span>
                {queue.slice(queueIndex + 1).length > 0 && (
                  <button className="clear-queue-btn" onClick={clearQueue}>
                    Clear Upcoming
                  </button>
                )}
              </div>
              <div className="queue-now-playing-card">
                <img src={currentSong.coverUrl} alt={currentSong.title} className="queue-thumb" />
                <div className="queue-song-info">
                  <span className="queue-song-title">{currentSong.title}</span>
                  <span className="queue-song-artist">{currentSong.artist}</span>
                </div>
                {isPlaying && (
                  <div className="mini-equalizer-bars">
                    <span /><span /><span />
                  </div>
                )}
              </div>

              <div className="queue-upcoming-section">
                <span className="queue-eyebrow">
                  UP NEXT ({Math.max(0, queue.length - queueIndex - 1)})
                </span>
                <div className="queue-items-list">
                  {queue.slice(queueIndex + 1).length === 0 ? (
                    <div className="empty-queue-msg">
                      <span>No more upcoming tracks. Use "Play Next" on any song to add it!</span>
                    </div>
                  ) : (
                    queue.slice(queueIndex + 1).map((s, idx) => {
                      const actualIdx = queueIndex + 1 + idx;
                      return (
                        <div
                          key={`${s.id}-${actualIdx}`}
                          className="queue-item-row"
                          onClick={() => playSong(s, queue)}
                        >
                          <span className="queue-pos">{idx + 1}</span>
                          <img src={s.coverUrl} alt={s.title} className="queue-thumb-small" />
                          <div className="queue-item-details">
                            <span className="queue-item-title">{s.title}</span>
                            <span className="queue-item-artist">{s.artist}</span>
                          </div>
                          <button
                            className="queue-remove-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromQueue(actualIdx);
                            }}
                            title="Remove from queue"
                            aria-label="Remove from queue"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
