/**
 * All user-facing interface text lives here so the app can be translated later.
 * Components import `t` and never hard-code English strings.
 */
import { byPlatform } from './platform';

const FB_STRINGS = {
  app: {
    name: 'Footprint',
    tagline: 'your social media privacy assistant',
    notAffiliated: 'Not affiliated with Meta',
  },
  topbar: {
    privacy: 'Local only',
    bytesUploaded: '0 bytes uploaded',
    privacyTooltip:
      'Your export is read inside this browser tab. Nothing is uploaded, and the app blocks connections to other servers.',
    search: 'Search',
    allTime: 'All time',
    themeToDark: 'Switch to dark theme',
    themeToLight: 'Switch to light theme',
    resetLayout: 'Reset layout',
    sampleOn: 'Demo data',
  },
  filters: {
    clearAll: 'Clear all',
    date: 'Date',
    category: 'Category',
    person: 'Person',
    country: 'Country',
    device: 'Device',
    remove: 'Remove filter',
  },
  nav: {
    overview: 'Command center',
    ads: 'Ads',
    connections: 'Connections',
    activity: 'Your activity',
    messages: 'Messages',
    profile: 'Personal info',
    security: 'Security & login',
    location: 'Location',
    media: 'Media',
    raw: 'Raw data',
  },
  groups: {
    messages: 'Messages',
    ads: 'Ads & tracking',
    social: 'Likes & comments',
    posts: 'Posts & photos',
    communities: 'Friends, groups & pages',
    search: 'Searches & browsing',
    security: 'Logins & security',
    other: 'Other logged activity',
  },
  groupsShort: {
    messages: 'Message',
    ads: 'Ads',
    social: 'Social',
    posts: 'Posts',
    communities: 'Groups',
    search: 'Search',
    security: 'Security',
    other: 'Logged',
  },
  panels: {
    kpi: 'Key figures',
    pulse: 'Activity pulse',
    heatmap: 'Activity heatmap',
    map: 'Login map',
    security: 'Security status',
    ads: 'Ad exposure',
    graph: 'Social graph',
    contacts: 'Top contacts',
    feed: 'Event feed',
    media: 'Media',
    footprint: 'Data footprint',
    timeline: 'Master timeline',
  },
  kpi: {
    friends: 'Friends',
    posts: 'Posts',
    messages: 'Messages',
    reactions: 'Reactions',
    advertisers: 'Advertisers',
    logins: 'Logins',
    accountAge: 'Account age',
    years: 'yrs',
    vsPrior: 'vs prior year',
  },
  panel: {
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    drag: 'Drag to move',
    open: 'Open details',
  },
  empty: {
    noData: 'No data loaded',
    importHint: 'Import your Facebook or Instagram download to fill this panel.',
    noMatch: 'Nothing matches the current filters',
    comingSoon: 'Coming in a later milestone',
  },
  inspector: {
    title: 'Details',
    close: 'Close',
    records: 'records',
    nothing: 'Click any number, bar or point to see the records behind it.',
    source: 'Source file',
  },
  timeline: {
    hint: 'Drag across the timeline to filter every panel to that period',
    events: 'events',
  },
  demo: {
    banner: 'You’re exploring the demo. Everything here belongs to an invented person, so nothing is about you.',
    useYours: 'Use your own export',
  },
  importer: {
    title: 'Import your Facebook or Instagram data',
    lead: 'Drop the ZIP file Facebook or Instagram sent you. It is opened right here in your browser. Nothing is uploaded.',
    drop: 'Drop your export here',
    dropHint: 'ZIP file(s), an unzipped folder, or individual JSON files',
    chooseFiles: 'Choose ZIP or JSON files',
    chooseFolder: 'Choose a folder',
    trySample: 'Explore the demo',
    demoTitle: 'No export yet? Try it with an example',
    demoText: 'The demo is an invented person’s Facebook data, so you can see every tab and the privacy plan before downloading your own.',
    howTitle: 'Getting your export',
    howSteps: [
      'Facebook → Settings → Accounts Center → Your information and permissions → Download your information',
      'Choose "Download to device" and select all your information',
      'Date range: All time · Format: JSON (not HTML) · Media quality: any',
      'When Facebook emails you, download the ZIP and drop it here',
    ],
    phase: {
      listing: 'Opening files',
      reading: 'Reading and repairing text',
      parsing: 'Building your timeline',
      done: 'Finishing',
    },
    summaryTitle: 'Import complete',
    files: 'files',
    jsonFiles: 'JSON files',
    understood: 'fully understood',
    timelineOnly: 'added to timeline only',
    keptRaw: 'kept for the raw view',
    mediaFiles: 'photos & videos',
    events: 'timeline events',
    advertisers: 'advertiser entries',
    interests: 'ad interests',
    facts: 'facts about you',
    covering: 'covering',
    took: 'Read in',
    openDashboard: 'Open the command center',
    openRaw: 'Explore raw files',
    importAnother: 'Import a different export',
    unload: 'Remove from this tab',
    unloadHint: 'Clears the export from memory. Your files on disk are not touched.',
    errorTitle: 'Some files could not be read',
    failed: 'The import failed',
    warnings: {
      html_export:
        'This download is in HTML format, which this tool cannot read. Request a new download and choose Format: JSON.',
      instagram_export:
        'This looks like an Instagram download.',
      not_facebook:
        "None of these files look like a Facebook or Instagram download. Make sure you dropped the ZIP they sent you (it contains folders like 'your_facebook_activity' or 'your_instagram_activity').",
      no_json: 'No JSON files were found. Make sure you dropped the export ZIP or its unzipped folder.',
      parse_errors: 'Some files could not be read and were skipped. Everything else imported normally.',
    },
  },
  raw: {
    title: 'Raw data',
    search: 'Filter files…',
    showMedia: 'Show photos & videos',
    pick: 'Pick a file to see exactly what was stored in it.',
    unavailable: 'Raw files are available after importing a real export.',
    parsed: 'Understood',
    generic: 'Timeline only',
    unparsed: 'Raw only',
    error: 'Unreadable',
    records: 'records',
    events: 'events',
    showEvents: 'Show its events',
    loading: 'Loading…',
    more: 'more',
    showMore: 'Show more',
    expandAll: 'Expand',
    collapseAll: 'Collapse',
  },
  sources: {
    export: 'Export',
    close: 'Close this export',
    import: 'Import',
  },
  phone: {
    title: 'Best on a larger screen',
    body: 'This dashboard is designed for desktop and tablet. On a phone, some panels will be cramped.',
    continue: 'Continue anyway',
  },
} as const;

/** Interface wording, for the platform on screen. */
export const strings = byPlatform<typeof FB_STRINGS>(FB_STRINGS, {
  instagram: {
    groups: { communities: 'Followers & following', posts: 'Posts & stories', search: 'Searches & viewing' },
  },
});
export const t = strings;

export const fmt = {
  number: (n: number) => new Intl.NumberFormat(undefined).format(n),
  bytes: (n: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: i ? 1 : 0 }).format(n)} ${units[i]}`;
  },
  compact: (n: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n),
  percent: (n: number) => new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 }).format(n),
  date: (ms: number) => new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(ms),
  month: (ms: number) => new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short' }).format(ms),
  /** Compact, sortable stamp for dense logs: 2024-03-09 18:04 (local time). */
  stamp: (ms: number) => {
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  },
  dateTime: (ms: number) =>
    new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(ms),
};
