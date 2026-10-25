import React from 'react';
import { useMusic } from '../context/MusicContext';
import { X, Play, Trash2, ListMusic, Music2 } from 'lucide-react';
import { upgradeHighQualityCover, DEFAULT_LOGO } from '../utils/imageQuality';

export const QueueModal: React.FC = () => {
  const {
    queue,
    queueIndex,
    currentSong,
    isPlaying,
    isQueueOpen,
    setIsQueueOpen,
    playSong,
    removeFromQueue,
    clearQueue
  } = useMusic();

  if (!isQueueOpen) return null;

  const upcomingSongs = queue.slice(queueIndex + 1);

  return (
    <div className="queue-modal-overlay" onClick={() => setIsQueueOpen(false)}>
      <div className="queue-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="queue-sheet-header">
          <div className="queue-sheet-title-wrap">
            <ListMusic size={20} className="text-green" />
            <div>
              <h3>Up Next Queue</h3>
              <p>{upcomingSongs.length} upcoming tracks</p>
            </div>
          </div>
          <div className="queue-header-actions">
            {upcomingSongs.length > 0 && (
              <button className="clear-queue-text-btn" onClick={clearQueue}>
                Clear
              </button>
            )}
            <button className="queue-close-btn" onClick={() => setIsQueueOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="queue-sheet-body">
          {/* Currently Playing Card */}
          <div className="queue-section-box">
            <span className="queue-section-label">NOW PLAYING</span>
            {currentSong ? (
              <div className="queue-track-card now-playing-highlight">
                <img
                  src={upgradeHighQualityCover(currentSong.coverUrl, currentSong.id)}
                  alt={currentSong.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_LOGO;
                  }}
                  className="queue-track-thumb"
                />
                <div className="queue-track-meta">
                  <span className="queue-track-title">{currentSong.title}</span>
                  <span className="queue-track-artist">{currentSong.artist}</span>
                </div>
                {isPlaying && (
                  <div className="mini-equalizer-bars">
                    <span /><span /><span />
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-queue-hint">
                <Music2 size={24} />
                <span>No song playing currently</span>
              </div>
            )}
          </div>

          {/* Up Next in Queue */}
          <div className="queue-section-box">
            <span className="queue-section-label">
              NEXT IN QUEUE ({upcomingSongs.length})
            </span>

            {upcomingSongs.length === 0 ? (
              <div className="empty-queue-hint">
                <ListMusic size={32} />
                <h4>Your queue is empty</h4>
                <p>Tap "Play Next" or "Add to Queue" on any track to line up your songs!</p>
              </div>
            ) : (
              <div className="queue-tracks-list">
                {upcomingSongs.map((song, i) => {
                  const actualIndex = queueIndex + 1 + i;
                  return (
                    <div
                      key={`${song.id}-${actualIndex}`}
                      className="queue-track-card"
                      onClick={() => playSong(song, queue)}
                    >
                      <span className="queue-track-order">{i + 1}</span>
                      <img
                        src={upgradeHighQualityCover(song.coverUrl, song.id)}
                        alt={song.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_LOGO;
                        }}
                        className="queue-track-thumb"
                      />
                      <div className="queue-track-meta">
                        <span className="queue-track-title">{song.title}</span>
                        <span className="queue-track-artist">{song.artist}</span>
                      </div>
                      <button
                        className="queue-track-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(actualIndex);
                        }}
                        title="Remove from queue"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
