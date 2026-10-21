// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { find, findOption, isChecked, listItems, looksLikeSecurityCheck, looksSignedOut, nameOf, outline, parseDate, readSetting, roleOf, settingControl } from './dom';
import { runStep } from './runner';

/** Stand-in pages, shaped like the platform's (roles and labels, random class names). */
const SETTINGS = `
  <nav><a href="#" class="x1">Posts</a><a href="#" class="x2">How people find and contact you</a></nav>
  <main>
    <div class="r1"><div class="q"><span>Who can see your future posts?</span></div>
      <div class="v"><div role="button" tabindex="0" aria-haspopup="menu" class="b9"><span>Friends of friends</span></div></div></div>
    <div class="r2"><span>Who can look you up using the phone number you provided?</span>
      <div><div role="button" aria-label="Edit, Everyone" tabindex="0"></div></div></div>
    <div class="r3"><span>Do you want search engines outside of Facebook to link to your profile?</span>
      <div role="switch" aria-checked="true" aria-label="Search engines" tabindex="0"></div></div>
    <div class="r4"><span>Who can see your friends list?</span><span>Only me</span><button>Edit</button></div>
  </main>`;

beforeEach(() => {
  document.body.innerHTML = SETTINGS;
});

describe('finding things by role and label', () => {
  it('works out roles and names', () => {
    const btn = document.querySelector('[role=button]')!;
    expect(roleOf(btn)).toBe('button');
    expect(nameOf(btn)).toBe('Friends of friends');
    expect(roleOf(document.querySelector('a')!)).toBe('link');
    expect(nameOf(document.querySelector('[aria-label="Edit, Everyone"]')!)).toBe('Edit, Everyone');
  });

  it('prefers the most specific match', () => {
    const el = find(document, { role: 'link', name: '^Posts$' });
    expect(el?.textContent).toBe('Posts');
    expect(find(document, { name: 'future posts' })?.tagName).toBe('SPAN');
  });

  it('ignores hidden elements', () => {
    document.body.innerHTML = '<div hidden><button>Only me</button></div><button>Only me</button>';
    expect(find(document, { role: 'button', name: 'only me' })?.parentElement?.tagName).toBe('BODY');
  });
});

describe('reading settings', () => {
  it('reads an audience shown next to the question', () => {
    expect(readSetting(document, 'who can see your future posts', 'audience')).toEqual({ value: 'friends_of_friends', raw: 'Friends of friends' });
    expect(readSetting(document, 'who can see your friends list', 'audience')).toEqual({ value: 'only_me', raw: 'Only me' });
  });
  it('reads a value carried only in a button label', () => {
    expect(readSetting(document, 'look you up using the phone number', 'audience')).toEqual({ value: 'public', raw: 'Everyone' });
  });
  it('reads switches', () => {
    expect(readSetting(document, 'search engines outside of facebook', 'onoff')).toEqual({ value: true, raw: 'On' });
  });
  it('reads which radio option is chosen', () => {
    document.body.innerHTML = `<div><label><input type="radio" name="f" checked> Connect future activity</label></div>
      <div><label><input type="radio" name="f"> Disconnect future activity</label></div>`;
    expect(readSetting(document, '^disconnect future activity', 'onoff')).toEqual({ value: false, raw: 'Off' });
  });
  it('handles a switch labelled with the question, and a checkbox inside its label', async () => {
    document.body.innerHTML = `<div><input type="checkbox" role="switch" aria-label="Review posts you're tagged in" checked></div>
      <div><label><input type="checkbox"> In-app notifications</label><label><input type="checkbox" checked> Email</label></div>`;
    expect(readSetting(document, "review posts you're tagged in", 'onoff')).toEqual({ value: true, raw: 'On' });
    expect(readSetting(document, '^in-app notifications$', 'onoff')).toEqual({ value: false, raw: 'Off' });
    expect(roleOf(settingControl(document, '^in-app notifications$')!)).toBe('checkbox');
    expect(await runStep(document, { op: 'openSetting', question: '^in-app notifications$' }, { settle: 0 })).toEqual({ ok: true });
    expect(readSetting(document, '^in-app notifications$', 'onoff')?.value).toBe(true);
  });
  it('tries question patterns in order, most specific first', () => {
    document.body.innerHTML = `<h1>Activity information from ad partners</h1><div role="button">Review setting</div>
      <div><span>Make ads more personalised using activity from partners</span><div role="switch" aria-checked="true"></div></div>`;
    expect(nameOf(settingControl(document, ['more personali[sz]ed', 'activity information from ad partners'])!)).toBe('');
    expect(roleOf(settingControl(document, ['more personali[sz]ed', 'activity information from ad partners'])!)).toBe('switch');
  });
  it('returns null when the question isn’t on the page', () => {
    expect(readSetting(document, 'something else entirely', 'audience')).toBeNull();
  });
  it('finds the control to change a setting', () => {
    expect(nameOf(settingControl(document, 'who can see your future posts')!)).toBe('Friends of friends');
    expect(nameOf(settingControl(document, 'friends list')!)).toBe('Edit');
  });
  it('picks an option by its main label, not its description', () => {
    document.body.innerHTML = `<div role="menu"><div role="menuitemradio">Public · Anyone on or off Facebook</div>
      <div role="menuitemradio">Friends · Your friends on Facebook</div><div role="menuitemradio">Friends except… · Don't show to some friends</div></div>`;
    expect(nameOf(findOption(document, '^friends$')!)).toMatch(/^Friends · Your/);
  });
});

