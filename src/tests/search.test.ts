import { describe, it, expect, beforeEach } from 'vitest';
import { trackQuota, getQuotaUsage } from '../services/search.js';
import { redis } from '../config.js';

describe('Search & Quota unit tests', () => {
  beforeEach(async () => {
    await redis.del('youtube:daily_quota_used');
  });

  it('tracks quota increments and calculates remaining quota', async () => {
    let quota = await getQuotaUsage();
    expect(quota.used).toBe(0);
    expect(quota.remaining).toBe(10000);

    await trackQuota(100);
    quota = await getQuotaUsage();
    expect(quota.used).toBe(100);
    expect(quota.remaining).toBe(9900);

    await trackQuota(300);
    quota = await getQuotaUsage();
    expect(quota.used).toBe(400);
    expect(quota.remaining).toBe(9600);
  });
});
