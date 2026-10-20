#!/usr/bin/env node
/**
 * Make a Footprint Pro license key.
 *
 *   FOOTPRINT_LICENSE_KEY=/path/to/license-private.pem node scripts/make-license.mjs [order-ref]
 *
 * The private key file must never be committed or shared: anyone holding it can make keys.
 * Paste the printed key into your store's "license key" delivery (or email it to the buyer).
 */
import { createPrivateKey, randomBytes, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const path = process.env.FOOTPRINT_LICENSE_KEY;
if (!path) {
  console.error('Set FOOTPRINT_LICENSE_KEY to the path of license-private.pem');
  process.exit(1);
}
const key = createPrivateKey(readFileSync(path));
const b64url = (buf) => Buffer.from(buf).toString('base64url');
const payload = { v: 1, plan: 'pro', id: randomBytes(8).toString('hex'), iat: Date.now(), ...(process.argv[2] ? { ref: process.argv[2] } : {}) };
const body = `FP1.${b64url(JSON.stringify(payload))}`;
const signature = sign('sha256', Buffer.from(body), { key, dsaEncoding: 'ieee-p1363' });
console.log(`${body}.${b64url(signature)}`);
