import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, AuthPayload } from '../middleware/auth.js';
import { redisSub } from '../config.js';

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

// Memory store for user playback state (can also be mirrored to Redis)
const userPlaybackStates = new Map<string, PlaybackState>();

export function setupSocketServer(io: SocketIOServer) {
  // Subscribe to Redis events (track:ready, track:failed)
  redisSub.subscribe('track:ready', 'track:failed', (err) => {
    if (err) console.error('Redis subscription error:', err);
  });

  redisSub.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);
      if (channel === 'track:ready') {
        io.emit('track:ready', data);
      } else if (channel === 'track:failed') {
        io.emit('track:failed', data);
      }
    } catch (e) {
      console.error('Error forwarding redis pubsub message:', e);
    }
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

    console.log(`[Socket] Device connected: ${user.deviceName} (${user.sessionId}) for user ${user.userId}`);

    // Send initial user playback state
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

    // Request active player role
    socket.on('playback:transfer', ({ deviceId, deviceName }) => {
      const currentState = userPlaybackStates.get(user.userId);
      if (currentState) {
        currentState.activeDeviceId = deviceId || user.sessionId;
        currentState.activeDeviceName = deviceName || user.deviceName;
        currentState.updatedAt = Date.now();
        io.to(userRoom).emit('playback:state', currentState);
      }
    });

    // Playback control update (play, pause, seek, track change, queue change)
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

      // If playing on this device, automatically take active role
      if (updateData.isPlaying) {
        currentState.activeDeviceId = user.sessionId;
        currentState.activeDeviceName = user.deviceName;
      }

      Object.assign(currentState, updateData, {
        updatedAt: Date.now(),
      });

      userPlaybackStates.set(user.userId, currentState);

      // Broadcast new state to ALL devices of the user
      io.to(userRoom).emit('playback:state', currentState);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Device disconnected: ${user.deviceName} (${user.sessionId})`);
    });
  });
}
