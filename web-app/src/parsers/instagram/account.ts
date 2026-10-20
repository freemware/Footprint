import { fieldsToLines, fieldText, firstTime, type Field } from '../../importer/fields';
import { str } from '../../importer/text';
import { firstMs } from '../../importer/time';
import type { Fact, SettingState } from '../../model/types';
import { IG, IG_ACTIVITY_TYPES, IG_SETTING_LABELS } from '../labels';
import { toBool } from '../settings';
import type { EventInput, Parser } from '../types';
import { deviceLabel } from '../userAgent';
import { isObj, objs, recordTime, records, type Obj } from '../util';
import { fieldsOf, igPath, ownText, smd, smdLines } from './shared';

/**
 * personal_information and security_and_login_information: your profile, what Instagram worked
 * out about you, the devices it recorded, logins, privacy changes and your last known location.
 */

const SENSITIVE = /email|phone|birth|address|zip|postal|device id|cookie|ip\b|name|username|website|bio|card|city|state|country|local|national|area code/i;
const setting = (id: string, label: string, raw: string, source: string): SettingState | undefined => {
  const value = toBool(raw);
  return value === undefined ? undefined : { id, label, value, raw, source };
};

/** string_map_data → profile facts, plus any recognised settings (Private Account …). */
function profileFacts(r: Obj, source: string, prefix = '', settingPrefix = '') {
  const facts: Fact[] = [];
  const settings: Record<string, SettingState> = {};
  if (!isObj(r.string_map_data)) return { facts, settings };
  for (const [label, v] of Object.entries(r.string_map_data)) {
    if (!isObj(v)) continue;
    const text = str(v.value) ?? str(v.href);
    const time = firstMs(v.timestamp);
    if (text) facts.push({ group: 'profile', label: `${prefix}${label}`, value: text, sensitive: SENSITIVE.test(label), source });
    else if (time !== undefined) facts.push({ group: 'profile', label: `${prefix}${label}`, value: new Date(time).toISOString().slice(0, 10), time, source });
    for (const [id, labels] of Object.entries(IG_SETTING_LABELS))
      if (labels.includes(label) && text) {
        const s = setting(`${settingPrefix}${id}`, `${prefix}${label}`, text, source);
        if (s) settings[s.id] = s;
      }
  }
  return { facts, settings };
}

/** personal_information.json (Instagram) and threads/personal_information.json (Threads). */
export const igProfileParser: Parser = {
  id: 'ig_profile',
  label: 'Profile information',
  category: 'profile',
  match: igPath(/(personal_information\/personal_information\/personal_information|your_instagram_activity\/threads\/personal_information)(_\d+)?\.json$/),
  parse(json, ctx) {
    const threads = /threads\//.test(ctx.path);
    const facts: Fact[] = [];
    const settings: Record<string, SettingState> = {};
    let owner: string | undefined;
    const recs = records(json);
    for (const r of recs) {
      const out = profileFacts(r, ctx.path, threads ? 'Threads › ' : '', threads ? 'threads_' : '');
      facts.push(...out.facts);
      Object.assign(settings, out.settings);
      if (!threads) owner ??= smd(r, 'Name').text;
    }
    return { collections: { facts, settings, ...(owner ? { owner } : {}) }, records: recs.length };
  },
};

/** instagram_profile_information.json: account details over time, and the contact-syncing setting. */
export const igAccountInfoParser: Parser = {
  id: 'ig_account_info',
  label: 'Account information',
  category: 'profile',
  match: igPath(/personal_information\/personal_information\/instagram_profile_information(_\d+)?\.json$/),
  parse(json, ctx) {
    const facts: Fact[] = [];
    const settings: Record<string, SettingState> = {};
    const recs = records(json);
    for (const r of recs) {
      for (const f of fieldsOf(r)) {
        if (!f.label) continue;
        if (f.text !== undefined) facts.push({ group: 'security', label: f.label, value: f.text, sensitive: SENSITIVE.test(f.label), source: ctx.path });
        else if (f.time !== undefined) facts.push({ group: 'security', label: f.label, value: new Date(f.time).toISOString().slice(0, 10), time: f.time, source: ctx.path });
        for (const [id, labels] of Object.entries(IG_SETTING_LABELS))
          if (labels.includes(f.label) && f.text) {
            const s = setting(id, f.label, f.text, ctx.path);
            if (s) settings[id] = s;
          }
      }
    }
    return { collections: { facts, settings }, records: recs.length };
  },
};

