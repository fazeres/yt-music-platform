import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../server.js';
import { db } from '../db.js';
import { config } from '../config.js';
import { signToken } from '../middleware/auth.js';

describe('Supertest Integration Tests (Self-contained, Zero external DB)', () => {
  let token: string;
  let userId: string;
  let sessionId: string;

  beforeAll(() => {
    let user = db.getUserByEmail('user@example.com');
    if (!user) {
      user = db.createUser('user@example.com', 'password123');
    }
    userId = user.id;

    const session = db.createSession(userId, 'Test Device', 'test_token');
    sessionId = session.id;

    token = signToken({
      userId,
      email: user.email,
      sessionId,
      deviceName: 'Test Device',
    });

    db.updateSession(sessionId, { token });
  });

  it('GET /api/health returns 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/auth/login succeeds with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123', deviceName: 'Integration Device' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('user@example.com');
  });

  it('Playlists CRUD flow', async () => {
    const createRes = await request(app)
      .post('/api/library/playlists')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Standalone Playlist' });
    expect(createRes.status).toBe(201);
    const playlistId = createRes.body.playlist.id;

    const addTrackRes = await request(app)
      .post(`/api/library/playlists/${playlistId}/tracks`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        videoId: 'test_vid_1',
        title: 'Test Song 1',
        artist: 'Test Artist',
        durationSeconds: 180,
      });
    expect(addTrackRes.status).toBe(201);

    const getRes = await request(app)
      .get(`/api/library/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.playlist.tracks.length).toBe(1);

    const delRes = await request(app)
      .delete(`/api/library/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);
  });

  it('E2E simulation: resolve track -> mock cache file -> stream with Range header -> favorite -> stats', async () => {
    const testVideoId = 'sim_vid_123';
    if (!fs.existsSync(config.audioCacheDir)) {
      fs.mkdirSync(config.audioCacheDir, { recursive: true });
    }
    const testAudioFile = path.join(config.audioCacheDir, `${testVideoId}.m4a`);
    fs.writeFileSync(testAudioFile, Buffer.alloc(10000, 65));

    const resolveRes = await request(app)
      .post(`/api/tracks/${testVideoId}/resolve`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Simulated Audio',
        artist: 'Simulated Artist',
        durationSeconds: 200,
      });
    expect([200, 202]).toContain(resolveRes.status);

    const streamRes = await request(app)
      .get(`/api/stream/${testVideoId}`)
      .set('Range', 'bytes=0-499');
    expect(streamRes.status).toBe(206);
    expect(streamRes.header['content-range']).toBe('bytes 0-499/10000');

    const favRes = await request(app)
      .post('/api/library/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({
        videoId: testVideoId,
        title: 'Simulated Audio',
        artist: 'Simulated Artist',
        durationSeconds: 200,
      });
    expect(favRes.status).toBe(201);

    const histRes = await request(app)
      .post('/api/library/history')
      .set('Authorization', `Bearer ${token}`)
      .send({
        videoId: testVideoId,
        title: 'Simulated Audio',
        artist: 'Simulated Artist',
        durationSeconds: 200,
        msPlayed: 120000,
      });
    expect(histRes.status).toBe(201);

    const statsRes = await request(app)
      .get('/api/library/history/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.totalTracksPlayed).toBeGreaterThanOrEqual(1);

    try { fs.unlinkSync(testAudioFile); } catch {}
  });
});
