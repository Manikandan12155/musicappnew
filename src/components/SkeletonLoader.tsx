import React from 'react';

export const HeroSkeleton: React.FC = () => {
  return (
    <div className="skeleton-hero-banner">
      <div className="skeleton-shimmer" />
      <div className="skeleton-hero-content">
        <div className="skeleton-bar skeleton-badge" />
        <div className="skeleton-bar skeleton-title" />
        <div className="skeleton-bar skeleton-subtitle" />
        <div className="skeleton-bar skeleton-desc" />
        <div className="skeleton-btn-row">
          <div className="skeleton-bar skeleton-btn" />
          <div className="skeleton-circle" />
        </div>
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="songs-cards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-shimmer" />
          <div className="skeleton-artwork-box" />
          <div className="skeleton-bar skeleton-card-title" />
          <div className="skeleton-bar skeleton-card-subtitle" />
          <div className="skeleton-meta-row">
            <div className="skeleton-bar skeleton-tag" />
            <div className="skeleton-circle-sm" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TrackListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="results-track-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-track-row">
          <div className="skeleton-shimmer" />
          <div className="skeleton-index" />
          <div className="skeleton-thumb" />
          <div className="skeleton-info">
            <div className="skeleton-bar skeleton-row-title" />
            <div className="skeleton-bar skeleton-row-subtitle" />
          </div>
          <div className="skeleton-bar skeleton-duration" />
        </div>
      ))}
    </div>
  );
};
