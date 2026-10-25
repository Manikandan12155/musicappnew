import React, { useEffect, useRef, useState } from 'react';
import { useMusic } from '../context/MusicContext';
import { Languages, Volume2, Music2, RefreshCw, Loader2 } from 'lucide-react';

export const SyncedLyrics: React.FC = () => {
  const { currentSong, currentLyricIndex, seekTo, fetchLyricsForSong } = useMusic();
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // If lyrics not loaded yet, actively trigger fetch on open
  useEffect(() => {
    if (currentSong && (!currentSong.lyrics || currentSong.lyrics.length === 0)) {
      setIsFetching(true);
      fetchLyricsForSong(currentSong).finally(() => setIsFetching(false));
    }
  }, [currentSong?.id]);

  const handleManualRetry = () => {
    if (!currentSong) return;
    setIsFetching(true);
    fetchLyricsForSong(currentSong).finally(() => setIsFetching(false));
  };

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

  if (isFetching) {
    return (
      <div className="no-lyrics-container">
        <Loader2 size={44} style={{ animation: 'spin 1.5s linear infinite', color: '#39FF14' }} />
        <h3>Fetching Synced Lyrics...</h3>
        <p>Searching real-time karaoke timestamps for {currentSong?.title}</p>
      </div>
    );
  }

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="no-lyrics-container">
        <Music2 size={48} className="no-lyrics-icon" />
        <h3>Instrumental / No Synced Lyrics Found</h3>
        <p>No verified lyrics in LRCLIB database for {currentSong?.title}</p>
        <button className="lyrics-retry-btn" onClick={handleManualRetry}>
          <RefreshCw size={14} />
          <span>Retry Search</span>
        </button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="lyrics-retry-btn"
            style={{ margin: 0, padding: '4px 10px', fontSize: '0.72rem' }}
            onClick={handleManualRetry}
            title="Refresh Lyrics"
          >
            <RefreshCw size={12} />
            <span>Reload</span>
          </button>
          <button
            className={`translation-toggle-btn ${showTranslations ? 'active' : ''}`}
            onClick={() => setShowTranslations(!showTranslations)}
            title="Toggle Tanglish / Meaning Translation"
          >
            <Languages size={15} />
            <span>{showTranslations ? 'Meaning: ON' : 'Meaning: OFF'}</span>
          </button>
        </div>
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
