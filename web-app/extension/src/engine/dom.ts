import type { ListItem, Locator, PageOutline, Pattern, SettingReading, Vocabulary } from '../shared/types';

/**
 * Finding things on a platform's page the way a person does: by role and visible label.
 *
 * Platforms generate random class names that change every week, so nothing here relies on CSS
 * classes or ids. Accessible names (aria-label, button text, label text) change far less often.
 * Every function is pure DOM and runs the same in a real page and in tests.
 */

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

export const toRegexps = (p: Pattern | undefined): RegExp[] =>
  (p === undefined ? [] : Array.isArray(p) ? p : [p]).map((s) => new RegExp(s, 'i'));

const matchesAny = (text: string, res: RegExp[]) => res.some((r) => r.test(text));

const IMPLICIT_ROLE: Record<string, string> = { BUTTON: 'button', SELECT: 'combobox', OPTION: 'option', TEXTAREA: 'textbox', LI: 'listitem', DIALOG: 'dialog', NAV: 'navigation' };

export function roleOf(el: Element): string {
  const explicit = el.getAttribute('role');
  if (explicit) return explicit.split(/\s+/)[0]!.toLowerCase();
  const tag = el.tagName;
  if (tag === 'A' && el.hasAttribute('href')) return 'link';
  if (/^H[1-6]$/.test(tag)) return 'heading';
  if (tag === 'INPUT') {
    const t = (el.getAttribute('type') ?? 'text').toLowerCase();
    if (t === 'checkbox') return 'checkbox';
    if (t === 'radio') return 'radio';
    if (t === 'button' || t === 'submit' || t === 'reset') return 'button';
    return 'textbox';
  }
  return IMPLICIT_ROLE[tag] ?? '';
}

/** A simplified accessible name: aria-label, aria-labelledby, label, alt/title, then text. */
export function nameOf(el: Element): string {
  const aria = el.getAttribute('aria-label');
  if (aria && norm(aria)) return norm(aria);
  const by = el.getAttribute('aria-labelledby');
  if (by) {
    const doc = el.ownerDocument;
    const t = norm(by.split(/\s+/).map((id) => doc.getElementById(id)?.textContent ?? '').join(' '));
    if (t) return t;
  }
  if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
    const id = el.getAttribute('id');
    const label = (id && el.ownerDocument.querySelector(`label[for="${CSS_escape(id)}"]`)) || el.closest('label');
    if (label) return norm(label.textContent);
    const v = (el as HTMLInputElement).value;
    if ((el.getAttribute('type') ?? '') === 'submit' && v) return norm(v);
  }
  const alt = el.getAttribute('alt') ?? el.getAttribute('title');
  if (alt && norm(alt)) return norm(alt);
  return norm(el.textContent).slice(0, 300);
}

