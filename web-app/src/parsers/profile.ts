import { fieldsToLines, isLabelRecord, toFields } from '../importer/fields';
import { str } from '../importer/text';
import { toMs } from '../importer/time';
import type { Fact, FactGroup } from '../model/types';
import type { Parser } from './types';
import { arr, humanize, isObj, objectLines, objs, pathIs, records } from './util';

/** The account owner's name, used to tell sent messages from received ones. */
export function ownerFromProfile(json: unknown): string | undefined {
  if (!isObj(json)) return undefined;
  // Instagram: { profile_user: [ { string_map_data: { Name: { value } } } ] }
  if (Array.isArray(json.profile_user)) {
    const m = isObj(json.profile_user[0]) ? json.profile_user[0].string_map_data : undefined;
    const name = isObj(m) && isObj(m.Name) ? str(m.Name.value) : undefined;
    if (name) return name;
  }
  const p = Object.entries(json).find(([k]) => /^profile(_v\d+)?$/.test(k))?.[1];
  if (!isObj(p) || !isObj(p.name)) return undefined;
  return str(p.name.full_name) ?? ([str(p.name.first_name), str(p.name.last_name)].filter(Boolean).join(' ') || undefined);
}

const SENSITIVE = /email|phone|ip\b|_ip$|address|birthday|zip|postal|device id|android id|hardware id|advertiser id|idfa|imei|cookie|registration_ip|^name$|name\b|profile link|screen name|website/i;

/** profile_information.json: name, emails, phones, birthday, work, education … */
export const profileParser: Parser = {
  id: 'profile',
  label: 'Profile information',
  category: 'profile',
  match: (_path, json) => isObj(json) && Object.keys(json).some((k) => /^profile(_v\d+)?$/.test(k)),
  parse(json, ctx) {
    const p = isObj(json) ? Object.entries(json).find(([k]) => /^profile(_v\d+)?$/.test(k))?.[1] : undefined;
    if (!isObj(p)) return {};
    const facts: Fact[] = [];
    const add = (label: string, value: string | undefined, time?: number) => {
      if (value) facts.push({ group: 'profile', label, value, time, sensitive: SENSITIVE.test(label), source: ctx.path });
    };
    if (isObj(p.name)) add('Name', str(p.name.full_name));
    for (const n of objs(p.previous_names)) add('Previous name', str(n.name), toMs(n.timestamp));
    for (const n of objs(p.other_names)) add('Other name', str(n.name), toMs(n.timestamp));
    if (isObj(p.emails)) {
      for (const e of arr(p.emails.emails)) add('Email', str(e));
      for (const e of arr(p.emails.previous_emails)) add('Previous email', str(e));
      for (const e of arr(p.emails.ad_account_emails)) add('Ad account email', str(e));
    }
    for (const ph of objs(p.phone_numbers)) add('Phone', str(ph.phone_number), toMs(ph.creation_time));
    if (isObj(p.birthday)) {
      const { year, month, day } = p.birthday as Record<string, number>;
      if (year || month || day) add('Birthday', [year, month && String(month).padStart(2, '0'), day && String(day).padStart(2, '0')].filter(Boolean).join('-'));
    }
    if (isObj(p.gender)) add('Gender', str(p.gender.gender_option) ?? str(p.gender.custom_genders));
    if (isObj(p.hometown)) add('Hometown', str(p.hometown.name), toMs(p.hometown.timestamp));
    if (isObj(p.current_city)) add('Current city', str(p.current_city.name), toMs(p.current_city.timestamp));
    for (const e of objs(p.education_experiences)) add('Education', str(e.name), toMs(e.timestamp));
    for (const w of objs(p.work_experiences))
      add('Work', [str(w.title), str(w.employer)].filter(Boolean).join(' at '), toMs(w.start_timestamp) ?? toMs(w.timestamp));
    for (const s of objs(p.screen_names)) for (const n of objs(s.names)) add(`Screen name (${str(s.service_name) ?? '?'})`, str(n.name));
    if (isObj(p.relationship)) add('Relationship', str(p.relationship.status), toMs(p.relationship.timestamp));
    for (const f of objs(p.family_members)) add('Family', [str(f.name), str(f.relation)].filter(Boolean).join(' · '));
    for (const site of arr(p.websites)) add('Website', isObj(site) ? str(site.address) : str(site));
    add('Registration IP', str(p.registration_ip));
    add('Profile link', str(p.profile_uri));
    if (isObj(p.intro_bio)) add('Bio', str(p.intro_bio.name));
    const created = toMs(p.registration_timestamp);
    if (created) add('Account created', new Date(created).toISOString().slice(0, 10), created);
    return { collections: { owner: ownerFromProfile(json), accountCreated: created, facts }, records: facts.length };
  },
};

/**
 * Small files that describe you rather than log activity: predictions, locations,
 * detected hardware, device IDs … Every field becomes a "fact" so nothing is hidden,
 * grouped by what kind of knowledge it is.
 */
const FACT_FILES: { re: RegExp; group: FactGroup }[] = [
  { re: /age_group_prediction|predicted_languages|locations_of_interest|how_active_we_think|your_preferred_categories|languages_you_may_know|your_experiences/, group: 'inference' },
  { re: /primary_location|timezone|your_privacy_jurisdiction|last_location|your_sampled_locations/, group: 'location' },
  { re: /detected_hardware|your_devices|device_login_cookies|browser_cookies/, group: 'device' },
  { re: /two-factor_authentication|login_protection_data|registration_information|your_account_password_information|information_about_your_last_login|login_alerts_settings/, group: 'security' },
  { re: /contact_info|autofill_information|profile_information\/the_ways_we_can_send_you_notifications/, group: 'profile' },
];

export const factsParser: Parser = {
  id: 'facts',
  label: 'Inferences, devices and locations',
  category: 'profile',
  match: (path) => FACT_FILES.some((f) => pathIs(path, new RegExp(`(${f.re.source})(_\\d+)?\\.json$`))),
  parse(json, ctx) {
    const group = FACT_FILES.find((f) => f.re.test(ctx.path))?.group ?? 'inference';
    const facts: Fact[] = [];
    let lastLocation: { lat: number; lng: number; time?: number } | undefined;
    const recs = records(json);
    const list = recs.length ? recs : isObj(json) ? [json] : [];
    list.forEach((r, i) => {
      const prefix = list.length > 1 ? `${humanize(ctx.path)} #${i + 1}` : '';
      const lines = isLabelRecord(r) ? fieldsToLines(toFields(r.label_values), prefix) : objectLines(r, prefix);
      for (const [label, value] of lines)
        facts.push({ group, label: label || humanize(ctx.path), value, sensitive: SENSITIVE.test(label), source: ctx.path });
      // last_location: { last_location_v2: { time, coordinate: { latitude, longitude } } }
      for (const v of Object.values(r)) {
        if (isObj(v) && isObj(v.coordinate) && typeof v.coordinate.latitude === 'number' && typeof v.coordinate.longitude === 'number')
          lastLocation = { lat: v.coordinate.latitude, lng: v.coordinate.longitude, time: toMs(v.time) };
      }
    });
    return { collections: { facts, ...(lastLocation ? { lastLocation } : {}) }, records: list.length };
  },
};
