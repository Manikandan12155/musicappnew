import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import play from 'play-dl';
import { Ytdl, chooseFormat, Client } from '@distube/ytdl-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ytdl = new Ytdl({
  clients: [Client.Tv, Client.WebEmbedded, Client.VisionOS, Client.Mweb]
});
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const PORT = Number(process.env.PORT) || 5050;

server.on('upgrade', (request, socket, head) => {
  const urlObj = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  if (pathname === '/ws' || pathname === '/ws/' || pathname === '/' || pathname === '') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// Helper to decode HTML entities in YouTube titles
function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// Clean noisy YouTube titles to clean, Spotify-style track titles
function cleanSongTitle(raw: string): string {
  let cleaned = decodeHtml(raw);
  // Remove common fluff like (Official Video), [4K], etc.
  cleaned = cleaned.replace(/\s*[\(\[](official\s*(music\s*video|video|audio|lyric\s*video|lyrical|hd|4k)?|full\s*song|visualizer|audio\s*song|4k\s*uhd)[\)\]]/gi, '');
  // Remove channel prefixes like @SaiAbhyankkar -
  cleaned = cleaned.replace(/^@[a-zA-Z0-9_-]+\s*-\s*/, '');
  return cleaned.trim();
}

function cleanArtistName(raw: string): string {
  return decodeHtml(raw)
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/Official$/i, '')
    .trim();
}

function extractArtist(runs: any[]): string {
  if (!runs || !Array.isArray(runs)) return 'Space Music';
  const filtered = runs
    .map(r => r.text?.trim())
    .filter(t => t && t !== '•' && t !== 'Song' && t !== 'Video' && !/^\d+(:[0-9]{2})+$/.test(t) && !/\d+(\.\d+)?[MBK]?\s*(plays|views)/i.test(t));
  return filtered.length > 0 ? filtered[0] : 'Space Music';
}

function parseInnerTubeRuns(runs: any[]): { artist: string; album: string; duration: number } {
  if (!runs || !Array.isArray(runs)) return { artist: 'Space Music', album: 'Space Mix', duration: 0 };

  const sections: string[] = [];
  let currentSection: string[] = [];
  for (const r of runs) {
    const txt = (r.text || '').trim();
    if (txt === '•') {
      if (currentSection.length) sections.push(currentSection.join('').trim());
      currentSection = [];
    } else {
      currentSection.push(r.text || '');
    }
  }
  if (currentSection.length) sections.push(currentSection.join('').trim());

  let artist = '';
  let album = '';
  let duration = 0;

  for (const sec of sections) {
    if (!sec) continue;
    if (/^\d+:[0-5]\d(:[0-5]\d)?$/.test(sec)) {
      const parts = sec.split(':').map(Number);
      if (parts.length === 2) duration = parts[0] * 60 + parts[1];
      else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
      continue;
    }
    if (/^\d+(\.\d+)?[MBK]?\s*(plays|views)$/i.test(sec) || /^(Song|Video|Episode|Playlist|Single)$/i.test(sec)) {
      continue;
    }
    if (!artist) {
      artist = sec;
    } else if (!album) {
      album = sec;
    }
  }

  return {
    artist: artist || 'Space Music',
    album: album || `${artist || 'Space'} Mix`,
    duration
  };
}

// 1. Core Engine: Direct YouTube Music InnerTube (Zero API Key, Unlimited)
async function fetchFromYouTubeMusicInnerTube(query: string, limit = 16) {
  const trySearch = async (paramsFilter?: string) => {
    try {
      const bodyPayload: any = {
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20240101.01.00',
            hl: 'en',
            gl: 'IN'
          }
        },
        query: query
      };
      if (paramsFilter) {
        bodyPayload.params = paramsFilter;
      }

      const res = await fetch('https://music.youtube.com/youtubei/v1/search?alt=json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Origin': 'https://music.youtube.com',
          'Referer': 'https://music.youtube.com/'
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) return [];

      const data = await res.json();
      const list: any[] = [];
      const seen = new Set<string>();

      function findItems(node: any) {
        if (!node || typeof node !== 'object') return;

        if (node.musicResponsiveListItemRenderer) {
          const item = node.musicResponsiveListItemRenderer;
          const flexCols = item.flexColumns || [];
          const fixedCols = item.fixedColumns || [];

          let title: string | null = null;
          let videoId: string | null = null;

          const col0Runs = flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
          if (col0Runs && col0Runs[0]) {
            title = col0Runs[0].text;
            videoId = col0Runs[0].navigationEndpoint?.watchEndpoint?.videoId;
          }

          if (!videoId) {
            videoId = item.playlistItemData?.videoId ||
              item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
          }

          const col1Runs = flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
          const parsed = parseInnerTubeRuns(col1Runs);
          let duration = parsed.duration;

          // Check fixed columns if duration wasn't in col1
          if (!duration && Array.isArray(fixedCols)) {
            for (const fCol of fixedCols) {
              const runs = fCol?.musicResponsiveListItemFixedColumnRenderer?.text?.runs || [];
              for (const r of runs) {
                const txt = (r?.text || '').trim();
                if (/^\d+:[0-5]\d(:[0-5]\d)?$/.test(txt)) {
                  const parts = txt.split(':').map(Number);
                  if (parts.length === 2) duration = parts[0] * 60 + parts[1];
                  else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                  break;
                }
              }
              if (duration) break;
            }
          }

          // Check other flex columns
          if (!duration && flexCols.length > 2) {
            for (let i = 2; i < flexCols.length; i++) {
              const runs = flexCols[i]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
              for (const r of runs) {
                const txt = (r?.text || '').trim();
                if (/^\d+:[0-5]\d(:[0-5]\d)?$/.test(txt)) {
                  const parts = txt.split(':').map(Number);
                  if (parts.length === 2) duration = parts[0] * 60 + parts[1];
                  else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                  break;
                }
              }
              if (duration) break;
            }
          }

          const thumbs = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const rawThumb = thumbs[thumbs.length - 1]?.url;
          const coverUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : (rawThumb || '');

          if (videoId && title && !seen.has(videoId)) {
            seen.add(videoId);
            list.push({
              id: videoId,
              title: cleanSongTitle(title),
              artist: cleanArtistName(parsed.artist),
              album: parsed.album,
              duration,
              coverUrl,
              audioUrl: `/api/stream/${videoId}`,
              genre: 'Space Stream',
              url: `/api/stream/${videoId}`
            });
          }
        }

        for (const key of Object.keys(node)) {
          findItems(node[key]);
        }
      }

      findItems(data);
      return list;
    } catch {
      return [];
    }
  };

  try {
    // 1st Priority: Songs filtered search (returns clean tracks with accurate duration & album)
    let songs = await trySearch('EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D');
    if (!songs || songs.length === 0) {
      // Fallback: general music search
      songs = await trySearch();
    }
    if (songs && songs.length > 0) {
      return songs.slice(0, limit);
    }
  } catch (err: any) {
    console.warn('InnerTube fetch error:', err.message);
  }

  return [];
}

