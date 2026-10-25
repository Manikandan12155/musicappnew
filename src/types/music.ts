export interface LyricLine {
  time: number; // in seconds
  text: string;
  translation?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  audioUrl: string;
  genre: string;
  year?: number;
  lyrics?: LyricLine[];
  dna?: {
    geniusStory: string;
    wikiSummary: string;
    producers: string[];
    writers: string[];
    tempoBpm: number;
    key: string;
  };
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  songIds: string[];
  createdAt: number;
}

export type PlayerMode = 'apple' | 'material' | 'nothing';

export type ActiveScreen = 'home' | 'search' | 'flow' | 'library';

export interface EqualizerSettings {
  enabled: boolean;
  bass: number; // -10 to +10 dB
  band60: number;
  band230: number;
  band910: number;
  band3600: number;
  band14000: number;
  virtualizer: number; // 0 to 100%
}
