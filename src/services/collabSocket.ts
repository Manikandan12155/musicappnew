import { Song } from '../types/music';

export interface RoomMember {
  id: string;
  name: string;
  isHost: boolean;
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
}

export interface PlaybackSyncPayload {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  senderName: string;
}

export interface SeekSyncPayload {
  currentTime: number;
  senderName: string;
}

export interface ReactionPayload {
  id: string;
  emoji: string;
  senderName: string;
  timestamp: number;
}

type MessageHandler = (data: any) => void;

class CollabSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isExplicitlyClosed = false;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private pendingQueue: Array<{ type: string; payload: Record<string, any> }> = [];
  private urlIndex = 0;

  public myUserId: string | null = null;
  public currentRoomCode: string | null = null;

  constructor() {
    this.connect();
  }

  public get isConnected(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  private getCandidateUrls(): string[] {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname || 'localhost';
    const host = window.location.host;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    const urls: string[] = [];
    if (!isLocal) {
      // In production (Render, custom domain, etc.), always connect directly to the active host /ws
      if (host) urls.push(`${protocol}//${host}/ws`);
      if (host) urls.push(`${protocol}//${host}/`);
    } else {
      // In local dev, prioritize direct port 5050, then proxy
      urls.push(`${protocol}//${hostname}:5050/ws`);
      if (host && host !== `${hostname}:5050`) {
        urls.push(`${protocol}//${host}/ws`);
      }
      urls.push(`${protocol}//${hostname}:5050/`);
    }
    return urls;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
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
        this.myUserId = data.userId;
        this.currentRoomCode = data.roomCode;
        this.emit('room_created', data);
        break;

      case 'ROOM_JOINED':
        this.myUserId = data.userId;
        this.currentRoomCode = data.roomCode;
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
        this.emit('error', data.message || 'Unknown room error');
        break;

      default:
        break;
    }
  }

  public send(type: string, payload: Record<string, any> = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message to send as soon as connected
      this.pendingQueue.push({ type, payload });
      this.connect();
      return;
    }
    this.ws.send(JSON.stringify({ type, ...payload }));
  }

  public createRoom(userName: string, currentSong?: Song | null, isPlaying?: boolean, currentTime?: number, queue?: Song[]) {
    this.send('CREATE_ROOM', {
      name: userName,
      currentSong,
      isPlaying: Boolean(isPlaying),
      currentTime: Number(currentTime) || 0,
      queue: queue || []
    });
  }

  public joinRoom(roomCode: string, userName: string) {
    this.send('JOIN_ROOM', {
      code: roomCode.trim().toUpperCase(),
      name: userName
    });
  }

  public syncPlay(currentSong: Song | null, isPlaying: boolean, currentTime: number, queue?: Song[]) {
    this.send('SYNC_PLAY', {
      currentSong,
      isPlaying,
      currentTime,
      queue
    });
  }

  public syncSeek(currentTime: number) {
    this.send('SYNC_SEEK', { currentTime });
  }

  public addQueue(song: Song) {
    this.send('ADD_QUEUE', { song });
  }

  public sendReaction(emoji: string) {
    this.send('REACTION', { emoji });
  }

  public leaveRoom() {
    this.send('LEAVE_ROOM', {});
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
