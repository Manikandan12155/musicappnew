import React, { useState } from 'react';
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
  Trash2
} from 'lucide-react';
import { SyncedLyrics } from './SyncedLyrics';
import { SongDNA } from './SongDNA';
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
  const [artViewMode, setArtViewMode] = useState<'vinyl' | 'glass'>('vinyl');

  // Close full player on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullPlayerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsFullPlayerOpen]);

  if (!isFullPlayerOpen || !currentSong) return null;

  const isLiked = likedSongIds.includes(currentSong.id);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    seekTo(targetTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolumeState(val);
    setIsMuted(val === 0);
    audioEngine.setVolume(val);
  };

  const toggleMute = () => {
    if (isMuted) {
      audioEngine.setVolume(volume || 0.8);
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
      {/* Dynamic Ambient Looping Aurora Mesh Backdrop */}
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
            >
              <Sliders size={20} />
            </button>
            <button
              className="player-icon-btn"
              onClick={handleShare}
              title="Share Track"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigator: Cover Player / Synced Lyrics / Song DNA */}
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
              {/* Album Art / Rotating Vinyl Disc Stage */}
              <div className="artwork-stage">
                {artViewMode === 'vinyl' ? (
                  <div className={`vinyl-turntable-box ${isPlaying ? 'active-playing' : 'is-paused'}`}>
                    {/* Neon Soundwave Frequency Rings pulsing behind the record */}
                    <div className={`vinyl-pulse-ring ring-1 ${isPlaying ? 'pulsing' : ''}`} />
                    <div className={`vinyl-pulse-ring ring-2 ${isPlaying ? 'pulsing' : ''}`} />

                    {/* Realistic Vinyl Record Disc that spins continuously on loop */}
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

                    {/* Tonearm Needle */}
                    <div className={`turntable-tonearm ${isPlaying ? 'arm-on-record' : 'arm-rest'}`}>
                      <div className="tonearm-pivot" />
                      <div className="tonearm-rod" />
                      <div className="tonearm-cartridge" />
                    </div>
                  </div>
                ) : (
                  <div className={`artwork-glass-card ${isPlaying ? 'artwork-floating' : ''}`}>
                    <img
                      src={currentSong.coverUrl}
                      alt={currentSong.title}
                      className="artwork-image"
                    />
                    <div className="artwork-sheen-overlay" />
                  </div>
                )}

                {/* Quick Toggle Pill: Vinyl Spin vs Glass Art */}
                <button
                  className="art-mode-switch-btn"
                  onClick={() => setArtViewMode((prev) => (prev === 'vinyl' ? 'glass' : 'vinyl'))}
                  title={artViewMode === 'vinyl' ? 'Switch to Classic Glass Art' : 'Switch to Cosmic Vinyl Loop'}
                >
                  <span>{artViewMode === 'vinyl' ? '📀 Vinyl Spin' : '🔲 Cover Art'}</span>
                </button>
              </div>

              {/* Title & Artist & Like row */}
              <div className="meta-and-like-row">
                <div className="meta-text-block">
                  <h2 className="song-title-main">{currentSong.title}</h2>
                  <p className="song-artist-main">{currentSong.artist}</p>
                </div>
                <button
                  className={`full-like-btn ${isLiked ? 'liked' : ''}`}
                  onClick={() => toggleLikeSong(currentSong.id)}
                  title={isLiked ? 'Favorited' : 'Add to Favorites'}
                >
                  <Heart
                    size={26}
                    fill={isLiked ? '#ff2a5f' : 'none'}
                    color={isLiked ? '#ff2a5f' : 'currentColor'}
                  />
                </button>
              </div>

              {/* Progress Scrubber */}
              <div className="scrubber-section">
                <div className="scrubber-slider-wrap">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.5}
                    value={currentTime}
                    onChange={handleSeek}
                    className="scrubber-slider"
                    style={{
                      background: `linear-gradient(to right, var(--accent-color, #ed5564) ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%)`
                    }}
                  />
                </div>
                <div className="scrubber-time-row">
                  <span className="time-display">{formatTime(currentTime)}</span>
                  <span className="time-display">-{formatTime(Math.max(0, duration - currentTime))}</span>
                </div>
              </div>

              {/* Main Playback Controls */}
              <div className="main-playback-controls">
                <button
                  className={`ctrl-btn shuffle-btn ${isShuffle ? 'active-shuffle' : ''}`}
                  onClick={toggleShuffle}
                  title={isShuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                >
                  <Shuffle size={20} />
                </button>

                <button
                  className="ctrl-btn prev-btn"
                  onClick={prevSong}
                  title="Previous Track"
                >
                  <SkipBack size={26} />
                </button>

                <button
                  className="ctrl-btn primary-play-btn"
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={32} fill="currentColor" />
                  ) : (
                    <Play size={32} fill="currentColor" style={{ marginLeft: '4px' }} />
                  )}
                </button>

                <button
                  className="ctrl-btn next-btn"
                  onClick={nextSong}
                  title="Next Track"
                >
                  <SkipForward size={26} />
                </button>

                <button
                  className={`ctrl-btn repeat-btn ${repeatMode !== 'none' ? 'active-repeat' : ''}`}
                  onClick={toggleRepeat}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                </button>
              </div>

              {/* Volume Slider Section */}
              <div className="volume-slider-bar">
                <button className="vol-icon-btn" onClick={toggleMute}>
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                  style={{
                    background: `linear-gradient(to right, rgba(255,255,255,0.8) ${
                      (isMuted ? 0 : volume) * 100
                    }%, rgba(255,255,255,0.15) ${(isMuted ? 0 : volume) * 100}%)`
                  }}
                />
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
