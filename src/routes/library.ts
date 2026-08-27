import { Router, Response } from 'express';
import { prisma } from '../config.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const libraryRouter = Router();

// --- Playlists ---
libraryRouter.get('/playlists', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const playlists = await prisma.playlist.findMany({
    where: { userId },
    include: {
      tracks: {
        orderBy: { position: 'asc' },
        include: { track: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ playlists });
});

libraryRouter.post('/playlists', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Playlist name required' });
    return;
  }

  const playlist = await prisma.playlist.create({
    data: { userId, name },
    include: { tracks: { include: { track: true } } },
  });
  res.status(201).json({ playlist });
});

libraryRouter.get('/playlists/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const playlist = await prisma.playlist.findFirst({
    where: { id, userId },
    include: {
      tracks: {
        orderBy: { position: 'asc' },
        include: { track: true },
      },
    },
  });

  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }
  res.json({ playlist });
});

libraryRouter.delete('/playlists/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  await prisma.playlist.deleteMany({
    where: { id, userId },
  });
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

  const playlist = await prisma.playlist.findFirst({ where: { id, userId } });
  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }

  const track = await prisma.track.upsert({
    where: { videoId },
    update: {},
    create: {
      videoId,
      title: title || 'Unknown Title',
      artist: artist || 'Unknown Artist',
      thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: durationSeconds || 0,
    },
  });

  const count = await prisma.playlistTrack.count({ where: { playlistId: id } });
  const playlistTrack = await prisma.playlistTrack.upsert({
    where: {
      playlistId_trackId: {
        playlistId: id,
        trackId: track.id,
      },
    },
    update: {},
    create: {
      playlistId: id,
      trackId: track.id,
      position: count,
    },
    include: { track: true },
  });

  res.status(201).json({ playlistTrack });
});

libraryRouter.delete('/playlists/:id/tracks/:trackId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id, trackId } = req.params;

  const playlist = await prisma.playlist.findFirst({ where: { id, userId } });
  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }

  await prisma.playlistTrack.deleteMany({
    where: { playlistId: id, trackId },
  });

  res.json({ success: true });
});

// Reorder playlist tracks (positions array of trackIds)
libraryRouter.put('/playlists/:id/reorder', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { trackIds } = req.body;

  if (!Array.isArray(trackIds)) {
    res.status(400).json({ error: 'trackIds array required' });
    return;
  }

  const playlist = await prisma.playlist.findFirst({ where: { id, userId } });
  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }

  await prisma.$transaction(
    trackIds.map((trackId: string, index: number) =>
      prisma.playlistTrack.updateMany({
        where: { playlistId: id, trackId },
        data: { position: index },
      })
    )
  );

  res.json({ success: true });
});

// --- Favorites ---
libraryRouter.get('/favorites', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { favoritedAt: 'desc' },
    include: { track: true },
  });
  res.json({ favorites: favorites.map((f) => f.track) });
});

libraryRouter.post('/favorites', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { videoId, title, artist, thumbnailUrl, durationSeconds } = req.body;

  if (!videoId) {
    res.status(400).json({ error: 'videoId is required' });
    return;
  }

  const track = await prisma.track.upsert({
    where: { videoId },
    update: {},
    create: {
      videoId,
      title: title || 'Unknown Title',
      artist: artist || 'Unknown Artist',
      thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: durationSeconds || 0,
    },
  });

  await prisma.favorite.upsert({
    where: {
      userId_trackId: {
        userId,
        trackId: track.id,
      },
    },
    update: {},
    create: {
      userId,
      trackId: track.id,
    },
  });

  res.status(201).json({ success: true, track });
});

libraryRouter.delete('/favorites/:videoId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { videoId } = req.params;

  const track = await prisma.track.findUnique({ where: { videoId } });
  if (track) {
    await prisma.favorite.deleteMany({
      where: { userId, trackId: track.id },
    });
  }
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

  const track = await prisma.track.upsert({
    where: { videoId },
    update: {},
    create: {
      videoId,
      title: title || 'Unknown Title',
      artist: artist || 'Unknown Artist',
      thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: durationSeconds || 0,
    },
  });

  const historyEntry = await prisma.playHistory.create({
    data: {
      userId,
      trackId: track.id,
      msPlayed,
    },
    include: { track: true },
  });

  res.status(201).json({ historyEntry });
});

libraryRouter.get('/history', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const history = await prisma.playHistory.findMany({
    where: { userId },
    orderBy: { playedAt: 'desc' },
    take: 50,
    include: { track: true },
  });
  res.json({ history });
});

libraryRouter.get('/history/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const history = await prisma.playHistory.findMany({
    where: { userId },
    include: { track: true },
  });

  let totalListeningMs = 0;
  const artistCounts: Record<string, { plays: number; totalMs: number }> = {};
  const trackCounts: Record<string, { track: any; plays: number; totalMs: number }> = {};

  for (const item of history) {
    const ms = item.msPlayed || (item.track.durationSeconds ? item.track.durationSeconds * 1000 : 0);
    totalListeningMs += ms;

    // Artist stats
    const artist = item.track.artist || 'Unknown';
    if (!artistCounts[artist]) {
      artistCounts[artist] = { plays: 0, totalMs: 0 };
    }
    artistCounts[artist].plays += 1;
    artistCounts[artist].totalMs += ms;

    // Track stats
    const trackId = item.track.id;
    if (!trackCounts[trackId]) {
      trackCounts[trackId] = { track: item.track, plays: 0, totalMs: 0 };
    }
    trackCounts[trackId].plays += 1;
    trackCounts[trackId].totalMs += ms;
  }

  const topArtists = Object.entries(artistCounts)
    .map(([artist, data]) => ({ artist, ...data }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 10);

  const topTracks = Object.values(trackCounts)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 10);

  res.json({
    totalTracksPlayed: history.length,
    totalListeningMinutes: Math.round(totalListeningMs / 60000),
    topArtists,
    topTracks,
  });
});
