import { describe, expect, it } from 'vitest';
import { geocode, placeKey } from './geocode';

describe('offline geocoding', () => {
  it('normalizes names', () => {
    expect(placeKey('São Paulo')).toBe('sao paulo');
    expect(placeKey('Winston-Salem')).toBe('winston salem');
  });
  it('picks the right city using the US state', async () => {
    const [dallasTx, dallasGa] = await geocode([
      { city: 'Dallas', region: 'Texas', countryCode: 'US' },
      { city: 'Dallas', region: 'Georgia', countryCode: 'US' },
    ]);
    expect(dallasTx).toMatchObject({ approximate: false });
    expect(dallasTx!.lng).toBeCloseTo(-96.8, 0);
    expect(dallasGa!.lng).toBeCloseTo(-84.8, 0);
  });
  it('finds small towns and falls back to the country', async () => {
    const [small, unknown, noCountry] = await geocode([
      { city: 'Positano', countryCode: 'IT' },
      { city: 'Nowhereville', countryCode: 'IT' },
      { city: 'X', countryCode: 'ZZ' },
    ]);
    expect(small?.approximate).toBe(false);
    expect(unknown?.approximate).toBe(true);
    expect(noCountry).toBeNull();
  });
});
