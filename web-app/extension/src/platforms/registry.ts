import { INSTAGRAM } from './instagram';
import { FACEBOOK } from './facebook';
import type { PlatformDef } from './types';

/**
 * Every platform Footprint's extension covers or plans to, in release order.
 * A platform becomes available by adding its recipes file and switching its status.
 */
const coming = (id: string, name: string, mark: string, planned: string[]): PlatformDef => ({
  id,
  name,
  mark,
  status: 'coming',
  hosts: [],
  home: '',
  checks: [],
  planned,
});

export const PLATFORMS: PlatformDef[] = [
  FACEBOOK,
  INSTAGRAM,
  coming('linkedin', 'LinkedIn', 'in', ['Who can see your email and connections', 'Profile visibility off LinkedIn', 'Data used for ads and AI training']),
  coming('x', 'X', 'X', ['Protect your posts', 'Discoverability by email and phone', 'Personalised ads and data sharing', 'Delete old posts']),
  coming('tiktok', 'TikTok', 'tt', ['Private account', 'Suggest your account to others', 'Ads personalisation', 'Who can duet, stitch and message you']),
  coming('snapchat', 'Snapchat', 'sc', ['Snap Map ghost mode', 'Who can contact you and see your story', 'Quick Add', 'Ads personalisation']),
  coming('venmo', 'Venmo', 'v', ['Default payment privacy', 'Past transactions visibility', 'Friends list visibility', 'Contact syncing']),
];

export const platform = (id: string) => PLATFORMS.find((p) => p.id === id);
export const available = () => PLATFORMS.filter((p) => p.status === 'available');
