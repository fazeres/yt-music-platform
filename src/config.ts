import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ytmusic?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'supersecret_jwt_key_for_dev_12345',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  audioCacheDir: process.env.AUDIO_CACHE_DIR || path.join(process.cwd(), 'audio_cache'),
  cacheMaxSizeMb: parseInt(process.env.CACHE_MAX_SIZE_MB || '5120', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};

export const prisma = new PrismaClient();

function createRedisClient(url: string) {
  const client = new (Redis as any)(url, {
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      if (times > 20) {
        return null;
      }
      return Math.min(times * 200, 5000);
    },
  });

  client.on('error', () => {});

  return client;
}

export const redis = createRedisClient(config.redisUrl);
export const redisSub = createRedisClient(config.redisUrl);

