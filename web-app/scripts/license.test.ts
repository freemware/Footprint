import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyLicense } from '../src/pro/license';

const KEY = process.env.FP_TEST_LICENSE;

describe('license keys', () => {
  it('rejects junk and tampered keys', async () => {
    expect(await verifyLicense('')).toBeNull();
    expect(await verifyLicense('hello')).toBeNull();
    // Signed with a different key: must fail.
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const body = `FP1.${Buffer.from(JSON.stringify({ v: 1, plan: 'pro', id: 'x', iat: 1 })).toString('base64url')}`;
    const sig = sign('sha256', Buffer.from(body), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    expect(await verifyLicense(`${body}.${sig}`)).toBeNull();
  });
  it.skipIf(!KEY)('accepts a genuine key', async () => {
    expect((await verifyLicense(KEY!))?.plan).toBe('pro');
    expect(await verifyLicense(KEY!.slice(0, -2) + 'AA')).toBeNull();
  });
});
