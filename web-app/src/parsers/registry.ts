import type { Parser } from './types';
import { connectionParsers } from './connections';
import { commentsParser, eventsParser, mediaParser, postsParser, reactionsParser, searchParser, viewsParser } from './activity';
import { messagesParser } from './messages';
import { securityParser, sessionsParser } from './security';
import { adEventsParser, adInterestsParser, advertisersParser, offMetaParser } from './ads';
import { factsParser, profileParser } from './profile';
import { genericParser } from './generic';
import { INSTAGRAM_PARSERS } from './instagram';

/**
 * Parsers are tried in order; the first whose `match` returns true handles the file.
 * Specific parsers come first, the generic timeline fallback last.
 * To support a new file: write a Parser and add it to this list.
 */
export const PARSERS: Parser[] = [
  // Instagram first: its files share some folder names with Facebook's, and these match Instagram paths only.
  ...INSTAGRAM_PARSERS,
  messagesParser,
  profileParser,
  factsParser,
  securityParser,
  sessionsParser,
  advertisersParser,
  adEventsParser,
  adInterestsParser,
  offMetaParser,
  reactionsParser,
  commentsParser,
  postsParser,
  mediaParser,
  searchParser,
  eventsParser,
  viewsParser,
  ...connectionParsers,
];

export const FALLBACK_PARSER = genericParser;

export function pickParser(path: string, json: unknown): Parser {
  for (const p of PARSERS) {
    try {
      if (p.match(path, json)) return p;
    } catch {
      /* a broken matcher must not stop the import */
    }
  }
  return FALLBACK_PARSER;
}
