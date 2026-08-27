import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const libraryRouter = Router();

// --- Playlists ---
libraryRouter.get('/playlists', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const playlists = db.getPlaylists(userId);
  res.json({ playlists });
});

libraryRouter.post('/playlists', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Playlist name required' });
    return;
  }

  const playlist = db.createPlaylist(userId, name);
  res.status(201).json({ playlist });
});

libraryRouter.get('/playlists/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const playlist = db.getPlaylist(userId, id);
  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }
  res.json({ playlist });
});

libraryRouter.delete('/playlists/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  db.deletePlaylist(userId, id);
  res.json({ success: true });
});

libraryRouter.post('/playlists/:id/tracks', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { videoId, title, artist, thumbnailUrl, durationSeconds } = req.body;

  if (!videoId) {
    res.status(400).json({ error: 'videoId is required' });
    return;
  }

  const pt = db.addTrackToPlaylist(userId, id, {
    videoId,
    title,
    artist,
    thumbnailUrl,
    durationSeconds,
  });

  if (!pt) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }

  res.status(201).json({ playlistTrack: pt });
});

libraryRouter.delete('/playlists/:id/tracks/:trackId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id, trackId } = req.params;

  db.removeTrackFromPlaylist(userId, id, trackId);
  res.json({ success: true });
});

// --- Favorites ---
libraryRouter.get('/favorites', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const favorites = db.getFavorites(userId);
  res.json({ favorites });
});

libraryRouter.post('/favorites', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { videoId, title, artist, thumbnailUrl, durationSeconds } = req.body;

  if (!videoId) {
    res.status(400).json({ error: 'videoId is required' });
    return;
  }

  db.addFavorite(userId, { videoId, title, artist, thumbnailUrl, durationSeconds });
  const track = db.getTrackByVideoId(videoId);
  res.status(201).json({ success: true, track });
});

libraryRouter.delete('/favorites/:videoId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { videoId } = req.params;

  db.removeFavorite(userId, videoId);
  res.json({ success: true });
});

// --- Play History & Stats ---
libraryRouter.post('/history', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { videoId, title, artist, thumbnailUrl, durationSeconds, msPlayed = 0 } = req.body;

  if (!videoId) {
    res.status(400).json({ error: 'videoId is required' });
    return;
  }

  const historyEntry = db.addHistory(userId, { videoId, title, artist, thumbnailUrl, durationSeconds }, msPlayed);
  res.status(201).json({ historyEntry });
});

libraryRouter.get('/history', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const history = db.getHistory(userId);
  res.json({ history });
});

libraryRouter.get('/history/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const stats = db.getStats(userId);
  res.json(stats);
});
