import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  deviceName: string;
  token: string;
  lastActiveAt: string;
}

export interface Track {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  durationSeconds: number;
  cachedPath?: string | null;
  isUnavailable?: boolean;
  lastResolvedAt?: string;
  createdAt: string;
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  trackId: string;
  position: number;
  addedAt: string;
  track: Track;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  tracks: PlaylistTrack[];
}

export interface PlayHistory {
  id: string;
  userId: string;
  trackId: string;
  track: Track;
  playedAt: string;
  msPlayed: number;
}

export interface Favorite {
  id: string;
  userId: string;
  trackId: string;
  track: Track;
  favoritedAt: string;
}

interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  tracks: Track[];
  playlists: Playlist[];
  history: PlayHistory[];
  favorites: Favorite[];
}

class JsonDatabase {
  private dataDir: string;
  private filePath: string;
  private data: DatabaseSchema;

  constructor() {
    this.dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    this.filePath = path.join(this.dataDir, 'db.json');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const defaultSeed: DatabaseSchema = {
      users: [
        {
          id: 'default-user-id',
          email: 'user@example.com',
          // bcrypt hash of 'password123'
          passwordHash: '$2a$10$wN1Gz3Z7h5wGz7c7I3D5t.Y6l9YqM6O4kPz7b3b7h4o0V0aZ6N5zG',
          createdAt: new Date().toISOString(),
        },
      ],
      sessions: [],
      tracks: [],
      playlists: [],
      history: [],
      favorites: [],
    };

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.users || this.data.users.length === 0) {
          this.data.users = defaultSeed.users;
        }
      } catch {
        this.data = defaultSeed;
        this.save();
      }
    } else {
      this.data = defaultSeed;
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DB] Failed to save json db:', e);
    }
  }

  // Users
  getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  createUser(email: string, passwordHash: string): User {
    const user: User = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  // Sessions
  createSession(userId: string, deviceName: string, token: string): Session {
    const session: Session = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      userId,
      deviceName,
      token,
      lastActiveAt: new Date().toISOString(),
    };
    this.data.sessions.push(session);
    this.save();
    return session;
  }

  getSessionByToken(token: string): Session | undefined {
    return this.data.sessions.find((s) => s.token === token);
  }

  updateSession(id: string, updates: Partial<Session>): void {
    const sess = this.data.sessions.find((s) => s.id === id);
    if (sess) {
      Object.assign(sess, updates, { lastActiveAt: new Date().toISOString() });
      this.save();
    }
  }

  getUserSessions(userId: string): Session[] {
    return this.data.sessions
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
  }

  deleteSession(userId: string, id: string): void {
    this.data.sessions = this.data.sessions.filter((s) => !(s.id === id && s.userId === userId));
    this.save();
  }

  // Tracks
  getTrackByVideoId(videoId: string): Track | undefined {
    return this.data.tracks.find((t) => t.videoId === videoId);
  }

  upsertTrack(data: {
    videoId: string;
    title: string;
    artist: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    cachedPath?: string | null;
    isUnavailable?: boolean;
    lastResolvedAt?: string;
  }): Track {
    let track = this.data.tracks.find((t) => t.videoId === data.videoId);
    if (track) {
      Object.assign(track, data);
    } else {
      track = {
        id: 'trk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        videoId: data.videoId,
        title: data.title || 'Unknown Title',
        artist: data.artist || 'Unknown Artist',
        thumbnailUrl: data.thumbnailUrl || `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`,
        durationSeconds: data.durationSeconds || 0,
        cachedPath: data.cachedPath || null,
        isUnavailable: data.isUnavailable || false,
        lastResolvedAt: data.lastResolvedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      this.data.tracks.push(track);
    }
    this.save();
    return track;
  }

  // Playlists
  getPlaylists(userId: string): Playlist[] {
    return this.data.playlists
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getPlaylist(userId: string, id: string): Playlist | undefined {
    return this.data.playlists.find((p) => p.id === id && p.userId === userId);
  }

  createPlaylist(userId: string, name: string): Playlist {
    const pl: Playlist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      userId,
      name,
      createdAt: new Date().toISOString(),
      tracks: [],
    };
    this.data.playlists.push(pl);
    this.save();
    return pl;
  }

  deletePlaylist(userId: string, id: string): void {
    this.data.playlists = this.data.playlists.filter((p) => !(p.id === id && p.userId === userId));
    this.save();
  }

  addTrackToPlaylist(userId: string, playlistId: string, trackData: any): PlaylistTrack | undefined {
    const playlist = this.getPlaylist(userId, playlistId);
    if (!playlist) return undefined;

    const track = this.upsertTrack(trackData);
    let pt = playlist.tracks.find((t) => t.trackId === track.id);
    if (!pt) {
      pt = {
        id: 'plt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        playlistId,
        trackId: track.id,
        position: playlist.tracks.length,
        addedAt: new Date().toISOString(),
        track,
      };
      playlist.tracks.push(pt);
      this.save();
    }
    return pt;
  }

  removeTrackFromPlaylist(userId: string, playlistId: string, trackId: string): void {
    const playlist = this.getPlaylist(userId, playlistId);
    if (playlist) {
      playlist.tracks = playlist.tracks.filter((t) => t.trackId !== trackId && t.id !== trackId);
      this.save();
    }
  }

  // Favorites
  getFavorites(userId: string): Track[] {
    return this.data.favorites
      .filter((f) => f.userId === userId)
      .sort((a, b) => new Date(b.favoritedAt).getTime() - new Date(a.favoritedAt).getTime())
      .map((f) => f.track);
  }

  addFavorite(userId: string, trackData: any): void {
    const track = this.upsertTrack(trackData);
    if (!this.data.favorites.some((f) => f.userId === userId && f.trackId === track.id)) {
      this.data.favorites.push({
        id: 'fav_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        userId,
        trackId: track.id,
        track,
        favoritedAt: new Date().toISOString(),
      });
      this.save();
    }
  }

  removeFavorite(userId: string, videoId: string): void {
    const track = this.getTrackByVideoId(videoId);
    if (track) {
      this.data.favorites = this.data.favorites.filter(
        (f) => !(f.userId === userId && f.trackId === track.id)
      );
      this.save();
    }
  }

  // History & Stats
  addHistory(userId: string, trackData: any, msPlayed: number = 0): PlayHistory {
    const track = this.upsertTrack(trackData);
    const entry: PlayHistory = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      userId,
      trackId: track.id,
      track,
      playedAt: new Date().toISOString(),
      msPlayed,
    };
    this.data.history.push(entry);
    this.save();
    return entry;
  }

  getHistory(userId: string, limit: number = 50): PlayHistory[] {
    return this.data.history
      .filter((h) => h.userId === userId)
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      .slice(0, limit);
  }

  getStats(userId: string) {
    const userHistory = this.data.history.filter((h) => h.userId === userId);
    let totalListeningMs = 0;
    const artistCounts: Record<string, { plays: number; totalMs: number }> = {};
    const trackCounts: Record<string, { track: Track; plays: number; totalMs: number }> = {};

    for (const item of userHistory) {
      const ms = item.msPlayed || (item.track.durationSeconds ? item.track.durationSeconds * 1000 : 0);
      totalListeningMs += ms;

      const artist = item.track.artist || 'Unknown';
      if (!artistCounts[artist]) artistCounts[artist] = { plays: 0, totalMs: 0 };
      artistCounts[artist].plays += 1;
      artistCounts[artist].totalMs += ms;

      const trackId = item.track.id;
      if (!trackCounts[trackId]) trackCounts[trackId] = { track: item.track, plays: 0, totalMs: 0 };
      trackCounts[trackId].plays += 1;
      trackCounts[trackId].totalMs += ms;
    }

    const topArtists = Object.entries(artistCounts)
      .map(([artist, data]) => ({ artist, ...data }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10);

    const topTracks = Object.values(trackCounts)
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10);

    return {
      totalTracksPlayed: userHistory.length,
      totalListeningMinutes: Math.round(totalListeningMs / 60000),
      topArtists,
      topTracks,
    };
  }
}

export const db = new JsonDatabase();
