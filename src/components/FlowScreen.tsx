import React, { useState } from 'react';
import { useMusic } from '../context/MusicContext';
import { Radio, Play, Sparkles, Volume2, Shuffle, Disc3 } from 'lucide-react';

export const FlowScreen: React.FC = () => {
  const { songs, playSong, currentSong, isPlaying } = useMusic();
  const [selectedMood, setSelectedMood] = useState<string>('energy');

  const moods = [
    { id: 'energy', label: 'Mass & Energy', desc: 'Fast paced beats, Kollywood anthems, and adrenaline', color: '#ff2a5f' },
    { id: 'chill', label: 'Late Night Chill', desc: 'Dreamy synthwave, 80s nostalgia, and lo-fi melodies', color: '#aa3bff' },
    { id: 'focus', label: 'Acoustic & Focus', desc: 'Instrumental warmth, soothing harmonies, and clear sound', color: '#0ba360' },
    { id: 'party', label: 'Dance Floor', desc: 'Bouncy pop, electro-grooves, and chart toppers', color: '#00d2ff' }
  ];

  const getMoodSongs = () => {
    if (selectedMood === 'energy') {
      return songs.filter((s) => s.genre.includes('Mass') || s.genre.includes('Kuthu') || s.genre.includes('Rock'));
    }
    if (selectedMood === 'chill') {
      return songs.filter((s) => s.genre.includes('Synthwave') || s.genre.includes('Lo-Fi') || s.genre.includes('Dream'));
    }
    if (selectedMood === 'focus') {
      return songs.filter((s) => s.genre.includes('Folk') || s.genre.includes('Indie'));
    }
    return songs;
  };

  const currentMoodSongs = getMoodSongs();
  const currentMoodObj = moods.find((m) => m.id === selectedMood) || moods[0];

  const startFlowRadio = () => {
    const list = currentMoodSongs.length > 0 ? currentMoodSongs : songs;
    if (!list || list.length === 0) return;
    const randomSong = list[Math.floor(Math.random() * list.length)];
    if (randomSong) {
      playSong(randomSong, list);
    }
  };

  return (
    <div className="screen-container flow-screen">
      <div className="flow-hero-stage">
        <div className="flow-radar-glow-disc">
          <div className="flow-inner-disc">
            <Radio size={48} className="flow-center-icon" />
            <div className={`flow-pulse-wave ${isPlaying ? 'pulsing' : ''}`} />
          </div>
        </div>

        <div className="flow-hero-text">
          <div className="flow-pill-badge">
            <Sparkles size={14} />
            <span>ALGORITHMIC RADIO ENGINE</span>
          </div>
          <h2 className="flow-title">Space Flow</h2>
          <p className="flow-subtitle">
            An infinite personalized radio stream tuned to your mood. Never runs out of music.
          </p>

          <button className="start-flow-btn" onClick={startFlowRadio}>
            <Play size={20} fill="currentColor" />
            <span>Start {currentMoodObj.label} Flow</span>
          </button>
        </div>
      </div>

      {/* Mood Selector Row */}
      <div className="flow-moods-section">
        <h3 className="flow-section-heading">Select Your Flow Mood</h3>
        <div className="flow-mood-cards-grid">
          {moods.map((m) => {
            const isSelected = selectedMood === m.id;
            return (
              <div
                key={m.id}
                className={`flow-mood-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedMood(m.id)}
                style={{ borderColor: isSelected ? m.color : 'transparent' }}
              >
                <div className="mood-header">
                  <span className="mood-indicator-dot" style={{ backgroundColor: m.color }} />
                  <h4 className="mood-title">{m.label}</h4>
                </div>
                <p className="mood-desc">{m.desc}</p>
                {isSelected && (
                  <div className="mood-active-tag" style={{ color: m.color }}>
                    Active Frequency
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Up Next in Flow */}
      <div className="flow-queue-preview">
        <div className="queue-header">
          <h3 className="flow-section-heading">Harmonic Track Matches ({currentMoodSongs.length})</h3>
          <span className="queue-sub">Autoplay algorithm ready</span>
        </div>

        {currentMoodSongs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No tracks matched for this mood frequency yet. Search or explore songs in Space Music.
            </p>
          </div>
        ) : (
          <div className="flow-songs-mini-list">
            {currentMoodSongs.map((song) => (
              <div
                key={song.id}
                className={`flow-song-row ${currentSong?.id === song.id ? 'active-playing' : ''}`}
                onClick={() => playSong(song, currentMoodSongs)}
              >
                <img src={song.coverUrl} alt={song.title} className="flow-cover-thumb" />
                <div className="flow-info">
                  <span className="flow-title-text">{song.title}</span>
                  <span className="flow-artist-text">{song.artist}</span>
                </div>
                <span className="flow-genre-pill">{song.genre}</span>
                <button className="flow-play-action">
                  <Play size={14} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