// 2. Fallback Engine: Official Data API or Static Trending Curated fallback
async function getSongsWithoutApiKey(query: string, limit = 16) {
  // 1st Priority: Native YouTube Music InnerTube (Keyless, Unlimited)
  const innerTubeResults = await fetchFromYouTubeMusicInnerTube(query, limit);
  if (innerTubeResults && innerTubeResults.length > 0) {
    return innerTubeResults;
  }

  // Fallback: If network restricts InnerTube, return high quality fallback
  return [];
}

// 1. Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    mode: 'Space Music High-Res Streaming Engine',
    apiKeyRequired: false,
    service: 'Space Music Unlimited Stream API',
    uptime: process.uptime(),
    time: new Date().toISOString()
  });
});

// 2. Trending Music Feed (100% Keyless Infinite Pagination Engine)
app.get('/api/trending', async (req: Request, res: Response) => {
  try {
    const genre = (req.query.genre as string) || (req.query.category as string) || 'all';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(40, parseInt(req.query.limit as string) || 20);

    // Dynamic query rotation pool per genre and page for endless unique songs!
    const queryPools: Record<string, string[]> = {
      all: [
        'trending tamil hit songs 2026',
        'latest kollywood blockbuster hits 2026',
        'tamil viral songs anirudh harris yuvan',
        'top trending songs south india',
        'tamil melody and mass chartbusters 2026',
        'new tamil jukebox audio hits',
        'superhit tamil cinema songs 2026',
        'tamil indie pop hits think music'
      ],
      tamil: [
        'latest tamil hit songs 2026',
        'tamil melody love songs 2026',
        'tamil acoustic love songs',
        'kollywood latest songs 2026',
        'superhit tamil jukebox audio'
      ],
      trending: [
        'top trending music songs 2026',
        'viral worldwide hit songs',
        'global top 50 songs 2026',
        'trending billboard music hits'
      ],
      mass: [
        'tamil mass songs rock beats',
        'kollywood high energy gym motivation beats',
        'tamil kuthu party anthems',
        'anirudh mass bgm and songs',
        'thala thalapathy mass hits'
      ],
      dance: [
        'dance party hits songs 2026',
        'club remix dance songs',
        'tamil party mix dj beats',
        'electro pop dance hits'
      ],
      chill: [
        'tamil chill lofi songs acoustic',
        'midnight chill vibe songs',
        'peaceful acoustic melody tamil',
        'rainy day tamil lofi mix'
      ]
    };

    const pool = queryPools[genre] || queryPools.all;
    const poolIndex = (page - 1) % pool.length;
    const searchQuery = pool[poolIndex];

    const results = await getSongsWithoutApiKey(searchQuery, limit);
    return res.json({
      results,
      page,
      hasMore: true,
      mode: 'innertube-keyless-unlimited'
    });
  } catch (error: any) {
    console.error('Trending fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch trending songs' });
  }
});

