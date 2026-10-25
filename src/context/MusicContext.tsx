import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Song, Playlist, PlayerMode, ActiveScreen, EqualizerSettings, LyricLine } from '../types/music';
import { audioEngine } from '../services/audioEngine';
import { apiUrl } from '../services/apiConfig';

interface MusicContextType {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playerMode: PlayerMode;
  activeScreen: ActiveScreen;
  isFullPlayerOpen: boolean;
  activePlayerTab: 'player' | 'lyrics' | 'dna' | 'queue';
  queue: Song[];
  queueIndex: number;
  isQueueOpen: boolean;
  toastMessage: string | null;
  repeatMode: 'none' | 'all' | 'one';
  isShuffle: boolean;
  likedSongIds: string[];
  playlists: Playlist[];
  equalizer: EqualizerSettings;
  isEqualizerOpen: boolean;
  isEchoFindOpen: boolean;
  searchQuery: string;
  selectedGenre: string;
  currentLyricIndex: number;
  isLoadingTrending: boolean;
  isLoadingMore: boolean;
  // Actions
  playSong: (song: Song, customQueue?: Song[]) => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seekTo: (seconds: number) => void;
  setPlayerMode: (mode: PlayerMode) => void;
  setActiveScreen: (screen: ActiveScreen) => void;
  setIsFullPlayerOpen: (open: boolean) => void;
  setActivePlayerTab: (tab: 'player' | 'lyrics' | 'dna' | 'queue') => void;
  toggleLikeSong: (id: string) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  updateEqualizer: (newSettings: Partial<EqualizerSettings>) => void;
  setIsEqualizerOpen: (open: boolean) => void;
  setIsEchoFindOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setSelectedGenre: (genre: string) => void;
  createPlaylist: (name: string, description: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  refreshTrending: () => Promise<void>;
  loadMoreSongs: () => Promise<void>;
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setIsQueueOpen: (open: boolean) => void;
  showToast: (msg: string) => void;
}

const defaultEqualizer: EqualizerSettings = {
  enabled: true,
  bass: 4,
  band60: 3,
  band230: 2,
  band910: 0,
  band3600: 2,
  band14000: 4,
  virtualizer: 30
};

const MusicContext = createContext<MusicContextType | null>(null);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
// 0-Setup Clean Initial State (Zero Mock Data)
  // Auto cleanup legacy keys from previous sessions
  try {
    ['echo_songs', 'echo_liked_songs', 'echo_playlists', 'echo_player_mode', 'echo_equalizer'].forEach(k => {
      localStorage.removeItem(k);
    });
  } catch (_) {}

  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('space_playlists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [likedSongIds, setLikedSongIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('space_liked_songs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [equalizer, setEqualizer] = useState<EqualizerSettings>(() => {
    try {
      const saved = localStorage.getItem('space_equalizer');
      return saved ? JSON.parse(saved) : defaultEqualizer;
    } catch {
      return defaultEqualizer;
    }
  });

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [playerMode, setPlayerModeState] = useState<PlayerMode>(() => {
    const saved = localStorage.getItem('space_player_mode') as PlayerMode;
    return saved || 'apple';
  });
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState<boolean>(false);
  const [activePlayerTab, setActivePlayerTab] = useState<'player' | 'lyrics' | 'dna' | 'queue'>('player');
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('all');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };
  const [isEqualizerOpen, setIsEqualizerOpen] = useState<boolean>(false);
  const [isEchoFindOpen, setIsEchoFindOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(-1);
  const [isLoadingTrending, setIsLoadingTrending] = useState<boolean>(true);

  const audioRef = useRef<HTMLAudioElement>(audioEngine.getAudioElement());

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMoreTrending, setHasMoreTrending] = useState<boolean>(true);

