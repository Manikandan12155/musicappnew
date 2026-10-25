import React from 'react';
import { useMusic } from '../context/MusicContext';
import { useCollab } from '../context/CollabContext';
import { Home, Search, Radio, Library, Users } from 'lucide-react';
import { ActiveScreen } from '../types/music';

export const FloatingTabBar: React.FC = () => {
  const { activeScreen, setActiveScreen } = useMusic();
  const { isInRoom, room, setIsCollabModalOpen, isCollabModalOpen } = useCollab();

  const tabs: { id: ActiveScreen; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'search', label: 'Explore', icon: <Search size={20} /> },
    { id: 'flow', label: 'Flow Radio', icon: <Radio size={20} /> },
    { id: 'library', label: 'Library', icon: <Library size={20} /> }
  ];

  return (
    <nav className="floating-tab-bar" aria-label="Bottom Navigation">
      <div className="tab-bar-container">
        {tabs.map((tab) => {
          const isActive = activeScreen === tab.id;
          return (
            <button
              key={tab.id}
              className={`tab-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveScreen(tab.id)}
            >
              <div className="tab-icon-wrap">
                {tab.icon}
                {isActive && <div className="tab-active-indicator" />}
              </div>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}

        {/* Space Jam (Collab Room) Bottom Tab */}
        <button
          className={`tab-item jam-tab-item ${isCollabModalOpen || isInRoom ? 'active in-jam-room' : ''}`}
          onClick={() => setIsCollabModalOpen(true)}
          title={isInRoom ? `Active Space Jam Room: ${room?.code}` : 'Space Jam (Listen Together)'}
        >
          <div className="tab-icon-wrap">
            <Users size={20} className={isInRoom ? 'collab-active-pulse' : ''} />
            {isInRoom && <span className="tab-jam-live-dot" />}
          </div>
          <span className="tab-label">
            {isInRoom ? `Jam (${room?.memberCount || 1})` : 'Jam'}
          </span>
        </button>
      </div>
    </nav>
  );
};