// 3. Search Songs Endpoint (100% Keyless Infinite Pagination Engine)
app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Parameter "q" is required' });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(40, parseInt(req.query.limit as string) || 20);

    // Multi-page variation search for endless matching results
    let searchQuery = query;
    if (page === 2) {
      searchQuery = `${query} hits songs`;
    } else if (page === 3) {
      searchQuery = `${query} full album audio`;
    } else if (page === 4) {
      searchQuery = `${query} jukebox tracks`;
    } else if (page > 4) {
      searchQuery = `${query} mix songs volume ${page}`;
    }

    const results = await getSongsWithoutApiKey(searchQuery, limit);
    return res.json({
      results,
      page,
      hasMore: results.length > 0,
      mode: 'innertube-keyless-unlimited'
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// 4. Audio Streaming API (Direct Pipe via @distube/ytdl-core — 100% Same-Origin & Mobile Safe)
app.get('/api/stream/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).send('Video ID is required');

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    res.header('Content-Type', 'audio/mp4');
    res.header('Accept-Ranges', 'bytes');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Cache-Control', 'public, max-age=7200');

    let start = 0;
    const rangeHeader = req.headers.range;
    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace('bytes=', '').split('-');
      start = parseInt(parts[0], 10) || 0;
    }

    const downloadOptions: any = {
      filter: (f: any) => Boolean(f.hasAudio && !f.hasVideo),
      quality: 'highestaudio'
    };

    if (start > 0) {
      downloadOptions.range = { start };
      res.status(206);
    }

    const stream = ytdl.download(videoUrl, downloadOptions);

    stream.on('error', (err) => {
      console.error(`Stream error for ${videoId}:`, err.message);
      if (!res.headersSent) {
        res.status(500).send('Streaming error');
      }
    });

    req.on('close', () => {
      try {
        stream.destroy();
      } catch {}
    });

    return stream.pipe(res);
  } catch (error: any) {
    console.error(`Stream error for ${videoId}:`, error.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Streaming failed', details: error.message });
    }
  }
});

// 4.1 Direct Offline MP3 Download API
app.get('/api/download/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const rawTitle = (req.query.title as string) || `space-track-${videoId}`;
  const cleanTitle = rawTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || `space-track-${videoId}`;

  if (!videoId) return res.status(400).send('Video ID is required');

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    res.header('Content-Type', 'audio/mpeg');
    res.header('Content-Disposition', `attachment; filename="${cleanTitle}.mp3"`);
    res.header('Accept-Ranges', 'bytes');
    res.header('Access-Control-Allow-Origin', '*');

    const stream = ytdl.download(videoUrl, {
      filter: (f) => Boolean(f.hasAudio && !f.hasVideo),
      quality: 'highestaudio'
    });

    stream.on('error', (err) => {
      console.error(`Download error for ${videoId}:`, err.message);
      if (!res.headersSent) {
        res.status(500).send('Download stream error');
      }
    });

    return stream.pipe(res);
  } catch (error: any) {
    console.error(`Download failed for ${videoId}:`, error.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Download failed', details: error.message });
    }
  }
});

