import React from 'react';
import { MusicProvider, useMusic } from './context/MusicContext';
import { CollabProvider } from './context/CollabContext';
import { Header } from './components/Header';
import { FloatingTabBar } from './components/FloatingTabBar';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayer } from './components/FullPlayer';
import { EqualizerModal } from './components/EqualizerModal';
import { EchoFindModal } from './components/EchoFindModal';
import { CollabRoomModal } from './components/CollabRoomModal';
import { FloatingReactions } from './components/FloatingReactions';
import { QueueModal } from './components/QueueModal';
import { Toast } from './components/Toast';
import { HomeScreen } from './components/HomeScreen';
import { SearchScreen } from './components/SearchScreen';
import { FlowScreen } from './components/FlowScreen';
import { LibraryScreen } from './components/LibraryScreen';

const MainLayout: React.FC = () => {
  const { activeScreen, playerMode } = useMusic();

  return (
    <div className={`echo-app-root theme-${playerMode}`}>
      {/* Top Glass Navigation Bar */}
      <Header />

      {/* Main Dynamic View Area */}
      <main className="echo-main-viewport">
        {activeScreen === 'home' && <HomeScreen />}
        {activeScreen === 'search' && <SearchScreen />}
        {activeScreen === 'flow' && <FlowScreen />}
        {activeScreen === 'library' && <LibraryScreen />}
      </main>

      {/* Persistent Mini Player Bar */}
      <MiniPlayer />

      {/* Floating Bottom Navigation Tab Bar */}
      <FloatingTabBar />

      {/* Full-Screen Player Modal (Apple / Material / Nothing modes) */}
      <FullPlayer />

      {/* 5-Band Equalizer & Bass Boost Modal */}
      <EqualizerModal />

      {/* Echo Find Acoustic Radar Modal */}
      <EchoFindModal />

      {/* WiFi Collaborative Space Jam Room Modal */}
      <CollabRoomModal />

      {/* Real-Time Floating Reactions Overlay */}
      <FloatingReactions />

      {/* Up Next Queue Modal Sheet */}
      <QueueModal />

      {/* Global Action Toast Notification */}
      <Toast />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <MusicProvider>
      <CollabProvider>
        <MainLayout />
      </CollabProvider>
    </MusicProvider>
  );
};

export default App;
