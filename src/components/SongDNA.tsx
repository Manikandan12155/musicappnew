import React from 'react';
import { useMusic } from '../context/MusicContext';
import { Dna, Activity, KeyRound, Sparkles, BookOpen, Users, Disc3 } from 'lucide-react';

export const SongDNA: React.FC = () => {
  const { currentSong } = useMusic();
  const dna = currentSong?.dna;

  if (!dna) {
    return (
      <div className="no-dna-container">
        <Dna size={44} />
        <h3>Music DNA Not Analyzed</h3>
        <p>Acoustic metadata analysis in progress for this track.</p>
      </div>
    );
  }

  return (
    <div className="song-dna-container">
      {/* Metrics Row: BPM, Key, Year, Genre */}
      <div className="dna-metrics-grid">
        <div className="dna-metric-card">
          <div className="metric-header">
            <Activity size={18} className="metric-icon bpm-pulse" />
            <span className="metric-title">Tempo</span>
          </div>
          <div className="metric-value">{dna.tempoBpm} <span className="metric-unit">BPM</span></div>
          <div className="bpm-bar-meter">
            <div
              className="bpm-bar-fill"
              style={{ width: `${Math.min(100, (dna.tempoBpm / 180) * 100)}%` }}
            />
          </div>
        </div>

        <div className="dna-metric-card">
          <div className="metric-header">
            <KeyRound size={18} className="metric-icon" />
            <span className="metric-title">Musical Key</span>
          </div>
          <div className="metric-value">{dna.key}</div>
          <span className="metric-sub">Harmonic Scale</span>
        </div>

        <div className="dna-metric-card">
          <div className="metric-header">
            <Disc3 size={18} className="metric-icon" />
            <span className="metric-title">Release</span>
          </div>
          <div className="metric-value">{currentSong.year || 2024}</div>
          <span className="metric-sub">{currentSong.album}</span>
        </div>
      </div>

      {/* Genius Lore Card */}
      <div className="dna-info-card lore-card">
        <div className="info-card-header">
          <Sparkles size={18} className="lore-sparkle" />
          <h4>Behind The Music (Genius Story)</h4>
        </div>
        <p className="lore-text">{dna.geniusStory}</p>
      </div>

      {/* Wikipedia Trivia Card */}
      <div className="dna-info-card wiki-card">
        <div className="info-card-header">
          <BookOpen size={18} />
          <h4>Chart History & Reception</h4>
        </div>
        <p className="lore-text">{dna.wikiSummary}</p>
      </div>

      {/* Credits Breakdown */}
      <div className="dna-credits-card">
        <div className="info-card-header">
          <Users size={18} />
          <h4>Production & Credits</h4>
        </div>
        <div className="credits-list">
          <div className="credit-row">
            <span className="credit-role">Producers</span>
            <div className="credit-tags">
              {dna.producers.map((prod, i) => (
                <span key={i} className="credit-pill">{prod}</span>
              ))}
            </div>
          </div>
          <div className="credit-row">
            <span className="credit-role">Writers</span>
            <div className="credit-tags">
              {dna.writers.map((writer, i) => (
                <span key={i} className="credit-pill writer">{writer}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
