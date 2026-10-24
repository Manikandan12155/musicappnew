// Audio Engine with dual-engine architecture:
// 1. YouTube Iframe Player (hidden, ad-free, 100% keyless, zero IP bans) for all online YouTube tracks.
// 2. HTML5 Audio + Web Audio API Equalizer for offline downloads & blobs.

import { EqualizerSettings } from '../types/music';

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private pannerNode: StereoPannerNode | null = null;
  private isInitialized = false;

  // YouTube Engine state
  private ytPlayer: any = null;
  private isYtReady = false;
  private pendingVideoId: string | null = null;
  private isYtActive = false;
  private ytTimeInterval: ReturnType<typeof setInterval> | null = null;
  private currentYtTime = 0;
  private currentYtDuration = 215;
  private activeVideoId: string | null = null;
  private fallbackAudioUrl: string | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    const self = this;
    const proto = HTMLMediaElement.prototype;
    const originalCurrentTimeDesc = Object.getOwnPropertyDescriptor(proto, 'currentTime');
    const originalDurationDesc = Object.getOwnPropertyDescriptor(proto, 'duration');

    // Intercept currentTime & duration on this.audio so MusicContext & UI automatically read YouTube state!
    Object.defineProperty(this.audio, 'currentTime', {
      get() {
        if (self.isYtActive) return self.currentYtTime;
        return originalCurrentTimeDesc?.get?.call(self.audio) || 0;
      },
      set(val: number) {
        if (self.isYtActive) {
          self.seek(val);
        } else {
          originalCurrentTimeDesc?.set?.call(self.audio, val);
        }
      },
      configurable: true
    });

    Object.defineProperty(this.audio, 'duration', {
      get() {
        if (self.isYtActive) return self.currentYtDuration;
        return originalDurationDesc?.get?.call(self.audio) || 215;
      },
      configurable: true
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
      console.warn('Web Audio API initialization note:', e);
    }
  }

  private initYouTubeIframe() {
    if (typeof window === 'undefined') return;

    const setupDomAndApi = () => {
      let anchor = document.getElementById('space-yt-player-host');
      if (!anchor) {
        anchor = document.createElement('div');
        anchor.id = 'space-yt-player-host';
        anchor.style.position = 'fixed';
        anchor.style.top = '-9999px';
        anchor.style.left = '-9999px';
        anchor.style.width = '200px';
        anchor.style.height = '200px';
        anchor.style.opacity = '0';
        anchor.style.pointerEvents = 'none';
        anchor.style.zIndex = '-9999';
        document.body.appendChild(anchor);
      }

      const win = window as any;
      if (win.YT && win.YT.Player) {
        this.setupPlayer();
      } else {
        const prevOnReady = win.onYouTubeIframeAPIReady;
        win.onYouTubeIframeAPIReady = () => {
          if (prevOnReady) prevOnReady();
          this.setupPlayer();
        };

        if (!document.getElementById('yt-iframe-api-script')) {
          const tag = document.createElement('script');
          tag.id = 'yt-iframe-api-script';
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupDomAndApi);
    } else {
      setupDomAndApi();
    }
  }

  private setupPlayer() {
    const win = window as any;
    const YT = win.YT;
    if (!YT || !YT.Player) return;

    try {
      this.ytPlayer = new YT.Player('space-yt-player-host', {
        height: '200',
        width: '200',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0
        },
        events: {
          onReady: () => {
            this.isYtReady = true;
            if (this.pendingVideoId) {
              const vid = this.pendingVideoId;
              this.pendingVideoId = null;
              this.playYouTube(vid);
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0, BUFFERING=3
            if (event.data === 1) {
              this.startTimeTicker();
              this.audio.dispatchEvent(new Event('play'));
              this.audio.dispatchEvent(new Event('loadedmetadata'));
            } else if (event.data === 2) {
              this.stopTimeTicker();
              this.audio.dispatchEvent(new Event('pause'));
            } else if (event.data === 0) {
              this.stopTimeTicker();
              this.audio.dispatchEvent(new Event('ended'));
            }
          },
          onError: (err: any) => {
            console.warn('YouTube Iframe Player error:', err.data);
            this.fallbackToDirectStream();
          }
        }
      });
    } catch (e) {
      console.warn('YT.Player init warning:', e);
    }
  }

  private startTimeTicker() {
    this.stopTimeTicker();
    this.ytTimeInterval = setInterval(() => {
      if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        const cur = this.ytPlayer.getCurrentTime() || 0;
        const dur = this.ytPlayer.getDuration() || this.currentYtDuration;
        this.currentYtTime = cur;
        if (dur && isFinite(dur) && dur > 0) {
          this.currentYtDuration = dur;
        }
        this.audio.dispatchEvent(new Event('timeupdate'));
      }
    }, 250);
  }

  private stopTimeTicker() {
    if (this.ytTimeInterval) {
      clearInterval(this.ytTimeInterval);
      this.ytTimeInterval = null;
    }
  }

  private playYouTube(videoId: string) {
    this.activeVideoId = videoId;
    if (!this.isYtReady || !this.ytPlayer) {
      this.pendingVideoId = videoId;
      return;
    }

    try {
      this.ytPlayer.loadVideoById(videoId);
      this.ytPlayer.playVideo();
    } catch (e) {
      console.warn('YT loadVideoById warning:', e);
      this.fallbackToDirectStream();
    }
  }

  private fallbackToDirectStream() {
    if (!this.fallbackAudioUrl) return;
    console.log('Falling back to direct HTML5 audio stream:', this.fallbackAudioUrl);
    this.isYtActive = false;
    this.stopTimeTicker();
    this.audio.src = this.fallbackAudioUrl;
    this.audio.load();
    this.audio.play().catch(() => {});
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

  /**
   * Main unified Play method:
   * Accepts audioUrl and optional videoId.
   * If videoId is provided and valid, routes via YouTube Iframe Engine (zero IP blocks).
   * Otherwise routes via native HTML5 Audio (offline blobs, custom URLs).
   */
  public async play(url?: string, videoId?: string): Promise<void> {
    // If called with no arguments, resume current active player
    if (!url && !videoId) {
      if (this.isYtActive && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
        this.ytPlayer.playVideo();
        this.startTimeTicker();
        this.audio.dispatchEvent(new Event('play'));
        return;
      }
      return this.audio.play();
    }

    this.fallbackAudioUrl = url || null;

    // Check if videoId or url has a YouTube 11-char ID
    const validVideoId = videoId && videoId.length === 11 && !videoId.includes('/')
      ? videoId
      : (url && url.includes('/api/stream/') ? url.split('/api/stream/')[1].split('?')[0] : null);

    const isBlobOrDirect = url && (url.startsWith('blob:') || url.startsWith('data:'));

    if (validVideoId && !isBlobOrDirect) {
      this.isYtActive = true;
      this.currentYtTime = 0;
      this.audio.pause(); // Pause HTML5 audio
      this.playYouTube(validVideoId);
      return;
    }

    // Standard HTML5 Audio mode
    this.isYtActive = false;
    this.stopTimeTicker();
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

    return this.audio.play();
  }

  public pause(): void {
    if (this.isYtActive && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      this.ytPlayer.pauseVideo();
      this.stopTimeTicker();
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
}

export const audioEngine = new AudioEngine();
