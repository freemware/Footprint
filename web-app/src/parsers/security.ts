import { str } from '../importer/text';
import { toMs } from '../importer/time';
import { SECURITY_ACTIONS } from './labels';
import type { EventInput, Parser } from './types';
import { hasKey, objectLines, recordTime, records } from './util';
import { deviceLabel } from './userAgent';

/** Two-letter country codes become names in the viewer's language; anything else passes through. */
export function countryName(code: string | undefined): string | undefined {
  if (!code) return undefined;
  if (!/^[A-Za-z]{2}$/.test(code)) return code;
  try {
    return new Intl.DisplayNames(undefined, { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

const actionType = (action: string | undefined) =>
  (action && SECURITY_ACTIONS[action.trim().toLowerCase()]) ?? 'account_activity';

const ACTION_TITLES: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  session_updated: 'Session updated',
  password_reset_requested: 'Password reset requested',
  password_changed: 'Password changed',
  login_failed: 'Failed login',
  checkpoint: 'Security checkpoint',
};

/**
 * Account activity, logins and logouts, IP address activity.
 * All share { action, timestamp, ip_address|ip, user_agent?, city?, region?, country? }.
 * The same login can appear in more than one file; the pipeline de-duplicates them.
 */
export const securityParser: Parser = {
  id: 'security',
  label: 'Logins and account activity',
  category: 'security',
  match: (_path, json) => hasKey(json, /^(account_activity|account_accesses|used_ip_address)(_v\d+)?$/),
  parse(json) {
    const recs = records(json, /^(account_activity|account_accesses|used_ip_address)(_v\d+)?$/);
    const events: EventInput[] = [];
    for (const r of recs) {
      const timestamp = recordTime(r);
      if (timestamp === undefined) continue;
      const action = str(r.action);
      const type = actionType(action);
      const city = str(r.city);
      const country = str(r.country);
      const where = [city, countryName(country)].filter(Boolean).join(', ');
      const device = deviceLabel(str(r.user_agent));
      events.push({
        type,
        category: 'security',
        timestamp,
        title: `${ACTION_TITLES[type] ?? action ?? 'Account activity'}${where ? ` · ${where}` : ''}`,
        location: {
          ip: str(r.ip_address) ?? str(r.ip),
          city,
          country: countryName(country),
          ...(country && /^[A-Za-z]{2}$/.test(country) ? { countryCode: country.toUpperCase() } : {}),
          ...(str(r.region) ? { region: str(r.region) } : {}),
        },
        device,
        details: objectLines(r),
        meta: { ...(action ? { action } : {}), ...(str(r.site_name) ?? str(r.site) ? { site: (str(r.site_name) ?? str(r.site))! } : {}) },
      });
    }
    return { events, records: recs.length };
  },
};

/** "Where you're logged in": currently or recently active sessions. */
export const sessionsParser: Parser = {
  id: 'active_sessions',
  label: "Where you're logged in",
  category: 'security',
  match: (_path, json) => hasKey(json, /^active_sessions(_v\d+)?$/),
  parse(json) {
    const recs = records(json, /^active_sessions(_v\d+)?$/);
    const events: EventInput[] = [];
    for (const r of recs) {
      const timestamp = toMs(r.created_timestamp) ?? recordTime(r);
      if (timestamp === undefined) continue;
      const device = deviceLabel(str(r.user_agent)) ?? str(r.app);
      const loc = str(r.location);
      events.push({
        type: 'session_started',
        category: 'security',
        timestamp,
        title: `Active session started${device ? ` · ${device}` : ''}${loc ? ` · ${loc}` : ''}`,
        location: { ip: str(r.ip_address), city: loc },
        device,
        details: objectLines(r),
        meta: {
          ...(toMs(r.updated_timestamp) ? { lastActive: toMs(r.updated_timestamp)! } : {}),
          ...(str(r.session_type) ? { sessionType: str(r.session_type)! } : {}),
        },
      });
    }
    return { events, records: recs.length };
  },
};
