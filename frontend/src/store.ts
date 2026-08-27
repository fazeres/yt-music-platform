import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Track, PlaybackState, UserSession } from './types';

interface AuthState {
  token: string | null;
  user: { id: string; email: string; sessionId: string; deviceName: string } | null;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
}));

interface PlayerState {
  // Local state
  currentTrack: Track | null;
  isPlaying: boolean;
  progressSeconds: number;
  durationSeconds: number;
  volume: number;
  queue: Track[];
  queueIndex: number;
  crossfadeDuration: number; // 0 to 8 seconds
  isResolving: boolean;
  activeDeviceId: string | null;
  activeDeviceName: string | null;
  socket: Socket | null;

  setProgress: (progress: number, duration?: number) => void;
  // Actions
  initSocket: (token: string) => void;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setCrossfadeDuration: (seconds: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  transferPlaybackToThisDevice: () => void;
  addToQueue: (track: Track) => void;
  reorderQueue: (newQueue: Track[]) => void;
  removeFromQueue: (index: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progressSeconds: 0,
  durationSeconds: 0,
  volume: 0.8,
  queue: [],
  queueIndex: 0,
  crossfadeDuration: 3,
  isResolving: false,
  activeDeviceId: null,
  activeDeviceName: null,
  socket: null,

  setProgress: (progress: number, duration?: number) => {
    set({
      progressSeconds: progress,
      ...(duration && duration > 0 ? { durationSeconds: duration } : {}),
    });
  },

  initSocket: (token: string) => {
    const existingSocket = get().socket;
    if (existingSocket) existingSocket.disconnect();

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to realtime sync server');
    });

    socket.on('playback:state', (state: PlaybackState) => {
      const user = useAuthStore.getState().user;
      const isThisDeviceActive = user && state.activeDeviceId === user.sessionId;

      set({
        activeDeviceId: state.activeDeviceId,
        activeDeviceName: state.activeDeviceName,
        isPlaying: state.isPlaying,
        currentTrack: state.currentTrack,
        progressSeconds: state.progressSeconds,
        queue: state.queue || [],
      });
    });

    socket.on('track:ready', (data: { videoId: string }) => {
      const current = get().currentTrack;
      if (current && current.videoId === data.videoId) {
        set({ isResolving: false });
      }
    });

    socket.on('track:failed', (data: { videoId: string; error: string }) => {
      const current = get().currentTrack;
      if (current && current.videoId === data.videoId) {
        set({ isResolving: false, isPlaying: false });
        alert(`Failed to load track: ${data.error}`);
      }
    });

    set({ socket });
  },

  playTrack: async (track: Track, newQueue?: Track[]) => {
    const { socket } = get();
    const user = useAuthStore.getState().user;
    const token = useAuthStore.getState().token;

    let updatedQueue = newQueue || get().queue;
    if (!updatedQueue.some((t) => t.videoId === track.videoId)) {
      updatedQueue = [track, ...updatedQueue];
    }
    const trackIndex = updatedQueue.findIndex((t) => t.videoId === track.videoId);

    set({
      currentTrack: track,
      isPlaying: true,
      progressSeconds: 0,
      durationSeconds: track.durationSeconds || 0,
      queue: updatedQueue,
      queueIndex: Math.max(0, trackIndex),
      isResolving: true,
      activeDeviceId: user?.sessionId || null,
      activeDeviceName: user?.deviceName || null,
    });

    // Request audio resolve from backend
    try {
      const res = await fetch(`/api/tracks/${track.videoId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(track),
      });
      if (res.status === 200) {
        set({ isResolving: false });
      }
    } catch (e) {
      console.error('Resolve error:', e);
    }

    // Broadcast playback state
    if (socket) {
      socket.emit('playback:update', {
        isPlaying: true,
        currentTrack: track,
        progressSeconds: 0,
        queue: updatedQueue,
      });
    }

    // Record play history
    try {
      fetch('/api/library/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoId: track.videoId,
          title: track.title,
          artist: track.artist,
          thumbnailUrl: track.thumbnailUrl,
          durationSeconds: track.durationSeconds,
          msPlayed: (track.durationSeconds || 180) * 1000,
        }),
      });
    } catch {}
  },

  togglePlay: () => {
    const { isPlaying, currentTrack, progressSeconds, queue, socket } = get();
    const nextPlay = !isPlaying;
    set({ isPlaying: nextPlay });

    if (socket && currentTrack) {
      socket.emit('playback:update', {
        isPlaying: nextPlay,
        currentTrack,
        progressSeconds,
        queue,
      });
    }
  },

  seek: (seconds: number) => {
    const { currentTrack, isPlaying, queue, socket } = get();
    set({ progressSeconds: seconds });

    if (socket && currentTrack) {
      socket.emit('playback:update', {
        isPlaying,
        currentTrack,
        progressSeconds: seconds,
        queue,
      });
    }
  },

  setVolume: (volume: number) => {
    set({ volume: Math.max(0, Math.min(1, volume)) });
  },

  setCrossfadeDuration: (seconds: number) => {
    set({ crossfadeDuration: Math.max(0, Math.min(8, seconds)) });
  },

  nextTrack: () => {
    const { queue, queueIndex, playTrack } = get();
    if (queue.length > 0 && queueIndex + 1 < queue.length) {
      const next = queue[queueIndex + 1];
      set({ queueIndex: queueIndex + 1 });
      playTrack(next);
    }
  },

  prevTrack: () => {
    const { queue, queueIndex, progressSeconds, playTrack, seek } = get();
    if (progressSeconds > 3) {
      seek(0);
      return;
    }
    if (queueIndex > 0 && queue.length > 0) {
      const prev = queue[queueIndex - 1];
      set({ queueIndex: queueIndex - 1 });
      playTrack(prev);
    }
  },

  transferPlaybackToThisDevice: () => {
    const { socket } = get();
    const user = useAuthStore.getState().user;
    if (socket && user) {
      socket.emit('playback:transfer', {
        deviceId: user.sessionId,
        deviceName: user.deviceName,
      });
      set({
        activeDeviceId: user.sessionId,
        activeDeviceName: user.deviceName,
      });
    }
  },

  addToQueue: (track: Track) => {
    const { queue, socket } = get();
    const updated = [...queue, track];
    set({ queue: updated });
    if (socket) {
      socket.emit('playback:update', { queue: updated });
    }
  },

  reorderQueue: (newQueue: Track[]) => {
    const { socket } = get();
    set({ queue: newQueue });
    if (socket) {
      socket.emit('playback:update', { queue: newQueue });
    }
  },

  removeFromQueue: (index: number) => {
    const { queue, socket } = get();
    const updated = queue.filter((_, i) => i !== index);
    set({ queue: updated });
    if (socket) {
      socket.emit('playback:update', { queue: updated });
    }
  },
}));
