import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Song } from '../types/music';
import { collabSocket, CollabRoomState, ReactionPayload, PlaybackSyncPayload, SeekSyncPayload } from '../services/collabSocket';
import { useMusic } from './MusicContext';
import { audioEngine } from '../services/audioEngine';

interface CollabContextType {
  room: CollabRoomState | null;
  isInRoom: boolean;
  isHost: boolean;
  isConnected: boolean;
  isCollabModalOpen: boolean;
  userName: string;
  reactions: ReactionPayload[];
  errorMessage: string | null;
  setIsCollabModalOpen: (open: boolean) => void;
  setUserName: (name: string) => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  sendReaction: (emoji: string) => void;
  addSongToCollabQueue: (song: Song) => void;
  clearError: () => void;
}

const CollabContext = createContext<CollabContextType | null>(null);

export const CollabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentSong, isPlaying, currentTime, playSong, togglePlay, seekTo, queue } = useMusic();

  const [room, setRoom] = useState<CollabRoomState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(collabSocket.isConnected);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState<boolean>(false);
  const [reactions, setReactions] = useState<ReactionPayload[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [userName, setUserNameState] = useState<string>(() => {
    try {
      return localStorage.getItem('space_collab_username') || `Cosmic-${Math.floor(100 + Math.random() * 900)}`;
    } catch {
      return `Cosmic-${Math.floor(100 + Math.random() * 900)}`;
    }
  });

  const setUserName = (name: string) => {
    const trimmed = name.trim() || 'Cosmic Listener';
    setUserNameState(trimmed);
    try {
      localStorage.setItem('space_collab_username', trimmed);
    } catch {}
  };

  const isRemoteActionRef = useRef<boolean>(false);
  const isInRoom = Boolean(room && room.code);
  const isHost = Boolean(room && collabSocket.myUserId && room.hostId === collabSocket.myUserId);

  // Setup WebSocket Listeners
  useEffect(() => {
    // Immediately sync current connection state
    setIsConnected(collabSocket.isConnected);

    if (!collabSocket.isConnected) {
      collabSocket.connect();
    }

    const unsubConn = collabSocket.on('connection_change', (connected: boolean) => {
      setIsConnected(connected);
    });

    // Heartbeat check every 1.2s to guarantee React UI is never desynced from socket
    const syncTimer = setInterval(() => {
      const active = collabSocket.isConnected;
      setIsConnected((prev) => (prev !== active ? active : prev));
      if (!active) {
        collabSocket.connect();
      }
    }, 1200);

    const unsubRoomUpdate = collabSocket.on('room_update', (roomData: CollabRoomState) => {
      setRoom(roomData);
    });

    const unsubPlaybackSync = collabSocket.on('playback_sync', async (data: PlaybackSyncPayload) => {
      isRemoteActionRef.current = true;

      try {
        if (data.currentSong) {
          // If different song, start playing it
          if (!currentSong || currentSong.id !== data.currentSong.id) {
            playSong(data.currentSong);
          }

          // Seek to exact synchronized timestamp
          if (data.currentTime !== undefined && Math.abs(currentTime - data.currentTime) > 1.5) {
            audioEngine.seek(data.currentTime);
          }

          // Sync play/pause state
          if (data.isPlaying && !isPlaying) {
            await audioEngine.play();
          } else if (!data.isPlaying && isPlaying) {
            audioEngine.pause();
          }
        } else {
          audioEngine.pause();
        }
      } catch (err) {
        console.warn('Collab sync play execution error:', err);
      } finally {
        setTimeout(() => {
          isRemoteActionRef.current = false;
        }, 300);
      }
    });

    const unsubSeekSync = collabSocket.on('seek_sync', (data: SeekSyncPayload) => {
      isRemoteActionRef.current = true;
      audioEngine.seek(data.currentTime);
      setTimeout(() => {
        isRemoteActionRef.current = false;
      }, 300);
    });

    const unsubReaction = collabSocket.on('reaction_pulse', (rx: ReactionPayload) => {
      setReactions((prev) => [...prev.slice(-15), rx]);
      // Remove after 3.5 seconds
      setTimeout(() => {
        setReactions((prev) => prev.filter((item) => item.id !== rx.id));
      }, 3500);
    });

    const unsubError = collabSocket.on('error', (msg: string) => {
      setErrorMessage(msg);
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    });

    return () => {
      clearInterval(syncTimer);
      unsubConn();
      unsubRoomUpdate();
      unsubPlaybackSync();
      unsubSeekSync();
      unsubReaction();
      unsubError();
    };
  }, [currentSong, isPlaying, currentTime, playSong]);

  // Synchronize local playback changes with the room
  useEffect(() => {
    if (!isInRoom || isRemoteActionRef.current) return;

    // Send playback update to room
    collabSocket.syncPlay(currentSong, isPlaying, currentTime, queue);
  }, [currentSong?.id, isPlaying]);

  const createRoom = () => {
    collabSocket.createRoom(userName, currentSong, isPlaying, currentTime, queue);
  };

  const joinRoom = (code: string) => {
    if (!code.trim()) {
      setErrorMessage('Please enter a 4-digit Room Code!');
      return;
    }
    collabSocket.joinRoom(code.trim().toUpperCase(), userName);
  };

  const leaveRoom = () => {
    collabSocket.leaveRoom();
    setRoom(null);
  };

  const sendReaction = (emoji: string) => {
    if (!isInRoom) return;
    collabSocket.sendReaction(emoji);
  };

  const addSongToCollabQueue = (song: Song) => {
    if (!isInRoom) return;
    collabSocket.addQueue(song);
  };

  const clearError = () => {
    setErrorMessage(null);
  };

  return (
    <CollabContext.Provider
      value={{
        room,
        isInRoom,
        isHost,
        isConnected,
        isCollabModalOpen,
        userName,
        reactions,
        errorMessage,
        setIsCollabModalOpen,
        setUserName,
        createRoom,
        joinRoom,
        leaveRoom,
        sendReaction,
        addSongToCollabQueue,
        clearError
      }}
    >
      {children}
    </CollabContext.Provider>
  );
};

export const useCollab = (): CollabContextType => {
  const ctx = useContext(CollabContext);
  if (!ctx) {
    throw new Error('useCollab must be used within a CollabProvider');
  }
  return ctx;
};
