import { Queue } from 'bullmq';
import { config } from './config.js';
import Redis from 'ioredis';

const connection = new (Redis as any)(config.redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    return Math.min(times * 100, 3000);
  },
});

connection.on('error', (err: any) => {
  console.warn('[Redis Queue Connection] Warning/retry:', err?.message || err);
});


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
