import { LICENSE_PUBLIC_KEY } from './config';

/**
 * Footprint Pro licenses are signed text, checked on this device:
 *   FP1.<payload>.<signature>   (both parts base64url; payload is JSON)
 * No account and no server call, so buying Pro never sends anything about the buyer's data.
 *
 * Like any check that runs in the browser, a determined developer could bypass it.
 * It is meant to keep honest people honest, not to be unbreakable.
 */
export interface LicensePayload {
  v: 1;
  plan: 'pro';
  /** Random license id, so a leaked key can be recognised. */
  id: string;
  /** Issued at, ms since epoch. */
  iat: number;
  /** Optional label the seller chose, e.g. an order number. Never shown to anyone else. */
  ref?: string;
}

const b64urlToBytes = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

let keyPromise: Promise<CryptoKey> | null = null;
const publicKey = () =>
  (keyPromise ??= crypto.subtle.importKey('jwk', LICENSE_PUBLIC_KEY, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']));

/** The license's details when the key is genuine, otherwise null. Never throws. */
export async function verifyLicense(raw: string): Promise<LicensePayload | null> {
  try {
    const key = raw.trim().replace(/\s+/g, '');
    const [tag, payload, sig] = key.split('.');
    if (tag !== 'FP1' || !payload || !sig || !crypto?.subtle) return null;
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      await publicKey(),
      b64urlToBytes(sig),
      new TextEncoder().encode(`${tag}.${payload}`),
    );
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload))) as LicensePayload;
    return data.v === 1 && data.plan === 'pro' ? data : null;
  } catch {
    return null;
  }
}
