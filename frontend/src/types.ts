export interface Track {
  id?: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  durationSeconds: number;
  score?: number;
  reason?: string;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: string;
  tracks: Array<{
    id: string;
    position: number;
    track: Track;
  }>;
}

export interface UserSession {
  id: string;
  deviceName: string;
  lastActiveAt: string;
}

export interface PlaybackState {
  userId: string;
  activeDeviceId: string;
  activeDeviceName: string;
  isPlaying: boolean;
  currentTrack: Track | null;
  progressSeconds: number;
  updatedAt: number;
  queue: Track[];
}

export interface ListeningStats {
  totalTracksPlayed: number;
  totalListeningMinutes: number;
  topArtists: Array<{ artist: string; plays: number; totalMs: number }>;
  topTracks: Array<{ track: Track; plays: number; totalMs: number }>;
}
