import React, { useState } from 'react';
import { useMusic } from '../context/MusicContext';
import {
  Search,
  Sparkles,
  ArrowRight,
  Radio,
  Download,
  Wifi,
  Sliders,
  Flame,
  Zap,
  Music2,
  Compass
} from 'lucide-react';

const QUICK_VIBES = [
  { id: 'tamil', name: 'Tamil & Kollywood Hits', icon: <Flame size={16} />, color: '#ff4d4d' },
  { id: 'trending', name: 'Worldwide Trending 2026', icon: <Sparkles size={16} />, color: '#ffd700' },
  { id: 'mass', name: 'High Energy & Mass Beats', icon: <Zap size={16} />, color: '#39ff14' },
  { id: 'dance', name: 'Dance & EDM Party', icon: <Music2 size={16} />, color: '#00d4ff' },
  { id: 'chill', name: 'Midnight Lo-Fi & Chill', icon: <Radio size={16} />, color: '#c084fc' }
];

export const HomeScreen: React.FC = () => {
  const {
    setActiveScreen,
    setSelectedGenre,
    setSearchQuery,
    equalizer,
    updateEqualizer,
    setIsEqualizerOpen
  } = useMusic();
  const [searchInput, setSearchInput] = useState('');

  const isBoseActive = equalizer?.enabled && equalizer.bass >= 7 && equalizer.virtualizer >= 50;

  const handleActivateBoseDsp = () => {
    if (isBoseActive) {
      setIsEqualizerOpen(true);
    } else {
      updateEqualizer({
        enabled: true,
        bass: 8,
        band60: 7,
        band230: 3,
        band910: 2,
        band3600: 4,
        band14000: 7,
        virtualizer: 60
      });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
    }
    setActiveScreen('search');
  };

  const handleVibeClick = (genreId: string, genreName: string) => {
    setSelectedGenre(genreId);
    setSearchQuery(genreName);
    setActiveScreen('search');
  };

  return (
    <div className="screen-container home-landing-screen">
      {/* 1. Cinematic Full-Bleed Video Hero Landing Section */}
      <section className="landing-hero-section">
        <video
          className="landing-backdrop-video"
          src="/Vibe.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="landing-video-overlay" />

        <div className="landing-hero-content">
          <div className="landing-badge-glow">
            <Sparkles size={14} className="sparkle-spin" />
            <span>COSMIC AUDIO ENGINE • ZERO ADS FOREVER</span>
          </div>

          <h1 className="landing-headline">
            Step Into The <span className="text-cosmic-glow">Universe of Music</span>
          </h1>

          <p className="landing-subtext">
            Stream millions of high-resolution songs, sing with synced karaoke lyrics,
            collab on WiFi with friends, and download tracks offline.
          </p>

          {/* Interactive Search Bar -> Seamlessly switches to Explore */}
          <form
            className="landing-search-bar"
            onSubmit={handleSearchSubmit}
            onClick={() => {
              if (searchInput.trim()) {
                setSearchQuery(searchInput.trim());
              }
            }}
          >
            <Search size={24} className="landing-search-icon" />
            <input
              type="text"
              placeholder="Search any song, artist, album, or kollywood hit..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => {
                if (searchInput.trim()) {
                  setSearchQuery(searchInput.trim());
                }
              }}
              className="landing-search-input"
            />
          </form>

          {/* Quick Vibe Tags */}
          <div className="landing-vibes-row">
            <span className="vibes-label">Trending Vibes:</span>
            <div className="vibes-tags-scroll">
              {QUICK_VIBES.map((v) => (
                <button
                  key={v.id}
                  className="vibe-tag-btn"
                  onClick={() => handleVibeClick(v.id, v.name)}
                >
                  <span style={{ color: v.color }}>{v.icon}</span>
                  <span>{v.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Sound by Bose Liquid Titanium 3D Acoustic Showcase */}
      <section className="bose-showcase-wrapper" style={{ padding: '0 24px' }}>
        <div className="bose-3d-showcase-card">
          <div className="bose-card-backdrop" />

          {/* Left 3D Earbud - Master Buds Open (Front Angle) */}
          <div className="bose-earbud-stage-left">
            <div className="bose-3d-bud-left">
              <div className="bose-earhook-loop" />
              <div className="bose-base-pod" />
              <div className="bose-chrome-orb-main">
                <div className="bose-orb-specular" />
                <div className="bose-orb-secondary-sheen" />
                <div className="bose-acoustic-speaker-grille" />
              </div>
            </div>
          </div>

          {/* Center Brand Identity & Acoustic Tuning */}
          <div className="bose-center-branding">
            <span className="bose-sound-by-label">SOUND BY</span>
            <div className="bose-title-row">
              <div className="bose-bar-left" />
              <h2 className="bose-primary-logo-text">BOSE</h2>
              <div className="bose-bar-right" />
            </div>
            <p className="bose-acoustic-desc">
              Master Buds Open with Sound by Bose technology delivers balanced, distortion-free audio with deep bass, clear mids, and crisp highs.
            </p>
            <div className="bose-action-pills-row">
              <button
                className="bose-activate-btn"
                onClick={handleActivateBoseDsp}
              >
                <Sliders size={15} />
                <span>{isBoseActive ? 'Bose DSP: Active 🎧' : 'Activate Bose Acoustic DSP'}</span>
              </button>
              <div className="bose-status-pill">
                <span className="bose-pulse-led" />
                <span>3D Spatial Radar</span>
              </div>
            </div>
          </div>

          {/* Right 3D Earbud - Master Buds Open (Rear Perspective Pair) */}
          <div className="bose-earbud-stage-right">
            <div className="bose-3d-bud-right">
              <div className="bose-earhook-loop-right" />
              <div className="bose-chrome-orb-pair-1" />
              <div className="bose-chrome-orb-pair-2" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Feature Highlights Showcase */}
      <section className="landing-features-section">
        <div className="landing-section-header">
          <span className="landing-kicker">ENGINE CAPABILITIES</span>
          <h2 className="landing-section-title">Built for the Ultimate Listening Experience</h2>
        </div>

        <div className="landing-features-grid">
          {/* Card 1: Explore & Stream */}
          <div
            className="landing-feature-card clickable-card"
            onClick={() => setActiveScreen('search')}
          >
            <div className="feature-icon-box cosmic-green">
              <Compass size={26} />
            </div>
            <h3>Infinite Audio Search</h3>
            <p>
              Millions of lossless tracks with instant InnerTube streaming. Zero video ads or sponsored interruptions.
            </p>
            <div className="card-action-link">
              <span>Go to Explore</span>
              <ArrowRight size={15} />
            </div>
          </div>

          {/* Card 2: Synced Lyrics */}
          <div
            className="landing-feature-card clickable-card"
            onClick={() => setActiveScreen('search')}
          >
            <div className="feature-icon-box cosmic-cyan">
              <Sparkles size={26} />
            </div>
            <h3>Synced Live Lyrics</h3>
            <p>
              Real-time syllable-synced karaoke lyrics powered by LRCLIB database. Sing along with every beat.
            </p>
            <div className="card-action-link">
              <span>Sing Now</span>
              <ArrowRight size={15} />
            </div>
          </div>

          {/* Card 3: WiFi Space Jam */}
          <div
            className="landing-feature-card clickable-card"
            onClick={() => setActiveScreen('flow')}
          >
            <div className="feature-icon-box cosmic-purple">
              <Wifi size={26} />
            </div>
            <h3>WiFi Collaborative Jam</h3>
            <p>
              Connect devices on the same WiFi router. Listen together in real-time sync with live emoji reactions.
            </p>
            <div className="card-action-link">
              <span>Join Space Jam</span>
              <ArrowRight size={15} />
            </div>
          </div>

          {/* Card 4: Offline Downloads */}
          <div
            className="landing-feature-card clickable-card"
            onClick={() => setActiveScreen('library')}
          >
            <div className="feature-icon-box cosmic-amber">
              <Download size={26} />
            </div>
            <h3>100% Offline Downloads</h3>
            <p>
              Save songs directly to your device storage or browser memory. Enjoy uninterrupted music anywhere without internet.
            </p>
            <div className="card-action-link">
              <span>View Library</span>
              <ArrowRight size={15} />
            </div>
          </div>

          {/* Card 5: DSP Studio Equalizer */}
          <div
            className="landing-feature-card clickable-card"
            onClick={() => setActiveScreen('search')}
          >
            <div className="feature-icon-box cosmic-emerald">
              <Sliders size={26} />
            </div>
            <h3>Studio DSP Equalizer</h3>
            <p>
              5-band parametric equalizer with bass boost and 3D spatial acoustic radar for immersive headphone fidelity.
            </p>
            <div className="card-action-link">
              <span>Tune Audio</span>
              <ArrowRight size={15} />
            </div>
          </div>

          {/* Card 6: Flow Radio Infinite */}
          <div
            className="landing-feature-card clickable-card"
            onClick={() => setActiveScreen('flow')}
          >
            <div className="feature-icon-box cosmic-blue">
              <Radio size={26} />
            </div>
            <h3>Cosmic Flow Radio</h3>
            <p>
              Continuous endless radio stream tailored to your mood, powered by smart audio waveform intelligence.
            </p>
            <div className="card-action-link">
              <span>Listen Flow</span>
              <ArrowRight size={15} />
            </div>
          </div>
        </div>

        {/* Big Bottom Explore CTA Banner */}
        <div className="landing-bottom-cta">
          <div className="cta-glow-effect" />
          <div className="cta-content">
            <h2>Ready to Immerse in Space Music?</h2>
            <p>Explore top hits, trending blockbusters, or search any track right now.</p>
            <button
              className="cta-explore-button"
              onClick={() => setActiveScreen('search')}
            >
              <Compass size={20} />
              <span>Launch Explore Music</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeScreen;
