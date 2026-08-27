# Railway Service Configurations

This repository is configured to deploy directly to [Railway](https://railway.com) as a multi-service project.

## Architecture on Railway

1. **Database Plugins:**
   - **PostgreSQL**: Provision via Railway dashboard (`+ New` -> `Database` -> `Add PostgreSQL`).
   - **Redis**: Provision via Railway dashboard (`+ New` -> `Database` -> `Add Redis`).

2. **Backend API (`api` service):**
   - **Dockerfile**: `Dockerfile.api`
   - **Healthcheck**: `/api/health`
   - **Volume Mount**: `/app/audio_cache` (Shared Disk Volume)
   - **Environment Variables**:
     - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
     - `REDIS_URL`: `${{Redis.REDIS_URL}}`
     - `JWT_SECRET`: Generate a secure random string
     - `YOUTUBE_API_KEY`: (Optional) YouTube Data API v3 key
     - `AUDIO_CACHE_DIR`: `/app/audio_cache`
     - `PORT`: `3000`

3. **Audio Worker (`worker` service):**
   - **Dockerfile**: `Dockerfile.worker`
   - **Volume Mount**: `/app/audio_cache` (Shared Disk Volume)
   - **Environment Variables**:
     - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
     - `REDIS_URL`: `${{Redis.REDIS_URL}}`
     - `AUDIO_CACHE_DIR`: `/app/audio_cache`

4. **Frontend (`frontend` service):**
   - **Root Directory**: `frontend`
   - **Dockerfile**: `frontend/Dockerfile`
   - **Environment Variables**:
     - `VITE_API_URL`: Backend API URL or domain
