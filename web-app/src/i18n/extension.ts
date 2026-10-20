/** Wording for the browser extension's page in the app, and for the start screen's two paths. */
import { byPlatform } from './platform';

const FB_EXTENSION_COPY = {
  nav: 'Browser extension',
  title: 'Footprint for your browser',
  lead: 'The Footprint extension checks your privacy settings on the platforms you’re signed in to, flags what’s open, and fixes what you approve. It takes about a minute, and there’s nothing to download from Facebook first.',
  installed: (v: string) => `Installed (version ${v})`,
  open: 'Open the extension',
  install: 'Get the extension',
  features: [
    { id: 'scan', title: 'Privacy scan', text: 'Reads eleven Facebook settings, from who can find you by phone to activity from other businesses, and lists what’s open.', pro: false },
    { id: 'fix', title: 'Fix what you approve', text: 'See each change before and after, approve it, and the extension makes it, then checks it took.', pro: true },
    { id: 'untag', title: 'Untag yourself', text: 'Find posts and photos you’re tagged in, tick the ones you don’t want your name on, and remove your tag.', pro: true },
    { id: 'cleanup', title: 'Clean up old posts', text: 'Pick old posts by year and move them to Facebook’s trash, where they stay recoverable for 30 days.', pro: true },
    { id: 'autoscans', title: 'Autoscans', text: 'A weekly or monthly re-check that tells you when a setting opens up again, for example after a Facebook update.', pro: true },
  ],
  free: 'Free',
  pro: 'Pro',
  controlTitle: 'You stay in control',
  control: [
    'It uses the sign-ins already in your browser. It never asks for, sees or stores your passwords.',
    'It only opens platform pages when you start a scan, approve a change, or turn on autoscans.',
    'It shows every change before making it, and does nothing you haven’t approved.',
    'Everything it reads stays in your browser. Its own pages can’t connect to the internet at all.',
    'Every change is listed under “What Footprint changed”, and it stops at once if Facebook asks for a security check.',
    'When the Footprint app is open in the same browser, your privacy plan shows what the extension read, so each step says whether it was checked live or comes from your download. Only the settings’ values (like “Only me”) pass between them, inside your browser.',
  ],
  terms: 'Platforms don’t officially support tools that act on your account for you. Footprint goes slowly, makes only the changes you approve and stops at any security check, but use it at your own judgement.',
  installTitle: 'Install it',
  browsers: [
    {
      name: 'Chrome and Edge',
      steps: [
        'Download the extension and unzip it.',
        'Open chrome://extensions (or edge://extensions) and turn on Developer mode.',
        'Choose Load unpacked and pick the unzipped folder.',
        'Pin Footprint to your toolbar, then open it and choose Scan now.',
      ],
      note: 'A one-click install from the Chrome Web Store is on its way.',
    },
    {
      name: 'Safari (Mac)',
      steps: ['The Safari version is on its way to the Mac App Store.'],
      note: 'It’s the same extension, packaged for Safari.',
    },
  ],
  download: 'Download the extension',
  downloadSoon: 'The download appears here once Footprint is on its own website. Until then, ask for the test build.',
  platformsTitle: 'Platforms',
  platformsNow: 'Facebook works today. Instagram, LinkedIn, X, TikTok, Snapchat and Venmo are coming next.',
  /** Start screen */
  start: {
    title: 'Take back your privacy',
    lead: 'Footprint has two parts that answer two questions. Use either one, or both for the full picture.',
    scanTitle: 'What are my settings right now?',
    scanText: 'The browser extension reads your Facebook privacy settings on Facebook’s own pages, in about a minute. Free. With Pro it also makes the changes you approve.',
    scanBadge: 'Live',
    exportTitle: 'What has Facebook collected about me?',
    exportText: 'The data download Facebook gives you shows what it has stored: businesses with your information, tracking from other apps, logins and more. Facebook can take a few hours or days to prepare it, so scan your settings while you wait.',
    exportBadge: 'Full history',
    exportPrivacy: 'It opens right here in your browser; nothing is uploaded.',
    together: 'Use both, and your privacy plan combines them: every step says whether it was checked live or read from your download.',
    lastScan: (date: string, open: number) =>
      open === 0 ? `Last scan ${date}: nothing open in the settings it checked.` : `Last scan ${date}: ${open === 1 ? '1 setting is' : `${open} settings are`} open.`,
    lastScanSignedOut: (date: string) => `Last scan ${date} couldn’t see your account. Sign in to Facebook in this browser and scan again.`,
    seeResults: 'See the results',
  },
  plan: {
    fixWith: 'Let the extension do it',
    fixWithHint: 'The extension can check this setting and change it for you, after you approve.',
  },
  /** Where each answer in the plan came from, and the live-check strip above the plan. */
  live: {
    sourceLive: (date: string) => `Checked live · ${date}`,
    sourceLiveHint: 'The browser extension read this setting on Facebook’s own page.',
    sourceDownload: (date?: string) => (date ? `From your download · ${date}` : 'From your download'),
    sourceDownloadHint: 'Read from the data download Facebook gave you.',
    sourceNone: 'Not checked yet',
    sourceNoneHint: 'Your download doesn’t record this setting. Check it live with the extension, or look on Facebook.',
    sawTitle: 'What the extension saw',
    checkLive: 'Check it live',
    stripNoExtension: (n: number) =>
      `This plan is built from your data download, which shows what Facebook collected and how your settings were on the day it was made. The browser extension can check ${n === 1 ? 'one of these settings' : `${n} of these settings`} as they are right now.`,
    stripNoScan: (n: number) => `The extension is installed. Scan once to check ${n === 1 ? 'one of these settings' : `${n} of these settings`} as they are right now; the rest of the plan stays based on your download.`,
    stripRunning: 'Checking your settings on Facebook. The plan updates by itself when it’s done.',
    stripDone: (n: number, date: string) => `${n === 1 ? '1 setting' : `${n} settings`} checked live on ${date}. Everything else comes from your download.`,
    stripNoneMatched: (date: string) => `Your last scan (${date}) didn’t read any of the settings in this plan. Scan again, or check them on Facebook.`,
    stripSignedOut: 'The last scan couldn’t see your account. Sign in to Facebook in this browser, then scan again.',
    stripBusy: 'The extension is busy with another task. Try again when it’s finished.',
    scanNow: 'Scan now',
    scanAgain: 'Scan again',
    getExtension: 'Get the extension',
    scanning: 'Scanning…',
    /** Names of the extension's checks, for "What the extension saw". */
    checks: {
      two_factor: 'Two-factor authentication',
      login_alerts: 'Login alerts',
      future_posts: 'Who can see your future posts',
      lookup_phone: 'Who can look you up by phone number',
      lookup_email: 'Who can look you up by email address',
      friends_list: 'Who can see your friends list',
      friend_requests: 'Who can send you friend requests',
      other_businesses: 'Disconnect future activity from other businesses',
      ad_partners: 'Use activity from ad partners for ads',
    } as Record<string, string>,
    on: 'On',
    off: 'Off',
  },
};

/** The extension works on Facebook today, so on an Instagram plan "not checked" means "not in your download". */
export const extensionCopy = byPlatform<typeof FB_EXTENSION_COPY>(FB_EXTENSION_COPY, {
  instagram: {
    live: {
      sourceNone: 'Not in your download',
      sourceNoneHint: 'Your Instagram download doesn’t record this setting. Check it in Instagram.',
    },
  },
});
