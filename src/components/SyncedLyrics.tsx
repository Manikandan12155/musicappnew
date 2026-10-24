import React, { useEffect, useRef, useState } from 'react';
import { useMusic } from '../context/MusicContext';
import { Languages, Volume2, Music2 } from 'lucide-react';

export const SyncedLyrics: React.FC = () => {
  const { currentSong, currentTime, currentLyricIndex, seekTo } = useMusic();
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active lyric line smoothly
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentLyricIndex]);

  const lyrics = currentSong?.lyrics;

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="no-lyrics-container">
        <Music2 size={48} className="no-lyrics-icon" />
        <h3>Instrumental / No Synced Lyrics Available</h3>
        <p>Enjoy the high-fidelity acoustic beats from {currentSong?.artist}</p>
      </div>
    );
  }

  return (
    <div className="synced-lyrics-wrapper">
      <div className="lyrics-toolbar">
        <div className="lyrics-sync-indicator">
          <span className="pulse-dot-green" />
          <span>Real-time Synced</span>
        </div>
        <button
          className={`translation-toggle-btn ${showTranslations ? 'active' : ''}`}
          onClick={() => setShowTranslations(!showTranslations)}
          title="Toggle Tanglish / Meaning Translation"
        >
          <Languages size={15} />
          <span>{showTranslations ? 'Meaning: ON' : 'Meaning: OFF'}</span>
        </button>
      </div>

      <div className="lyrics-scroll-box" ref={scrollContainerRef}>
        {lyrics.map((line, idx) => {
          const isActive = idx === currentLyricIndex;
          const isPassed = idx < currentLyricIndex;

          return (
            <div
              key={idx}
              ref={isActive ? activeLineRef : null}
              className={`lyric-line-item ${isActive ? 'active-karaoke-line' : ''} ${
                isPassed ? 'passed-line' : ''
              }`}
              onClick={() => seekTo(line.time)}
              title={`Click to jump to ${Math.floor(line.time / 60)}:${String(
                Math.floor(line.time % 60)
              ).padStart(2, '0')}`}
            >
              <div className="lyric-main-row">
                {isActive && <Volume2 size={16} className="lyric-playing-speaker" />}
                <p className="lyric-text">{line.text}</p>
              </div>
              {showTranslations && line.translation && (
                <p className="lyric-translation-text">{line.translation}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
