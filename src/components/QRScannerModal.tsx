import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (roomCode: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to extract clean room passcode from URL or raw text
  const extractRoomCode = (rawText: string): string | null => {
    const text = rawText.trim();
    // 1. Check for URL parameters (?room=ABCD or ?jam=ABCD)
    const matchUrl = text.match(/[?&](?:room|jam)=([a-zA-Z0-9]{3,6})/i);
    if (matchUrl && matchUrl[1]) {
      return matchUrl[1].toUpperCase();
    }

    // 2. Check for direct 3-6 letter code
    if (/^[a-zA-Z0-9]{3,6}$/.test(text)) {
      return text.toUpperCase();
    }

    // 3. Fallback: extract any 4-character uppercase token
    const tokenMatch = text.match(/\b([A-Z0-9]{4})\b/);
    if (tokenMatch) {
      return tokenMatch[1].toUpperCase();
    }

    return null;
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setIsInitializing(true);
    setScannerError(null);
    setScannedCode(null);

    const qrRegionId = 'space-jam-qr-reader';
    const scanner = new Html5Qrcode(qrRegionId);
    html5QrCodeRef.current = scanner;

    const startCamera = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: { width: 230, height: 230 }
          },
          (decodedText) => {
            const code = extractRoomCode(decodedText);
            if (code) {
              setScannedCode(code);
              // Stop camera immediately upon detection
              stopScanner();
              setTimeout(() => {
                onScanSuccess(code);
                onClose();
              }, 600);
            } else {
              setScannerError(`Scanned content is not a Space Jam code: "${decodedText.slice(0, 30)}..."`);
            }
          },
          () => {
            // Frame parse failure - standard while scanning, do nothing
          }
        );
        setIsInitializing(false);
      } catch (err: any) {
        console.warn('Camera start error:', err);
        setIsInitializing(false);
        setScannerError(
          err?.message ||
          'Camera access was denied or not supported. You can upload a QR image below instead!'
        );
      }
    };

    // Small delay to ensure DOM element is mounted
    const initTimer = setTimeout(startCamera, 300);

    return () => {
      clearTimeout(initTimer);
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
            html5QrCodeRef.current?.clear();
            html5QrCodeRef.current = null;
          });
        } else {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        }
      } catch {}
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerError(null);
      const scanner = html5QrCodeRef.current || new Html5Qrcode('space-jam-qr-reader');
      const decodedText = await scanner.scanFile(file, true);
      const code = extractRoomCode(decodedText);
      if (code) {
        setScannedCode(code);
        setTimeout(() => {
          onScanSuccess(code);
          onClose();
        }, 500);
      } else {
        setScannerError(`Could not find a valid Space Jam room code in this image.`);
      }
    } catch (err: any) {
      setScannerError('Failed to read QR code from image file.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="qr-scanner-overlay" onClick={onClose}>
      <div className="qr-scanner-card" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="qr-scanner-header">
          <div className="qr-scanner-title-box">
            <Camera size={20} className="text-neon-green" />
            <h3>Scan Space Jam QR Code</h3>
          </div>
          <button className="qr-scanner-close-btn" onClick={onClose} aria-label="Close Scanner">
            <X size={20} />
          </button>
        </div>

        <p className="qr-scanner-subtitle">
          Point your camera at a friend's Space Jam Passcode QR to join instantly!
        </p>

        {/* Viewfinder Container */}
        <div className="qr-viewfinder-wrapper">
          <div id="space-jam-qr-reader" className="qr-video-viewport" />

          {/* Animated Viewfinder Overlay */}
          <div className="qr-scanner-frame">
            <span className="corner-bracket top-left" />
            <span className="corner-bracket top-right" />
            <span className="corner-bracket bottom-left" />
            <span className="corner-bracket bottom-right" />
            {!scannedCode && <div className="qr-scanner-laser" />}
          </div>

          {isInitializing && (
            <div className="qr-scanner-loading">
              <RefreshCw size={28} className="animate-spin text-neon-green" />
              <span>Starting Camera...</span>
            </div>
          )}

          {scannedCode && (
            <div className="qr-scanner-success-badge">
              <CheckCircle2 size={36} className="text-neon-green" />
              <span>Room Code Detected: {scannedCode}</span>
            </div>
          )}
        </div>

        {/* Error or Permission Warning */}
        {scannerError && (
          <div className="qr-scanner-error-box">
            <AlertCircle size={16} />
            <span>{scannerError}</span>
          </div>
        )}

        {/* Alternative: Image Upload Fallback */}
        <div className="qr-scanner-actions">
          <button
            type="button"
            className="qr-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            <span>Upload QR Screenshot</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </div>
  );
};
