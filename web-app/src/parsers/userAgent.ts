/**
 * Collapse a raw user-agent string into a short, stable device label such as
 * "Chrome on Windows" or "Facebook app on iPhone". Hundreds of distinct user-agent
 * versions collapse into a handful of labels, which makes devices filterable.
 */
export function deviceLabel(ua: string | undefined): string | undefined {
  if (!ua) return undefined;
  const os = /\bQuest\b/.test(ua)
    ? 'Meta Quest'
    : /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /CrOS/.test(ua)
            ? 'ChromeOS'
            : /Mac OS X|Macintosh/.test(ua)
              ? 'Mac'
              : /Linux/.test(ua)
                ? 'Linux'
                : undefined;
  const app = /\[FBAN\/(MessengerForiOS|Orca-Android|MessengerLite)|Messenger/.test(ua)
    ? 'Messenger app'
    : /FBAN|FBAV|FB4A|FBIOS|FB_IAB/.test(ua)
      ? 'Facebook app'
      : /Instagram/.test(ua)
        ? 'Instagram app'
        : /Edg\//.test(ua)
          ? 'Edge'
          : /OPR\/|Opera/.test(ua)
            ? 'Opera'
            : /SamsungBrowser/.test(ua)
              ? 'Samsung Internet'
              : /Firefox\/|FxiOS/.test(ua)
                ? 'Firefox'
                : /Chrome\/|CriOS/.test(ua)
                  ? 'Chrome'
                  : /Safari\//.test(ua)
                    ? 'Safari'
                    : undefined;
  if (app && os) return `${app} on ${os}`;
  return app ?? os ?? 'Other device';
}
