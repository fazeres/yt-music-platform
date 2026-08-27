import { memoryStore } from '../config.js';
import { db } from '../db.js';
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
  history: Array<{ track: any; playedAt: string; msPlayed: number }>
): Map<string, { track: any; score: number; count: number }> {
  const now = Date.now();
  const trackMap = new Map<string, { track: any; score: number; count: number }>();

  for (const item of history) {
    const ageHours = Math.max(0, (now - new Date(item.playedAt).getTime()) / (1000 * 60 * 60));
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
  const cached = memoryStore.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const history = db.getHistory(userId, 100);
  const favorites = db.getFavorites(userId);

  if (history.length === 0 && favorites.length === 0) {
    const defaultSearch = await searchYouTube('Top hits music 2024');
    return defaultSearch.slice(0, 15).map((t, idx) => ({
      ...t,
      score: 10 - idx * 0.5,
      reason: 'Trending Now',
    }));
  }

  const scoredMap = computeRecencyAndFrequencyScores(history);

  for (const fav of favorites) {
    const existing = scoredMap.get(fav.videoId);
    if (existing) {
      existing.score += 3.0;
    } else {
      scoredMap.set(fav.videoId, {
        track: fav,
        score: 3.0,
        count: 1,
      });
    }
  }

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
  memoryStore.set(cacheKey, JSON.stringify(recommendations), 10800);

  return recommendations;
}
