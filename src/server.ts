import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { searchRouter, adminRouter } from './routes/search.js';
import { streamRouter, cacheRouter } from './routes/stream.js';
import { libraryRouter } from './routes/library.js';
import { recommendationRouter } from './routes/recommendation.js';
import { setupSocketServer } from './services/socket.js';
import { openApiSpec } from './openapi.js';

export const app = express();
export const server = http.createServer(app);

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// OpenAPI documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/search', searchRouter);
app.use('/api/admin', adminRouter);
app.use('/api/tracks', streamRouter);
app.use('/api/stream', streamRouter);
app.use('/api/library', libraryRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/recommendations', recommendationRouter);

// Serve Frontend SPA
const frontendDist = path.join(process.cwd(), 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Socket.IO
export const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

setupSocketServer(io);

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || config.port;
  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] API Docs available at http://0.0.0.0:${PORT}/api-docs`);
  });
}
