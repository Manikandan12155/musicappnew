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
  const [showTapRipple, setShowTapRipple] = useState<boolean>(false);

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

    // Tap in center detected! (little movement & quick touch) -> Play/Pause
    if (Math.abs(dx) < 14 && dt < 320) {
      togglePlay();
      setShowTapRipple(true);
      setTimeout(() => setShowTapRipple(false), 700);
      return;
    }

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

  const videoId = (currentSong.id && currentSong.id.length === 11)
    ? currentSong.id
    : (currentSong.audioUrl && currentSong.audioUrl.includes('/api/stream/'))
    ? currentSong.audioUrl.split('/api/stream/')[1].split('?')[0]
    : null;

    return (
      <div className={`full-player-overlay mode-${playerMode}`}>
        {/* Permanent Cinematic Video Background (or Picture fallback if no video) */}
        {videoId ? (
          <div className="player-video-background">
            <iframe
              className="player-video-iframe"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1`}
              title={`${currentSong.title} Video Background`}
              allow="autoplay; encrypted-media"
            />
            <div className="player-video-vignette" />
          </div>
        ) : (
          <div className="player-picture-background">
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              className={`player-picture-backdrop-img ${isPlaying ? 'picture-live' : ''}`}
            />
            <div className="cosmic-canvas-aurora" />
            <div className="cosmic-canvas-dust" />
            <div className="player-picture-vignette" />
          </div>
        )}

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

                {/* Left & Right Liquid Glass Navigation Arrows */}
                <button
                  className="liquid-swipe-arrow arrow-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevSong();
                  }}
                  title="Previous Song"
                  aria-label="Previous track"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  className="liquid-swipe-arrow arrow-right"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextSong();
                  }}
                  title="Next Song"
                  aria-label="Next track"
                >
                  <ChevronRight size={28} />
                </button>

                {/* Open Cinematic Stage: Center card removed, tap anywhere in center to Play / Pause! */}
                <div
                  className="artwork-swipe-transform"
                  style={{
                    transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.04}deg)`,
                    transition: slideTransition,
                    opacity: 1 - Math.min(0.4, Math.abs(dragOffset) / 300)
                  }}
                >
                  <div className="open-cinematic-stage-spacer">
                    {/* Visual Tap Indicator for Play / Pause in Center */}
                    {(!isPlaying || showTapRipple) && (
                      <div className={`center-tap-play-badge ${showTapRipple ? 'ripple-animate' : ''}`}>
                        {isPlaying ? (
                          <Pause size={38} fill="currentColor" />
                        ) : (
                          <Play size={38} fill="currentColor" style={{ marginLeft: '4px' }} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Title & Artist & Favorite / Shuffle row */}
              <div className="meta-and-like-row">
                <div className="meta-text-block">
                  <h2 className="song-title-main">{currentSong.title}</h2>
                  <p className="song-artist-main">{currentSong.artist}</p>
                </div>
                <div className="meta-actions-cluster">
                  <button
                    className={`meta-action-btn shuffle-meta-btn ${isShuffle ? 'active-neon' : ''}`}
                    onClick={toggleShuffle}
                    title={isShuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                    aria-label="Toggle shuffle"
                  >
                    <Shuffle size={20} />
                    {isShuffle && <span className="active-dot" />}
                  </button>
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

              {/* Compact Liquid Glass Tool Capsule: Repeat & Volume (Play/Pause moved to Center Tap) */}
              <div className="futuristic-control-console compact-pill">
                <button
                  className={`console-btn sub-btn ${repeatMode !== 'none' ? 'active-neon' : ''}`}
                  onClick={toggleRepeat}
                  title={`Repeat: ${repeatMode}`}
                  aria-label={`Toggle repeat: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
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
