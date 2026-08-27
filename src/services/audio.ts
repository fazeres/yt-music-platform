import fs from 'fs';
import path from 'path';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { config, memoryStore } from '../config.js';
import { db } from '../db.js';

const execFileAsync = promisify(execFile);

export async function ensureCacheDir(): Promise<void> {
  if (!fs.existsSync(config.audioCacheDir)) {
    fs.mkdirSync(config.audioCacheDir, { recursive: true });
  }
}

export function getAudioCachePath(videoId: string): string {
  return path.join(config.audioCacheDir, `${videoId}.m4a`);
}

export async function extractAndCacheAudio(videoId: string, metadata?: { title?: string; artist?: string; thumbnailUrl?: string; durationSeconds?: number }): Promise<string> {
  await ensureCacheDir();
  const outputPath = getAudioCachePath(videoId);
  const rawTemplate = path.join(config.audioCacheDir, `${videoId}.raw.%(ext)s`);

  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    if (stats.size > 1024) {
      db.upsertTrack({
        videoId,
        title: metadata?.title || 'Unknown Title',
        artist: metadata?.artist || 'Unknown Artist',
        thumbnailUrl: metadata?.thumbnailUrl,
        durationSeconds: metadata?.durationSeconds,
        cachedPath: outputPath,
        isUnavailable: false,
        lastResolvedAt: new Date().toISOString(),
      });
      return outputPath;
    }
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    let resolvedTitle = metadata?.title;
    let resolvedArtist = metadata?.artist;
    let resolvedDuration = metadata?.durationSeconds || 0;
    let resolvedThumb = metadata?.thumbnailUrl;

    if (!resolvedTitle || !resolvedArtist || !resolvedDuration) {
      try {
        const { stdout: infoJson } = await execFileAsync('yt-dlp', [
          '--remote-components', 'ejs:github',
          '--js-runtimes', 'node',
          '--dump-single-json',
          '--no-warnings',
          url,
        ], { maxBuffer: 10 * 1024 * 1024 });

        const info = JSON.parse(infoJson);
        resolvedTitle = resolvedTitle || info.title || 'Unknown Title';
        resolvedArtist = resolvedArtist || info.uploader || info.channel || 'Unknown Artist';
        resolvedDuration = resolvedDuration || Math.floor(info.duration || 0);
        resolvedThumb = resolvedThumb || info.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      } catch (err) {
        console.warn(`Could not dump info for ${videoId}, using fallback:`, err);
      }
    }

    // Clean old raw files
    const existingRaw = fs.readdirSync(config.audioCacheDir).filter(f => f.startsWith(`${videoId}.raw.`));
    for (const f of existingRaw) {
      try { fs.unlinkSync(path.join(config.audioCacheDir, f)); } catch {}
    }

    // Step 1: Download raw audio using yt-dlp
    let downloadedFilePath = '';
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('yt-dlp', [
        '--remote-components', 'ejs:github',
        '--js-runtimes', 'node',
        '-f', 'ba/b',
        '--print', 'after_move:filepath',
        '-o', rawTemplate,
        '--no-playlist',
        '--no-warnings',
        url,
      ]);

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        const printedPath = stdout.trim().split('\n').pop()?.trim();
        if (printedPath && fs.existsSync(printedPath)) {
          downloadedFilePath = printedPath;
          resolve();
        } else {
          // Fallback search in directory
          const found = fs.readdirSync(config.audioCacheDir).find(f => f.startsWith(`${videoId}.raw.`));
          if (found) {
            downloadedFilePath = path.join(config.audioCacheDir, found);
            resolve();
          } else {
            reject(new Error(`yt-dlp download failed (code ${code}): ${stderr}`));
          }
        }
      });
    });

    // Step 2: High Quality Transcode with ffmpeg (256kbps high-fidelity AAC with faststart for instant seek)
    await new Promise<void>((resolve, reject) => {
      const ffProc = spawn('ffmpeg', [
        '-y',
        '-i', downloadedFilePath,
        '-vn',
        '-c:a', 'aac',
        '-b:a', '256k',
        '-ar', '48000',
        '-movflags', '+faststart',
        outputPath,
      ]);

      let ffErr = '';
      ffProc.stderr.on('data', (d) => { ffErr += d.toString(); });

      ffProc.on('close', (code) => {
        try { if (fs.existsSync(downloadedFilePath)) fs.unlinkSync(downloadedFilePath); } catch {}
        if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1024) {
          resolve();
        } else {
          reject(new Error(`ffmpeg conversion failed (code ${code}): ${ffErr}`));
        }
      });
    });

    db.upsertTrack({
      videoId,
      title: resolvedTitle || 'Unknown Title',
      artist: resolvedArtist || 'Unknown Artist',
      thumbnailUrl: resolvedThumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: resolvedDuration || 0,
      cachedPath: outputPath,
      isUnavailable: false,
      lastResolvedAt: new Date().toISOString(),
    });

    memoryStore.publish('track:ready', {
      videoId,
      cachedPath: outputPath,
      title: resolvedTitle,
      artist: resolvedArtist,
      durationSeconds: resolvedDuration,
      thumbnailUrl: resolvedThumb,
    });

    return outputPath;
  } catch (error: any) {
    console.error(`Audio extraction failed for ${videoId}:`, error);
    throw error;
  }
}

export async function evictCacheIfNeeded(maxSizeBytes: number = config.cacheMaxSizeMb * 1024 * 1024): Promise<number> {
  await ensureCacheDir();
  const files = fs.readdirSync(config.audioCacheDir);
  
  let totalSize = 0;
  const fileEntries: { filename: string; filePath: string; size: number; mtime: number }[] = [];

  for (const file of files) {
    if (file.endsWith('.m4a') && !file.includes('.temp.')) {
      const filePath = path.join(config.audioCacheDir, file);
      const stat = fs.statSync(filePath);
      totalSize += stat.size;
      fileEntries.push({
        filename: file,
        filePath,
        size: stat.size,
        mtime: stat.mtimeMs,
      });
    }
  }

  if (totalSize <= maxSizeBytes) {
    return 0;
  }

  fileEntries.sort((a, b) => a.mtime - b.mtime);

  let evictedBytes = 0;
  for (const entry of fileEntries) {
    if (totalSize - evictedBytes <= maxSizeBytes) {
      break;
    }

    try {
      fs.unlinkSync(entry.filePath);
      evictedBytes += entry.size;

      const videoId = entry.filename.replace('.m4a', '');
      const track = db.getTrackByVideoId(videoId);
      if (track) {
        db.upsertTrack({ ...track, cachedPath: null });
      }
    } catch (err) {
      console.error(`Failed to evict file ${entry.filePath}:`, err);
    }
  }

  return evictedBytes;
}

export function getCacheStats(): { count: number; totalSizeBytes: number; maxSizeBytes: number } {
  if (!fs.existsSync(config.audioCacheDir)) {
    return { count: 0, totalSizeBytes: 0, maxSizeBytes: config.cacheMaxSizeMb * 1024 * 1024 };
  }

  const files = fs.readdirSync(config.audioCacheDir);
  let totalSize = 0;
  let count = 0;

  for (const file of files) {
    if (file.endsWith('.m4a') && !file.includes('.temp.')) {
      const filePath = path.join(config.audioCacheDir, file);
      const stat = fs.statSync(filePath);
      totalSize += stat.size;
      count++;
    }
  }

  return {
    count,
    totalSizeBytes: totalSize,
    maxSizeBytes: config.cacheMaxSizeMb * 1024 * 1024,
  };
}
