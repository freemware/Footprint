import type { CheckArea } from '../../src/platforms/types';
import type { FailReason } from '../../src/shared/types';

declare const __APP_URL__: string | undefined;
/** The Footprint web app: look inside a data download, and get Pro. */
export const APP_URL = typeof __APP_URL__ === 'string' ? __APP_URL__ : 'https://claude.ai/artifact/Evhotzt7jLYS5CH7vRYTsf';

/** All wording for the extension's screens, in one place for translation later. */
export const C = {
  brand: 'Footprint',
  promise: 'Runs in this browser. Never sees your passwords. Changes only what you approve.',
  nav: { home: 'Your accounts', scan: 'Privacy scan', untag: 'Untag yourself', cleanup: 'Clean up old posts', autoscans: 'Autoscans', history: 'What Footprint changed', settings: 'Settings' },
  home: {
    title: 'Your accounts',
    lead: 'Footprint checks your privacy settings on each platform you’re signed in to in this browser, flags what’s open, and fixes what you approve.',
    available: 'Ready',
    coming: 'Coming soon',
    willCover: 'Will cover',
    neverScanned: 'Not scanned yet',
    openScan: 'Open scan',
    exportTitle: 'Want the full picture?',
    exportText: 'Download your data from Facebook and drop it into the Footprint app to see everything that’s been collected, not just your settings.',
    exportCta: 'Open the Footprint app',
  },
  scan: {
    title: 'Facebook privacy scan',
    lead: 'Footprint opens Facebook’s own settings pages in this browser, reads each setting, and lists what’s worth changing. Scanning only reads; nothing changes until you approve it.',
    scanNow: 'Scan now',
    scanAgain: 'Scan again',
    scanning: 'Scanning…',
    never: 'You haven’t scanned yet. It takes about a minute, and you need to be signed in to Facebook in this browser.',
    last: (when: string) => `Last scanned ${when}`,
    summary: (risk: number, ok: number, unknown: number) =>
      [risk ? `${risk} ${risk === 1 ? 'setting needs' : 'settings need'} attention` : 'Nothing needs attention', ok ? `${ok} already private` : '', unknown ? `${unknown} couldn’t be read` : ''].filter(Boolean).join(' · '),
    needs: 'Needs attention',
    needsHint: 'These are open right now. Choose the ones to fix, or follow the steps yourself.',
    fine: 'Already private',
    unknown: 'Couldn’t read',
    unknownHint: 'Facebook may have moved these. Follow the steps, and send a problem report so we can update Footprint.',
    now: 'Now',
    to: 'Change to',
    fixOne: 'Fix this',
    fixSelected: (n: number) => `Fix ${n} selected`,
    fixAll: (n: number) => (n === 1 ? 'Fix it' : `Fix all ${n}`),
    selectAll: 'Select all',
    manualOnly: 'You do this one',
    manualOnlyHint: 'This needs your phone, so Footprint shows you how instead of doing it.',
    howTo: 'Show me how',
    hide: 'Hide steps',
    openSetting: 'Open this setting on Facebook',
    why: 'Why it matters',
    limits: 'What this does and doesn’t do',
    signedOut: 'You’re signed out of Facebook in this browser. Sign in, then scan again.',
    openFacebook: 'Open Facebook',
    securityCheck: 'Facebook asked for a security check, so Footprint stopped. Finish it on Facebook, wait a little, then scan again.',
    autoscanNote: 'From an autoscan',
  },
  approve: {
    title: (n: number) => `Approve ${n} ${n === 1 ? 'change' : 'changes'}`,
    lead: 'Footprint will open Facebook in a tab, make exactly these changes, and then check each one took. Nothing else changes.',
    confirm: (n: number) => `Approve and make ${n === 1 ? 'this change' : `${n} changes`}`,
    cancel: 'Cancel',
    stopAnytime: 'You can stop at any time. Footprint never sees your password.',
  },
  job: {
    stop: 'Stop',
    working: 'Working in a Facebook tab',
    running: 'Working',
    done: 'Finished',
    failed: 'Stopped',
    cancelled: 'Stopped',
  },
  untag: {
    title: 'Untag yourself',
    lead: 'Find posts and photos you’re tagged in, choose the ones you don’t want your name on, and Footprint removes your tag.',
    which: 'Look through',
    find: 'Find them',
    finding: 'Looking…',
    none: 'Nothing found here. You may not be tagged in anything, or Facebook may show this list differently.',
    found: (n: number) => `${n} found. Tick the ones to untag.`,
    act: (n: number) => `Remove my tag from ${n}`,
    confirmTitle: (n: number) => `Remove your tag from ${n} ${n === 1 ? 'item' : 'items'}?`,
    confirmText: 'Your name comes off these posts and photos. The posts stay on the other person’s profile, and this can’t be undone from Footprint.',
    limit: (n: number) => `Up to ${n} at a time, to stay inside Facebook’s limits.`,
  },
  cleanup: {
    title: 'Clean up old posts',
    lead: 'List your posts, pick old or unwanted ones, and Footprint moves them to Facebook’s trash. They stay recoverable for 30 days.',
    find: 'Find my posts',
    finding: 'Looking…',
    none: 'No posts found. Facebook may show this list differently; send a problem report so we can fix it.',
    olderThan: 'Select posts from before',
    selectOlder: 'Select',
    act: (n: number) => `Move ${n} to trash`,
    confirmTitle: (n: number) => `Move ${n} ${n === 1 ? 'post' : 'posts'} to trash?`,
    confirmText: 'They disappear from your profile now. You can restore them from Facebook’s Trash for 30 days, after which Facebook deletes them. Copies others shared or saved stay where they are.',
    noDate: 'No date shown',
  },
  autoscans: {
    title: 'Autoscans',
    lead: 'Footprint re-checks your settings on a schedule and tells you if anything opens up again, for example after a Facebook update. It only reads; changes still wait for your approval.',
    toggle: 'Scan automatically',
    weekly: 'Every week',
    monthly: 'Every month',
    next: (when: string) => `Next scan ${when}`,
    lastRun: (when: string) => `Last autoscan ${when}`,
    how: [
      'Runs while this browser is open and you’re signed in to the platform.',
      'Opens Facebook’s settings in a background tab, reads them, and closes it.',
      'New risks show on the Footprint button in your toolbar, and as a notification in Chrome and Edge.',
      'If your browser was closed when it was due, it runs shortly after you open it.',
    ],
  },
  history: {
    title: 'What Footprint changed',
    lead: 'Every change Footprint made for you, kept only in this browser.',
    none: 'Nothing yet.',
  },
  settings: {
    title: 'Settings',
    watch: 'Show the Facebook tab while Footprint works',
    watchHint: 'On: you can watch every click. Off: changes run in a background tab. Autoscans always run in the background.',
    proTitle: 'Footprint Pro',
    proOn: 'Pro is active in this browser.',
    proOff: 'Scans and step-by-step instructions are free. Pro adds one-click fixes, untagging, post clean-up and autoscans.',
    keyLabel: 'Paste your license key',
    activate: 'Activate',
    bad: 'That key didn’t work. Copy it again in full, from FP1 to the end.',
    getPro: 'Get Pro in the Footprint app',
    remove: 'Remove license',
    deleteTitle: 'Delete all Footprint data',
    deleteText: 'Removes scan results, history, settings and your license key from this browser.',
    deleteCta: 'Delete everything',
    deleteConfirm: 'Delete all Footprint data in this browser?',
    privacyTitle: 'How Footprint handles your accounts',
    privacy: [
      'It uses the sign-ins already in this browser. It never asks for, sees or stores your passwords.',
      'It only opens platform pages when you start a scan, approve a change, or turn on autoscans.',
      'Everything it reads stays in this browser. The extension’s own pages can’t connect to the internet at all.',
      'It only changes what you approve, then checks each change took.',
    ],
    terms: 'Platforms don’t officially support tools that act on your account for you. Footprint goes slowly and stops at any security check, but use it at your own judgement.',
  },
  pro: {
    title: 'A Footprint Pro feature',
    text: 'One-click fixes, untagging, post clean-up and autoscans are part of Pro. Scans and instructions stay free.',
    cta: 'Get Pro',
    have: 'I have a key',
  },
  problem: {
    title: 'Problem report',
    text: 'Facebook’s page didn’t look as Footprint expected. This report lists only the page’s button and menu labels, never your posts, names or messages. Copy it and send it to us.',
    copy: 'Copy report',
    copied: 'Copied',
  },
  area: {
    security: 'Security',
    visibility: 'Who can see and find you',
    tracking: 'Tracking by other businesses',
    ads: 'Ads',
    tagging: 'Tagging',
  } satisfies Record<CheckArea, string>,
  reason: {
    restricted: "This account requires manual review.",
    not_found: 'The page didn’t show what Footprint looks for.',
    unreadable: 'The setting wasn’t on the page where Footprint expected it.',
    signed_out: 'You’re signed out.',
    security_check: 'Facebook asked for a security check.',
    cancelled: 'Stopped.',
    error: 'Something went wrong on the page.',
  } satisfies Record<FailReason, string>,
};

export function ago(at: number | undefined, now = Date.now()): string {
  if (!at) return 'never';
  const m = Math.round((now - at) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export function when(at: number | undefined): string {
  if (!at) return 'not scheduled';
  return new Date(at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
