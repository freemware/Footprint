/**
 * Everything about Footprint Pro you might want to change, in one place.
 *
 * BUY_URL: your Stripe Payment Link (https://buy.stripe.com/…). Leave empty until it exists;
 * the app then says Pro checkout is opening soon. Set the link's after-payment redirect to
 * https://YOUR-APP/?session_id={CHECKOUT_SESSION_ID}
 * LICENSE_API: address of the license service in server/stripe-license (no trailing slash).
 * After checkout the app sends it only the Stripe session id and gets a key back.
 * PRICE: shown on the upgrade screen. Keep it in step with the store.
 * FREE_FIXES: privacy-plan fixes whose steps stay free, as a preview of what Pro unlocks.
 */
export const PRO = {
  BUY_URL: '',
  LICENSE_API: '',
  PRICE: '$19',
  PRICE_NOTE: 'one-time · yours to keep',
  FREE_FIXES: ['two_factor', 'ig_two_factor'] as readonly string[],
  /** How many platforms can be explored without Pro. */
  FREE_PLATFORMS: 1,
};

/**
 * Public half of the key that signs licenses. The private half never ships with the app;
 * licenses are made with scripts/make-license.mjs on your own computer.
 */
export const LICENSE_PUBLIC_KEY: JsonWebKey = {
  kty: 'EC',
  crv: 'P-256',
  x: '2Rfweq1Cme0bx5tWo1p6r7Cj7OD5oXj1rwW62V-0tZ8',
  y: 'XkXiZw2rL775s-hgeIFJ7vvZ_WEiQM2HN4VNB42EQGA',
};
