import { Song } from '../types/music';

export interface RoomMember {
  id: string;
  name: string;
  isHost: boolean;
  isOnline?: boolean;
}

export interface CollabRoomState {
  code: string;
  name: string;
  hostId: string;
  memberCount: number;
  members: RoomMember[];
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  queue: Song[];
  timestamp?: number;
}

export interface PlaybackSyncPayload {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  senderName: string;
  timestamp?: number;
}

export interface SeekSyncPayload {
  currentTime: number;
  senderName: string;
  timestamp?: number;
}

export interface ReactionPayload {
  id: string;
  emoji: string;
  senderName: string;
  timestamp: number;
}

export interface JamSession {
  roomCode: string;
  userName: string;
  userId: string;
  isHost: boolean;
}

type MessageHandler = (data: any) => void;

class CollabSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isExplicitlyClosed = false;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private pendingQueue: Array<{ type: string; payload: Record<string, any> }> = [];
  private urlIndex = 0;
  private lastSubmittedName = '';

  public myUserId: string;
  public currentRoomCode: string | null = null;

  constructor() {
    let savedUid = '';
    try {
      savedUid = localStorage.getItem('space_collab_userid') || '';
      if (!savedUid) {
        savedUid = Math.random().toString(36).substring(2, 9);
        localStorage.setItem('space_collab_userid', savedUid);
      }
    } catch {
      savedUid = Math.random().toString(36).substring(2, 9);
    }
    this.myUserId = savedUid;

    const existingSession = this.getActiveSession();
    if (existingSession) {
      this.currentRoomCode = existingSession.roomCode;
      this.lastSubmittedName = existingSession.userName;
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.connect(true);
      });
      window.addEventListener('focus', () => {
        if (!this.isConnected) {
          this.connect();
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.isConnected) {
          this.connect();
        }
      });
    }

    this.connect();
  }

  public get isConnected(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  public getActiveSession(): JamSession | null {
    try {
      const data = localStorage.getItem('space_jam_session');
      if (data) return JSON.parse(data);
    } catch {}
    return null;
  }

  public saveActiveSession(session: JamSession) {
    try {
      localStorage.setItem('space_jam_session', JSON.stringify(session));
      this.currentRoomCode = session.roomCode;
    } catch {}
  }

  public clearActiveSession() {
    try {
      localStorage.removeItem('space_jam_session');
      this.currentRoomCode = null;
    } catch {}
  }

  private getCandidateUrls(): string[] {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname || 'localhost';
    const host = window.location.host;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    const envBackend = (import.meta as any).env?.VITE_BACKEND_URL || (import.meta as any).env?.VITE_API_URL;
    let envWsUrl = '';
    if (envBackend && typeof envBackend === 'string' && envBackend.trim()) {
      const clean = envBackend.trim().replace(/^http/, 'ws').replace(/\/+$/, '');
      envWsUrl = `${clean}/ws`;
    }

    const urls: string[] = [];
    if (envWsUrl) {
      urls.push(envWsUrl);
    }

    if (!isLocal) {
      // Connect WebSocket to the live Render backend
      urls.push('wss://space-music.onrender.com/ws');
      urls.push('wss://space-music.onrender.com/');
      if (host) {
        urls.push(`${protocol}//${host}/ws`);
        urls.push(`${protocol}//${host}/`);
      }
    } else {
      // In local dev, prioritize direct port 5050, then proxy, and render backend as fallback
      urls.push(`${protocol}//${hostname}:5050/ws`);
      if (host && host !== `${hostname}:5050`) {
        urls.push(`${protocol}//${host}/ws`);
      }
      urls.push(`${protocol}//${hostname}:5050/`);
      urls.push('wss://space-music.onrender.com/ws');
    }
    return urls;
  }

  public connect(force = false) {
    if (!force && this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (force && this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    try {
      const urls = this.getCandidateUrls();
      const wsUrl = urls[this.urlIndex % urls.length];

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.emit('connection_change', true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Auto-rejoin if active room session exists in localStorage
        const activeSess = this.getActiveSession();
        if (activeSess && activeSess.roomCode) {
          this.send('REJOIN_ROOM', {
            code: activeSess.roomCode,
            name: activeSess.userName,
            userId: this.myUserId,
            isHost: activeSess.isHost
          });
        }

        // Flush any pending messages queued while connecting
        if (this.pendingQueue.length > 0) {
          const queue = [...this.pendingQueue];
          this.pendingQueue = [];
          queue.forEach((item) => {
            this.send(item.type, item.payload);
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (e) {
          console.warn('Failed to parse Collab WS message:', e);
        }
      };

      this.ws.onclose = () => {
        this.emit('connection_change', false);
        if (!this.isExplicitlyClosed) {
          this.urlIndex++;
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Collab WS Error, switching endpoint candidate:', err);
        this.emit('connection_change', false);
        this.urlIndex++;
      };
    } catch (e) {
      console.warn('Collab WS connection failed:', e);
      this.urlIndex++;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 1200);
  }

  private handleServerMessage(data: any) {
    switch (data.type) {
      case 'ROOM_CREATED':
        this.myUserId = data.userId || this.myUserId;
        this.currentRoomCode = data.roomCode;
        this.saveActiveSession({
          roomCode: data.roomCode,
          userName: data.userName || this.lastSubmittedName,
          userId: this.myUserId,
          isHost: true
        });
        this.emit('room_created', data);
        break;

      case 'ROOM_JOINED':
        this.myUserId = data.userId || this.myUserId;
        this.currentRoomCode = data.roomCode;
        this.saveActiveSession({
          roomCode: data.roomCode,
          userName: data.userName || this.lastSubmittedName,
          userId: this.myUserId,
          isHost: Boolean(data.isHost)
        });
        this.emit('room_joined', data);
        break;

      case 'ROOM_UPDATE':
        this.emit('room_update', data.room);
        break;

      case 'PLAYBACK_SYNC':
        this.emit('playback_sync', data);
        break;

      case 'SEEK_SYNC':
        this.emit('seek_sync', data);
        break;

      case 'REACTION_PULSE':
        this.emit('reaction_pulse', {
          id: Math.random().toString(36).substring(2, 9),
          emoji: data.emoji,
          senderName: data.senderName,
          timestamp: Date.now()
        });
        break;

      case 'ERROR':
        if (typeof data.message === 'string' && (data.message.includes('not found') || data.message.includes('expired'))) {
          this.clearActiveSession();
        }
        this.emit('error', data.message || 'Unknown room error');
        break;

      default:
        break;
    }
  }

  public send(type: string, payload: Record<string, any> = {}) {
    const fullPayload = {
      userId: this.myUserId,
      ...payload
    };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingQueue.push({ type, payload: fullPayload });
      this.connect();
      return;
    }
    this.ws.send(JSON.stringify({ type, ...fullPayload }));
  }

  public createRoom(userName: string, currentSong?: Song | null, isPlaying?: boolean, currentTime?: number, queue?: Song[]) {
    this.lastSubmittedName = userName;
    this.send('CREATE_ROOM', {
      name: userName,
      userId: this.myUserId,
      currentSong,
      isPlaying: Boolean(isPlaying),
      currentTime: Number(currentTime) || 0,
      queue: queue || []
    });
  }

  public joinRoom(roomCode: string, userName: string) {
    this.lastSubmittedName = userName;
    this.send('JOIN_ROOM', {
      code: roomCode.trim().toUpperCase(),
      name: userName,
      userId: this.myUserId
    });
  }

  public syncPlay(currentSong: Song | null, isPlaying: boolean, currentTime: number, queue?: Song[]) {
    this.send('SYNC_PLAY', {
      currentSong,
      isPlaying,
      currentTime: Number(currentTime) || 0,
      queue
    });
  }

  public syncSeek(currentTime: number) {
    this.send('SYNC_SEEK', { currentTime: Number(currentTime) || 0 });
  }

  public addQueue(song: Song) {
    this.send('ADD_QUEUE', { song });
  }

  public sendReaction(emoji: string) {
    this.send('REACTION', { emoji });
  }

  public leaveRoom() {
    this.send('LEAVE_ROOM', { userId: this.myUserId });
    this.clearActiveSession();
    this.currentRoomCode = null;
  }

  public on(event: string, callback: MessageHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: MessageHandler) {
    const subs = this.listeners.get(event);
    if (subs) {
      subs.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const subs = this.listeners.get(event);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.warn(`Error in listener for event ${event}:`, e);
        }
      });
    }
  }
}

export const collabSocket = new CollabSocketService();
