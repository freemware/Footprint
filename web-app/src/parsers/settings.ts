import { isLabelRecord, toFields, type Field } from '../importer/fields';
import { str } from '../importer/text';
import { toMs } from '../importer/time';
import type { Audience, Collections, ConnectedApp, SettingState } from '../model/types';
import { AUDIENCES, BOOLEANS, NOT_PROFILE_FIELDS, SETTING_LABELS } from './labels';
import { isObj, pathIs, records } from './util';

/**
 * Reads the files that record the account's *current settings* (privacy audiences,
 * two-factor, ad preferences, contact upload …). Runs on every file alongside the normal
 * parsers, so the same file can also feed facts or the raw view.
 *
 * Language: labels go through SETTING_LABELS; when a label isn't known the setting is kept
 * with its original text so it can still be shown, it just doesn't drive advice.
 */

const LABEL_TO_ID = new Map<string, string>();
for (const [id, labels] of Object.entries(SETTING_LABELS)) for (const l of labels) LABEL_TO_ID.set(l, id);

export const toAudience = (v: string | undefined): Audience | undefined =>
  v === undefined ? undefined : AUDIENCES[v.trim().toLowerCase()];
export const toBool = (v: unknown): boolean | undefined =>
  typeof v === 'boolean' ? v : typeof v === 'string' ? BOOLEANS[v.trim().toLowerCase()] : undefined;

