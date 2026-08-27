import { Router, Response } from 'express';
import fs from 'fs';
import { prisma } from '../config.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { resolveQueue } from '../queue.js';
import { getAudioCachePath, getCacheStats } from '../services/audio.js';

export const streamRouter = Router();

// Resolve audio extraction (returns 200 if already cached, 202 if queued)
streamRouter.post('/:videoId/resolve', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { videoId } = req.params;
  const { title, artist, thumbnailUrl, durationSeconds } = req.body || {};

  const cachedFilePath = getAudioCachePath(videoId);
  if (fs.existsSync(cachedFilePath) && fs.statSync(cachedFilePath).size > 1024) {
    const track = await prisma.track.findUnique({ where: { videoId } });
    res.json({
      status: 'ready',
      videoId,
      cachedPath: cachedFilePath,
      track,
    });
    return;
  }

  // Check if job already active/waiting in queue
  const existingJob = await resolveQueue.getJob(videoId);
  if (!existingJob) {
    await resolveQueue.add(
      'resolve',
      {
        videoId,
        title,
        artist,
        thumbnailUrl,
        durationSeconds,
      },
      { jobId: videoId }
    );
  }

  res.status(202).json({
    status: 'queued',
    videoId,
    message: 'Audio extraction in progress. Subscribe to WebSocket track:ready or poll.',
  });
});

// Stream audio with HTTP Range support
streamRouter.get('/:videoId', async (req, res): Promise<void> => {
  const { videoId } = req.params;
  const filePath = getAudioCachePath(videoId);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Audio not cached yet. Call POST /api/tracks/:videoId/resolve first.' });
    return;
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

export const cacheRouter = Router();

cacheRouter.get('/stats', authMiddleware, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const stats = getCacheStats();
  res.json(stats);
});
