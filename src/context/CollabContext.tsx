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

  const [room, setRoom] = useState<CollabRoomState | null>(() => {
    const sess = collabSocket.getActiveSession();
    if (sess && sess.roomCode) {
      return {
        code: sess.roomCode,
        name: `${sess.userName}'s Collab Jam`,
        hostId: sess.isHost ? sess.userId : '',
        memberCount: 1,
        members: [{ id: sess.userId, name: sess.userName, isHost: sess.isHost, isOnline: true }],
        currentSong: null,
        isPlaying: false,
        currentTime: 0,
        queue: []
      };
    }
    return null;
  });

  const [isConnected, setIsConnected] = useState<boolean>(collabSocket.isConnected);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState<boolean>(false);
  const [reactions, setReactions] = useState<ReactionPayload[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [userName, setUserNameState] = useState<string>(() => {
    try {
      const sess = collabSocket.getActiveSession();
      if (sess?.userName) return sess.userName;
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
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  // Dedicated playback sync executor with latency compensation and anti-echo protection
  const syncPlaybackState = async (data: {
    currentSong: Song | null;
    isPlaying: boolean;
    currentTime: number;
    timestamp?: number;
  }) => {
    if (!data) return;

    // Calculate latency elapsed if timestamp provided
    let targetTime = Number(data.currentTime) || 0;
    if (data.isPlaying && data.timestamp) {
      const elapsed = (Date.now() - data.timestamp) / 1000;
      if (elapsed > 0 && elapsed < 60) {
        targetTime += elapsed;
      }
    }

    const activeSong = currentSongRef.current;
    const songChanged = !activeSong || activeSong.id !== data.currentSong?.id;

    isRemoteActionRef.current = true;
    lastSyncedSongIdRef.current = data.currentSong?.id || null;
    lastSyncedPlayStateRef.current = data.isPlaying;

    try {
      if (data.currentSong) {
        if (songChanged) {
          await playSong(data.currentSong, undefined, targetTime);
          if (!data.isPlaying) {
            audioEngine.pause();
          }
        } else {
          const myTime = audioEngine.getCurrentTime();
          // If time is drifted by more than 1.8 seconds, align it
          if (Math.abs(myTime - targetTime) > 1.8) {
            audioEngine.seek(targetTime);
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
      }, 2500);
    }
  };

  // Setup WebSocket Listeners (stable on mount)
  useEffect(() => {
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

    const unsubRoomUpdate = (roomData: CollabRoomState) => {
      setRoom(roomData);

      // If we are a listener (or just rejoined after refresh/network drop), sync playback
      const hostCheck = Boolean(roomData && collabSocket.myUserId && roomData.hostId === collabSocket.myUserId);
      if (!hostCheck && roomData.currentSong) {
        syncPlaybackState({
          currentSong: roomData.currentSong,
          isPlaying: roomData.isPlaying,
          currentTime: roomData.currentTime,
          timestamp: roomData.timestamp
        });
      }
    };
    const offRoomUpdate = collabSocket.on('room_update', unsubRoomUpdate);

    const unsubPlaybackSync = collabSocket.on('playback_sync', (data: PlaybackSyncPayload) => {
      syncPlaybackState(data);
    });

    const unsubSeekSync = collabSocket.on('seek_sync', (data: SeekSyncPayload) => {
      isRemoteActionRef.current = true;
      let targetTime = Number(data.currentTime) || 0;
      if (data.timestamp) {
        const elapsed = (Date.now() - data.timestamp) / 1000;
        if (elapsed > 0 && elapsed < 30) targetTime += elapsed;
      }
      audioEngine.seek(targetTime);
      setTimeout(() => {
        isRemoteActionRef.current = false;
      }, 1200);
    });

    const unsubReaction = collabSocket.on('reaction_pulse', (rx: ReactionPayload) => {
      setReactions((prev) => [...prev.slice(-15), rx]);
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
      offRoomUpdate();
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

  // Periodic host sync pulse: locks listeners in exact sync even across buffering / network blips
  useEffect(() => {
    if (!isInRoom || !isHost || !isPlaying || !currentSong) return;

    const pulseInterval = setInterval(() => {
      if (isRemoteActionRef.current) return;
      collabSocket.syncPlay(currentSongRef.current, isPlayingRef.current, currentTimeRef.current, queue);
    }, 4000);

    return () => clearInterval(pulseInterval);
  }, [isInRoom, isHost, isPlaying, currentSong?.id]);

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
    lastSyncedSongIdRef.current = null;
    lastSyncedPlayStateRef.current = null;
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
