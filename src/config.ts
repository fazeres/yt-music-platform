import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  jwtSecret: process.env.JWT_SECRET || 'supersecret_jwt_key_for_dev_12345',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  audioCacheDir: process.env.AUDIO_CACHE_DIR || path.join(process.cwd(), 'audio_cache'),
  cacheMaxSizeMb: parseInt(process.env.CACHE_MAX_SIZE_MB || '5120', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Fast in-memory cache and pubsub replacing external Redis
class MemoryCacheAndPubSub {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private listeners = new Map<string, Array<(data: any) => void>>();

  get(key: string): string | null {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key: string, value: string, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  incr(key: string, amount: number = 1): number {
    const curr = parseInt(this.get(key) || '0', 10);
    const updated = curr + amount;
    this.set(key, updated.toString());
    return updated;
  }

  subscribe(channel: string, callback: (data: any) => void): void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
    }
    this.listeners.get(channel)!.push(callback);
  }

  publish(channel: string, message: any): void {
    const callbacks = this.listeners.get(channel) || [];
    for (const cb of callbacks) {
      try {
        cb(message);
      } catch (err) {
        console.error('[PubSub] Callback error:', err);
      }
    }
  }
}

export const memoryStore = new MemoryCacheAndPubSub();
