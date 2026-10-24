import React from 'react';
import { useCollab } from '../context/CollabContext';

export const FloatingReactions: React.FC = () => {
  const { reactions } = useCollab();

  if (reactions.length === 0) return null;

  return (
    <div className="floating-reactions-layer" pointer-events="none">
      {reactions.map((rx, idx) => {
        // Random horizontal sway offset
        const randomX = (idx % 5) * 18 - 36;
        return (
          <div
            key={rx.id}
            className="floating-reaction-item"
            style={{
              transform: `translateX(${randomX}px)`
            }}
          >
            <span className="reaction-emoji">{rx.emoji}</span>
            <span className="reaction-sender">{rx.senderName}</span>
          </div>
        );
      })}
    </div>
  );
};
