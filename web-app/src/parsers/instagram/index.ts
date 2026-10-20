import type { Parser } from '../types';
import { instagramAccountParsers } from './account';
import { instagramActivityParsers } from './activity';
import { instagramAdParsers } from './ads';
import { instagramConnectionParsers } from './connections';

/** Every Instagram parser. Each matches only paths that exist in Instagram downloads. */
export const INSTAGRAM_PARSERS: Parser[] = [...instagramAdParsers, ...instagramActivityParsers, ...instagramConnectionParsers, ...instagramAccountParsers];