  // Fetch real trending songs via streaming engine (initial page 1)
  const refreshTrending = async (genreOverride?: string) => {
    try {
      setIsLoadingTrending(true);
      setCurrentPage(1);
      setHasMoreTrending(true);
      const targetGenre = genreOverride !== undefined ? genreOverride : selectedGenre;
      const url = targetGenre && targetGenre !== 'all'
        ? `/api/trending?genre=${encodeURIComponent(targetGenre)}&page=1`
        : '/api/trending?page=1';

      const res = await fetch(apiUrl(url));
      if (res.ok) {
        const data = (await res.json()) as { results?: Song[]; hasMore?: boolean };
        if (data.results && data.results.length > 0) {
          setSongs(data.results);
          if (queue.length === 0) {
            setQueue(data.results);
          }
        }
      }
    } catch (e) {
      console.warn('Backend trending fetch unavailable:', e);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  // Endless / Infinite pagination scrolling: automatically load next page and append
  const loadMoreSongs = async () => {
    if (isLoadingMore || !hasMoreTrending || isLoadingTrending) return;
    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const targetGenre = selectedGenre;
      const url = targetGenre && targetGenre !== 'all'
        ? `/api/trending?genre=${encodeURIComponent(targetGenre)}&page=${nextPage}`
        : `/api/trending?page=${nextPage}`;

      const res = await fetch(apiUrl(url));
      if (res.ok) {
        const data = (await res.json()) as { results?: Song[]; hasMore?: boolean };
        if (data.results && data.results.length > 0) {
          setSongs((prev) => {
            const seen = new Set(prev.map((s) => s.id));
            const fresh = data.results!.filter((s) => !seen.has(s.id));
            return [...prev, ...fresh];
          });
          setCurrentPage(nextPage);
        } else {
          setHasMoreTrending(false);
        }
      } else {
        setHasMoreTrending(false);
      }
    } catch (e) {
      console.warn('Error loading more songs:', e);
      setHasMoreTrending(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    refreshTrending(selectedGenre);
  }, [selectedGenre]);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('space_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('space_liked_songs', JSON.stringify(likedSongIds));
  }, [likedSongIds]);

  useEffect(() => {
    localStorage.setItem('space_equalizer', JSON.stringify(equalizer));
    audioEngine.applyEqualizer(equalizer);
  }, [equalizer]);

  const setPlayerMode = (mode: PlayerMode) => {
    setPlayerModeState(mode);
    localStorage.setItem('space_player_mode', mode);
  };

  // Audio Event Listeners with Null Validations
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      const cur = audioEngine.getCurrentTime();
      setCurrentTime(cur);

      const dur = audioEngine.getDuration();
      if (dur && !isNaN(dur) && dur > 0) {
        setDuration(prev => (prev === dur ? prev : dur));
      }

      if (currentSong?.lyrics && currentSong.lyrics.length > 0) {
        let activeIdx = -1;
        for (let i = 0; i < currentSong.lyrics.length; i++) {
          if (cur >= currentSong.lyrics[i].time) {
            activeIdx = i;
          } else {
            break;
          }
        }
        setCurrentLyricIndex(activeIdx);
      }
    };

    const onLoadedMetadata = () => {
      const dur = audioEngine.getDuration();
      if (dur && !isNaN(dur) && dur > 0) {
        setDuration(dur);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audioEngine.play();
      } else {
        handleNextSong();
      }
    };

    const onError = () => {
      console.warn('Audio tag playback error:', audio.error);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [currentSong, repeatMode, queue, queueIndex]);

  // Try to load real synced lyrics from LRCLIB for any song when played
  const fetchLyricsForSong = async (song: Song) => {
    try {
      const res = await fetch(apiUrl(`/api/lyrics?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`));
      if (res.ok) {
        const data = (await res.json()) as { lyrics?: LyricLine[] };
        if (data.lyrics && data.lyrics.length > 0) {
          setCurrentSong((prev) => (prev && prev.id === song.id ? { ...prev, lyrics: data.lyrics } : prev));
        }
      }
    } catch {
      // Ignore if lyrics not available
    }
  };

  const playSong = async (song: Song, customQueue?: Song[]) => {
    if (!song) return;
    setCurrentSong(song);
    const newQueue = customQueue && customQueue.length > 0 ? customQueue : (queue.length > 0 ? queue : [song]);
    setQueue(newQueue);
    const idx = newQueue.findIndex((s) => s.id === song.id);
    setQueueIndex(idx !== -1 ? idx : 0);
    setCurrentTime(0);
    setDuration(song.duration || 0);

    fetchLyricsForSong(song);

    try {
      const finalAudioUrl = song.audioUrl.startsWith('/api') ? apiUrl(song.audioUrl) : song.audioUrl;
      await audioEngine.play(finalAudioUrl, song.id, song.duration);
      setIsPlaying(true);
    } catch (e) {
      console.warn('Playback error or user gesture required:', e);
    }
  };

