import { execFile } from 'child_process';
import { promisify } from 'util';
import { memoryStore, config } from '../config.js';

const execFileAsync = promisify(execFile);

export interface SearchResult {
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  durationSeconds: number;
}

const QUOTA_KEY = 'youtube:daily_quota_used';
const DAILY_LIMIT = 10000;

export async function trackQuota(units: number = 100): Promise<number> {
  return memoryStore.incr(QUOTA_KEY, units);
}

export async function getQuotaUsage(): Promise<{ used: number; limit: number; remaining: number }> {
  const usedStr = memoryStore.get(QUOTA_KEY);
  const used = usedStr ? parseInt(usedStr, 10) : 0;
  return {
    used,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - used),
  };
}

export async function searchYouTube(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = `search:${trimmed.toLowerCase()}`;
  const cached = memoryStore.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  let results: SearchResult[] = [];

  if (config.youtubeApiKey) {
    try {
      await trackQuota(100);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(trimmed)}&key=${config.youtubeApiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        results = (data.items || []).map((item: any) => ({
          videoId: item.id?.videoId || '',
          title: item.snippet?.title || '',
          artist: item.snippet?.channelTitle || '',
          thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
          durationSeconds: 0,
        })).filter((item: SearchResult) => item.videoId);
      }
    } catch (err) {
      console.error('YouTube Data API search failed, falling back to yt-dlp search:', err);
    }
  }

  if (results.length === 0) {
    try {
      const { stdout } = await execFileAsync('yt-dlp', [
        `ytsearch20:${trimmed}`,
        '--dump-single-json',
        '--flat-playlist',
        '--no-warnings',
        '--ignore-errors',
      ], { maxBuffer: 10 * 1024 * 1024 });

      const parsed = JSON.parse(stdout);
      const entries = parsed.entries || [];
      results = entries.map((entry: any) => ({
        videoId: entry.id,
        title: entry.title || 'Unknown Title',
        artist: entry.uploader || entry.channel || 'Unknown Artist',
        thumbnailUrl: entry.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
        durationSeconds: Math.floor(entry.duration || 0),
      })).filter((item: SearchResult) => item.videoId);
    } catch (err) {
      console.error('yt-dlp search failed:', err);
    }
  }

  if (results.length > 0) {
    memoryStore.set(cacheKey, JSON.stringify(results), 600);
  }

  return results;
}
