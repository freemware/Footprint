/**
 * Which platforms let people download their data, and how well each export works with Footprint.
 * Steps checked October 2026 against recent guides; platforms change menus often, so re-check
 * before release. Only Facebook is supported today; the rest are planned, in this order.
 */
export type PlatformStatus = 'available' | 'next' | 'planned';

export interface PlatformInfo {
  id: 'facebook' | 'instagram' | 'tiktok' | 'x' | 'youtube';
  name: string;
  status: PlatformStatus;
  /** 1–5: how much Footprint can show and advise from this platform's export. */
  depth: number;
  depthLabel: string;
  steps: string[];
  choose: string[];
  arrives: string;
  shows: string[];
  note?: string;
}

export const PLATFORMS: PlatformInfo[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    status: 'available',
    depth: 5,
    depthLabel: 'Works best',
    steps: [
      'Open Menu → Settings & privacy → Settings → Accounts Center.',
      'Choose Your information and permissions → Download your information.',
      'Choose Download or transfer information, pick your Facebook profile, then All available information.',
      'Choose Download to device, set the options below, and Create files.',
    ],
    choose: ['Format: JSON', 'Date range: All time', 'Media quality: Low (faster)'],
    arrives: 'Usually within hours; large accounts can take a few days. Facebook emails you.',
    shows: [
      'Every business that has your information',
      'Apps and websites reporting on you',
      'Logins, devices and places',
      'Messages, photos and what they reveal',
      'Your current privacy settings, for a full privacy plan',
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    status: 'available',
    depth: 4,
    depthLabel: 'Very good',
    steps: [
      'Open your profile → Menu → Accounts Center.',
      'Choose Your information and permissions → Download your information.',
      'Pick your Instagram profile, then All available information → Download to device.',
    ],
    choose: ['Format: JSON', 'Date range: All time'],
    arrives: 'Usually within hours to a few days.',
    shows: [
      'Businesses with your information, and the ads and posts it logged you seeing',
      'Every story, video and post Instagram recorded you watching',
      'Websites you opened inside the app',
      'Followers, messages, logins and devices',
      'A privacy plan from your settings',
    ],
    note: 'Drop the ZIP on the start screen, the same way as a Facebook download.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    status: 'planned',
    depth: 4,
    depthLabel: 'Very good',
    steps: [
      'Open Profile → Menu → Settings and privacy.',
      'Choose Privacy → Personalization and data → Download your data.',
      'Select all categories, choose JSON, and request the file.',
      'Download it from the link within four days of it arriving.',
    ],
    choose: ['Format: JSON (TXT leaves out most history)', 'All categories, including messages'],
    arrives: 'Usually one to four days.',
    shows: ['Watch and search history', 'Login history and devices', 'Advertising IDs and ad interactions', 'Likes, comments and messages'],
    note: 'Your own videos aren’t included, only links to them.',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    status: 'planned',
    depth: 3,
    depthLabel: 'Good',
    steps: [
      'Open Settings and privacy → Your account → Download an archive of your data.',
      'Confirm your password and the code X sends you.',
      'Choose Request archive, then download it when X notifies you.',
    ],
    choose: ['The full archive (there are no format options)'],
    arrives: 'Often about a day, sometimes longer.',
    shows: ['Your posts and likes', 'Login IP addresses and connected apps', 'Interests and ad data X uses', 'Followers and who you follow'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    status: 'planned',
    depth: 2,
    depthLabel: 'Basic',
    steps: [
      'Go to Google Takeout and choose Deselect all.',
      'Tick YouTube and YouTube Music, then open Multiple formats and set history to JSON.',
      'Choose Next step → Create export, and download every part within about a week.',
    ],
    choose: ['History format: JSON', 'File type: ZIP'],
    arrives: 'Hours to a few days, depending on size.',
    shows: ['Every video you watched', 'Every search you made', 'Subscriptions and your comments'],
    note: 'Google keeps ad settings in My Ad Center, not in this export, so the plan focuses on history.',
  },
];

export const platformsCopy = {
  title: 'Which platforms work with Footprint',
  lead: 'Most big platforms let you download a copy of what they keep. Some exports show far more than others. Here’s what works today, what’s coming, and exactly how to get each one.',
  freeNote: 'Your first platform is free. Adding more is part of Footprint Pro.',
  status: { available: 'Available now', next: 'Coming next', planned: 'Planned' },
  depth: 'How much Footprint can show',
  how: 'How to get it',
  choose: 'Choose',
  arrives: 'Arrives',
  shows: 'What you’ll see',
  tipsTitle: 'For the best results with any platform',
  tips: [
    'Pick JSON whenever there’s a choice. It’s the format Footprint reads in full.',
    'Choose “All time” and all categories, so nothing is missing from your plan.',
    'Low media quality is fine and arrives faster, unless you want to see your photos.',
    'Download links expire after a few days, so save the file when the email arrives.',
  ],
  start: 'Start with Facebook',
  pro: 'Pro',
  checked: 'Steps checked October 2026',
};
