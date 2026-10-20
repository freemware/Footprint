import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { generateKeyPairSync, verify } from 'node:crypto';
import { handle, isPaid, makeLicense, type StripeSession } from '../server/stripe-license/src/index';
import { verifyLicense } from '../src/pro/license';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const SID = 'cs_test_a1B2c3D4e5F6g7H8i9J0';

const env = { STRIPE_SECRET_KEY: 'rk_test_x', LICENSE_PRIVATE_KEY: PEM, ALLOWED_ORIGINS: 'https://app.example', PAYMENT_LINK_ID: 'plink_1' };
const paid: StripeSession = { id: SID, status: 'complete', payment_status: 'paid', payment_link: 'plink_1' };
const get = (q: string) => new Request(`https://lic.example/license?${q}`, { headers: { Origin: 'https://app.example' } });

describe('stripe license service', () => {
  it('only counts finished, paid sessions from the right link', () => {
    expect(isPaid(paid, 'plink_1')).toBe(true);
    expect(isPaid({ ...paid, payment_status: 'unpaid' })).toBe(false);
    expect(isPaid({ ...paid, status: 'open' })).toBe(false);
    expect(isPaid(paid, 'plink_other')).toBe(false);
  });

  it('signs keys in the app format', async () => {
    const key = await makeLicense(PEM, SID, 1);
    const [tag, body, sig] = key.split('.');
    expect(tag).toBe('FP1');
    expect(verify('sha256', Buffer.from(`${tag}.${body}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'))).toBe(true);
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    expect(payload).toMatchObject({ v: 1, plan: 'pro', ref: SID });
    expect((await makeLicense(PEM, SID)).split('.')[1]).not.toBe(body); // iat differs
  });

  it('answers requests safely', async () => {
    const ok = await handle(get(`session_id=${SID}`), env, async () => paid);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
    expect(((await ok.json()) as { key: string }).key.startsWith('FP1.')).toBe(true);
    expect((await handle(get('session_id=nope'), env, async () => paid)).status).toBe(400);
    expect((await handle(get(`session_id=${SID}`), env, async () => ({ ...paid, payment_status: 'unpaid' }))).status).toBe(402);
    expect((await handle(get(`session_id=${SID}`), env, async () => null)).status).toBe(404);
    expect((await handle(get(`session_id=${SID}`), env, async () => { throw new Error('down'); })).status).toBe(502);
  });

  const real = process.env.FOOTPRINT_LICENSE_KEY;
  it.skipIf(!real || !existsSync(real))('makes keys the app accepts', async () => {
    const key = await makeLicense(readFileSync(real!, 'utf8'), SID);
    expect((await verifyLicense(key))?.ref).toBe(SID);
  });
});
