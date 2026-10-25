import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QRScannerModal } from './QRScannerModal';
import { useCollab } from '../context/CollabContext';
import { useMusic } from '../context/MusicContext';
import { collabSocket } from '../services/collabSocket';
import {
  Users,
  Wifi,
  Copy,
  Check,
  X,
  Play,
  Pause,
  Crown,
  Share2,
  Sparkles,
  LogOut,
  Radio,
  Flame,
  Heart,
  Rocket,
  Zap,
  Music2,
  QrCode,
  Camera,
  Scan
} from 'lucide-react';

export const CollabRoomModal: React.FC = () => {
  const {
    room,
    isInRoom,
    isHost,
    isConnected,
    isCollabModalOpen,
    userName,
    errorMessage,
    setIsCollabModalOpen,
    setUserName,
    createRoom,
    joinRoom,
    leaveRoom,
    sendReaction,
    clearError
  } = useCollab();

  const { currentSong, isPlaying, togglePlay } = useMusic();

  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showQrCode, setShowQrCode] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Generate high-resolution scannable QR Code for the room
  useEffect(() => {
    if (!room?.code) {
      setQrDataUrl(null);
      return;
    }
    const fullShareUrl = `${window.location.origin}/?room=${room.code}`;
    QRCode.toDataURL(fullShareUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then((url) => {
      setQrDataUrl(url);
    }).catch((err) => {
      console.warn('QR code gen error:', err);
    });
  }, [room?.code]);

  if (!isCollabModalOpen) return null;

  const handleCopyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/?room=${room?.code || ''}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const reactionEmojis = [
    { emoji: '🔥', label: 'Fire' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '🚀', label: 'Space' },
    { emoji: '🪩', label: 'Party' },
    { emoji: '⚡', label: 'Vibe' },
    { emoji: '🎧', label: 'Bass' }
  ];

  return (
    <div className="collab-modal-overlay" onClick={() => setIsCollabModalOpen(false)}>
      <div className="collab-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="collab-modal-header">
          <div className="collab-header-left">
            <div className="collab-icon-glow">
              <Wifi size={20} className="wifi-pulse-icon" />
            </div>
            <div>
              <div className="collab-title-row">
                <h2 className="collab-modal-title">WiFi Space Jam</h2>
                <span
                  className={`status-badge ${isConnected ? 'online' : 'offline'}`}
                  onClick={() => !isConnected && collabSocket.connect()}
                  title={isConnected ? 'Connected to WiFi Engine' : 'Click to reconnect'}
                  style={{ cursor: isConnected ? 'default' : 'pointer' }}
                >
                  <span className="dot" />
                  {isConnected ? 'WiFi Sync Active' : 'Connecting... (tap to retry)'}
                </span>
              </div>
              <p className="collab-modal-sub">Real-Time Collaborative Listening on LAN</p>
            </div>
          </div>
          <button
            className="collab-close-btn"
            onClick={() => setIsCollabModalOpen(false)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="collab-error-banner">
            <span>{errorMessage}</span>
            <button onClick={clearError}><X size={14} /></button>
          </div>
        )}

        {/* Modal Body */}
        <div className="collab-modal-body">
          {!isInRoom ? (
            /* --- STATE 1: NOT IN ROOM --- */
            <div className="collab-create-join-view">
              <div className="collab-hero-card">
                <div className="collab-hero-icon">
                  <Users size={32} />
                </div>
                <h3>Listen Together with Friends</h3>
                <p>
                  Any device connected to your WiFi (mobile, tablet, laptop) can join
                  this room to listen to synced music in real-time without ads!
                </p>
              </div>

              {/* Username Input */}
              <div className="collab-form-group">
                <label>Your Listener Name</label>
                <input
                  type="text"
                  className="collab-input"
                  placeholder="e.g. Vignesh, CosmicHost"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  maxLength={20}
                />
              </div>

              {/* Action Buttons */}
              <div className="collab-actions-wrap">
                <button
                  className="collab-btn-primary"
                  onClick={createRoom}
                >
                  <Sparkles size={18} />
                  <span>{isConnected ? 'Create Cosmic Room' : 'Connect & Create Room'}</span>
                </button>

                <div className="collab-divider">
                  <span>OR JOIN WITH CODE</span>
                </div>

                <div className="collab-join-row">
                  <input
                    type="text"
                    className="collab-input code-input"
                    placeholder="4-LETTER CODE"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    maxLength={4}
                  />
                  <button
                    className="collab-btn-secondary"
                    onClick={() => joinRoom(inputCode)}
                    disabled={inputCode.length < 3}
                  >
                    Join Room
                  </button>
                </div>

                {/* Instant QR Code Scanner Button */}
                <button
                  type="button"
                  className="collab-scan-btn-cta"
                  onClick={() => setIsScannerOpen(true)}
                >
                  <Camera size={18} />
                  <span>Scan Friend's QR Code</span>
                </button>
              </div>

              <div className="collab-wifi-hint">
                <Wifi size={14} />
                <span>Make sure both phones/laptops are on the same WiFi router!</span>
              </div>
            </div>
          ) : (
            /* --- STATE 2: IN ACTIVE ROOM --- */
            <div className="collab-active-room-view">
              {/* Room Code Card with Passcode & QR Code */}
              <div className="collab-code-card">
                <div className="code-card-header-bar">
                  <span className="code-label">ROOM PASSCODE</span>
                  <div className="code-card-actions-row">
                    <button
                      className={`qr-toggle-btn ${showQrCode ? 'active' : ''}`}
                      onClick={() => setShowQrCode(!showQrCode)}
                      title={showQrCode ? 'Hide QR Code' : 'Show QR Code'}
                    >
                      <QrCode size={14} />
                      <span>{showQrCode ? 'Hide QR' : 'Show QR'}</span>
                    </button>
                    <button
                      className="copy-code-btn"
                      onClick={handleCopyCode}
                      title="Copy 4-digit code"
                    >
                      {copied ? <Check size={16} className="text-green" /> : <Copy size={16} />}
                      <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>

                <div className="code-display-wrap">
                  <span className="room-code-text">{room?.code}</span>
                </div>

                {/* Scannable Room QR Code Showcase */}
                {showQrCode && qrDataUrl && (
                  <div className="collab-qr-showcase">
                    <div className="collab-qr-frame">
                      <img
                        src={qrDataUrl}
                        alt={`Space Jam Room ${room?.code} QR Code`}
                        className="collab-qr-img"
                      />
                    </div>
                    <div className="collab-qr-caption">
                      <Scan size={14} className="text-neon-green" />
                      <span>Scan with phone camera or Space Jam scanner to join!</span>
                    </div>
                  </div>
                )}

                <div className="share-url-row">
                  <span className="share-url-text">
                    WiFi Address: <strong>http://{window.location.host}</strong>
                  </span>
                  <button className="copy-link-btn" onClick={handleCopyLink}>
                    <Share2 size={13} />
                    <span>{copiedUrl ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Synced Now Playing Preview */}
              <div className="collab-synced-player-card">
                <div className="synced-player-tag">
                  <Radio size={13} className="live-spin" />
                  <span>SYNCED PLAYBACK</span>
                </div>
                {currentSong ? (
                  <div className="synced-song-row">
                    <img
                      src={currentSong.coverUrl || '/assets/space-music-logo.png'}
                      alt={currentSong.title}
                      className="synced-song-cover"
                    />
                    <div className="synced-song-info">
                      <h4 className="synced-song-title">{currentSong.title}</h4>
                      <p className="synced-song-artist">{currentSong.artist}</p>
                    </div>
                    <button
                      className="synced-play-toggle"
                      onClick={togglePlay}
                      title={isPlaying ? 'Pause for all' : 'Play for all'}
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                    </button>
                  </div>
                ) : (
                  <div className="synced-empty-state">
                    <Music2 size={24} />
                    <span>No song playing. Tap any song to broadcast to room!</span>
                  </div>
                )}
              </div>

              {/* Live Reactions Bar */}
              <div className="collab-reactions-section">
                <label className="section-label">Send Real-Time Reaction</label>
                <div className="reaction-buttons-grid">
                  {reactionEmojis.map((r) => (
                    <button
                      key={r.emoji}
                      className="reaction-tap-btn"
                      onClick={() => sendReaction(r.emoji)}
                      title={`Send ${r.label}`}
                    >
                      <span className="reaction-char">{r.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Connected Listeners List */}
              <div className="collab-members-section">
                <div className="members-header-row">
                  <label className="section-label">
                    Connected WiFi Listeners ({room?.memberCount || 1})
                  </label>
                </div>
                <div className="members-list">
                  {room?.members.map((member) => (
                    <div key={member.id} className="member-item">
                      <div className="member-avatar">
                        {member.name.charAt(0).toUpperCase()}
                        <div className="online-indicator" />
                      </div>
                      <div className="member-details">
                        <span className="member-name">
                          {member.name} {member.id === collabSocket.myUserId ? '(You)' : ''}
                        </span>
                        {member.isHost && (
                          <span className="host-pill">
                            <Crown size={11} /> Room Host
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave Room Footer */}
              <div className="collab-room-footer">
                <button
                  type="button"
                  className="collab-scan-other-btn"
                  onClick={() => setIsScannerOpen(true)}
                  title="Scan another room QR Code"
                >
                  <Camera size={15} />
                  <span>Scan Another Room</span>
                </button>
                <button className="collab-btn-leave" onClick={leaveRoom}>
                  <LogOut size={16} />
                  <span>Leave Collab Room</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Built-in Live Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scannedCode) => {
          setInputCode(scannedCode);
          joinRoom(scannedCode);
        }}
      />
    </div>
  );
};
