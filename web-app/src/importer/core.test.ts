import { describe, expect, it } from 'vitest';
import { deepFixText, fixText } from './text';
import { toMs } from './time';
import { fieldText, firstTime, toFields } from './fields';

/** Produce the mojibake Facebook writes: each UTF-8 byte as one Latin-1 character. */
const moji = (s: string) => String.fromCharCode(...new TextEncoder().encode(s));

describe('fixText', () => {
  it('repairs accented text and emoji', () => {
    expect(fixText(moji('Café ☕ 😀'))).toBe('Café ☕ 😀');
  });
  it('leaves ASCII alone', () => {
    expect(fixText('plain text')).toBe('plain text');
  });
  it('leaves Latin-1 text that is not valid UTF-8 untouched', () => {
    expect(fixText('café au lait')).toBe('café au lait');
  });
  it('leaves strings that already contain real Unicode untouched', () => {
    expect(fixText('Ã© and ☕')).toBe('Ã© and ☕');
  });
  it('fixes keys and nested values', () => {
    expect(deepFixText({ [moji('Ñame')]: [moji('Zoë')] })).toEqual({ Ñame: ['Zoë'] });
  });
});

describe('toMs', () => {
  it('reads seconds, milliseconds and numeric strings', () => {
    expect(toMs(1700000000)).toBe(1700000000000);
    expect(toMs(1700000000123)).toBe(1700000000123);
    expect(toMs('1700000000')).toBe(1700000000000);
  });
  it('treats 0 and nonsense as not set', () => {
    expect(toMs(0)).toBeUndefined();
    expect(toMs(7)).toBeUndefined();
    expect(toMs('soon')).toBeUndefined();
    expect(toMs(null)).toBeUndefined();
  });
});

describe('toFields', () => {
  const record = [
    { label: 'Ad', value: 'Example Shoes', href: 'https://example.com/ad' },
    { label: 'Time', timestamp_value: 1700000000 },
    { label: 'Ended', timestamp_value: 0 },
    {
      label: 'Events',
      vec: [{ dict: [{ label: 'Event', value: 'PAGE_VIEW' }, { label: 'Received on', timestamp_value: 1700000500000 }] }],
    },
    { label: 'Details', dict: [{ label: 'Name', value: 'No data' }] },
  ];

  it('keeps order, reads values, links and times', () => {
    const f = toFields(record);
    expect(f.map((x) => x.label)).toEqual(['Ad', 'Time', 'Ended', 'Events', 'Details']);
    expect(f[0]).toMatchObject({ text: 'Example Shoes', href: 'https://example.com/ad' });
    expect(f[1]!.time).toBe(1700000000000);
    expect(f[2]!.time).toBeUndefined();
  });
  it('handles nested vec/dict and mixed time units', () => {
    const f = toFields(record);
    expect(f[3]!.items![0]!.children![1]!.time).toBe(1700000500000);
    expect(fieldText(f, ['Event'])).toBe('PAGE_VIEW');
  });
  it('drops placeholder strings', () => {
    expect(fieldText(toFields(record), ['Name'])).toBeUndefined();
  });
  it('finds the first time regardless of label language', () => {
    expect(firstTime(toFields([{ label: 'Hora', timestamp_value: 1600000000 }]))).toBe(1600000000000);
  });
  it('never throws on junk', () => {
    expect(toFields(null)).toEqual([]);
    expect(toFields([1, 'x', null, { vec: 'nope' }])).toEqual([{ label: '' }]);
  });
});
