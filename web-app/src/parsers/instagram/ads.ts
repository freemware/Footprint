import { fieldText, fieldsToLines, firstText, firstTime } from '../../importer/fields';
import type { Advertiser, SettingState } from '../../model/types';
import { IG, IG_SETTING_LABELS } from '../labels';
import { toBool } from '../settings';
import type { EventInput, Parser } from '../types';
import { recordTime } from '../util';
import { igPath, labelRecords, ownerOf, ownText } from './shared';

/**
 * Instagram's ads_information folder: who has your information, which ads and sponsored posts
 * were logged, what you told advertisers, and the ad settings recorded on the day of the download.
 */

/** advertisers_using_your_activity_or_information.json: three lists, told apart by label, then order. */
export const igAdvertisersParser: Parser = {
  id: 'ig_advertisers',
  label: 'Advertisers using your information',
  category: 'ads',
  match: igPath(/instagram_ads_and_businesses\/advertisers_using_your_activity_or_information(_\d+)?\.json$/),
  parse(json) {
    const advertisers: Advertiser[] = [];
    for (const { f } of labelRecords(json)) {
      f.filter((s) => s.items).forEach((s, i) => {
        const source: Advertiser['source'] = IG.advertiserUploaded.includes(s.label as never)
          ? 'uploaded_list'
          : IG.advertiserInteractions.includes(s.label as never) || IG.advertiserStore.includes(s.label as never)
            ? 'activity'
            : i === 0
              ? 'uploaded_list'
              : 'activity';
        for (const it of s.items ?? []) {
          const name = it.text ?? firstText(it.children);
          if (name) advertisers.push({ name, source });
        }
      });
    }
    return { collections: { advertisers }, records: advertisers.length };
  },
};

/** other_categories_used_to_reach_you.json: audience categories, a single list. */
export const igCategoriesParser: Parser = {
  id: 'ig_categories',
  label: 'Categories used to reach you',
  category: 'ads',
  match: igPath(/instagram_ads_and_businesses\/other_categories_used_to_reach_you(_\d+)?\.json$/),
  parse(json) {
    const cats: string[] = [];
    for (const { f } of labelRecords(json)) for (const s of f) s.items?.forEach((it) => it.text && cats.push(it.text));
    return { collections: { adCategories: cats }, records: cats.length };
  },
};

/** Ads you saw or clicked, and the posts and videos Instagram logged you viewing (used for ads). */
export const igAdEventsParser: Parser = {
  id: 'ig_ad_events',
  label: 'Ads, posts and videos viewed',
  category: 'ads',
  match: igPath(/ads_and_topics\/(ads_viewed|ads_clicked|posts_viewed|videos_watched|posts_you're_not_interested_in|profiles_you're_not_interested_in)(_\d+)?\.json$/),
  parse(json, ctx) {
    const kind = /ads_clicked/.test(ctx.path)
      ? 'ad_interaction'
      : /ads_viewed/.test(ctx.path)
        ? 'ad_viewed'
        : /posts_viewed/.test(ctx.path)
          ? 'post_viewed'
          : /videos_watched/.test(ctx.path)
            ? 'video_watched'
            : 'not_interested';
    const recs = labelRecords(json);
    const events: EventInput[] = [];
    for (const { r, f } of recs) {
      const timestamp = recordTime(r) ?? firstTime(f);
      if (timestamp === undefined) continue;
      const account = ownerOf(f);
      const action = ownText(f, IG.action);
      const title =
        kind === 'ad_viewed'
          ? `Saw an ad${account ? ` from ${account}` : ''}`
          : kind === 'ad_interaction'
            ? `${action ?? 'Clicked'} an ad${account ? ` from ${account}` : ''}`
            : kind === 'post_viewed'
              ? `Viewed a post${account ? ` by ${account}` : ''}`
              : kind === 'video_watched'
                ? `Watched a video${account ? ` by ${account}` : ''}`
                : 'Marked something as not interested';
      events.push({
        type: kind,
        category: kind === 'post_viewed' || kind === 'video_watched' ? 'other' : 'ads',
        timestamp,
        title,
        details: fieldsToLines(f),
        meta: { ...(account ? (kind.startsWith('ad_') ? { advertiser: account } : { account }) : {}), ...(action ? { action } : {}) },
      });
    }
    return { events, records: recs.length };
  },
};

/** information_you've_submitted_to_advertisers.json: answers you typed into advertisers' forms. */
export const igLeadFormsParser: Parser = {
  id: 'ig_lead_forms',
  label: 'Information you gave advertisers',
  category: 'ads',
  match: igPath(/information_you've_submitted_to_advertisers(_\d+)?\.json$/),
  parse(json) {
    const recs = labelRecords(json);
    const events: EventInput[] = [];
    for (const { r, f } of recs) {
      const timestamp = recordTime(r) ?? firstTime(f);
      if (timestamp === undefined) continue;
      events.push({
        type: 'lead_form',
        category: 'ads',
        timestamp,
        // The answer stays in the details, never the title, so it isn't shown in lists.
        title: 'Answered a question in an advertiser’s form',
        details: fieldsToLines(f),
      });
    }
    return { events, records: recs.length };
  },
};

/** Ad settings recorded in the download: ad_preferences.json and ads_about_meta.json. */
export const igAdSettingsParser: Parser = {
  id: 'ig_ad_settings',
  label: 'Ad settings',
  category: 'ads',
  match: igPath(/instagram_ads_and_businesses\/(ad_preferences|ads_about_meta)(_\d+)?\.json$/),
  parse(json, ctx) {
    const settings: Record<string, SettingState> = {};
    const recs = labelRecords(json);
    for (const { f } of recs)
      for (const [id, labels] of Object.entries(IG_SETTING_LABELS)) {
        const text = fieldText(f, labels);
        const value = toBool(text);
        if (text !== undefined && value !== undefined) settings[id] = { id, label: labels[0]!, value, raw: text, source: ctx.path };
      }
    return { collections: { settings }, records: recs.length };
  },
};

export const instagramAdParsers = [igAdvertisersParser, igCategoriesParser, igAdEventsParser, igLeadFormsParser, igAdSettingsParser];
