import React from 'react';
import { useMusic } from '../context/MusicContext';
import { X, Sliders, Zap, Check } from 'lucide-react';
import { EqualizerSettings } from '../types/music';

const EQ_PRESETS: { name: string; settings: Partial<EqualizerSettings> }[] = [
  {
    name: 'Flat / Studio',
    settings: { bass: 0, band60: 0, band230: 0, band910: 0, band3600: 0, band14000: 0, virtualizer: 0 }
  },
  {
    name: 'Bass Max 🔥',
    settings: { bass: 9, band60: 8, band230: 5, band910: -1, band3600: 2, band14000: 3, virtualizer: 40 }
  },
  {
    name: 'Vocal Clarity 🎙️',
    settings: { bass: 1, band60: -2, band230: 1, band910: 6, band3600: 5, band14000: 3, virtualizer: 20 }
  },
  {
    name: 'Mass & Rock ⚡',
    settings: { bass: 6, band60: 6, band230: 3, band910: 2, band3600: 5, band14000: 6, virtualizer: 35 }
  },
  {
    name: '3D Spatial Waves 🎧',
    settings: { bass: 4, band60: 3, band230: 1, band910: 2, band3600: 4, band14000: 5, virtualizer: 85 }
  }
];

export const EqualizerModal: React.FC = () => {
  const { equalizer, updateEqualizer, isEqualizerOpen, setIsEqualizerOpen } = useMusic();

  if (!isEqualizerOpen) return null;

  const bands: { key: keyof EqualizerSettings; label: string; freq: string }[] = [
    { key: 'band60', label: 'Sub-Bass', freq: '60 Hz' },
    { key: 'band230', label: 'Bass Warmth', freq: '230 Hz' },
    { key: 'band910', label: 'Midrange', freq: '910 Hz' },
    { key: 'band3600', label: 'Presence', freq: '3.6 kHz' },
    { key: 'band14000', label: 'Brilliance', freq: '14 kHz' }
  ];

  return (
    <div className="modal-backdrop-overlay" onClick={() => setIsEqualizerOpen(false)}>
      <div className="equalizer-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Sliders size={22} className="modal-title-icon" />
            <div>
              <h3>Audio DSP & Equalizer</h3>
              <p>Hardware-accelerated 5-Band Equalizer & Bass Driver</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setIsEqualizerOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Master Power Toggle */}
        <div className="eq-master-toggle-row">
          <div className="master-toggle-info">
            <Zap size={18} className={equalizer.enabled ? 'zap-active' : ''} />
            <span>Equalizer Engine: {equalizer.enabled ? 'ACTIVATED' : 'BYPASSED'}</span>
          </div>
          <label className="switch-slider-wrap">
            <input
              type="checkbox"
              checked={equalizer.enabled}
              onChange={(e) => updateEqualizer({ enabled: e.target.checked })}
            />
            <span className="slider-round" />
          </label>
        </div>

        {/* Presets Pills */}
        <div className="eq-presets-row">
          <span className="presets-label">Presets:</span>
          <div className="presets-scroll">
            {EQ_PRESETS.map((p, i) => (
              <button
                key={i}
                className="preset-pill-btn"
                onClick={() => updateEqualizer(p.settings)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Bass Boost & Virtualizer Row */}
        <div className="eq-boosters-grid">
          <div className="booster-card">
            <div className="booster-header">
              <span>Dynamic Bass Boost</span>
              <span className="booster-val">+{equalizer.bass} dB</span>
            </div>
            <input
              type="range"
              min={-6}
              max={12}
              step={1}
              value={equalizer.bass}
              disabled={!equalizer.enabled}
              onChange={(e) => updateEqualizer({ bass: parseInt(e.target.value) })}
              className="eq-slider"
            />
          </div>

          <div className="booster-card">
            <div className="booster-header">
              <span>3D Stereo Virtualizer</span>
              <span className="booster-val">{equalizer.virtualizer}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={equalizer.virtualizer}
              disabled={!equalizer.enabled}
              onChange={(e) => updateEqualizer({ virtualizer: parseInt(e.target.value) })}
              className="eq-slider"
            />
          </div>
        </div>

        {/* 5-Band Vertical Faders */}
        <div className="bands-container">
          {bands.map((b) => {
            const val = equalizer[b.key] as number;
            return (
              <div key={b.key} className="eq-band-column">
                <span className="band-gain">{val > 0 ? `+${val}` : val} dB</span>
                <div className="vertical-slider-track">
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={1}
                    value={val}
                    disabled={!equalizer.enabled}
                    onChange={(e) => updateEqualizer({ [b.key]: parseInt(e.target.value) })}
                    className="vertical-slider"
                  />
                </div>
                <span className="band-freq">{b.freq}</span>
                <span className="band-label">{b.label}</span>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button className="done-btn" onClick={() => setIsEqualizerOpen(false)}>
            <Check size={16} />
            <span>Apply & Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