  const togglePlay = async () => {
    if (!currentSong) return;
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioEngine.play();
        setIsPlaying(true);
      } catch (e) {
        console.warn('Audio play toggle failed:', e);
      }
    }
  };

  const handleNextSong = () => {
    if (queue.length === 0) return;
    let nextIdx = queueIndex + 1;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      if (repeatMode === 'none') return;
      nextIdx = 0;
    }
    setQueueIndex(nextIdx);
    playSong(queue[nextIdx], queue);
  };

  const prevSong = () => {
    if (queue.length === 0) return;
    if (currentTime > 3) {
      seekTo(0);
      return;
    }
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }
    setQueueIndex(prevIdx);
    playSong(queue[prevIdx], queue);
  };

  const addToQueue = (song: Song) => {
    if (!song) return;
    if (!currentSong) {
      playSong(song, [song]);
      showToast(`Playing "${song.title}"`);
      return;
    }
    setQueue((prev) => [...prev, song]);
    showToast(`Added "${song.title}" to Queue`);
  };

  const playNext = (song: Song) => {
    if (!song) return;
    if (!currentSong) {
      playSong(song, [song]);
      showToast(`Playing "${song.title}"`);
      return;
    }
    setQueue((prev) => {
      const copy = [...prev];
      const insertIdx = queueIndex + 1;
      copy.splice(insertIdx, 0, song);
      return copy;
    });
    showToast(`"${song.title}" will play next!`);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    if (index < queueIndex) {
      setQueueIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const clearQueue = () => {
    if (currentSong) {
      setQueue([currentSong]);
      setQueueIndex(0);
    } else {
      setQueue([]);
      setQueueIndex(0);
    }
    showToast('Upcoming queue cleared');
  };

  const seekTo = (seconds: number) => {
    if (!currentSong) return;
    audioEngine.seek(seconds);
    setCurrentTime(seconds);
  };

  const toggleLikeSong = (id: string) => {
    if (!id) return;
    setLikedSongIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  };

  const updateEqualizer = (newSettings: Partial<EqualizerSettings>) => {
    setEqualizer((prev) => {
      const updated = { ...prev, ...newSettings };
      audioEngine.applyEqualizer(updated);
      return updated;
    });
  };

  const createPlaylist = (name: string, description: string) => {
    if (!name.trim()) return;
    const newPl: Playlist = {
      id: 'pl-' + Date.now(),
      name: name.trim(),
      description: description.trim() || 'My Space Music Playlist',
      coverUrl: currentSong?.coverUrl || '/assets/space-music-logo.png',
      songIds: currentSong ? [currentSong.id] : [],
      createdAt: Date.now()
    };
    setPlaylists((prev) => [newPl, ...prev]);
  };

  const addSongToPlaylist = (playlistId: string, songId: string) => {
    if (!playlistId || !songId) return;
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId && !pl.songIds.includes(songId)
          ? { ...pl, songIds: [...pl.songIds, songId] }
          : pl
      )
    );
  };

  return (
    <MusicContext.Provider
      value={{
        songs,
        currentSong,
        isPlaying,
        currentTime,
        duration,
        playerMode,
        activeScreen,
        isFullPlayerOpen,
        activePlayerTab,
        queue,
        queueIndex,
        repeatMode,
        isShuffle,
        likedSongIds,
        playlists,
        equalizer,
        isEqualizerOpen,
        isEchoFindOpen,
        searchQuery,
        selectedGenre,
        currentLyricIndex,
        isLoadingTrending,
        playSong,
        togglePlay,
        nextSong: handleNextSong,
        prevSong,
        seekTo,
        setPlayerMode,
        setActiveScreen,
        setIsFullPlayerOpen,
        setActivePlayerTab,
        toggleLikeSong,
        toggleShuffle,
        toggleRepeat,
        updateEqualizer,
        setIsEqualizerOpen,
        setIsEchoFindOpen,
        setSearchQuery,
        setSelectedGenre,
        createPlaylist,
        addSongToPlaylist,
        refreshTrending,
        isLoadingMore,
        loadMoreSongs,
        addToQueue,
        playNext,
        removeFromQueue,
        clearQueue,
        isQueueOpen,
        setIsQueueOpen,
        toastMessage,
        showToast
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
