import { fieldsToLines, fieldText, findField, firstText, firstTime, isLabelRecord, toFields, type Field } from '../importer/fields';
import { str } from '../importer/text';
import type { Advertiser, OffMetaApp } from '../model/types';
import { L } from './labels';
import type { EventInput, Parser } from './types';
import { hasKey, isObj, pathIs, recordTime, records } from './util';

/**
 * "Advertisers using your activity or information": no timestamps, just long lists.
 * The file holds one list per reason (uploaded a list with your info / has data on your
 * activity with them). Sections are told apart by label, falling back to their order.
 */
export const advertisersParser: Parser = {
  id: 'advertisers',
  label: 'Advertisers using your information',
  category: 'ads',
  match: (path) => pathIs(path, /ads_information\/advertisers_using_your_activity_or_information(_\d+)?\.json$/),
  parse(json) {
    const advertisers: Advertiser[] = [];
    const sections: Field[] = [];
    for (const r of records(json, /^custom_audiences(_all_types)?(_v\d+)?$/)) {
      if (isLabelRecord(r)) sections.push(...toFields(r.label_values).filter((f) => f.items?.length));
      else {
        // Older format: [{ advertiser_name, has_data_file_custom_audience, has_remarketing_custom_audience … }]
        const name = str(r.advertiser_name) ?? str(r.name);
        if (name) advertisers.push({ name, source: r.has_data_file_custom_audience ? 'uploaded_list' : r.has_remarketing_custom_audience || r.has_in_person_store_visit ? 'activity' : 'other' });
      }
    }
    sections.forEach((s, i) => {
      const source: Advertiser['source'] = (L.advertiserUploadedList as readonly string[]).includes(s.label)
        ? 'uploaded_list'
        : (L.advertiserActivity as readonly string[]).includes(s.label)
          ? 'activity'
          : i === 0
            ? 'uploaded_list'
            : i === 1
              ? 'activity'
              : 'other';
      for (const it of s.items ?? []) {
        const name = it.text ?? firstText(it.children);
        if (name) advertisers.push({ name, source });
      }
    });
    return { collections: { advertisers }, records: advertisers.length };
  },
};

/** Ads you clicked or hid, and ads Facebook logged you seeing. */
export const adEventsParser: Parser = {
  id: 'ad_events',
  label: 'Ads viewed and interacted with',
  category: 'ads',
  match: (path) => pathIs(path, /ads_information\/(ads_viewed|advertisers_you've_interacted_with|ads_clicked)(_\d+)?\.json$/),
  parse(json, ctx) {
    const viewed = /ads_viewed/.test(ctx.path);
    const recs = records(json, /^(history|impressions_history_posts_seen|ads_clicked)(_v\d+)?$/);
    const events: EventInput[] = [];
    for (const r of recs) {
      if (isLabelRecord(r)) {
        const f = toFields(r.label_values);
        const timestamp = recordTime(r) ?? firstTime(f);
        if (timestamp === undefined) continue;
        const ad = fieldText(f, L.ad) ?? fieldText(f, L.title) ?? firstText(f);
        const action = fieldText(f, L.action);
        events.push({
          type: viewed ? 'ad_viewed' : 'ad_interaction',
          category: 'ads',
          timestamp,
          title: viewed ? `Saw an ad: ${ad ?? 'unknown advertiser'}` : `${action ?? 'Interacted with'} ad: ${ad ?? 'unknown'}`,
          details: fieldsToLines(f),
          meta: { ...(ad ? { advertiser: ad } : {}), ...(action ? { action } : {}) },
        });
      } else {
        const timestamp = recordTime(r);
        if (timestamp === undefined) continue;
        events.push({
          type: viewed ? 'ad_viewed' : 'ad_interaction',
          category: 'ads',
          timestamp,
          title: `${str(r.action) ?? 'Ad'}: ${str(r.title) ?? ''}`.trim(),
        });
      }
    }
    return { events, records: recs.length };
  },
};

/** Topics and categories Facebook inferred about you for ad targeting. */
export const adInterestsParser: Parser = {
  id: 'ad_interests',
  label: 'Ad interests and categories',
  category: 'ads',
  match: (path, json) =>
    hasKey(json, /^topics(_v\d+)?$/) || pathIs(path, /ads_information\/other_categories_used_to_reach_you(_\d+)?\.json$/),
  parse(json) {
    if (isObj(json)) {
      const key = Object.keys(json).find((k) => /^topics(_v\d+)?$/.test(k));
      if (key) {
        const topics = (Array.isArray(json[key]) ? json[key] : []).map((t: unknown) => (isObj(t) ? str(t.name) : str(t))).filter(Boolean) as string[];
        return { collections: { adInterests: topics }, records: topics.length };
      }
    }
    const cats: string[] = [];
    for (const r of records(json, /^bcts$/)) {
      if (isLabelRecord(r))
        for (const f of toFields(r.label_values)) {
          if (f.text) cats.push(f.text);
          f.items?.forEach((it) => it.text && cats.push(it.text));
        }
      else if (str(r.name)) cats.push(str(r.name)!);
    }
    return { collections: { adCategories: cats }, records: cats.length };
  },
};

/** Activity that other apps and websites sent to Meta about you. */
export const offMetaParser: Parser = {
  id: 'off_meta',
  label: 'Activity off Meta technologies',
  category: 'off_meta',
  match: (path, json) =>
    pathIs(path, /your_activity_off_meta_technologies(_\d+)?\.json$/) ||
    pathIs(path, /your_off-facebook_activity(_\d+)?\.json$/) ||
    hasKey(json, /^off_facebook_activity(_v\d+)?$/),
  parse(json) {
    const apps: OffMetaApp[] = [];
    const events: EventInput[] = [];
    const recs = records(json, /^off_facebook_activity(_v\d+)?$/);
    for (const r of recs) {
      const app: OffMetaApp = { name: str(r.title) ?? str(r.name) ?? 'Unknown app', events: 0, byType: {} };
      const add = (code: string, timestamp: number | undefined, details?: [string, string][]) => {
        app.events++;
        app.byType[code] = (app.byType[code] ?? 0) + 1;
        if (timestamp === undefined) return;
        app.first = Math.min(app.first ?? timestamp, timestamp);
        app.last = Math.max(app.last ?? timestamp, timestamp);
        events.push({
          type: 'off_meta_activity',
          category: 'off_meta',
          timestamp,
          title: `${app.name} sent “${code.toLowerCase().replace(/_/g, ' ')}” to Meta`,
          details,
          meta: { app: app.name, event: code },
        });
      };
      if (isLabelRecord(r)) {
        const f = toFields(r.label_values);
        const list = findField(f, L.events) ?? f.find((x) => x.items?.length);
        for (const it of list?.items ?? []) {
          const code = fieldText(it.children, L.event) ?? it.children?.find((c) => c.text && /^[A-Z_]+$/.test(c.text))?.text ?? 'EVENT';
          add(code, firstTime(it.children), fieldsToLines(it.children));
        }
      } else {
        // Older format: { name, events: [{ id, type, timestamp }] }
        for (const e of Array.isArray(r.events) ? r.events : []) if (isObj(e)) add(str(e.type) ?? 'EVENT', recordTime(e));
      }
      apps.push(app);
    }
    return { events, collections: { offMetaApps: apps }, records: recs.length };
  },
};