function CSS_escape(s: string) {
  return s.replace(/["\\]/g, '\\$&');
}

/** Visible to a person: not hidden by attributes or styles (layout checks only in real browsers). */
export function isVisible(el: Element): boolean {
  const withCheck = el as Element & { checkVisibility?: (o?: object) => boolean };
  if (typeof withCheck.checkVisibility === 'function') return withCheck.checkVisibility({ visibilityProperty: true });
  for (let e: Element | null = el; e; e = e.parentElement) {
    if (e.hasAttribute('hidden') || e.getAttribute('aria-hidden') === 'true') return false;
    const style = (e as HTMLElement).style;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
  }
  return true;
}

const roles = (r: Locator['role']) => (r === undefined ? null : (Array.isArray(r) ? r : [r]).map((x) => x.toLowerCase()));

/**
 * Every visible element matching the locator, best first.
 * Among matches, the one with the shortest name wins: a button labelled "Only me" beats the
 * whole menu that happens to contain those words.
 */
export function findAll(root: ParentNode, loc: Locator): Element[] {
  // Never the document head (page titles repeat headings).
  let scope: ParentNode = (root as Document).body ?? root;
  if (loc.within) {
    const w = findAll(root, loc.within)[0];
    if (!w) return [];
    scope = w;
  }
  const want = roles(loc.role);
  const names = toRegexps(loc.name);
  const out: { el: Element; len: number; i: number }[] = [];
  let i = 0;
  for (const el of Array.from(scope.querySelectorAll('*'))) {
    i++;
    if (want && !want.includes(roleOf(el))) continue;
    if (!want && el.children.length && names.length) {
      // Plain text locator: only the innermost element carrying the text.
      if (Array.from(el.children).some((c) => matchesAny(norm(c.textContent), names))) continue;
    }
    const name = nameOf(el);
    if (names.length && !matchesAny(name, names)) continue;
    if (!isVisible(el)) continue;
    out.push({ el, len: name.length, i });
  }
  return out.sort((a, b) => a.len - b.len || a.i - b.i).map((x) => x.el);
}

export const find = (root: ParentNode, loc: Locator): Element | null => findAll(root, loc)[0] ?? null;

/** Click like a person: pointer and mouse events, then click (some sites listen for each). */
export function press(el: Element) {
  (el as HTMLElement).scrollIntoView?.({ block: 'center' });
  const view = el.ownerDocument.defaultView;
  const opts: MouseEventInit = { bubbles: true, cancelable: true, composed: true };
  const P = view?.PointerEvent ?? view?.MouseEvent;
  if (P) el.dispatchEvent(new P('pointerdown', opts));
  if (view?.MouseEvent) el.dispatchEvent(new view.MouseEvent('mousedown', opts));
  if (P) el.dispatchEvent(new P('pointerup', opts));
  if (view?.MouseEvent) el.dispatchEvent(new view.MouseEvent('mouseup', opts));
  (el as HTMLElement).click();
}

/* ---------- settings: question → current value ---------- */

const AUDIENCE: [RegExp, string][] = [
  [/^only me$/i, 'only_me'],
  [/^friends of friends$/i, 'friends_of_friends'],
  [/^friends except/i, 'custom'],
  [/^specific friends$/i, 'custom'],
  [/^custom$/i, 'custom'],
  [/^friends$/i, 'friends'],
  [/^(public|everyone|anyone)$/i, 'public'],
];
const ONOFF: [RegExp, boolean][] = [
  [/^(on|yes|allowed|enabled|connected|turned on)$/i, true],
  [/^(off|no|not allowed|disabled|disconnected|turned off|don'?t allow)$/i, false],
];

export function normaliseValue(text: string, vocab: Vocabulary): string | boolean | undefined {
  const t = norm(text);
  if (vocab === 'audience') return AUDIENCE.find(([r]) => r.test(t))?.[1];
  return ONOFF.find(([r]) => r.test(t))?.[1];
}

/**
 * The innermost element whose text is the setting's question. Patterns are tried in the
 * recipe's order, so the most specific wording wins over a looser fallback.
 */
export function findQuestion(root: ParentNode, question: Pattern): Element | null {
  for (const one of Array.isArray(question) ? question : [question]) {
    const hit = find(root, { name: one });
    if (hit) return hit;
  }
  return null;
}

/** Leaf texts under an element (each element's own text), in order. */
function leafTexts(el: Element): { el: Element; text: string }[] {
  const out: { el: Element; text: string }[] = [];
  const walk = (e: Element) => {
    if (!isVisible(e)) return;
    const own = norm(Array.from(e.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '));
    if (own) out.push({ el: e, text: own });
    const label = e.getAttribute('aria-label');
    if (label && !e.children.length && !own) out.push({ el: e, text: norm(label) });
    for (const c of Array.from(e.children)) walk(c);
  };
  walk(el);
  return out;
}

const CONTROL_ROLES = ['button', 'combobox', 'switch', 'checkbox', 'link', 'menuitem'];

/**
 * The row a question sits in: the smallest ancestor (up to 6 levels) that also holds a control.
 * Settings pages almost always show "question · current value · control" together.
 */
export function rowOf(q: Element): Element | null {
  let e: Element | null = q;
  for (let depth = 0; e && depth < 7; depth++, e = e.parentElement) {
    const hasControl = Array.from(e.querySelectorAll('*')).some((c) => CONTROL_ROLES.includes(roleOf(c)) && !q.contains(c)) || (CONTROL_ROLES.includes(roleOf(e)) && e !== q);
    if (hasControl) return e;
  }
  return null;
}

export function readSetting(root: ParentNode, question: Pattern, vocab: Vocabulary): SettingReading | null {
  const q = findQuestion(root, question);
  if (!q) return null;
  const row = rowOf(q) ?? q.parentElement;
  if (!row) return null;
  // A switch, checkbox or radio button in the row speaks for itself.
  if (vocab === 'onoff') {
    const sw = [q, ...Array.from(row.querySelectorAll('*')), row].find((c) => ['switch', 'checkbox', 'radio', 'menuitemradio'].includes(roleOf(c)));
    if (sw) {
      const checked = sw.getAttribute('aria-checked') ?? ((sw as HTMLInputElement).checked !== undefined ? String((sw as HTMLInputElement).checked) : null);
      if (checked === 'true' || checked === 'false') return { value: checked === 'true', raw: checked === 'true' ? 'On' : 'Off' };
    }
  }
  const qText = norm(q.textContent);
  for (const { text } of leafTexts(row)) {
    if (text === qText) continue;
    const v = normaliseValue(text, vocab);
    if (v !== undefined) return { value: v, raw: text };
  }
  // Values are sometimes only in a button's label, e.g. aria-label="Edit, Friends".
  for (const c of Array.from(row.querySelectorAll('*'))) {
    const label = c.getAttribute('aria-label');
    if (!label) continue;
    for (const part of label.split(/[,:·]/)) {
      const v = normaliseValue(part, vocab);
      if (v !== undefined) return { value: v, raw: norm(part) };
    }
  }
  return null;
}

/** The control to press to change a setting: a button named after the value or "Edit", else the first. */
export function settingControl(root: ParentNode, question: Pattern): Element | null {
  const q = findQuestion(root, question);
  if (!q) return null;
  const CONTROLS = ['button', 'combobox', 'switch', 'checkbox', 'menuitem', 'radio'];
  // The question can be the control itself (a switch labelled with the question).
  if (CONTROLS.includes(roleOf(q))) return q;
  const row = rowOf(q) ?? q.parentElement;
  if (!row) return null;
  const controls = [row, ...Array.from(row.querySelectorAll('*'))].filter((c) => c !== q && CONTROLS.includes(roleOf(c)) && isVisible(c));
  return controls.find((c) => /^(edit|change)\b/i.test(nameOf(c))) ?? controls.find((c) => normaliseValue(nameOf(c), 'audience') !== undefined) ?? controls[0] ?? (roleOf(row) === 'link' ? row : null);
}

const OPTION_ROLES = ['radio', 'menuitemradio', 'menuitem', 'option', 'menuitemcheckbox', 'button', 'link'];

export function findOption(root: ParentNode, option: Pattern): Element | null {
  const res = toRegexps(option);
  for (const role of OPTION_ROLES) {
    const hit = findAll(root, { role }).find((el) => {
      const n = nameOf(el);
      // Match the option's main label, not its description ("Only me · Only you can see …").
      const first = norm(n.split(/[\n·•]/)[0]);
      return res.some((r) => r.test(first) || r.test(n));
    });
    if (hit) return hit;
  }
  return null;
}

/* ---------- lists: tagged posts, your posts ---------- */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MON = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const monthIndex = (m: string) => MONTHS.findIndex((x) => x.startsWith(m.toLowerCase().slice(0, 3)));
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** A date written the way platforms show them in lists. English month names for now. */
export function parseDate(text: string, now = new Date()): string | undefined {
  const t = norm(text);
  let m = t.match(new RegExp(`\\b${MON}\\.? (\\d{1,2}),? (\\d{4})\\b`, 'i'));
  if (m) return iso(+m[3]!, monthIndex(m[1]!), +m[2]!);
  m = t.match(new RegExp(`\\b(\\d{1,2}) ${MON}\\.?,? (\\d{4})\\b`, 'i'));
  if (m) return iso(+m[3]!, monthIndex(m[2]!), +m[1]!);
  m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(new RegExp(`^${MON} (\\d{4})$`, 'i'));
  if (m) return iso(+m[2]!, monthIndex(m[1]!), 1);
  m = t.match(new RegExp(`^${MON} (\\d{1,2})$`, 'i'));
  if (m) return iso(now.getFullYear(), monthIndex(m[1]!), +m[2]!);
  m = t.match(/^(19|20)\d{2}$/);
  if (m) return `${t}-01-01`;
  if (/^today$/i.test(t)) return iso(now.getFullYear(), now.getMonth(), now.getDate());
  return undefined;
}

/** A short, stable fingerprint of a row's text. */
export function hashText(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** The row around a list checkbox: the nearest list item, or the smallest ancestor with real text. */
function itemRow(box: Element): Element {
  const li = box.closest('[role="listitem"], [role="row"], li, [role="article"]');
  if (li) return li;
  let e: Element = box;
  while (e.parentElement && norm(e.textContent).length < 12) e = e.parentElement;
  return e;
}

/** Every ticked-or-tickable row in the current list, with its text and date. */
export function listItems(root: ParentNode): { item: ListItem; box: Element }[] {
  const boxes = findAll(root, { role: 'checkbox' }).filter((b) => !/select all|all items/i.test(nameOf(b)));
  // Document order, not name length, for lists.
  boxes.sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1));
  const seen = new Map<string, number>();
  const out: { item: ListItem; box: Element }[] = [];
  const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & 4);
  const headings = findAll(root, { role: 'heading' })
    .map((h) => ({ h, date: parseDate(nameOf(h)) }))
    .filter((x) => x.date)
    .sort((a, b) => (before(a.h, b.h) ? -1 : 1));
  for (const box of boxes) {
    const row = itemRow(box);
    const leaves = leafTexts(row).filter((l) => l.el !== box && !box.contains(l.el));
    const text = leaves.map((l) => l.text).filter((t) => !parseDate(t)).join(' · ').slice(0, 220) || nameOf(box);
    const n = (seen.get(text) ?? 0) + 1;
    seen.set(text, n);
    // The closest date: in the row's own text, else the nearest heading above it.
    let date: string | undefined;
    for (const leaf of leaves) {
      date = parseDate(leaf.text);
      if (date) break;
    }
    if (!date) date = headings.filter((x) => before(x.h, box)).pop()?.date;
    out.push({ item: { key: `${hashText(text)}-${n}`, text, date }, box });
  }
  return out;
}

export const isChecked = (el: Element) => el.getAttribute('aria-checked') === 'true' || (el as HTMLInputElement).checked === true;

/* ---------- page state ---------- */

/** Signed out: the platform shows its login form instead of the page we asked for. */
export function looksSignedOut(doc: Document): boolean {
  if (/^\/login\b|\/login\.php/.test(doc.location?.pathname ?? '')) return true;
  return !!doc.querySelector('input[type="password"]') && !!doc.querySelector('input[name="email"], input[type="email"], input[autocomplete="username"]');
}

/** A security check or a "slow down" warning: everything stops so the person can deal with it. */
export function looksLikeSecurityCheck(doc: Document): boolean {
  if (/\/checkpoint\b|\/two_step_verification|\/challenge/.test(doc.location?.pathname ?? '')) return true;
  const text = norm(doc.body?.textContent).slice(0, 20000);
  return /you('|’)re temporarily blocked|temporarily restricted|you('|’)re going too fast|slow down|we limit how often|confirm (it'?s|that it'?s) you|security check|unusual activity/i.test(text);
}

/** Control labels only (never post text or names in lists), for a problem report. */
export function outline(doc: Document): PageOutline {
  const wanted = ['button', 'menuitem', 'menuitemradio', 'radio', 'switch', 'checkbox', 'tab', 'heading', 'option', 'combobox', 'dialog'];
  const controls: PageOutline['controls'] = [];
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    const role = roleOf(el);
    if (!wanted.includes(role) || !isVisible(el)) continue;
    if (el.closest('[role="article"], [role="listitem"], [role="feed"]')) continue;
    const name = nameOf(el).slice(0, 60);
    if (!name || /@|\d{6,}/.test(name)) continue;
    controls.push({ role, name });
    if (controls.length >= 150) break;
  }
  return { path: doc.location?.pathname ?? '', controls };
}
