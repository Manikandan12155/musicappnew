import React, { useState, useEffect } from 'react';
import { useMusic } from '../context/MusicContext';
import { X, Compass, Music, Play, CheckCircle2, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Song } from '../types/music';

export const EchoFindModal: React.FC = () => {
  const { isEchoFindOpen, setIsEchoFindOpen, songs, playSong } = useMusic();
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [matchedSong, setMatchedSong] = useState<Song | null>(null);

  useEffect(() => {
    if (isEchoFindOpen) {
      startScanning();
    }
  }, [isEchoFindOpen]);

  const startScanning = () => {
    setIsScanning(true);
    setMatchedSong(null);

    // Simulate acoustic fingerprinting scan for 2.6 seconds
    const timer = setTimeout(() => {
      if (songs && songs.length > 0) {
        const randomSong = songs[Math.floor(Math.random() * songs.length)];
        setMatchedSong(randomSong);
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } else {
        setMatchedSong(null);
      }
      setIsScanning(false);
    }, 2400);

    return () => clearTimeout(timer);
  };

  if (!isEchoFindOpen) return null;

  return (
    <div className="modal-backdrop-overlay" onClick={() => setIsEchoFindOpen(false)}>
      <div className="echo-find-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Compass size={22} className="radar-spin-icon" />
            <div>
              <h3>Space Radar</h3>
              <p>Acoustic Music Recognition & Fingerprinting</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setIsEchoFindOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="radar-body">
          {isScanning ? (
            <div className="radar-scanning-stage">
              <div className="radar-pulse-rings">
                <div className="radar-ring ring-1" />
                <div className="radar-ring ring-2" />
                <div className="radar-ring ring-3" />
                <div className="radar-center-core">
                  <Compass size={40} className="spinning-compass" />
                </div>
              </div>
              <h4 className="radar-status-text">Listening to ambient audio...</h4>
              <p className="radar-subtext">Sampling acoustic waveform & matching harmonic frequency</p>
            </div>
          ) : matchedSong ? (
            <div className="radar-result-stage">
              <div className="result-badge">
                <CheckCircle2 size={18} color="#1db954" />
                <span>100% Acoustic Match Found</span>
              </div>

              <div className="result-card">
                <img
                  src={matchedSong.coverUrl}
                  alt={matchedSong.title}
                  className="result-cover"
                />
                <div className="result-info">
                  <span className="result-genre">{matchedSong.genre}</span>
                  <h4 className="result-title">{matchedSong.title}</h4>
                  <p className="result-artist">{matchedSong.artist}</p>
                  <p className="result-album">{matchedSong.album} • {matchedSong.year}</p>
                </div>
              </div>

              <div className="result-actions">
                <button
                  className="play-matched-btn"
                  onClick={() => {
                    playSong(matchedSong);
                    setIsEchoFindOpen(false);
                  }}
                >
                  <Play size={18} fill="currentColor" />
                  <span>Play In Space Music</span>
                </button>

                <button className="rescan-btn" onClick={startScanning}>
                  <RefreshCw size={16} />
                  <span>Scan Again</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '14px' }}>
                No active tracks in catalog to match. Search or explore songs first.
              </p>
              <button className="done-btn" style={{ margin: '0 auto' }} onClick={() => setIsEchoFindOpen(false)}>
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
