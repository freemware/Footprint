/**
 * Normalized data model. Every parser turns Facebook's many file shapes into
 * these types. Panels only ever read these, never raw export JSON.
 * See section 5 of the project context file.
 */

export type Category =
  | 'ads'
  | 'off_meta'
  | 'connections'
  | 'posts'
  | 'comments'
  | 'reactions'
  | 'messages'
  | 'groups'
  | 'events'
  | 'pages'
  | 'search'
  | 'security'
  | 'location'
  | 'media'
  | 'profile'
  | 'other';

export type AnomalyFlag = 'new_country' | 'new_device' | 'spike' | 'large_upload' | 'inactivity_gap';

export interface EventLocation {
  lat?: number;
  lng?: number;
  country?: string;
  /** ISO 3166 two-letter code, when the export gives one. */
  countryCode?: string;
  region?: string;
  city?: string;
  ip?: string;
}

export interface ActivityEvent {
  id: string;
  /** Machine type, e.g. 'login', 'post', 'friend_added', 'message_sent'. Never localized text. */
  type: string;
  category: Category;
  /** Milliseconds since epoch. */
  timestamp: number;
  title?: string;
  text?: string;
  people?: string[];
  location?: EventLocation;
  device?: string;
  mediaUris?: string[];
  /** Path inside the export, for drill-down to the raw file. */
  sourceFile: string;
  /** Every field of the original record as "label: value" lines, for the inspector. */
  details?: [string, string][];
  /** Extra machine-readable attributes, e.g. { box: 'filtered_threads', reaction: 'like' }. */
  meta?: Record<string, string | number | boolean>;
  flags?: AnomalyFlag[];
}

export interface Person {
  name: string;
  friendSince?: number;
  messageCount: number;
  sentToThem: number;
  receivedFromThem: number;
  reactionCount: number;
  commentCount: number;
}

export interface Advertiser {
  name: string;
  /**
   * uploaded_list: uploaded or used a list (email/phone) that included you
   * activity: has data on your interactions with their website, app or store
   * other: listed in a section the importer doesn't recognize yet
   */
  source: 'uploaded_list' | 'activity' | 'other';
}

export interface OffMetaApp {
  name: string;
  events: number;
  byType: Record<string, number>;
  first?: number;
  last?: number;
}

export type FactGroup = 'profile' | 'inference' | 'device' | 'location' | 'security';

/** A single thing Facebook knows or has inferred, e.g. "Age group: 25-29". */
export interface Fact {
  group: FactGroup;
  label: string;
  value: string;
  /** Blur by default when screen sharing (emails, phones, IPs, IDs). */
  sensitive?: boolean;
  time?: number;
  source: string;
}

/** Who can see something, normalized from Facebook's localized audience names. */
export type Audience = 'public' | 'friends_of_friends' | 'friends' | 'only_me' | 'custom' | 'unknown';

/**
 * The current state of one account setting, as recorded in the export.
 * `id` is stable and language-independent (e.g. 'two_factor', 'lookup_email_phone');
 * settings whose label isn't recognized keep a 'raw:' or 'field:' id and their original text.
 */
export interface SettingState {
  id: string;
  /** The setting's name as written in the export (localized). */
  label: string;
  value: boolean | number | Audience | string;
  /** The value exactly as written in the export, for display. */
  raw: string;
  changedAt?: number;
  source: string;
}

/** An app or website the person logged into with Facebook. */
export interface ConnectedApp {
  name: string;
  /** Facebook's own status code: active, inactive (expired access) or removed. */
  status: 'active' | 'inactive' | 'removed' | 'other';
  added?: number;
}

/** Everything that isn't a timestamped event. */
export interface Collections {
  owner?: string;
  accountCreated?: number;
  advertisers: Advertiser[];
  adInterests: string[];
  adCategories: string[];
  offMetaApps: OffMetaApp[];
  facts: Fact[];
  lastLocation?: { lat: number; lng: number; time?: number };
  /** Current settings recorded in the export, by id. */
  settings: Record<string, SettingState>;
  connectedApps: ConnectedApp[];
  /** Privacy jurisdiction code, e.g. "US", "US_CA", "EU", "GB". */
  jurisdiction?: string;
}

export const emptyCollections = (): Collections => ({
  advertisers: [],
  adInterests: [],
  adCategories: [],
  offMetaApps: [],
  facts: [],
  settings: {},
  connectedApps: [],
});

export type FileKind = 'json' | 'media' | 'html' | 'other';

export interface ImportedFile {
  path: string;
  size: number;
  kind: FileKind;
  /** Parser id that handled it; 'generic' = timeline-only fallback; undefined = not parsed. */
  parser?: string;
  records?: number;
  events?: number;
  error?: string;
}

export type ImportWarning = 'html_export' | 'instagram_export' | 'not_facebook' | 'no_json' | 'parse_errors';

export interface MediaItem {
  uri: string;
  timestamp?: number;
  album?: string;
  kind: 'photo' | 'video' | 'audio' | 'file';
}

export interface ProfileInfo {
  [label: string]: string | string[] | undefined;
}

/** Which platform's download this is. Decided from the folder layout, never from text. */
export type Platform = 'facebook' | 'instagram';

export interface ExportSummary {
  /** Name of what was imported, e.g. the ZIP file name. */
  name?: string;
  platform?: Platform;
  fileCount: number;
  totalBytes: number;
  files: ImportedFile[];
  warnings: ImportWarning[];
  dateRange?: { start: number; end: number };
  durationMs?: number;
}

/** Global cross-filter state. Every panel derives its data from events filtered by this. */
export interface FilterState {
  dateRange?: [number, number];
  categories?: Category[];
  people?: string[];
  countries?: string[];
  devices?: string[];
  searchText?: string;
}
