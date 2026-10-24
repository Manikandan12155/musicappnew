import { Song } from '../types/music';
import { apiUrl } from './apiConfig';

const DB_NAME = 'SpaceMusicOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_songs';

export interface OfflineSongRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string;
  genre: string;
  audioBlob: Blob;
  downloadedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

class OfflineStorageService {
  /**
   * Save a song offline into IndexedDB and trigger direct file download
   */
  public async downloadSong(song: Song): Promise<boolean> {
    try {
      // 1. Fetch audio stream as blob
      const streamUrl = song.audioUrl.startsWith('/api') ? apiUrl(song.audioUrl) : song.audioUrl;
      const audioRes = await fetch(streamUrl);
      if (!audioRes.ok) throw new Error('Failed to fetch audio stream');
      const audioBlob = await audioRes.blob();

      // 2. Save into IndexedDB for in-app offline playback
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: OfflineSongRecord = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album || 'Single',
        duration: song.duration || 210,
        coverUrl: song.coverUrl,
        genre: song.genre || 'Music',
        audioBlob,
        downloadedAt: Date.now()
      };

      await new Promise<void>((resolve, reject) => {
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      // 3. Trigger browser file download to local PC / Mobile storage
      const downloadUrl = apiUrl(`/api/download/${song.id}?title=${encodeURIComponent(song.title)}`);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `${song.title}.mp3`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      return true;
    } catch (err) {
      console.error('Offline download failed:', err);
      return false;
    }
  }

  /**
   * Retrieve all offline songs converted to playable Song objects
   */
  public async getOfflineSongs(): Promise<Song[]> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      const records: OfflineSongRecord[] = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      return records.map((r) => ({
        id: r.id,
        title: r.title,
        artist: r.artist,
        album: r.album,
        duration: r.duration,
        coverUrl: r.coverUrl,
        audioUrl: URL.createObjectURL(r.audioBlob),
        genre: r.genre
      }));
    } catch (err) {
      console.warn('Could not read offline songs:', err);
      return [];
    }
  }

  /**
   * Check if song is already downloaded
   */
  public async isSongOffline(songId: string): Promise<boolean> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      return new Promise((resolve) => {
        const req = store.get(songId);
        req.onsuccess = () => resolve(Boolean(req.result));
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Remove a song from offline storage
   */
  public async removeSong(songId: string): Promise<boolean> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const req = store.delete(songId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return false;
    }
  }
}

export const offlineStorage = new OfflineStorageService();
