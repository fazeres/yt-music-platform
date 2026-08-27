# YT Music - Personal YouTube Music Streaming Platform

A production-grade, self-hosted YouTube Music streaming platform inspired by Spotify.

## Features
- **Audio Extraction & Transcoding**: Background audio extraction and M4A transcoding via `yt-dlp` and `ffmpeg`.
- **Worker & Queue Architecture**: Asynchronous extraction jobs handled by BullMQ worker processes with exponential backoff and concurrency control.
- **Fast Audio Streaming**: HTTP 206 Partial Content (Range requests) for gapless audio seeking.
- **Realtime Sync (Multi-Device)**: WebSocket (Socket.IO) multi-device playback synchronization with active player state authority.
- **Spotify-like Dark UI**: Full React 18, Vite, Tailwind CSS, Zustand client with Audio Visualizer (Web Audio API AnalyserNode) and gapless crossfade support.
- **Playlists & Recommendations**: Personalized content-based recommendations, play history, top artists stats, and playlist management.
- **PWA Offline Mode**: Service worker caching for offline playback of recently streamed songs.
- **Auto API Documentation**: Auto-generated Swagger / OpenAPI docs at `/api-docs`.

## Local Development
```bash
# Start Postgres and Redis
docker compose up -d postgres redis

# Run migrations and seed
pnpm prisma:migrate
pnpm prisma:seed

# Run API and Worker in dev mode
pnpm dev:api
pnpm dev:worker

# Run Frontend
cd frontend && pnpm dev
```

## Running Tests
```bash
pnpm test
```

## Deployment to Railway
See [RAILWAY.md](./RAILWAY.md) for full instructions on deploying PostgreSQL, Redis, API, Worker, and Frontend to [Railway](https://railway.com).
