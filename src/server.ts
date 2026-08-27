import express from 'express';
import http from 'http';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { searchRouter, adminRouter } from './routes/search.js';
import { streamRouter, cacheRouter } from './routes/stream.js';
import { libraryRouter } from './routes/library.js';
import { recommendationRouter } from './routes/recommendation.js';
import { setupSocketServer } from './services/socket.js';
import { startWorker } from './worker/index.js';
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

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/search', searchRouter);
app.use('/api/admin', adminRouter);
app.use('/api/tracks', streamRouter);
app.use('/api/stream', streamRouter);
app.use('/api/library', libraryRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/recommendations', recommendationRouter);

// Socket.IO
export const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

setupSocketServer(io);

if (process.env.NODE_ENV !== 'test') {
  // Start worker inside process if running monolithic or dev mode
  startWorker();

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${config.port}`);
    console.log(`[Server] API Docs available at http://0.0.0.0:${config.port}/api-docs`);
  });
}
