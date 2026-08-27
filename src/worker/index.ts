import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config, prisma, redis } from '../config.js';
import { extractAndCacheAudio, evictCacheIfNeeded, ensureCacheDir } from '../services/audio.js';
import { ResolveJobData } from '../queue.js';

const connection = new (Redis as any)(config.redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    if (times > 20) return null;
    return Math.min(times * 200, 5000);
  },
});

connection.on('error', () => {});


export function startWorker() {
  console.log('[Worker] Starting audio extraction worker process...');
  ensureCacheDir();

  const resolveWorker = new Worker<ResolveJobData>(
    'audio-resolve',
    async (job: Job<ResolveJobData>) => {
      const { videoId, title, artist, thumbnailUrl, durationSeconds } = job.data;
      console.log(`[Worker] Processing resolve job for ${videoId} (${title || 'No Title'}) - Attempt ${job.attemptsMade + 1}`);

      try {
        const cachedPath = await extractAndCacheAudio(videoId, {
          title,
          artist,
          thumbnailUrl,
          durationSeconds,
        });
        console.log(`[Worker] Successfully extracted audio for ${videoId} to ${cachedPath}`);
        return { cachedPath };
      } catch (err: any) {
        console.error(`[Worker] Error extracting audio for ${videoId}:`, err.message);
        if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
          console.error(`[Worker] Mark ${videoId} as unavailable after repeated failures.`);
          await prisma.track.upsert({
            where: { videoId },
            update: { isUnavailable: true },
            create: {
              videoId,
              title: title || 'Unavailable Track',
              artist: artist || 'Unknown Artist',
              isUnavailable: true,
            },
          });
          await redis.publish('track:failed', JSON.stringify({ videoId, error: err.message }));
        }
        throw err;
      }
    },
    {
      connection,
      concurrency: 2,
    }
  );

  resolveWorker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} for track ${job.data.videoId} completed`);
  });

  resolveWorker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });

  const maintenanceWorker = new Worker(
    'audio-maintenance',
    async (job: Job) => {
      if (job.name === 'cache-eviction') {
        const evicted = await evictCacheIfNeeded();
        console.log(`[Worker] Periodic cache eviction ran. Evicted ${evicted} bytes.`);
        return { evicted };
      }
    },
    { connection }
  );

  return { resolveWorker, maintenanceWorker };
}

if (process.argv[1] && process.argv[1].endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  startWorker();
}
