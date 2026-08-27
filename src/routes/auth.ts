import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config.js';
import { signToken, authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res): Promise<void> => {
  const { email, password, deviceName = 'Web Browser' } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      deviceName,
      token: 'pending',
    },
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
    sessionId: session.id,
    deviceName,
  });

  await prisma.session.update({
    where: { id: session.id },
    data: { token },
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      sessionId: session.id,
      deviceName,
    },
  });
});

authRouter.post('/refresh', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const currentUser = req.user!;
  const newToken = signToken({
    userId: currentUser.userId,
    email: currentUser.email,
    sessionId: currentUser.sessionId,
    deviceName: currentUser.deviceName,
  });

  await prisma.session.update({
    where: { id: currentUser.sessionId },
    data: { token: newToken, lastActiveAt: new Date() },
  });

  res.json({ token: newToken });
});

authRouter.get('/sessions', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const currentUser = req.user!;
  const sessions = await prisma.session.findMany({
    where: { userId: currentUser.userId },
    orderBy: { lastActiveAt: 'desc' },
    select: {
      id: true,
      deviceName: true,
      lastActiveAt: true,
    },
  });

  res.json({
    currentSessionId: currentUser.sessionId,
    sessions,
  });
});

authRouter.delete('/sessions/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const currentUser = req.user!;

  await prisma.session.deleteMany({
    where: {
      id,
      userId: currentUser.userId,
    },
  });

  res.json({ success: true });
});