/** profile_changes.json: each change to your name, bio, email … The old and new values stay in the details. */
export const igProfileChangesParser: Parser = {
  id: 'ig_profile_changes',
  label: 'Profile changes',
  category: 'profile',
  match: igPath(/personal_information\/personal_information\/profile_changes(_\d+)?\.json$/),
  parse(json) {
    const recs = records(json);
    const events: EventInput[] = [];
    for (const r of recs) {
      const timestamp = smd(r, 'Change date').time ?? recordTime(r);
      if (timestamp === undefined) continue;
      const what = smd(r, 'Changed').text;
      events.push({ type: 'profile_changed', category: 'profile', timestamp, title: what ? `Changed your ${what.toLowerCase()}` : 'Changed your profile', details: smdLines(r) });
    }
    return { events, records: recs.length };
  },
};

/** Autofill and checkout details Instagram keeps for forms and shopping. Every value is personal. */
export const igAutofillParser: Parser = {
  id: 'ig_autofill',
  label: 'Autofill and payment details',
  category: 'profile',
  match: igPath(/(autofill_information\/autofill_information|shopping\/checkout_payment_information)(_\d+)?\.json$/),
  parse(json, ctx) {
    const prefix = /checkout/.test(ctx.path) ? 'Checkout › ' : 'Autofill › ';
    const facts: Fact[] = [];
    const recs = records(json);
    for (const r of recs)
      for (const [label, value] of fieldsToLines(fieldsOf(r)))
        if (label && !/time$/i.test(label)) facts.push({ group: 'profile', label: `${prefix}${label}`, value, sensitive: true, source: ctx.path });
    return { collections: { facts }, records: recs.length };
  },
};

/** What Instagram worked out about you: places of interest, where your profile is based, interest categories. */
export const igInferencesParser: Parser = {
  id: 'ig_inferences',
  label: 'What Instagram inferred about you',
  category: 'profile',
  match: igPath(/(information_about_you\/(locations_of_interest|profile_based_in)|your_instagram_activity\/ai\/interest_categories)(_\d+)?\.json$/),
  parse(json, ctx) {
    const facts: Fact[] = [];
    const recs = records(json);
    const push = (label: string, value: string, time?: number) => facts.push({ group: 'inference', label, value, time, source: ctx.path });
    for (const r of recs) {
      const f = fieldsOf(r);
      for (const x of f) {
        if (x.items) x.items.forEach((it) => it.text && push(x.label, it.text));
        else if (x.children) {
          const place = x.children.map((c) => c.text).filter(Boolean).reverse().join(', ');
          if (place) push(x.label, place);
        } else if (x.text) push(x.label, x.text, firstTime(f));
      }
    }
    return { collections: { facts }, records: recs.length };
  },
};

/** device_camera_effects_support.json: one record per device, each with a device ID. */
export const igDevicesParser: Parser = {
  id: 'ig_devices',
  label: 'Devices recorded',
  category: 'profile',
  match: igPath(/device_information\/[^/]+\.json$/),
  parse(json, ctx) {
    const ids = new Set<string>();
    const recs = records(json);
    for (const r of recs) {
      const id = fieldText(fieldsOf(r), IG.deviceId);
      if (id) ids.add(id);
    }
    const facts: Fact[] = [...ids].map((value) => ({ group: 'device', label: 'Device ID', value, sensitive: true, source: ctx.path }));
    return { collections: { facts }, records: recs.length };
  },
};

const LOGIN_TITLES: Record<string, string> = { login: 'Login', logout: 'Logout', privacy_changed: 'Account privacy changed' };

