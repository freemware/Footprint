import { verifyLicense } from '../../../src/pro/license';
import { get, set } from './store';

declare const __FP_PRO_GATE__: boolean | undefined;

/**
 * Footprint Pro unlocks one-click fixes, untagging, post clean-up and autoscans.
 * The same license key as the Footprint app, checked on this device; no account, no server.
 */
export async function isPro(): Promise<boolean> {
  if (typeof __FP_PRO_GATE__ === 'undefined') return true;
  const key = await get('license');
  return !!key && !!(await verifyLicense(key));
}

export async function activate(key: string): Promise<boolean> {
  const ok = !!(await verifyLicense(key));
  if (ok) await set('license', key.trim());
  return ok;
}
