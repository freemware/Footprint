/**
 * Footprint license service: turns a paid Stripe Checkout session into a Pro license key.
 *
 *   GET /license?session_id=cs_live_…   →   { "key": "FP1.…" }
 *
 * Flow: the buyer pays through a Stripe Payment Link, Stripe sends them back to the app with
 * ?session_id={CHECKOUT_SESSION_ID}, the app calls this endpoint once and saves the key on the
 * device. The only thing the app ever sends here is that Stripe session id. Nothing about
 * the person's export or their results is ever sent.
 *
 * Secrets (set with `npx wrangler secret put NAME`):
 *   STRIPE_SECRET_KEY      a restricted key with read access to Checkout Sessions is enough
 *   LICENSE_PRIVATE_KEY    contents of license-private.pem (PKCS#8, "BEGIN PRIVATE KEY")
 * Vars (wrangler.toml):
 *   ALLOWED_ORIGINS        comma-separated origins of the app, e.g. https://footprint.example
 *   PAYMENT_LINK_ID        optional plink_… id; when set, only sessions from that link count
 */
export interface Env {
  STRIPE_SECRET_KEY: string;
  LICENSE_PRIVATE_KEY: string;
  ALLOWED_ORIGINS?: string;
  PAYMENT_LINK_ID?: string;
}

/** Shape of the Stripe Checkout Session fields we read. */
export interface StripeSession {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  payment_link?: string | null;
}

export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

const b64url = (bytes: Uint8Array) => {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const pemToBytes = (pem: string) => {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
};

/** Is this session paid, and (when configured) from our payment link? */
export function isPaid(s: StripeSession, paymentLinkId?: string): boolean {
  if (s.status !== 'complete') return false;
  if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') return false;
  if (paymentLinkId && s.payment_link !== paymentLinkId) return false;
  return true;
}

/**
 * Make a license in the same format as scripts/make-license.mjs.
 * The license id is derived from the session, so asking twice gives the same id.
 */
export async function makeLicense(privateKeyPem: string, sessionId: string, now = Date.now()): Promise<string> {
  const key = await crypto.subtle.importKey('pkcs8', pemToBytes(privateKeyPem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionId)));
  const id = [...hash.slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const payload = { v: 1, plan: 'pro', id, iat: now, ref: sessionId };
  const body = `FP1.${b64url(new TextEncoder().encode(JSON.stringify(payload)))}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(body)));
  return `${body}.${b64url(sig)}`;
}

async function fetchSession(id: string, secret: string): Promise<StripeSession | null> {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Stripe ${res.status}`);
  return (await res.json()) as StripeSession;
}

export async function handle(req: Request, env: Env, getSession = fetchSession): Promise<Response> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const cors: Record<string, string> = {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] ?? 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
  };
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.pathname !== '/license') return json(404, { error: 'not_found' });

  const sessionId = url.searchParams.get('session_id') ?? '';
  if (!SESSION_ID.test(sessionId)) return json(400, { error: 'bad_session' });

  try {
    const session = await getSession(sessionId, env.STRIPE_SECRET_KEY);
    if (!session) return json(404, { error: 'unknown_session' });
    if (!isPaid(session, env.PAYMENT_LINK_ID)) return json(402, { error: 'not_paid' });
    return json(200, { key: await makeLicense(env.LICENSE_PRIVATE_KEY, session.id) });
  } catch {
    return json(502, { error: 'try_again' });
  }
}

export default { fetch: (req: Request, env: Env) => handle(req, env) };
