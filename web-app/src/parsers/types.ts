import type { ActivityEvent, Category, Collections } from '../model/types';

/** An event before the pipeline assigns its id and source file. */
export type EventInput = Omit<ActivityEvent, 'id' | 'sourceFile'>;

export interface ParseContext {
  /** Path inside the export, e.g. "connections/friends/your_friends.json". */
  path: string;
  /** Account owner's display name, used to tell sent from received. May be unknown. */
  owner?: string;
}

export interface ParseResult {
  events?: EventInput[];
  collections?: Partial<Collections>;
  /** How many records the file held (for the import summary). */
  records?: number;
}

/**
 * A parser handles one kind of file. `match` must be cheap and must not throw.
 * `parse` must tolerate missing fields and unexpected shapes; the pipeline also
 * catches anything it throws, so one bad file never stops an import.
 */
export interface Parser {
  id: string;
  label: string;
  category: Category;
  match(path: string, json: unknown): boolean;
  parse(json: unknown, ctx: ParseContext): ParseResult;
}
