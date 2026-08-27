import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { generateRecommendations } from '../services/recommendation.js';

export const recommendationRouter = Router();

recommendationRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  try {
    const recommendations = await generateRecommendations(userId);
    res.json({ recommendations });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed generating recommendations' });
  }
});