describe('lists', () => {
  const LIST = `<h2>March 2016</h2><div role="list">
      <div role="listitem"><div role="checkbox" aria-checked="false" aria-label="Select"></div><span>Sam tagged you in a post.</span><span>March 3, 2016</span></div>
      <div role="listitem"><div role="checkbox" aria-checked="false" aria-label="Select"></div><span>Sam tagged you in a post.</span></div></div>
    <h2>2021</h2><div role="list"><div role="listitem"><input type="checkbox" aria-label="Select"><span>Alex tagged you in a photo.</span></div></div>`;

  it('gives every row a stable key and a date', () => {
    document.body.innerHTML = LIST;
    const items = listItems(document).map((x) => x.item);
    expect(items).toHaveLength(3);
    expect(items[0]!.date).toBe('2016-03-03');
    expect(items[1]!.date).toBe('2016-03-01');
    expect(items[2]!.date).toBe('2021-01-01');
    expect(items[0]!.key).not.toBe(items[1]!.key);
    document.body.innerHTML = LIST;
    expect(listItems(document).map((x) => x.item.key)).toEqual(items.map((i) => i.key));
  });

  it('ticks only the chosen rows', async () => {
    document.body.innerHTML = LIST + '<p>You have reached the end</p>';
    document.querySelectorAll('[role=checkbox]').forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-checked', String(b.getAttribute('aria-checked') !== 'true'))));
    const items = listItems(document);
    const r = await runStep(document, { op: 'select', keys: [items[1]!.item.key, 'gone'] });
    expect(r).toMatchObject({ ok: false, reason: 'not_found' });
    expect(listItems(document).map((x) => isChecked(x.box))).toEqual([false, true, false]);
  });

  it('reads dates in common formats', () => {
    expect(parseDate('Jan 5, 2019')).toBe('2019-01-05');
    expect(parseDate('5 January 2019')).toBe('2019-01-05');
    expect(parseDate('2019-01-05')).toBe('2019-01-05');
    expect(parseDate('Yesterday at 9:00')).toBeUndefined();
  });
});

describe('page state', () => {
  it('spots a sign-in page and a security check', () => {
    document.body.innerHTML = '<form><input name="email"><input type="password"></form>';
    expect(looksSignedOut(document)).toBe(true);
    document.body.innerHTML = '<h1>You’re temporarily blocked</h1>';
    expect(looksLikeSecurityCheck(document)).toBe(true);
    document.body.innerHTML = SETTINGS;
    expect(looksSignedOut(document)).toBe(false);
    expect(looksLikeSecurityCheck(document)).toBe(false);
  });

  it('problem reports carry control labels only, never list rows or personal details', () => {
    document.body.innerHTML = `${SETTINGS}<div role="listitem"><button>Sam Jones</button></div><button>someone@example.com</button>`;
    const o = outline(document);
    const names = o.controls.map((c) => c.name);
    expect(names).toContain('Friends of friends');
    expect(names).not.toContain('Sam Jones');
    expect(names.some((n) => n.includes('@'))).toBe(false);
  });
});

describe('running steps', () => {
  it('opens a menu, chooses, and the page updates', async () => {
    const btn = document.querySelector('.b9')!;
    btn.addEventListener('click', () => {
      const menu = document.createElement('div');
      menu.setAttribute('role', 'menu');
      menu.innerHTML = '<div role="menuitemradio">Public</div><div role="menuitemradio">Friends</div><div role="menuitemradio">Only me</div>';
      menu.querySelectorAll('[role=menuitemradio]').forEach((o) =>
        o.addEventListener('click', () => {
          btn.querySelector('span')!.textContent = o.textContent;
          menu.remove();
        }),
      );
      document.body.append(menu);
    });
    expect(await runStep(document, { op: 'openSetting', question: 'future posts' }, { settle: 0 })).toEqual({ ok: true });
    expect(await runStep(document, { op: 'choose', option: '^friends$' }, { settle: 0 })).toEqual({ ok: true });
    expect(await runStep(document, { op: 'read', question: 'future posts', vocab: 'audience' })).toEqual({ ok: true, value: { value: 'friends', raw: 'Friends' } });
  });

  it('fails clearly, and skips optional steps quietly', async () => {
    expect(await runStep(document, { op: 'click', loc: { role: 'button', name: '^nope$' }, timeout: 300 })).toEqual({ ok: false, reason: 'not_found' });
    expect(await runStep(document, { op: 'click', optional: true, loc: { role: 'button', name: '^nope$' }, timeout: 300 })).toEqual({ ok: true });
    expect(await runStep(document, { op: 'read', question: 'nope', vocab: 'onoff', timeout: 300 })).toEqual({ ok: false, reason: 'unreadable' });
  });

  it('stops at once on a sign-in page', async () => {
    document.body.innerHTML = '<form><input type="email"><input type="password"></form>';
    expect(await runStep(document, { op: 'read', question: 'future posts', vocab: 'audience' })).toEqual({ ok: false, reason: 'signed_out' });
  });
});
