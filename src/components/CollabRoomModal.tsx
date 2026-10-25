import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QRScannerModal } from './QRScannerModal';
import { useCollab } from '../context/CollabContext';
import { collabSocket } from '../services/collabSocket';
import {
  Users,
  Radio,
  Copy,
  Check,
  X,
  Share2,
  Sparkles,
  LogOut,
  QrCode,
  Camera,
  Scan,
  Dice5,
  ArrowRight
} from 'lucide-react';

export const CollabRoomModal: React.FC = () => {
  const {
    room,
    isInRoom,
    isConnected,
    isCollabModalOpen,
    userName,
    errorMessage,
    setIsCollabModalOpen,
    setUserName,
    createRoom,
    joinRoom,
    leaveRoom,
    clearError
  } = useCollab();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
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


  return (
    <div className="collab-modal-overlay" onClick={() => setIsCollabModalOpen(false)}>
      <div className="collab-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="collab-modal-header">
          <div className="collab-header-left">
            <div className="collab-icon-glow">
              <Radio size={20} className="wifi-pulse-icon" />
            </div>
            <div>
              <div className="collab-title-row">
                <h2 className="collab-modal-title">Space Jam</h2>
                <span
                  className={`status-badge ${isConnected ? 'online' : 'offline'}`}
                  onClick={() => !isConnected && collabSocket.connect()}
                  title={isConnected ? 'Connected to Space Jam Engine' : 'Click to reconnect'}
                  style={{ cursor: isConnected ? 'default' : 'pointer' }}
                >
                  <span className="dot" />
                  {isConnected ? 'Live Sync Active' : 'Connecting... (tap to retry)'}
                </span>
              </div>
              <p className="collab-modal-sub">Real-Time Music Sync & Co-Listening Anywhere</p>
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
            /* --- STATE 1: NOT IN ROOM (SUPER USER-FRIENDLY TABS) --- */
            <div className="collab-create-join-view">
              {/* Segmented Control: Start Jam vs Join Jam */}
              <div className="collab-tabs-nav">
                <button
                  type="button"
                  className={`collab-tab-pill ${activeTab === 'create' ? 'active' : ''}`}
                  onClick={() => setActiveTab('create')}
                >
                  <Sparkles size={15} />
                  <span>Host Jam</span>
                </button>
                <button
                  type="button"
                  className={`collab-tab-pill ${activeTab === 'join' ? 'active' : ''}`}
                  onClick={() => setActiveTab('join')}
                >
                  <Users size={15} />
                  <span>Join Jam</span>
                </button>
              </div>

              {/* Compact Inline Listener Name Bar */}
              <div className="collab-name-bar">
                <div className="collab-name-left">
                  <span className="collab-name-label">Listening as</span>
                  <input
                    type="text"
                    className="collab-name-input"
                    placeholder="Enter your name..."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <button
                  type="button"
                  className="collab-random-btn"
                  onClick={() => setUserName(`Cosmic-${Math.floor(100 + Math.random() * 900)}`)}
                  title="Randomize Nickname"
                >
                  <Dice5 size={16} />
                </button>
              </div>

              {activeTab === 'create' ? (
                /* TAB 1: HOST / CREATE JAM */
                <div className="collab-tab-pane">
                  <div className="collab-card-preview">
                    <div className="collab-pulse-avatar">
                      <Radio size={28} className="wifi-pulse-icon" />
                    </div>
                    <h3>Be the Room Host</h3>
                    <p>
                      Start a live music room. Play any song and share your 4-digit code or QR with friends anywhere!
                    </p>
                  </div>

                  <button
                    type="button"
                    className="collab-btn-primary"
                    onClick={createRoom}
                  >
                    <Sparkles size={18} />
                    <span>{isConnected ? 'Create Cosmic Jam Room' : 'Connect & Start Jam'}</span>
                  </button>
                </div>
              ) : (
                /* TAB 2: JOIN FRIEND'S JAM */
                <div className="collab-tab-pane">
                  <div className="collab-join-card">
                    <label className="collab-input-label">Enter 4-Letter Room Code</label>
                    <div className="collab-code-input-group">
                      <input
                        type="text"
                        className="collab-input code-input big-code"
                        placeholder="CODE"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        maxLength={4}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="collab-scan-icon-btn"
                        onClick={() => setIsScannerOpen(true)}
                        title="Scan Friend's QR Code"
                      >
                        <Camera size={18} />
                        <span>Scan QR</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      className="collab-btn-primary"
                      onClick={() => joinRoom(inputCode)}
                      disabled={inputCode.length < 3}
                    >
                      <span>Join Room</span>
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </div>
              )}

              <div className="collab-footer-note">
                <Sparkles size={13} className="text-neon-green" />
                <span>Real-time music sync from anywhere — mobile data (4G/5G) or WiFi</span>
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
                    Invite Link: <strong>{window.location.origin}</strong>
                  </span>
                  <button className="copy-link-btn" onClick={handleCopyLink}>
                    <Share2 size={13} />
                    <span>{copiedUrl ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>
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
