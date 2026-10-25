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
      return localStorage.getItem('space_collab_username') || '';
    } catch {
      return '';
    }
  });

  const setUserName = (name: string) => {
    setUserNameState(name);
    try {
      if (name.trim()) {
        localStorage.setItem('space_collab_username', name.trim());
      } else {
        localStorage.removeItem('space_collab_username');
      }
    } catch {}
  };

  const isRemoteActionRef = useRef<boolean>(false);
  const lastSyncedSongIdRef = useRef<string | null>(null);
  const lastSyncedPlayStateRef = useRef<boolean | null>(null);

  // Keep latest values in refs to prevent listener teardown every 250ms
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const isInRoom = Boolean(room && room.code);
  const isHost = Boolean(room && collabSocket.myUserId && room.hostId === collabSocket.myUserId);

  // Setup WebSocket Listeners (stable on mount)
  useEffect(() => {
    // Immediately sync current connection state
    setIsConnected(collabSocket.isConnected);

    if (!collabSocket.isConnected) {
      collabSocket.connect();
    }

    const unsubConn = collabSocket.on('connection_change', (connected: boolean) => {
      setIsConnected(connected);
    });

    // Heartbeat check every 2s
    const syncTimer = setInterval(() => {
      const active = collabSocket.isConnected;
      setIsConnected((prev) => (prev !== active ? active : prev));
      if (!active) {
        collabSocket.connect();
      }
    }, 2000);

    const unsubRoomUpdate = collabSocket.on('room_update', (roomData: CollabRoomState) => {
      setRoom(roomData);
    });

    const unsubPlaybackSync = collabSocket.on('playback_sync', async (data: PlaybackSyncPayload) => {
      isRemoteActionRef.current = true;
      lastSyncedSongIdRef.current = data.currentSong?.id || null;
      lastSyncedPlayStateRef.current = data.isPlaying;

      try {
        if (data.currentSong) {
          const activeSong = currentSongRef.current;
          // If different song, start playing it
          if (!activeSong || activeSong.id !== data.currentSong.id) {
            playSong(data.currentSong);
          } else {
            // Same song: sync seek and play state
            if (data.currentTime !== undefined && Math.abs(currentTimeRef.current - data.currentTime) > 2) {
              audioEngine.seek(data.currentTime);
            }

            if (data.isPlaying && !isPlayingRef.current) {
              await audioEngine.play();
            } else if (!data.isPlaying && isPlayingRef.current) {
              audioEngine.pause();
            }
          }
        } else {
          audioEngine.pause();
        }
      } catch (err) {
        console.warn('Collab sync play execution error:', err);
      } finally {
        setTimeout(() => {
          isRemoteActionRef.current = false;
        }, 1200);
      }
    });

    const unsubSeekSync = collabSocket.on('seek_sync', (data: SeekSyncPayload) => {
      isRemoteActionRef.current = true;
      audioEngine.seek(data.currentTime);
      setTimeout(() => {
        isRemoteActionRef.current = false;
      }, 800);
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
  }, [playSong]);

  // Synchronize local playback changes with the room (echo-loop protected)
  useEffect(() => {
    if (!isInRoom || isRemoteActionRef.current) return;
    if (currentSong?.id === lastSyncedSongIdRef.current && isPlaying === lastSyncedPlayStateRef.current) {
      return;
    }

    lastSyncedSongIdRef.current = currentSong?.id || null;
    lastSyncedPlayStateRef.current = isPlaying;

    collabSocket.syncPlay(currentSong, isPlaying, currentTime, queue);
  }, [currentSong?.id, isPlaying, isInRoom]);

  const createRoom = () => {
    const trimmed = userName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your name first!');
      return;
    }
    collabSocket.createRoom(trimmed, currentSong, isPlaying, currentTime, queue);
  };

  const joinRoom = (code: string) => {
    const trimmedName = userName.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter your name first before joining!');
      return;
    }
    if (!code.trim()) {
      setErrorMessage('Please enter a 4-digit Room Code!');
      return;
    }
    collabSocket.joinRoom(code.trim().toUpperCase(), trimmedName);
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

  // Auto-join room from URL query parameter (when scanned via phone camera QR)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('room') || urlParams.get('jam');
      if (code && code.trim().length >= 3) {
        setIsCollabModalOpen(true);
        const savedName = localStorage.getItem('space_collab_username')?.trim();
        if (savedName) {
          const timer = setTimeout(() => {
            collabSocket.connect();
            collabSocket.joinRoom(code.trim().toUpperCase(), savedName);
          }, 700);
          return () => clearTimeout(timer);
        } else {
          setErrorMessage('Please enter your name to connect to this Jam session!');
        }
      }
    } catch {}
  }, []);

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
