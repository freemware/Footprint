import type { Category } from '../model/types';

/**
 * Display groups. There are 16 data categories but only 8 colors that stay
 * distinguishable (including for color-blind users), so categories fold into
 * these 8 groups. Order matters: it was validated for color-blind separation
 * on both the dark and light panel surfaces. Do not reorder or add a 9th color.
 */
export type CategoryGroup =
  | 'messages'
  | 'ads'
  | 'social'
  | 'posts'
  | 'communities'
  | 'search'
  | 'security'
  | 'other';

export const GROUP_ORDER: CategoryGroup[] = [
  'messages',
  'ads',
  'social',
  'posts',
  'communities',
  'search',
  'security',
  'other',
];

export const CATEGORY_GROUP: Record<Category, CategoryGroup> = {
  messages: 'messages',
  ads: 'ads',
  off_meta: 'ads',
  connections: 'communities',
  comments: 'social',
  reactions: 'social',
  posts: 'posts',
  media: 'posts',
  groups: 'communities',
  events: 'communities',
  pages: 'communities',
  search: 'search',
  security: 'security',
  location: 'other',
  profile: 'other',
  other: 'other',
};

export type ThemeMode = 'dark' | 'light';

const GROUP_COLORS: Record<ThemeMode, Record<CategoryGroup, string>> = {
  dark: {
    messages: '#3987e5',
    ads: '#d95926',
    social: '#199e70',
    posts: '#c98500',
    communities: '#d55181',
    search: '#008300',
    security: '#9085e9',
    other: '#e66767',
  },
  light: {
    messages: '#2a78d6',
    ads: '#eb6834',
    social: '#1baf7a',
    posts: '#eda100',
    communities: '#e87ba4',
    search: '#008300',
    security: '#6250d6',
    other: '#e34948',
  },
};

export const groupColor = (group: CategoryGroup, mode: ThemeMode) => GROUP_COLORS[mode][group];

/**
 * Browsing that gets logged sits with searches: profiles and Marketplace items on Facebook;
 * stories, posts, videos and Threads posts you looked at, and websites you opened, on Instagram.
 */
const BROWSING = new Set(['item_viewed', 'profile_visit', 'story_viewed', 'post_viewed', 'video_watched', 'thread_post_viewed', 'link_visited']);
export const groupOf = (e: { category: Category; type: string }): CategoryGroup =>
  BROWSING.has(e.type) ? 'search' : CATEGORY_GROUP[e.category];
export const categoryColor = (category: Category, mode: ThemeMode) =>
  GROUP_COLORS[mode][CATEGORY_GROUP[category]];

/** Status colors are reserved for state (secure / warning / anomaly) and never used for a data series. */
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;
export type Status = keyof typeof STATUS;

/** Chrome colors the chart theme needs in JS. Kept in sync with src/styles/index.css. */
export const CHROME: Record<
  ThemeMode,
  { surface: string; text: string; text2: string; text3: string; border: string; grid: string; accent: string; tooltip: string }
> = {
  dark: {
    surface: '#171e2b',
    text: '#eef2f7',
    text2: '#aab5c6',
    text3: '#7a879c',
    border: '#263042',
    grid: '#222b3b',
    accent: '#8b98ff',
    tooltip: '#1f2837',
  },
  light: {
    surface: '#ffffff',
    text: '#131a26',
    text2: '#44506a',
    text3: '#66728a',
    border: '#dde2ea',
    grid: '#eceff4',
    accent: '#4352d4',
    tooltip: '#ffffff',
  },
};

/** Sequential single-hue ramp (blue), used for heatmaps and other magnitude encodings. */
export const SEQUENTIAL: Record<ThemeMode, string[]> = {
  dark: ['#1f2837', '#104281', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'],
  light: ['#f4f6fa', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95'],
};
