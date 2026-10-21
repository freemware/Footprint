import type { ListItem } from '../shared/types';

/** Only actual platform permalinks may be opened by the preview worker. */
export function postUrl(raw: string | null | undefined, base = 'https://www.facebook.com'): string | undefined {
  if (!raw) return;
  try {
    const u = new URL(raw, base);
    if (u.protocol !== 'https:' || u.username || u.password) return;
    if (/^(www\.|web\.|m\.)?facebook\.com$/.test(u.hostname)) {
      if (!(/\/(posts|videos|reel)\/[^/]+/.test(u.pathname) || /^\/(story|permalink|photo)\.php$/.test(u.pathname) || /^\/photo\/?$/.test(u.pathname) || /^\/watch\/?$/.test(u.pathname))) return;
      if (/photo/.test(u.pathname) && !u.searchParams.get('fbid')) return;
      if (/story|permalink/.test(u.pathname) && !u.searchParams.get('story_fbid')) return;
      if (/watch/.test(u.pathname) && !u.searchParams.get('v')) return;
      u.hostname = 'www.facebook.com';
      for (const key of [...u.searchParams.keys()]) if (!['fbid', 'story_fbid', 'id', 'v'].includes(key)) u.searchParams.delete(key);
    } else if (/^(www\.)?instagram\.com$/.test(u.hostname)) {
      if (!/^\/(p|reel|tv)\/[^/]+/.test(u.pathname)) return;
      u.hostname = 'www.instagram.com'; u.search = '';
    } else return;
    u.hash = '';
    return u.href;
  } catch { return; }
}

/** The same Facebook post can appear as a story.php link in one list and /posts/ in another. */
export function postIdentity(raw: string): string {
  const normalized = postUrl(raw);
  if (!normalized) return raw;
  const u = new URL(normalized);
  if (u.hostname.endsWith('facebook.com')) {
    const post = u.searchParams.get('story_fbid') || u.pathname.match(/\/posts\/([^/]+)/)?.[1];
    const photo = u.searchParams.get('fbid');
    const video = u.searchParams.get('v') || u.pathname.match(/\/videos\/([^/]+)/)?.[1];
    if (post) return `facebook:post:${post}`;
    if (photo) return `facebook:photo:${photo}`;
    if (video) return `facebook:video:${video}`;
  }
  return normalized.replace(/\/$/, '');
}

export function mediaUrl(raw: string | null | undefined): string | undefined {
  try {
    const u = new URL(raw ?? '');
    return u.protocol === 'https:' && /(^|\.)(fbcdn\.net|cdninstagram\.com|facebook\.com|instagram\.com)$/.test(u.hostname) ? u.href : undefined;
  } catch { return; }
}

export function rowMedia(row: Element): Partial<ListItem> {
  const links = [...row.querySelectorAll<HTMLAnchorElement>('a[href]')];
  const url = links.map(a => postUrl(a.getAttribute('href'), row.ownerDocument.location?.href)).find(Boolean);
  const images = [...row.querySelectorAll<HTMLImageElement>('img')].filter(img => !/profile|avatar/i.test(img.alt) && !img.closest('a[href*="profile.php"]'));
  const image = images.filter(i => (i.width || i.getBoundingClientRect().width || i.naturalWidth) >= 80).sort((a,b) => (b.naturalWidth || b.width) - (a.naturalWidth || a.width))[0];
  const poster = row.querySelector<HTMLVideoElement>('video[poster]')?.poster;
  return { url, thumbnail: mediaUrl(poster || image?.currentSrc || image?.src) };
}

/** Read visible post content, never execute a platform's embeds in the dashboard. */
export function postPreview(doc: Document): Partial<ListItem> {
  const article = doc.querySelector('[role="article"], article');
  const text = article?.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"], [dir="auto"]')?.textContent?.trim().slice(0, 2000);
  const media = article ? rowMedia(article) : {};
  const ogImage = doc.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;
  const description = doc.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content;
  return { thumbnail: media.thumbnail || mediaUrl(ogImage), postText: text || description?.slice(0, 2000), previewChecked: true };
}
