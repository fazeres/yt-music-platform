import { describe, it, expect, beforeEach } from 'vitest';
import { signToken, verifyToken } from '../middleware/auth.js';

describe('Auth Middleware & JWT unit tests', () => {
  const payload = {
    userId: 'user-123',
    email: 'test@example.com',
    sessionId: 'session-456',
    deviceName: 'Test Laptop',
  };

  it('correctly signs and verifies a JWT token', () => {
    const token = signToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.sessionId).toBe(payload.sessionId);
    expect(decoded.deviceName).toBe(payload.deviceName);
  });

  it('throws error when verifying invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });
});