/** login_activity.json, profile_activity.json and profile_privacy_changes.json. */
export const igSecurityParser: Parser = {
  id: 'ig_security',
  label: 'Logins and account activity',
  category: 'security',
  match: igPath(/login_and_profile_creation\/(login_activity|logout_activity|profile_activity|profile_privacy_changes|password_change_activity)(_\d+)?\.json$/),
  parse(json, ctx) {
    const recs = records(json);
    const events: EventInput[] = [];
    const file = ctx.path.split('/').pop()!;
    for (const r of recs) {
      if (Array.isArray(r.label_values)) {
        // profile_activity: { Type, IP address, User Agent, Device ID, Last Login, Details … }
        const f: Field[] = fieldsOf(r);
        const timestamp = recordTime(r) ?? firstTime(f);
        if (timestamp === undefined) continue;
        const kind = ownText(f, IG.type);
        const type = (kind && IG_ACTIVITY_TYPES[kind.trim().toLowerCase()]) ?? 'account_activity';
        const ua = ownText(f, IG.userAgent);
        const ip = ownText(f, IG.ip);
        events.push({ type, category: 'security', timestamp, title: kind ?? LOGIN_TITLES[type] ?? 'Account activity', device: deviceLabel(ua), location: ip ? { ip } : undefined, details: fieldsToLines(f), meta: { action: kind ?? type, ...(type === 'privacy_changed' ? { dedupe: 'ig-privacy', weakTitle: true } : {}) } });
      } else if (Array.isArray(r.string_list_data)) {
        // profile_privacy_changes: { title: "Switched to Private", string_list_data: [ { timestamp } ] }
        const timestamp = firstMs(objs(r.string_list_data)[0]?.timestamp) ?? recordTime(r);
        if (timestamp === undefined) continue;
        events.push({ type: 'privacy_changed', category: 'security', timestamp, title: str(r.title) ?? 'Account privacy changed', details: smdLines(r), meta: { dedupe: 'ig-privacy' } });
      } else {
        // login_activity: { title: ISO time, string_map_data: { IP Address, Time, User Agent, Cookie Name … } }
        const timestamp = smd(r, 'Time').time ?? firstMs(Date.parse(str(r.title) ?? '')) ?? recordTime(r);
        if (timestamp === undefined) continue;
        const type = /logout/.test(file) ? 'logout' : /password/.test(file) ? 'password_changed' : 'login';
        const ip = smd(r, 'IP Address').text;
        events.push({ type, category: 'security', timestamp, title: LOGIN_TITLES[type] ?? 'Password changed', device: deviceLabel(smd(r, 'User Agent').text), location: ip ? { ip } : undefined, details: smdLines(r) });
      }
    }
    return { events, records: recs.length };
  },
};

/** last_known_location.json and signup_details.json: the location Instagram last stored, and when you joined. */
export const igLocationParser: Parser = {
  id: 'ig_location',
  label: 'Last known location and sign-up',
  category: 'location',
  match: igPath(/login_and_profile_creation\/(last_known_location|signup_details)(_\d+)?\.json$/),
  parse(json, ctx) {
    const recs = records(json);
    if (/signup/.test(ctx.path)) {
      const t = recs.map((r) => smd(r, 'Time').time).find((x) => x !== undefined);
      return { collections: t ? { accountCreated: t } : {}, records: recs.length };
    }
    for (const r of recs) {
      const num = (k: string) => {
        const v = Number(smd(r, k).text);
        return Number.isFinite(v) && v !== 0 ? v : undefined;
      };
      const lat = num('Precise Latitude') ?? num('Imprecise Latitude');
      const lng = num('Precise Longitude') ?? num('Imprecise Longitude');
      if (lat === undefined || lng === undefined) continue;
      const precise = num('Precise Latitude') !== undefined;
      return {
        collections: {
          lastLocation: { lat, lng, time: smd(r, 'GPS Time Uploaded').time },
          facts: [{ group: 'location', label: precise ? 'Last known location (precise)' : 'Last known location (approximate)', value: `${lat.toFixed(3)}, ${lng.toFixed(3)}`, sensitive: true, source: ctx.path }],
        },
        records: recs.length,
      };
    }
    return { records: recs.length };
  },
};

export const instagramAccountParsers = [igProfileParser, igAccountInfoParser, igProfileChangesParser, igAutofillParser, igInferencesParser, igDevicesParser, igSecurityParser, igLocationParser];
