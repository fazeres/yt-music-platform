import { Router, Response } from 'express';
import fs from 'fs';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { resolveQueue } from '../queue.js';
import { getAudioCachePath, getCacheStats, extractAndCacheAudio } from '../services/audio.js';

export const streamRouter = Router();

// Resolve audio extraction (returns 200 if already cached, 202 if queued)
streamRouter.post('/:videoId/resolve', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { videoId } = req.params;
  const { title, artist, thumbnailUrl, durationSeconds } = req.body || {};

  const cachedFilePath = getAudioCachePath(videoId);
  if (fs.existsSync(cachedFilePath) && fs.statSync(cachedFilePath).size > 1024) {
    const track = db.getTrackByVideoId(videoId);
    res.json({
      status: 'ready',
      videoId,
      cachedPath: cachedFilePath,
      track,
    });
    return;
  }

  resolveQueue.add({
    videoId,
    title,
    artist,
    thumbnailUrl,
    durationSeconds,
  });

  res.status(202).json({
    status: 'queued',
    videoId,
    message: 'Audio extraction in progress. Subscribe to WebSocket track:ready or poll.',
  });
});

// Stream audio with HTTP Range support (auto-extracts immediately if not yet cached)
streamRouter.get('/:videoId', async (req, res): Promise<void> => {
  const { videoId } = req.params;
  const filePath = getAudioCachePath(videoId);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 1024) {
    try {
      console.log(`[Stream] Audio not yet cached for ${videoId}. Extracting on-demand...`);
      await extractAndCacheAudio(videoId);
    } catch (err: any) {
      console.error(`[Stream] On-demand extraction failed for ${videoId}:`, err.message);
      res.status(500).json({ error: `Audio extraction failed: ${err.message}` });
      return;
    }
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'audio/mp4',
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Download audio file directly
streamRouter.get('/:videoId/download', async (req, res): Promise<void> => {
  const { videoId } = req.params;
  const filePath = getAudioCachePath(videoId);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 1024) {
    try {
      await extractAndCacheAudio(videoId);
    } catch (err: any) {
      res.status(500).json({ error: `Audio extraction failed: ${err.message}` });
      return;
    }
  }

  const track = db.getTrackByVideoId(videoId);
  const filename = `${(track?.title || videoId).replace(/[^a-zA-Z0-9_-]/g, '_')}.m4a`;

  res.download(filePath, filename);
});

export const cacheRouter = Router();

cacheRouter.get('/stats', authMiddleware, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const stats = getCacheStats();
  res.json(stats);
});
