import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { evictCacheIfNeeded, ensureCacheDir } from '../services/audio.js';
import { config } from '../config.js';

describe('Audio cache eviction unit tests', () => {
  const testCacheDir = path.join('/tmp', 'test_audio_cache_' + Date.now());

  beforeEach(() => {
    config.audioCacheDir = testCacheDir;
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testCacheDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  it('evicts oldest files when cache limit is exceeded', async () => {
    const file1 = path.join(testCacheDir, 'track1.m4a');
    const file2 = path.join(testCacheDir, 'track2.m4a');
    const file3 = path.join(testCacheDir, 'track3.m4a');

    fs.writeFileSync(file1, Buffer.alloc(1024 * 1024)); // 1MB
    const pastTime1 = new Date(Date.now() - 30000);
    fs.utimesSync(file1, pastTime1, pastTime1);

    fs.writeFileSync(file2, Buffer.alloc(1024 * 1024)); // 1MB
    const pastTime2 = new Date(Date.now() - 20000);
    fs.utimesSync(file2, pastTime2, pastTime2);

    fs.writeFileSync(file3, Buffer.alloc(1024 * 1024)); // 1MB
    const pastTime3 = new Date(Date.now() - 10000);
    fs.utimesSync(file3, pastTime3, pastTime3);

    // Max limit is 1.5MB (1.5 * 1024 * 1024 bytes)
    // 3MB total -> should evict oldest (file1 and file2)
    const evicted = await evictCacheIfNeeded(1.5 * 1024 * 1024);
    expect(evicted).toBeGreaterThan(0);
    expect(fs.existsSync(file1)).toBe(false);
    expect(fs.existsSync(file3)).toBe(true);
  });
});
