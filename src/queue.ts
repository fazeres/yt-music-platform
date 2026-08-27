import { memoryStore } from './config.js';
import { db as jsonDb } from './db.js';
import { extractAndCacheAudio, ensureCacheDir } from './services/audio.js';

export interface ResolveJobData {
  videoId: string;
  title?: string;
  artist?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
}

class InMemoryQueue {
  private queue: ResolveJobData[] = [];
  private activeCount = 0;
  private concurrency = 2;
  private pendingVideoIds = new Set<string>();

  add(data: ResolveJobData): void {
    if (this.pendingVideoIds.has(data.videoId)) return;
    this.pendingVideoIds.add(data.videoId);
    this.queue.push(data);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.activeCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeCount++;
    try {
      console.log(`[Queue] Processing audio extraction for ${job.videoId} (${job.title || ''})`);
      await extractAndCacheAudio(job.videoId, {
        title: job.title,
        artist: job.artist,
        thumbnailUrl: job.thumbnailUrl,
        durationSeconds: job.durationSeconds,
      });
      console.log(`[Queue] Extraction complete for ${job.videoId}`);
    } catch (err: any) {
      console.error(`[Queue] Error extracting ${job.videoId}:`, err.message);
      jsonDb.upsertTrack({
        videoId: job.videoId,
        title: job.title || 'Unavailable',
        artist: job.artist || 'Unknown',
        isUnavailable: true,
      });
      memoryStore.publish('track:failed', { videoId: job.videoId, error: err.message });
    } finally {
      this.activeCount--;
      this.pendingVideoIds.delete(job.videoId);
      this.processNext();
    }
  }
}

export const resolveQueue = new InMemoryQueue();
