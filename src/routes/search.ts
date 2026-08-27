import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { searchYouTube, getQuotaUsage } from '../services/search.js';

export const searchRouter = Router();

searchRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const q = req.query.q as string;
  if (!q) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  try {
    const results = await searchYouTube(q);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

export const adminRouter = Router();

adminRouter.get('/quota', authMiddleware, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const quota = await getQuotaUsage();
  res.json(quota);
});
