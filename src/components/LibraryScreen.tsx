import React, { useState, useEffect } from 'react';
import { useMusic } from '../context/MusicContext';
import { Heart, Plus, ListMusic, Play, Trash2, Music, Download, Check, HardDrive } from 'lucide-react';
import { Playlist, Song } from '../types/music';
import { offlineStorage } from '../services/offlineStorage';
import { upgradeHighQualityCover, DEFAULT_LOGO } from '../utils/imageQuality';

export const LibraryScreen: React.FC = () => {
  const {
    songs,
    likedSongIds,
    playlists,
    createPlaylist,
    playSong,
    currentSong,
    isPlaying,
    toggleLikeSong
  } = useMusic();

  const [activeTab, setActiveTab] = useState<'liked' | 'offline' | 'playlists'>('liked');
  const [offlineSongs, setOfflineSongs] = useState<Song[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newPlName, setNewPlName] = useState<string>('');
  const [newPlDesc, setNewPlDesc] = useState<string>('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const likedSongs = songs.filter((s) => likedSongIds.includes(s.id));

  // Load offline songs from IndexedDB
  const refreshOfflineSongs = async () => {
    const list = await offlineStorage.getOfflineSongs();
    setOfflineSongs(list);
  };

  useEffect(() => {
    refreshOfflineSongs();
  }, [activeTab]);

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlName.trim()) return;
    createPlaylist(newPlName.trim(), newPlDesc.trim() || 'My personal Space Music mix');
    setNewPlName('');
    setNewPlDesc('');
    setIsCreateModalOpen(false);
  };

  const handleRemoveOffline = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await offlineStorage.removeSong(songId);
    await refreshOfflineSongs();
  };

  return (
    <div className="screen-container library-screen">
      {/* Top Header */}
      <div className="library-header-box">
        <h2 className="library-title">Your Space Library</h2>
        <div className="library-sub-bar">
          <div className="library-tabs">
            {/* Tab 1: Liked Songs */}
            <button
              className={`lib-tab-btn ${activeTab === 'liked' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('liked');
                setSelectedPlaylist(null);
              }}
            >
              <Heart size={16} fill={activeTab === 'liked' ? '#ff2a5f' : 'none'} />
              <span>Liked Songs ({likedSongs.length})</span>
            </button>

            {/* Tab 2: Downloaded (Offline) */}
            <button
              className={`lib-tab-btn ${activeTab === 'offline' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('offline');
                setSelectedPlaylist(null);
                refreshOfflineSongs();
              }}
            >
              <HardDrive size={16} color={activeTab === 'offline' ? '#39ff14' : 'currentColor'} />
              <span>Offline ({offlineSongs.length})</span>
            </button>

            {/* Tab 3: Playlists */}
            <button
              className={`lib-tab-btn ${activeTab === 'playlists' ? 'active' : ''}`}
              onClick={() => setActiveTab('playlists')}
            >
              <ListMusic size={16} />
              <span>Playlists ({playlists.length})</span>
            </button>
          </div>

          <button
            className="create-pl-action-btn"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="library-content">
        {/* Tab 1: Liked */}
        {activeTab === 'liked' && (
          <div className="liked-songs-section">
            {likedSongs.length === 0 ? (
              <div className="empty-lib-card">
                <Heart size={48} className="empty-lib-icon" />
                <h3>No favorites yet</h3>
                <p>Heart tracks while browsing or playing to collect them here.</p>
              </div>
            ) : (
              <div className="lib-track-table">
                <div className="lib-banner-summary">
                  <div className="liked-big-icon">
                    <Heart size={40} fill="#ff2a5f" color="#ff2a5f" />
                  </div>
                  <div>
                    <h3>Favorites Collection</h3>
                    <p>{likedSongs.length} tracks • Ready for playback</p>
                    <button
                      className="play-all-liked-btn"
                      onClick={() => playSong(likedSongs[0], likedSongs)}
                    >
                      <Play size={16} fill="currentColor" />
                      <span>Play All Liked</span>
                    </button>
                  </div>
                </div>

                <div className="lib-track-rows">
                  {likedSongs.map((song, i) => (
                    <div
                      key={song.id}
                      className={`lib-track-row ${currentSong?.id === song.id ? 'active-track' : ''}`}
                      onClick={() => playSong(song, likedSongs)}
                    >
                      <span className="row-num">{i + 1}</span>
                      <img
                        src={upgradeHighQualityCover(song.coverUrl, song.id)}
                        alt={song.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_LOGO;
                        }}
                        className="row-cover"
                      />
                      <div className="row-info">
                        <span className="row-title">{song.title}</span>
                        <span className="row-artist">{song.artist}</span>
                      </div>
                      <span className="row-genre">{song.genre}</span>
                      <button
                        className="row-heart"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLikeSong(song.id);
                        }}
                      >
                        <Heart size={16} fill="#ff2a5f" color="#ff2a5f" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Downloaded (Offline) */}
        {activeTab === 'offline' && (
          <div className="offline-songs-section">
            {offlineSongs.length === 0 ? (
              <div className="empty-lib-card">
                <Download size={48} className="empty-lib-icon" style={{ color: '#39ff14' }} />
                <h3>No offline songs saved yet</h3>
                <p>Click the download icon on any track in Explore to listen 100% offline without internet!</p>
              </div>
            ) : (
              <div className="lib-track-table">
                <div className="lib-banner-summary offline-banner">
                  <div className="liked-big-icon" style={{ background: 'rgba(57, 255, 20, 0.2)' }}>
                    <HardDrive size={40} color="#39ff14" />
                  </div>
                  <div>
                    <h3>Offline Storage Vault</h3>
                    <p>{offlineSongs.length} tracks saved locally • 0MB data used</p>
                    <button
                      className="play-all-liked-btn"
                      style={{ background: '#39ff14', color: '#000' }}
                      onClick={() => playSong(offlineSongs[0], offlineSongs)}
                    >
                      <Play size={16} fill="currentColor" />
                      <span>Play All Offline</span>
                    </button>
                  </div>
                </div>

                <div className="lib-track-rows">
                  {offlineSongs.map((song, i) => (
                    <div
                      key={song.id}
                      className={`lib-track-row ${currentSong?.id === song.id ? 'active-track' : ''}`}
                      onClick={() => playSong(song, offlineSongs)}
                    >
                      <span className="row-num">{i + 1}</span>
                      <img
                        src={upgradeHighQualityCover(song.coverUrl, song.id)}
                        alt={song.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_LOGO;
                        }}
                        className="row-cover"
                      />
                      <div className="row-info">
                        <span className="row-title">{song.title}</span>
                        <span className="row-artist">{song.artist}</span>
                      </div>
                      <span className="row-genre">
                        <span className="offline-pill-tag">Offline Ready</span>
                      </span>
                      <button
                        className="row-trash"
                        title="Delete from offline storage"
                        onClick={(e) => handleRemoveOffline(song.id, e)}
                      >
                        <Trash2 size={16} color="#ff5252" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Playlists */}
        {activeTab === 'playlists' && (
          <div className="playlists-view-section">
            {selectedPlaylist ? (
              <div className="selected-playlist-view">
                <button
                  className="back-to-playlists-btn"
                  onClick={() => setSelectedPlaylist(null)}
                >
                  ← Back to all playlists
                </button>
                <div className="playlist-detail-header">
                  <div className="pl-cover-large">
                    <ListMusic size={64} />
                  </div>
                  <div className="pl-detail-info">
                    <h2>{selectedPlaylist.name}</h2>
                    <p>{selectedPlaylist.description}</p>
                    <span>{selectedPlaylist.songIds.length} tracks</span>
                  </div>
                </div>
              </div>
            ) : playlists.length === 0 ? (
              <div className="empty-lib-card">
                <ListMusic size={48} className="empty-lib-icon" />
                <h3>No playlists created</h3>
                <p>Create playlists to group your favorite cosmic songs.</p>
                <button
                  className="done-btn"
                  style={{ margin: '14px auto 0' }}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus size={16} />
                  <span>Create First Playlist</span>
                </button>
              </div>
            ) : (
              <div className="playlists-grid">
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    className="playlist-card"
                    onClick={() => setSelectedPlaylist(pl)}
                  >
                    <div className="pl-card-artwork">
                      <ListMusic size={36} />
                    </div>
                    <div className="pl-card-info">
                      <span className="pl-card-name">{pl.name}</span>
                      <span className="pl-card-count">{pl.songIds.length} songs</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Space Playlist</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreatePlaylist} className="create-pl-form">
              <div className="form-group">
                <label>Playlist Name</label>
                <input
                  type="text"
                  placeholder="e.g. Midnight Beats, Tamil Rock"
                  value={newPlName}
                  onChange={(e) => setNewPlName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  placeholder="What's the cosmic vibe of this playlist?"
                  value={newPlDesc}
                  onChange={(e) => setNewPlDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="done-btn">
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryScreen;
