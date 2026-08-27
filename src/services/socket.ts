import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, AuthPayload } from '../middleware/auth.js';
import { memoryStore } from '../config.js';

export interface PlaybackState {
  userId: string;
  activeDeviceId: string;
  activeDeviceName: string;
  isPlaying: boolean;
  currentTrack: {
    videoId: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
    durationSeconds: number;
  } | null;
  progressSeconds: number;
  updatedAt: number;
  queue: Array<{
    videoId: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
    durationSeconds: number;
  }>;
}

const userPlaybackStates = new Map<string, PlaybackState>();

export function setupSocketServer(io: SocketIOServer) {
  memoryStore.subscribe('track:ready', (data) => {
    io.emit('track:ready', data);
  });

  memoryStore.subscribe('track:failed', (data) => {
    io.emit('track:failed', data);
  });

  // Socket authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }
    try {
      const payload = verifyToken(token as string);
      (socket as any).user = payload;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as AuthPayload;
    const userRoom = `user:${user.userId}`;
    socket.join(userRoom);

    let state = userPlaybackStates.get(user.userId);
    if (!state) {
      state = {
        userId: user.userId,
        activeDeviceId: user.sessionId,
        activeDeviceName: user.deviceName,
        isPlaying: false,
        currentTrack: null,
        progressSeconds: 0,
        updatedAt: Date.now(),
        queue: [],
      };
      userPlaybackStates.set(user.userId, state);
    }

    socket.emit('playback:state', state);

    socket.on('playback:transfer', ({ deviceId, deviceName }) => {
      const currentState = userPlaybackStates.get(user.userId);
      if (currentState) {
        currentState.activeDeviceId = deviceId || user.sessionId;
        currentState.activeDeviceName = deviceName || user.deviceName;
        currentState.updatedAt = Date.now();
        io.to(userRoom).emit('playback:state', currentState);
      }
    });

    socket.on('playback:update', (updateData: Partial<PlaybackState>) => {
      let currentState = userPlaybackStates.get(user.userId);
      if (!currentState) {
        currentState = {
          userId: user.userId,
          activeDeviceId: user.sessionId,
          activeDeviceName: user.deviceName,
          isPlaying: false,
          currentTrack: null,
          progressSeconds: 0,
          updatedAt: Date.now(),
          queue: [],
        };
      }

      if (updateData.isPlaying) {
        currentState.activeDeviceId = user.sessionId;
        currentState.activeDeviceName = user.deviceName;
      }

      Object.assign(currentState, updateData, {
        updatedAt: Date.now(),
      });

      userPlaybackStates.set(user.userId, currentState);
      io.to(userRoom).emit('playback:state', currentState);
    });
  });
}
