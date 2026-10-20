# Footprint license service (Stripe)

A tiny Cloudflare Worker that turns a paid Stripe checkout into a Footprint Pro license key.
It never sees anyone's export: the app sends it only the Stripe checkout session id.

## How a purchase works

1. The buyer clicks **Pay with card** in the app. That opens your Stripe Payment Link.
2. After paying, Stripe sends them back to the app with `?session_id=cs_…`.
3. The app calls `GET /license?session_id=…` on this Worker once.
4. The Worker asks Stripe whether that session is paid. If it is, the Worker signs a key
   (same format as `scripts/make-license.mjs`).
5. The app saves the key on the device, removes the session id from the address bar and
   shows the key so the buyer can keep a copy.

If a buyer loses their key, find their payment in Stripe and run
`node scripts/make-license.mjs <their cs_… id>` on your own computer.

## Setup (about 15 minutes)

1. **Stripe product.** In the Stripe Dashboard, create a product "Footprint Pro", $19, one-time.
2. **Payment Link.** Create a Payment Link for it. Under *After payment*, choose
   *Don't show confirmation page* → redirect to
   `https://YOUR-APP-ADDRESS/?session_id={CHECKOUT_SESSION_ID}`
   (type `{CHECKOUT_SESSION_ID}` exactly; Stripe fills it in).
3. **Restricted key.** Developers → API keys → *Create restricted key*, with
   **Checkout Sessions: Read** and nothing else.
4. **Deploy the Worker.**
   ```sh
   cd server/stripe-license
   npx wrangler login
   # edit wrangler.toml: ALLOWED_ORIGINS (your app address) and PAYMENT_LINK_ID (plink_…)
   npx wrangler secret put STRIPE_SECRET_KEY        # paste the restricted key
   npx wrangler secret put LICENSE_PRIVATE_KEY      # paste the whole license-private.pem
   npx wrangler deploy
   ```
   Wrangler prints the Worker address, e.g. `https://footprint-license.you.workers.dev`.
5. **Tell the app.** In `src/pro/config.ts` set `BUY_URL` to the Payment Link and
   `LICENSE_API` to the Worker address, then rebuild and deploy the app.
6. **Test** with Stripe test mode first: a test Payment Link, a test restricted key and card
   `4242 4242 4242 4242`. Then switch both to live.

The app must be served from your own address (Cloudflare Pages, GitHub Pages, etc.) for the
redirect back from Stripe to work. The private test page inside Claude can't receive it, but
paste-a-key still works there.
