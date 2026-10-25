import React, { useState, useEffect } from 'react';
import { useMusic } from '../context/MusicContext';
import { Search, X, Play, Heart, AlignLeft, Music, Loader2, Download, Check, ListPlus } from 'lucide-react';
import { Song } from '../types/music';
import { TrackListSkeleton } from './SkeletonLoader';
import { offlineStorage } from '../services/offlineStorage';
import { apiUrl } from '../services/apiConfig';

export const SearchScreen: React.FC = () => {
  const {
    songs,
    playSong,
    currentSong,
    isPlaying,
    likedSongIds,
    toggleLikeSong,
    searchQuery,
    setSearchQuery,
    playNext
  } = useMusic();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [onlineResults, setOnlineResults] = useState<Song[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [enableOnline, setEnableOnline] = useState<boolean>(true);

  const categories = ['All', 'Kollywood', 'Synthwave', 'Mass Beat', 'English Pop', 'Lo-Fi'];

  const [searchPage, setSearchPage] = useState<number>(1);
  const [isLoadingMoreSearch, setIsLoadingMoreSearch] = useState<boolean>(false);
  const [hasMoreSearch, setHasMoreSearch] = useState<boolean>(true);
  const searchSentinelRef = React.useRef<HTMLDivElement | null>(null);

  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  const handleDownload = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadingIds.includes(song.id) || downloadedIds.includes(song.id)) return;

    setDownloadingIds((prev) => [...prev, song.id]);
    const success = await offlineStorage.downloadSong(song);
    setDownloadingIds((prev) => prev.filter((id) => id !== song.id));
    if (success) {
      setDownloadedIds((prev) => [...prev, song.id]);
    }
  };

  // Search backend API debounce (initial page 1)
  useEffect(() => {
    if (!enableOnline || !searchQuery.trim() || searchQuery.trim().length < 2) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      setSearchPage(1);
      setHasMoreSearch(true);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingOnline(true);
        setSearchPage(1);
        setHasMoreSearch(true);
        const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(searchQuery)}&page=1`));
        if (res.ok) {
          const data = (await res.json()) as { results?: Song[]; hasMore?: boolean };
          if (data.results && data.results.length > 0) {
            setOnlineResults(data.results);
          } else {
            setHasMoreSearch(false);
          }
        } else {
          setHasMoreSearch(false);
        }
      } catch (e) {
        console.warn('Backend search unreachable, falling back to local catalog:', e);
        setHasMoreSearch(false);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, enableOnline]);

  // Load more search tracks on scroll
  const loadMoreSearchResults = async () => {
    if (isLoadingMoreSearch || !hasMoreSearch || isSearchingOnline || !searchQuery.trim()) return;
    try {
      setIsLoadingMoreSearch(true);
      const nextPage = searchPage + 1;
      const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(searchQuery)}&page=${nextPage}`));
      if (res.ok) {
        const data = (await res.json()) as { results?: Song[]; hasMore?: boolean };
        if (data.results && data.results.length > 0) {
          setOnlineResults((prev) => {
            const seen = new Set(prev.map((s) => s.id));
            const fresh = data.results!.filter((s) => !seen.has(s.id));
            return [...prev, ...fresh];
          });
          setSearchPage(nextPage);
        } else {
          setHasMoreSearch(false);
        }
      } else {
        setHasMoreSearch(false);
      }
    } catch (e) {
      console.warn('Error loading more search tracks:', e);
      setHasMoreSearch(false);
    } finally {
      setIsLoadingMoreSearch(false);
    }
  };

  // IntersectionObserver for Search Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMoreSearch && !isSearchingOnline) {
          loadMoreSearchResults();
        }
      },
      { rootMargin: '350px' }
    );

    if (searchSentinelRef.current) {
      observer.observe(searchSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [searchPage, hasMoreSearch, isLoadingMoreSearch, isSearchingOnline, searchQuery]);

  const filteredLocalSongs = songs.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.album.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q) ||
      (s.lyrics && s.lyrics.some((l) => l.text.toLowerCase().includes(q)));

    if (!matchesSearch) return false;

    if (activeCategory === 'All') return true;
    if (activeCategory === 'Kollywood')
      return s.genre.toLowerCase().includes('tamil') || s.genre.toLowerCase().includes('kuthu') || s.genre.toLowerCase().includes('folk');
    if (activeCategory === 'Synthwave')
      return s.genre.toLowerCase().includes('synth') || s.genre.toLowerCase().includes('retro');
    if (activeCategory === 'Mass Beat')
      return s.genre.toLowerCase().includes('mass') || s.genre.toLowerCase().includes('rock');
    if (activeCategory === 'English Pop')
      return s.genre.toLowerCase().includes('pop') || s.genre.toLowerCase().includes('r&b') || s.genre.toLowerCase().includes('dance');
    if (activeCategory === 'Lo-Fi')
      return s.genre.toLowerCase().includes('lo-fi') || s.genre.toLowerCase().includes('chill');

    return true;
  });

  // Combine local and online results (avoiding duplicates)
  const combinedSongs: Song[] = [
    ...filteredLocalSongs,
    ...onlineResults.filter((os) => !filteredLocalSongs.some((ls) => ls.id === os.id))
  ];

  const formatDuration = (secs: number) => {
    if (!secs || isNaN(secs) || secs <= 0) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="screen-container search-screen">
      <div className="search-header-box">
        <h2 className="search-page-title">Explore Space Music</h2>
        <p className="search-page-sub">
          Search songs, artists, Tamil lyrics, or global high-res catalog
        </p>

        {/* Search input field */}
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon-left" />
          <input
            type="text"
            placeholder="Search by title, artist, Tamil lyrics, or global track..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-field"
            autoFocus
          />
          {isSearchingOnline ? (
            <Loader2 size={18} className="clear-search-btn" style={{ animation: 'slow-radar-spin 1s linear infinite', color: '#1db954' }} />
          ) : searchQuery ? (
            <button
              className="clear-search-btn"
              onClick={() => {
                setSearchQuery('');
                setOnlineResults([]);
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        {/* Quick filter categories */}
        <div className="search-categories-row">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cat-chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="search-results-section">
        <div className="results-count-bar">
          <span>Found {combinedSongs.length} tracks</span>
          {searchQuery && <span>matching "{searchQuery}"</span>}
          {onlineResults.length > 0 && (
            <span style={{ color: '#39ff14', fontWeight: 700, marginLeft: '6px' }}>
              • {onlineResults.length} from Space Cloud
            </span>
          )}
        </div>

        {isSearchingOnline ? (
          <TrackListSkeleton count={6} />
        ) : combinedSongs.length === 0 ? (
          <div className="no-results-box" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Music size={44} style={{ color: '#727272', marginBottom: '12px' }} />
            <h4>No tracks found matching "{searchQuery}"</h4>
            <p style={{ color: '#a7a7a7', fontSize: '0.85rem' }}>
              Try searching for "Jailer", "Anirudh", "Starboy", or "Post Malone"
            </p>
          </div>
        ) : (
          <div className="results-track-list">
            {combinedSongs.map((song, index) => {
              const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;
              const isLiked = likedSongIds.includes(song.id);

              return (
                <div
                  key={song.id}
                  className={`track-list-item ${currentSong?.id === song.id ? 'current-active' : ''}`}
                  onClick={() => playSong(song, combinedSongs)}
                >
                  <div className="track-index-col">
                    {isCurrentlyPlaying ? (
                      <div className="mini-equalizer-bars">
                        <span /><span /><span />
                      </div>
                    ) : (
                      <span className="track-number">{index + 1}</span>
                    )}
                  </div>

                  <div className="track-thumb-box">
                    <img src={song.coverUrl} alt={song.title} className="track-thumb" />
                    <button className="track-play-hover">
                      <Play size={16} fill="currentColor" />
                    </button>
                  </div>

                  <div className="track-details-col">
                    <div className="track-title-row">
                      <span className="track-title-text">{song.title}</span>
                      {song.lyrics && (
                        <span className="lyric-badge-small" title="Synchronized lyrics included">
                          <AlignLeft size={11} /> Lyrics
                        </span>
                      )}
                    </div>
                    <span className="track-artist-text">
                      {song.artist} • {song.album}
                    </span>
                  </div>

                  <div className="track-meta-col">
                    <span className="track-genre-tag">{song.genre}</span>
                    <span className="track-duration-text">{formatDuration(song.duration)}</span>
                    <button
                      className={`track-like-btn ${isLiked ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeSong(song.id);
                      }}
                      title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        size={17}
                        fill={isLiked ? '#1db954' : 'none'}
                        color={isLiked ? '#39ff14' : 'currentColor'}
                      />
                    </button>
                    <button
                      className="track-queue-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        playNext(song);
                      }}
                      title="Play Next Song in Queue"
                    >
                      <ListPlus size={18} />
                    </button>
                    <button
                      className={`track-download-btn ${downloadedIds.includes(song.id) ? 'downloaded' : ''}`}
                      onClick={(e) => handleDownload(song, e)}
                      title={downloadedIds.includes(song.id) ? 'Downloaded offline' : 'Download for offline playback'}
                    >
                      {downloadingIds.includes(song.id) ? (
                        <Loader2 size={16} className="hero-search-spinner" />
                      ) : downloadedIds.includes(song.id) ? (
                        <Check size={16} color="#39ff14" />
                      ) : (
                        <Download size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Endless search results sentinel */}
        <div ref={searchSentinelRef} className="infinite-scroll-sentinel">
          {isLoadingMoreSearch && (
            <div className="infinite-scroll-loader">
              <Loader2 size={18} className="infinite-scroll-spin" />
              <span>Fetching more tracks...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
