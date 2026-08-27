import { prisma, redis } from '../config.js';
import { searchYouTube } from './search.js';

export interface ScoredTrack {
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  durationSeconds: number;
  score: number;
  reason: string;
}

export function computeRecencyAndFrequencyScores(
  history: Array<{ track: any; playedAt: Date; msPlayed: number }>
): Map<string, { track: any; score: number; count: number }> {
  const now = Date.now();
  const trackMap = new Map<string, { track: any; score: number; count: number }>();

  for (const item of history) {
    const ageHours = Math.max(0, (now - new Date(item.playedAt).getTime()) / (1000 * 60 * 60));
    // Exponential recency decay: 1 / (1 + ageHours / 24)
    const recencyWeight = 1 / (1 + ageHours / 24);
    const playScore = 1.0 * recencyWeight;

    const existing = trackMap.get(item.track.videoId);
    if (existing) {
      existing.score += playScore;
      existing.count += 1;
    } else {
      trackMap.set(item.track.videoId, {
        track: item.track,
        score: playScore,
        count: 1,
      });
    }
  }

  return trackMap;
}

export async function generateRecommendations(userId: string): Promise<ScoredTrack[]> {
  const cacheKey = `recommendations:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const history = await prisma.playHistory.findMany({
    where: { userId },
    orderBy: { playedAt: 'desc' },
    take: 100,
    include: { track: true },
  });

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: { track: true },
  });

  if (history.length === 0 && favorites.length === 0) {
    const defaultSearch = await searchYouTube('Top global hits music 2024');
    return defaultSearch.slice(0, 15).map((t, idx) => ({
      ...t,
      score: 10 - idx * 0.5,
      reason: 'Trending Now',
    }));
  }

  const scoredMap = computeRecencyAndFrequencyScores(history);

  // Bonus for favorites
  for (const fav of favorites) {
    const existing = scoredMap.get(fav.track.videoId);
    if (existing) {
      existing.score += 3.0;
    } else {
      scoredMap.set(fav.track.videoId, {
        track: fav.track,
        score: 3.0,
        count: 1,
      });
    }
  }

  // Top artists from user history
  const topArtistsMap = new Map<string, number>();
  for (const entry of scoredMap.values()) {
    const artist = entry.track.artist;
    topArtistsMap.set(artist, (topArtistsMap.get(artist) || 0) + entry.score);
  }

  const topArtists = Array.from(topArtistsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((e) => e[0]);

  const recommendations: ScoredTrack[] = [];
  const seenVideoIds = new Set<string>();

  // Add top scored tracks from user history
  const topHistoryTracks = Array.from(scoredMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  for (const h of topHistoryTracks) {
    seenVideoIds.add(h.track.videoId);
    recommendations.push({
      videoId: h.track.videoId,
      title: h.track.title,
      artist: h.track.artist,
      thumbnailUrl: h.track.thumbnailUrl || `https://i.ytimg.com/vi/${h.track.videoId}/hqdefault.jpg`,
      durationSeconds: h.track.durationSeconds,
      score: h.score,
      reason: 'Frequently Played',
    });
  }

  // Query related songs for top artists
  for (const artist of topArtists) {
    try {
      const results = await searchYouTube(`${artist} songs`);
      for (const res of results.slice(0, 4)) {
        if (!seenVideoIds.has(res.videoId)) {
          seenVideoIds.add(res.videoId);
          recommendations.push({
            ...res,
            score: 5.0,
            reason: `Because you listen to ${artist}`,
          });
        }
      }
    } catch (err) {
      console.warn(`Failed finding recommendations for artist ${artist}:`, err);
    }
  }

  recommendations.sort((a, b) => b.score - a.score);

  // Cache for 3 hours
  await redis.set(cacheKey, JSON.stringify(recommendations), 'EX', 10800);

  return recommendations;
}
