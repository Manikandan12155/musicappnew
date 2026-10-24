// Audio Engine with Web Audio API support for Echo Music
import { EqualizerSettings } from '../types/music';

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private pannerNode: StereoPannerNode | null = null;
  private isInitialized = false;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
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
      console.warn('Web Audio API initialization failed or restricted by browser policy:', e);
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
      // Virtualizer simulation
      const panAmount = (settings.virtualizer / 100) * 0.4;
      this.pannerNode.pan.value = panAmount;
    }
  }

  public async play(url?: string): Promise<void> {
    try {
      this.initWebAudio();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
    } catch (e) {
      console.warn('AudioContext resume warning:', e);
    }

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
    this.audio.pause();
  }

  public seek(seconds: number): void {
    if (isFinite(seconds) && seconds >= 0) {
      this.audio.currentTime = seconds;
    }
  }

  public setVolume(vol: number): void {
    this.audio.volume = Math.max(0, Math.min(1, vol));
  }
}

export const audioEngine = new AudioEngine();
