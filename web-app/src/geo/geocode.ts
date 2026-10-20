/**
 * Offline place lookup for the login map. City lists are bundled per country
 * (src/geo/cities/<CC>.txt, built by scripts/build-gazetteer.mjs from GeoNames data)
 * and loaded only for the countries that appear in an export. No network service is used.
 */

// Vite turns each file into its own lazily loaded chunk.
const loaders = import.meta.glob('./cities/*.txt', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

interface City {
  name: string;
  key: string;
  admin: string;
  lat: number;
  lng: number;
}

const cache = new Map<string, Promise<City[]>>();

/** Lowercase, no accents, no punctuation: "São Paulo" → "sao paulo". */
export const placeKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

function loadCountry(cc: string): Promise<City[]> {
  const code = cc.toUpperCase();
  if (!cache.has(code)) {
    const load = loaders[`./cities/${code}.txt`];
    cache.set(
      code,
      load
        ? load().then((txt) =>
            txt.split('\n').map((line) => {
              const [name = '', admin = '', lat = '0', lng = '0'] = line.split('\t');
              return { name, key: placeKey(name), admin, lat: Number(lat), lng: Number(lng) };
            }),
          )
        : Promise.resolve([]),
    );
  }
  return cache.get(code)!;
}

/** US states: Facebook gives full names, GeoNames uses postal codes. */
const US_STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA',
  'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'puerto rico': 'PR',
};

export interface PlaceQuery {
  city: string;
  region?: string;
  countryCode: string;
}

export interface PlaceHit {
  lat: number;
  lng: number;
  /** True when only the country could be placed (city not in the list). */
  approximate: boolean;
}

/**
 * Find coordinates for each place. Lists are sorted by population, so the first name match is
 * the likeliest one; a matching state/region wins when the name is ambiguous ("Dallas, Texas"
 * rather than "Dallas, Georgia"). Unknown cities fall back to the country's largest city.
 */
export async function geocode(places: PlaceQuery[]): Promise<(PlaceHit | null)[]> {
  return Promise.all(
    places.map(async (p) => {
      const list = await loadCountry(p.countryCode);
      if (!list.length) return null;
      const key = placeKey(p.city);
      const admin = p.region && p.countryCode.toUpperCase() === 'US' ? US_STATES[placeKey(p.region)] : undefined;
      const hit = (admin && list.find((c) => c.key === key && c.admin === admin)) || list.find((c) => c.key === key);
      if (hit) return { lat: hit.lat, lng: hit.lng, approximate: false };
      const biggest = list[0]!;
      return { lat: biggest.lat, lng: biggest.lng, approximate: true };
    }),
  );
}