function interpret(raw: string): SettingState['value'] {
  const b = toBool(raw);
  if (b !== undefined) return b;
  const a = toAudience(raw);
  if (a) return a;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

/** Settings files, recognized by path. Order matters only for readability. */
const FILES = {
  privacy: /(^|\/)privacy_settings(_\d+)?\.json$/,
  twoFactor: /(^|\/)two-factor_authentication(_\d+)?\.json$/,
  loginAlerts: /(^|\/)login_alerts_settings(_\d+)?\.json$/,
  adPrefs: /ads_information\/ad_preferences(_\d+)?\.json$/,
  adsOffMeta: /settings_for_ads_shown_outside_of_meta(_\d+)?\.json$/,
  offMeta: /your_activity_off_meta_technologies_settings(_\d+)?\.json$/,
  locationServices: /location_services_setting(_\d+)?\.json$/,
  jurisdiction: /your_privacy_jurisdiction(_\d+)?\.json$/,
  contacts: /contacts_sync_settings(_\d+)?\.json$/,
  consents: /other_logged_information\/consents(_\d+)?\.json$/,
  checkup: /your_privacy_checkup_interactions(_\d+)?\.json$/,
  connectedApps: /connected_apps_and_websites(_\d+)?\.json$/,
};

export const isSettingsFile = (path: string) => Object.values(FILES).some((re) => pathIs(path, re));

const flat = (fields: Field[]): Field[] => fields.flatMap((f) => [f, ...flat(f.children ?? [])]);

function fromFields(fields: Field[], source: string, out: Record<string, SettingState>, ownIds: readonly string[]) {
  const changedAt = fields.find((f) => f.time !== undefined)?.time;
  for (const f of flat(fields)) {
    if (f.text === undefined) continue;
    const id = LABEL_TO_ID.get(f.label);
    if (!id || !ownIds.includes(id)) continue;
    out[id] = { id, label: f.label, value: interpret(f.text), raw: f.text, changedAt, source };
  }
}

/** Ids each file may set, so a label shared by two files (e.g. "State") can't leak across. */
const IDS = (...prefixes: string[]) => Object.keys(SETTING_LABELS).filter((id) => prefixes.some((p) => id === p || id.startsWith(p)));

export function extractSettings(path: string, json: unknown): Partial<Collections> | undefined {
  const p = path.toLowerCase();
  const settings: Record<string, SettingState> = {};
  const label = (json: unknown) => (isLabelRecord(json) ? toFields(json.label_values) : []);

  if (FILES.privacy.test(p)) {
    // { label_values: [ { label: "Settings", dict: [ { label, value } … ] } ] }
    const fields = flat(label(json)).filter((f) => f.text !== undefined);
    const known = fields.filter((f) => LABEL_TO_ID.has(f.label)).length;
    for (const f of fields) {
      const id = LABEL_TO_ID.get(f.label);
      const value = interpret(f.text!);
      if (id) settings[id] = { id, label: f.label, value, raw: f.text!, source: path };
      // Only call the rest "profile details" when this file's language is understood.
      else if (known > 0 && !NOT_PROFILE_FIELDS.has(f.label) && !/\?$/.test(f.label) && toAudience(f.text))
        settings[`field:${f.label}`] = { id: `field:${f.label}`, label: f.label, value, raw: f.text!, source: path };
      else settings[`raw:${f.label}`] = { id: `raw:${f.label}`, label: f.label, value, raw: f.text!, source: path };
    }
  } else if (FILES.twoFactor.test(p)) {
    const fields = label(json);
    fromFields(fields, path, settings, ['two_factor']);
    // Unknown language: the state is the first yes/no-like value in the file.
    if (!settings.two_factor) {
      const f = fields.find((x) => x.text !== undefined && toBool(x.text) !== undefined);
      if (f) settings.two_factor = { id: 'two_factor', label: f.label, value: toBool(f.text)!, raw: f.text!, source: path };
    }
  } else if (FILES.loginAlerts.test(p)) fromFields(label(json), path, settings, ['login_alerts']);
  else if (FILES.adPrefs.test(p)) fromFields(label(json), path, settings, IDS('ad_optout_', 'daa_optout', 'gpc'));
  else if (FILES.adsOffMeta.test(p)) fromFields(label(json), path, settings, ['ads_off_meta_optout']);
  else if (FILES.offMeta.test(p)) fromFields(label(json), path, settings, ['off_meta_linked', 'off_meta_cleared']);
  else if (FILES.contacts.test(p)) fromFields(label(json), path, settings, ['contact_upload', 'contacts_permission']);
  else if (FILES.consents.test(p)) fromFields(label(json), path, settings, ['ad_partner_consent']);
  else if (FILES.locationServices.test(p)) {
    // { location_services_setting_v2: true } — keyed, so language-independent.
    const v = isObj(json) ? Object.entries(json).find(([k]) => /^location_services_setting/.test(k))?.[1] : undefined;
    const b = toBool(v);
    if (b !== undefined) settings.location_services = { id: 'location_services', label: 'Location services', value: b, raw: String(v), source: path };
  } else if (FILES.jurisdiction.test(p)) {
    // Codes like "US", "US_CA", "EU" are the same in every language; prefer the most specific.
    const codes = flat(label(json))
      .flatMap((f) => [f.text, ...(f.items ?? []).map((i) => i.text)])
      .filter((t): t is string => !!t && /^[A-Z]{2,3}(_[A-Z0-9]{1,4})?$/.test(t));
    const best = codes.sort((a, b) => b.length - a.length)[0];
    if (best) return { jurisdiction: best };
  } else if (FILES.checkup.test(p)) {
    const runs = records(json).filter(isLabelRecord);
    const finished = runs.map((r) => toFields(r.label_values).filter((f) => f.time !== undefined).pop()?.time).filter((t): t is number => t !== undefined);
    settings.privacy_checkup = {
      id: 'privacy_checkup',
      label: 'Privacy Checkup',
      value: runs.length,
      raw: String(runs.length),
      changedAt: finished.length ? Math.max(...finished) : undefined,
      source: path,
    };
  } else if (FILES.connectedApps.test(p)) {
    // { installed_apps_v2: [ { name, added_timestamp, category: "active" | "inactive" | "removed" } ] }
    const apps: ConnectedApp[] = [];
    for (const r of records(json, /^installed_apps(_v\d+)?$/)) {
      const name = str(r.name);
      if (!name) continue;
      const c = str(r.category)?.toLowerCase();
      apps.push({ name, status: c === 'active' || c === 'inactive' || c === 'removed' ? c : 'other', added: toMs(r.added_timestamp) });
    }
    return { connectedApps: apps };
  } else return undefined;

  return Object.keys(settings).length ? { settings } : undefined;
}

/** Apps grouped by name, keeping the most "alive" status (active > inactive > removed). */
export function currentApps(apps: ConnectedApp[]): ConnectedApp[] {
  const rank = { active: 3, inactive: 2, other: 1, removed: 0 } as const;
  const best = new Map<string, ConnectedApp>();
  for (const a of apps) {
    const prev = best.get(a.name);
    if (!prev || rank[a.status] > rank[prev.status]) best.set(a.name, a);
  }
  return [...best.values()].sort((a, b) => rank[b.status] - rank[a.status] || a.name.localeCompare(b.name));
}
