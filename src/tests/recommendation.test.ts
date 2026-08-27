import { describe, it, expect } from 'vitest';
import { computeRecencyAndFrequencyScores } from '../services/recommendation.js';

describe('Recommendation scoring logic unit tests', () => {
  it('correctly weighs recency and frequency', () => {
    const now = new Date().toISOString();
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

    const history = [
      {
        track: { videoId: 'recent_track', title: 'Recent Song', artist: 'Artist A', durationSeconds: 200 },
        playedAt: now,
        msPlayed: 200000,
      },
      {
        track: { videoId: 'old_track', title: 'Old Song', artist: 'Artist B', durationSeconds: 200 },
        playedAt: twoDaysAgo,
        msPlayed: 200000,
      },
      {
        track: { videoId: 'recent_track', title: 'Recent Song', artist: 'Artist A', durationSeconds: 200 },
        playedAt: now,
        msPlayed: 200000,
      },
    ];

    const scored = computeRecencyAndFrequencyScores(history);
    const recentScore = scored.get('recent_track')!.score;
    const oldScore = scored.get('old_track')!.score;

    expect(recentScore).toBeGreaterThan(oldScore);
    expect(scored.get('recent_track')!.count).toBe(2);
    expect(scored.get('old_track')!.count).toBe(1);
  });
});
