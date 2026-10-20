/** Top-level folders of a Facebook or Instagram export. Used to find the export root inside a ZIP or folder. */
const KNOWN_ROOTS = new Set([
  'ads_information',
  'apps_and_websites_off_of_facebook',
  'connections',
  'logged_information',
  'personal_information',
  'preferences',
  'security_and_login_information',
  'your_facebook_activity',
  'your_activity_across_facebook',
  'your_instagram_activity',
  'media',
  'messages',
  'posts',
  'comments',
  'friends',
]);

/**
 * Remove wrapper folders shared by every path, e.g. "facebook-user-2026-10-14/ads_information/…"
 * → "ads_information/…", so paths match media `uri` values inside the JSON.
 */
export function stripCommonRoot(paths: string[]): (p: string) => string {
  const prefix: string[] = [];
  let split = paths.map((p) => p.split('/').filter(Boolean));
  for (;;) {
    const first = split[0]?.[0];
    if (
      !first ||
      KNOWN_ROOTS.has(first) ||
      split.some((s) => s.length < 2 || s[0] !== first)
    )
      break;
    prefix.push(first);
    split = split.map((s) => s.slice(1));
  }
  const pre = prefix.length ? `${prefix.join('/')}/` : '';
  return (p) => {
    const clean = p.split('/').filter(Boolean).join('/');
    return pre && clean.startsWith(pre) ? clean.slice(pre.length) : clean;
  };
}

/** Skip OS junk that sneaks into ZIPs and folders. */
export const isJunk = (path: string) => /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)(\/|$)/i.test(path) || /(^|\/)\._/.test(path);