// 5. Synced Lyrics API (LRCLIB Integration — Synced with timestamps)
app.get('/api/lyrics', async (req: Request, res: Response) => {
  try {
    const { title, artist } = req.query as { title?: string; artist?: string };
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const cleanTitle = title
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/ft\..*/i, '')
      .replace(/feat\..*/i, '')
      .trim();

    const cleanArtist = (artist || '')
      .replace(/VEVO/i, '')
      .replace(/Official/i, '')
      .replace(/Topic/i, '')
      .trim();

    const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}${
      cleanArtist ? `&artist_name=${encodeURIComponent(cleanArtist)}` : ''
    }`;

    const lyricsRes = await fetch(url, {
      headers: {
        'User-Agent': 'SpaceMusicWebPlayer/2.0'
      }
    });

    if (!lyricsRes.ok) {
      return res.status(404).json({ error: 'No synced lyrics found' });
    }

    const data = (await lyricsRes.json()) as { syncedLyrics?: string; plainLyrics?: string };
    if (!data.syncedLyrics) {
      return res.json({ lyrics: [], plain: data.plainLyrics || '' });
    }

    const lines = data.syncedLyrics.split('\n');
    const parsedLines: Array<{ time: number; text: string }> = [];

    for (const line of lines) {
      const match = line.match(/\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        const time = Math.round((minutes * 60 + seconds) * 10) / 10;
        const text = match[3].trim();
        if (text) {
          parsedLines.push({ time, text });
        }
      }
    }

    return res.json({ lyrics: parsedLines, plain: data.plainLyrics });
  } catch (error: any) {
    console.error('Lyrics error:', error);
    return res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
});

// 6. Real-time Collaborative Rooms (WebSockets for Same-WiFi / Network Sync)
interface RoomMember {
  id: string;
  name: string;
  ws: WebSocket;
  isHost: boolean;
}

interface RoomState {
  code: string;
  name: string;
  hostId: string;
  members: Map<string, RoomMember>;
  currentSong: any | null;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
  queue: any[];
}

const rooms = new Map<string, RoomState>();

function broadcastToRoom(roomCode: string, payload: any, senderWs?: WebSocket) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const msg = JSON.stringify(payload);
  room.members.forEach((m) => {
    if (m.ws !== senderWs && m.ws.readyState === WebSocket.OPEN) {
      m.ws.send(msg);
    }
  });
}

function broadcastRoomUpdate(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const membersList = Array.from(room.members.values()).map((m) => ({
    id: m.id,
    name: m.name,
    isHost: m.isHost
  }));

  const payload = {
    type: 'ROOM_UPDATE',
    room: {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      memberCount: membersList.length,
      members: membersList,
      currentSong: room.currentSong,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      queue: room.queue
    }
  };

  const msg = JSON.stringify(payload);
  room.members.forEach((m) => {
    if (m.ws.readyState === WebSocket.OPEN) {
      m.ws.send(msg);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  let userRoomCode: string | null = null;
  let userId: string = Math.random().toString(36).substring(2, 9);
  let userName: string = 'Cosmic Listener';

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'CREATE_ROOM') {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        userName = (data.name || 'Cosmic Host').trim();
        const room: RoomState = {
          code,
          name: `${userName}'s Collab Jam`,
          hostId: userId,
          members: new Map(),
          currentSong: data.currentSong || null,
          isPlaying: Boolean(data.isPlaying),
          currentTime: Number(data.currentTime) || 0,
          updatedAt: Date.now(),
          queue: data.queue || []
        };

        room.members.set(userId, { id: userId, name: userName, ws, isHost: true });
        rooms.set(code, room);
        userRoomCode = code;

        ws.send(JSON.stringify({
          type: 'ROOM_CREATED',
          roomCode: code,
          userId,
          isHost: true
        }));
        broadcastRoomUpdate(code);
      } else if (data.type === 'JOIN_ROOM') {
        const code = (data.code || '').trim().toUpperCase();
        userName = (data.name || 'Guest Listener').trim();
        const room = rooms.get(code);

        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: `Room "${code}" not found! Make sure host created it.` }));
          return;
        }

        room.members.set(userId, { id: userId, name: userName, ws, isHost: false });
        userRoomCode = code;

        ws.send(JSON.stringify({
          type: 'ROOM_JOINED',
          roomCode: code,
          userId,
          isHost: false
        }));
        broadcastRoomUpdate(code);
      } else if (data.type === 'SYNC_PLAY') {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (!room) return;

        if (data.currentSong !== undefined) room.currentSong = data.currentSong;
        if (data.isPlaying !== undefined) room.isPlaying = data.isPlaying;
        if (data.currentTime !== undefined) room.currentTime = data.currentTime;
        if (data.queue !== undefined) room.queue = data.queue;
        room.updatedAt = Date.now();

        broadcastToRoom(userRoomCode, {
          type: 'PLAYBACK_SYNC',
          currentSong: room.currentSong,
          isPlaying: room.isPlaying,
          currentTime: room.currentTime,
          senderName: userName
        }, ws);
      } else if (data.type === 'SYNC_SEEK') {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (!room) return;

        room.currentTime = data.currentTime;
        room.updatedAt = Date.now();

        broadcastToRoom(userRoomCode, {
          type: 'SEEK_SYNC',
          currentTime: data.currentTime,
          senderName: userName
        }, ws);
      } else if (data.type === 'ADD_QUEUE') {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (!room || !data.song) return;

        room.queue.push(data.song);
        broadcastRoomUpdate(userRoomCode);
      } else if (data.type === 'REACTION') {
        if (!userRoomCode) return;
        broadcastToRoom(userRoomCode, {
          type: 'REACTION_PULSE',
          emoji: data.emoji || '🔥',
          senderName: userName
        });
      } else if (data.type === 'LEAVE_ROOM') {
        if (userRoomCode) {
          const room = rooms.get(userRoomCode);
          if (room) {
            room.members.delete(userId);
            if (room.members.size === 0) {
              rooms.delete(userRoomCode);
            } else {
              if (room.hostId === userId) {
                const nextHost = Array.from(room.members.values())[0];
                if (nextHost) {
                  nextHost.isHost = true;
                  room.hostId = nextHost.id;
                }
              }
              broadcastRoomUpdate(userRoomCode);
            }
          }
          userRoomCode = null;
        }
      }
    } catch (e: any) {
      console.warn('WebSocket message error:', e.message);
    }
  });

  ws.on('close', () => {
    if (userRoomCode) {
      const room = rooms.get(userRoomCode);
      if (room) {
        room.members.delete(userId);
        if (room.members.size === 0) {
          rooms.delete(userRoomCode);
        } else {
          if (room.hostId === userId) {
            const nextHost = Array.from(room.members.values())[0];
            if (nextHost) {
              nextHost.isHost = true;
              room.hostId = nextHost.id;
            }
          }
          broadcastRoomUpdate(userRoomCode);
        }
      }
    }
  });
});

// 7. Serve Static Frontend in Production (Render / Railway / VPS Unified Host)
const distCandidates = [
  path.resolve(process.cwd(), 'dist'),
  path.resolve(process.cwd(), '../dist'),
  path.resolve(__dirname, '../../dist')
];

let activeDistPath: string | null = null;
for (const cand of distCandidates) {
  if (fs.existsSync(cand) && fs.existsSync(path.join(cand, 'index.html'))) {
    activeDistPath = cand;
    break;
  }
}

if (activeDistPath) {
  console.log(`🚀 Serving frontend static assets from: ${activeDistPath}`);
  app.use(express.static(activeDistPath));
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(activeDistPath!, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌌 Space Music 100% KEYLESS Server & WebSocket running on http://0.0.0.0:${PORT}`);
  console.log(`   - Engine:    Official InnerTube Keyless`);
  console.log(`   - WebSocket: ws://0.0.0.0:${PORT}/ws (Collab Jam Rooms)`);
});
