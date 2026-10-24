import React from 'react';
import { useMusic } from '../context/MusicContext';
import { Sliders, Compass } from 'lucide-react';

export const Header: React.FC = () => {
  const { setIsEqualizerOpen, setIsEchoFindOpen } = useMusic();

  return (
    <header className="echo-header">
      <div className="header-brand">
        <div className="brand-logo-glow">
          <img
            src="/assets/space-music-logo.png"
            alt="Space Music Logo"
            className="brand-icon"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/space-music-logo.png';
            }}
          />
          <div className="brand-pulse-dot" />
        </div>
        <div className="brand-text-wrap">
          <h1 className="brand-title">SPACE MUSIC</h1>
          <span className="brand-tag">v2.0 • COSMIC AUDIO ENGINE</span>
        </div>
      </div>

      <div className="header-actions">
        {/* Space Radar Button */}
        <button
          className="icon-action-btn echo-find-btn"
          onClick={() => setIsEchoFindOpen(true)}
          title="Space Radar (Acoustic Match)"
        >
          <Compass size={18} className="radar-spin-icon" />
          <span className="btn-badge-radar">Space Radar</span>
        </button>

        {/* Equalizer DSP Button */}
        <button
          className="icon-action-btn eq-btn"
          onClick={() => setIsEqualizerOpen(true)}
          title="5-Band Equalizer & Bass Boost"
        >
          <Sliders size={18} />
        </button>
      </div>
    </header>
  );
};
