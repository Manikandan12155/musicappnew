import React from 'react';
import { useMusic } from '../context/MusicContext';
import { Play, Pause, SkipForward, Heart, Maximize2, ListMusic } from 'lucide-react';
import { upgradeHighQualityCover, DEFAULT_LOGO } from '../utils/imageQuality';

export const MiniPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextSong,
    likedSongIds,
    toggleLikeSong,
    setIsFullPlayerOpen,
    setIsQueueOpen,
    queue,
    playerMode
  } = useMusic();

  if (!currentSong) return null;

  const isLiked = likedSongIds.includes(currentSong.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`mini-player-pill mode-${playerMode}`}>
      {/* Top micro progress bar */}
      <div className="mini-progress-track">
        <div className="mini-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="mini-player-content" onClick={() => setIsFullPlayerOpen(true)}>
        <div className="mini-artwork-wrap">
          <img
            src={upgradeHighQualityCover(currentSong.coverUrl, currentSong.id)}
            alt={currentSong.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_LOGO;
            }}
            className={`mini-artwork ${isPlaying ? 'spinning-artwork' : ''}`}
          />
          {isPlaying && <div className="mini-music-eq-waves">
            <span /><span /><span />
          </div>}
        </div>

        <div className="mini-meta">
          <div className="mini-title-row">
            <span className="mini-title">{currentSong.title}</span>
            {currentSong.year && <span className="mini-year">{currentSong.year}</span>}
          </div>
          <span className="mini-artist">{currentSong.artist}</span>
        </div>
      </div>

      <div className="mini-controls" onClick={(e) => e.stopPropagation()}>
        <button
          className={`mini-action-btn like-btn ${isLiked ? 'liked' : ''}`}
          onClick={() => toggleLikeSong(currentSong.id)}
          title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={18} fill={isLiked ? '#ff2a5f' : 'none'} color={isLiked ? '#ff2a5f' : 'currentColor'} />
        </button>

        <button
          className="mini-action-btn play-pause-btn"
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>

        <button
          className="mini-action-btn next-btn"
          onClick={nextSong}
          title="Next track"
        >
          <SkipForward size={18} />
        </button>

        <button
          className="mini-action-btn queue-btn"
          onClick={() => setIsQueueOpen(true)}
          title={`Up Next Queue (${queue.length})`}
        >
          <ListMusic size={17} />
        </button>

        <button
          className="mini-action-btn expand-btn"
          onClick={() => setIsFullPlayerOpen(true)}
          title="Open Full Player"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
};
