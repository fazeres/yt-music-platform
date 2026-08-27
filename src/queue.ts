import { Queue } from 'bullmq';
import { config } from './config.js';
import Redis from 'ioredis';

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

export interface ResolveJobData {
  videoId: string;
  title?: string;
  artist?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
}

export const resolveQueue = new Queue<ResolveJobData>('audio-resolve', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const maintenanceQueue = new Queue('audio-maintenance', {
  connection,
});
