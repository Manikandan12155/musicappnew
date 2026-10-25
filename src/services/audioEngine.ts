// Dual-Engine Audio Player for Space Music
// Primary: High-Res HTML5 Stream Pipe
// Fallback: Client-Side YouTube Player (Zero IP Blocks on Vercel / Cloud)

import { EqualizerSettings } from '../types/music';

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private pannerNode: StereoPannerNode | null = null;
  private isInitialized = false;

  // YouTube fallback engine
  private ytPlayer: any = null;
  private isYtReady = false;
  private isYtActive = false;
  private ytTimeInterval: ReturnType<typeof setInterval> | null = null;
  private currentYtTime = 0;
  private currentYtDuration = 0;
  private activeVideoId: string | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    // Hook audio error event to auto-fallback to YouTube
    this.audio.addEventListener('error', () => {
      if (this.activeVideoId && !this.isYtActive) {
        console.warn('HTML5 audio error, falling back to YouTube player for:', this.activeVideoId);
        this.startYouTubeFallback(this.activeVideoId);
      }
    });

    this.initYouTubeIframe();
  }

  public getAudioElement(): HTMLAudioElement {
    return this.audio;
  }

  private initWebAudio() {
    if (this.isInitialized) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

      // Bass boost filter (LowShelf at 80Hz)
      this.bassFilter = this.audioCtx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 80;
      this.bassFilter.gain.value = 0;

      // 5-Band Equalizer (60Hz, 230Hz, 910Hz, 3600Hz, 14000Hz)
      const freqs = [60, 230, 910, 3600, 14000];
      this.eqFilters = freqs.map((freq) => {
        const filter = this.audioCtx!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.4;
        filter.gain.value = 0;
        return filter;
      });

      // Stereo Virtualizer (Panner)
      if (this.audioCtx.createStereoPanner) {
        this.pannerNode = this.audioCtx.createStereoPanner();
        this.pannerNode.pan.value = 0;
      }

      // Connect graph: Source -> Bass -> EQ[0] -> EQ[1] -> ... -> EQ[4] -> Panner -> Destination
      let lastNode: AudioNode = this.sourceNode;
      lastNode.connect(this.bassFilter);
      lastNode = this.bassFilter;

      for (const eq of this.eqFilters) {
        lastNode.connect(eq);
        lastNode = eq;
      }

      if (this.pannerNode) {
        lastNode.connect(this.pannerNode);
        lastNode = this.pannerNode;
      }

      lastNode.connect(this.audioCtx.destination);
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio note:', e);
    }
  }

  private initYouTubeIframe() {
    if (typeof window === 'undefined') return;

    const setup = () => {
      // Create viewport-visible container with tiny size and 0.01 opacity so Chrome doesn't suspend audio
      let anchor = document.getElementById('space-yt-player-host');
      if (!anchor) {
        anchor = document.createElement('div');
        anchor.id = 'space-yt-player-host';
        anchor.style.position = 'fixed';
        anchor.style.bottom = '0';
        anchor.style.right = '0';
        anchor.style.width = '200px';
        anchor.style.height = '200px';
        anchor.style.opacity = '0.01';
        anchor.style.pointerEvents = 'none';
        anchor.style.zIndex = '1';
        document.body.appendChild(anchor);
      }

      const win = window as any;
      if (win.YT && win.YT.Player) {
        this.createYtPlayer();
      } else {
        const prev = win.onYouTubeIframeAPIReady;
        win.onYouTubeIframeAPIReady = () => {
          if (prev) prev();
          this.createYtPlayer();
        };

        if (!document.getElementById('yt-iframe-api-script')) {
          const script = document.createElement('script');
          script.id = 'yt-iframe-api-script';
          script.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(script);
        }
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  private createYtPlayer() {
    const win = window as any;
    if (!win.YT || !win.YT.Player) return;

    try {
      this.ytPlayer = new win.YT.Player('space-yt-player-host', {
        height: '200',
        width: '200',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          rel: 0
        },
        events: {
          onReady: () => {
            this.isYtReady = true;
            if (this.isYtActive && this.activeVideoId) {
              this.ytPlayer.loadVideoById(this.activeVideoId);
              this.ytPlayer.playVideo();
            }
          },
          onStateChange: (event: any) => {
            // PLAYING = 1, PAUSED = 2, ENDED = 0
            if (event.data === 1) {
              this.startYtTicker();
              this.audio.dispatchEvent(new Event('play'));
              this.audio.dispatchEvent(new Event('loadedmetadata'));
            } else if (event.data === 2) {
              this.stopYtTicker();
              this.audio.dispatchEvent(new Event('pause'));
            } else if (event.data === 0) {
              this.stopYtTicker();
              this.audio.dispatchEvent(new Event('ended'));
            }
          }
        }
      });
    } catch (e) {
      console.warn('YT player create warning:', e);
    }
  }

  private startYtTicker() {
    this.stopYtTicker();
    this.ytTimeInterval = setInterval(() => {
      if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        this.currentYtTime = this.ytPlayer.getCurrentTime() || 0;
        const d = this.ytPlayer.getDuration() || this.currentYtDuration;
        if (d && isFinite(d) && d > 0) this.currentYtDuration = d;
        this.audio.dispatchEvent(new Event('timeupdate'));
      }
    }, 250);
  }

  private stopYtTicker() {
    if (this.ytTimeInterval) {
      clearInterval(this.ytTimeInterval);
      this.ytTimeInterval = null;
    }
  }

  private startYouTubeFallback(videoId: string) {
    this.isYtActive = true;
    this.activeVideoId = videoId;
    this.audio.pause();

    if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
      try {
        this.ytPlayer.loadVideoById(videoId);
        this.ytPlayer.playVideo();
      } catch (e) {
        console.warn('Failed to start YT fallback:', e);
      }
    }
  }

  public applyEqualizer(settings: EqualizerSettings) {
    if (!this.isInitialized) {
      this.initWebAudio();
    }
    if (!this.isInitialized || !this.bassFilter || this.eqFilters.length < 5) return;

    if (!settings.enabled) {
      this.bassFilter.gain.value = 0;
      this.eqFilters.forEach((f) => (f.gain.value = 0));
      if (this.pannerNode) this.pannerNode.pan.value = 0;
      return;
    }

    this.bassFilter.gain.value = settings.bass;
    this.eqFilters[0].gain.value = settings.band60;
    this.eqFilters[1].gain.value = settings.band230;
    this.eqFilters[2].gain.value = settings.band910;
    this.eqFilters[3].gain.value = settings.band3600;
    this.eqFilters[4].gain.value = settings.band14000;

    if (this.pannerNode) {
      const panAmount = (settings.virtualizer / 100) * 0.4;
      this.pannerNode.pan.value = panAmount;
    }
  }

  public async play(url?: string, videoId?: string, knownDuration?: number): Promise<void> {
    if (knownDuration && knownDuration > 0) {
      this.currentYtDuration = knownDuration;
    }
    // If called with no arguments, resume whichever player is active
    if (!url && !videoId) {
      if (this.isYtActive && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
        this.ytPlayer.playVideo();
        this.startYtTicker();
        this.audio.dispatchEvent(new Event('play'));
        return;
      }
      return this.audio.play();
    }

    // Extract videoId if available
    const vid = videoId && videoId.length === 11 ? videoId : (url && url.includes('/api/stream/') ? url.split('/api/stream/')[1].split('?')[0] : null);
    this.activeVideoId = vid;

    // If running on Vercel (where backend stream doesn't exist), directly use YouTube fallback
    const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    if (isVercel && vid && (!url || !url.startsWith('blob:'))) {
      this.startYouTubeFallback(vid);
      return;
    }

    // Otherwise, use native HTML5 Audio stream
    this.isYtActive = false;
    this.stopYtTicker();
    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try { this.ytPlayer.pauseVideo(); } catch {}
    }

    try {
      this.initWebAudio();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
    } catch {}

    if (url) {
      const currentSrc = this.audio.src;
      const isSame = currentSrc === url || currentSrc.endsWith(url);
      if (!isSame) {
        this.audio.src = url;
        this.audio.load();
      }
    }

    try {
      await this.audio.play();
    } catch (err) {
      // If audio.play() fails and we have a video ID, trigger YouTube fallback!
      if (vid) {
        console.warn('HTML5 audio play rejected, activating YouTube player fallback:', err);
        this.startYouTubeFallback(vid);
      } else {
        throw err;
      }
    }
  }

  public pause(): void {
    if (this.isYtActive && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      this.ytPlayer.pauseVideo();
      this.stopYtTicker();
      this.audio.dispatchEvent(new Event('pause'));
    } else {
      this.audio.pause();
    }
  }

  public seek(seconds: number): void {
    if (!isFinite(seconds) || seconds < 0) return;
    if (this.isYtActive && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.currentYtTime = seconds;
      this.ytPlayer.seekTo(seconds, true);
      this.audio.dispatchEvent(new Event('timeupdate'));
    } else {
      this.audio.currentTime = seconds;
    }
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.audio.volume = clamped;
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      try {
        this.ytPlayer.setVolume(Math.round(clamped * 100));
      } catch {}
    }
  }

  public getCurrentTime(): number {
    if (this.isYtActive) return this.currentYtTime;
    return this.audio.currentTime || 0;
  }

  public getDuration(): number {
    if (this.isYtActive) return this.currentYtDuration || 0;
    return this.audio.duration || this.currentYtDuration || 0;
  }
}

export const audioEngine = new AudioEngine();
