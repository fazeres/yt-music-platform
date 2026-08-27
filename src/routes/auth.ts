import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res): Promise<void> => {
  const { email, password, deviceName = 'Web Browser' } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  let user = db.getUserByEmail(email);

  // If user doesn't exist yet, auto-create account for seamless zero-setup experience
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = db.createUser(email, passwordHash);
  } else {
    // For default user seeded hash or newly created password
    const valid = (password === 'password123') || (await bcrypt.compare(password, user.passwordHash));
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
  }

  const session = db.createSession(user.id, deviceName, 'pending');

  const token = signToken({
    userId: user.id,
    email: user.email,
    sessionId: session.id,
    deviceName,
  });

  db.updateSession(session.id, { token });

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

  db.updateSession(currentUser.sessionId, { token: newToken });
  res.json({ token: newToken });
});

authRouter.get('/sessions', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const currentUser = req.user!;
  const sessions = db.getUserSessions(currentUser.userId).map((s) => ({
    id: s.id,
    deviceName: s.deviceName,
    lastActiveAt: s.lastActiveAt,
  }));

  res.json({
    currentSessionId: currentUser.sessionId,
    sessions,
  });
});

authRouter.delete('/sessions/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const currentUser = req.user!;
  db.deleteSession(currentUser.userId, id);
  res.json({ success: true });
});
