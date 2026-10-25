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
  ArrowRight,
  Crown
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

  const handleShareInvite = async () => {
    const fullUrl = `${window.location.origin}/?room=${room?.code || ''}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Space Jam Room',
          text: `Join my live music room on Echo Music! Passcode: ${room?.code || ''}`,
          url: fullUrl
        });
        return;
      } catch (err) {
        // Fallback to clipboard if share cancelled
      }
    }
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
              <div className={`collab-name-bar ${!userName.trim() ? 'needs-name' : ''}`}>
                <div className="collab-name-left">
                  <span className="collab-name-label">
                    Your Name <span style={{ color: '#ff5252' }}>*</span>
                  </span>
                  <input
                    type="text"
                    className="collab-name-input"
                    placeholder="Enter your name (Required)..."
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
            /* --- STATE 2: IN ACTIVE ROOM (PREMIUM MODERN JAM VIEW) --- */
            <div className="collab-active-room-view">
              {/* Live Session Status Bar */}
              <div className="collab-session-status-bar">
                <div className="collab-live-badge">
                  <span className="live-dot" />
                  <span>Jam Session Active</span>
                </div>
                <span className="collab-session-user">
                  Host: <strong>{userName}</strong>
                </span>
              </div>

              {/* Passcode Hero Card */}
              <div className="collab-session-card">
                <span className="collab-session-card-label">ROOM PASSCODE</span>

                {/* 4 Neon Digit Tiles */}
                <div
                  className="collab-passcode-tiles"
                  onClick={handleCopyCode}
                  title="Click to copy passcode"
                >
                  {(room?.code || '••••').split('').map((char, idx) => (
                    <div key={idx} className="passcode-digit-tile">
                      <span>{char}</span>
                    </div>
                  ))}
                </div>

                {/* Quick 1-Tap Copy Chip */}
                <button
                  type="button"
                  className="collab-copy-chip"
                  onClick={handleCopyCode}
                >
                  {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
                  <span>{copied ? 'Passcode Copied!' : 'Tap Code to Copy'}</span>
                </button>
              </div>

              {/* Share & QR Code Actions */}
              <div className="collab-active-actions-row">
                <button
                  type="button"
                  className="collab-btn-share-primary"
                  onClick={handleShareInvite}
                >
                  <Share2 size={16} />
                  <span>{copiedUrl ? 'Invite Link Copied! 🎉' : 'Share Invite Link'}</span>
                </button>
                <button
                  type="button"
                  className={`collab-btn-qr-pill ${showQrCode ? 'active' : ''}`}
                  onClick={() => setShowQrCode(!showQrCode)}
                  title={showQrCode ? 'Hide QR Code' : 'Show QR Code'}
                >
                  <QrCode size={16} />
                  <span>{showQrCode ? 'Hide QR' : 'Show QR'}</span>
                </button>
              </div>

              {/* Scannable Room QR Code Dropdown */}
              {showQrCode && qrDataUrl && (
                <div className="collab-qr-box fade-in">
                  <div className="collab-qr-frame">
                    <img
                      src={qrDataUrl}
                      alt={`Space Jam Room ${room?.code} QR Code`}
                      className="collab-qr-img"
                    />
                  </div>
                  <div className="collab-qr-caption">
                    <Scan size={13} className="text-neon-green" />
                    <span>Scan with any phone camera to join instantly</span>
                  </div>
                </div>
              )}

              {/* Connected Listeners List */}
              <div className="collab-listeners-section">
                <div className="collab-listeners-header">
                  <div className="collab-listeners-header-left">
                    <Users size={14} className="text-neon-green" />
                    <span>Connected Listeners ({room?.members?.length || 1})</span>
                  </div>
                  <span className="collab-live-pulse-dot" />
                </div>
                <div className="collab-listeners-list">
                  {room?.members && room.members.length > 0 ? (
                    room.members.map((member) => (
                      <div key={member.id} className="collab-listener-pill">
                        <div className="collab-member-avatar">
                          <span>{member.name ? member.name.charAt(0).toUpperCase() : '?'}</span>
                        </div>
                        <div className="collab-member-details">
                          <span className="collab-member-name">
                            {member.name} {member.id === collabSocket.myUserId ? '(You)' : ''}
                          </span>
                        </div>
                        {member.isHost ? (
                          <span className="collab-member-role host">
                            <Crown size={11} />
                            <span>Host</span>
                          </span>
                        ) : (
                          <span className="collab-member-role listener">
                            <span>Listener</span>
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="collab-listener-pill">
                      <div className="collab-member-avatar">
                        <span>{userName ? userName.charAt(0).toUpperCase() : 'Y'}</span>
                      </div>
                      <div className="collab-member-details">
                        <span className="collab-member-name">{userName || 'You'} (You)</span>
                      </div>
                      <span className="collab-member-role host">
                        <Crown size={11} />
                        <span>Host</span>
                      </span>
                    </div>
                  )}
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
                  <LogOut size={15} />
                  <span>Leave Jam</span>
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
          setActiveTab('join');
          setIsScannerOpen(false);
          const currentName = userName.trim();
          if (!currentName) {
            const entered = window.prompt("Please enter your name to connect to this Jam session:")?.trim();
            if (entered) {
              setUserName(entered);
              setTimeout(() => {
                collabSocket.joinRoom(scannedCode.trim().toUpperCase(), entered);
              }, 100);
            }
          } else {
            joinRoom(scannedCode);
          }
        }}
      />
    </div>
  );
};
