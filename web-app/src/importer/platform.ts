import type { Platform } from '../model/types';

/**
 * Facebook and Instagram downloads share some top-level folders (ads_information,
 * security_and_login_information, connections), so the platform is decided by folders
 * only one of them has. Language-independent: folder names are never translated.
 */
const INSTAGRAM = /^(your_instagram_activity|media\/(posts|stories)|ads_information\/(instagram_ads_and_businesses|ads_and_topics)|connections\/followers_and_following)\//;
const FACEBOOK = /^(your_facebook_activity|apps_and_websites_off_of_facebook|your_activity_across_facebook)\//;

export function detectPlatform(paths: string[]): Platform {
  let ig = 0;
  let fb = 0;
  for (const p of paths) {
    if (INSTAGRAM.test(p)) ig++;
    else if (FACEBOOK.test(p)) fb++;
  }
  return ig > fb ? 'instagram' : 'facebook';
}
