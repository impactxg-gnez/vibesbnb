/**
 * Airbnb-aligned amenity catalog for host property editing.
 * Labels match Airbnb's host listing editor categories (~115 items).
 * Stored values in properties.amenities are these display strings.
 */

export type AmenityCategoryId =
  | 'basics'
  | 'bathroom'
  | 'bedroom_laundry'
  | 'entertainment'
  | 'family'
  | 'heating_cooling'
  | 'home_safety'
  | 'internet_office'
  | 'kitchen_dining'
  | 'location'
  | 'outdoor'
  | 'parking_facilities';

export interface AmenityCategory {
  id: AmenityCategoryId;
  title: string;
  amenities: readonly string[];
}

/** Airbnb's 12 host amenity categories with selectable items. */
export const AMENITY_CATEGORIES: readonly AmenityCategory[] = [
  {
    id: 'basics',
    title: 'Basics',
    amenities: [
      'Essentials',
      'Toilet paper',
      'Body soap',
      'Hangers',
      'Extra pillows and blankets',
      'Safe',
      'Luggage dropoff allowed',
      'Long term stays allowed',
      'Cleaning before checkout',
      'Breakfast provided',
      'Self check-in',
      'Pets allowed',
    ],
  },
  {
    id: 'bathroom',
    title: 'Bathroom',
    amenities: [
      'Bathtub',
      'Bidet',
      'Cleaning products',
      'Conditioner',
      'Hair dryer',
      'Hot water',
      'Outdoor shower',
      'Shampoo',
      'Shower gel',
    ],
  },
  {
    id: 'bedroom_laundry',
    title: 'Bedroom and laundry',
    amenities: [
      'Bed linens',
      'Clothing storage',
      'Dryer',
      'Drying rack for clothes',
      'Iron',
      'Mosquito net',
      'Room-darkening shades',
      'Washer',
    ],
  },
  {
    id: 'entertainment',
    title: 'Entertainment',
    amenities: [
      'Books and reading material',
      'Ethernet connection',
      'Exercise equipment',
      'Game console',
      'Piano',
      'Ping pong table',
      'Pool table',
      'Record player',
      'Sound system',
      'TV',
    ],
  },
  {
    id: 'family',
    title: 'Family',
    amenities: [
      'Baby bath',
      'Baby monitor',
      'Baby safety gates',
      'Babysitter recommendations',
      'Board games',
      'Changing table',
      "Children's books and toys",
      "Children's dinnerware",
      'Crib',
      'Fireplace guards',
      'High chair',
      'Outlet covers',
      "Pack 'n Play/Travel crib",
      'Table corner guards',
      'Window guards',
    ],
  },
  {
    id: 'heating_cooling',
    title: 'Heating and cooling',
    amenities: [
      'Air conditioning',
      'Ceiling fan',
      'Heating',
      'Indoor fireplace',
      'Indoor fireplace: electric',
      'Portable fans',
    ],
  },
  {
    id: 'home_safety',
    title: 'Home safety',
    amenities: [
      'Carbon monoxide alarm',
      'Fire extinguisher',
      'First aid kit',
      'Smoke alarm',
    ],
  },
  {
    id: 'internet_office',
    title: 'Internet and office',
    amenities: ['Dedicated workspace', 'Pocket WiFi', 'WiFi'],
  },
  {
    id: 'kitchen_dining',
    title: 'Kitchen and dining',
    amenities: [
      'Kitchen',
      'Baking sheet',
      'Barbecue utensils',
      'Blender',
      'Bowls, chopsticks, plates, cups, etc.',
      'Bread maker',
      'Coffee',
      'Coffee maker',
      'Dining table',
      'Dishwasher',
      'Freezer',
      'Hot water kettle',
      'Microwave',
      'Mini fridge',
      'Oven',
      'Pots and pans, oil, salt and pepper',
      'Refrigerator',
      'Rice maker',
      'Stove',
      'Toaster',
      'Trash compactor',
      'Wine glasses',
    ],
  },
  {
    id: 'location',
    title: 'Location features',
    amenities: [
      'Waterfront',
      'Beach access',
      'Lake access',
      'Ski-in/ski-out',
      'Private entrance',
      'Laundromat nearby',
      'Resort access',
      'Mountain view',
    ],
  },
  {
    id: 'outdoor',
    title: 'Outdoor',
    amenities: [
      'Patio or balcony',
      'Backyard',
      'Fire pit',
      'Outdoor furniture',
      'Hammock',
      'Outdoor dining area',
      'Outdoor kitchen',
      'BBQ grill',
      'Beach essentials',
      'Bikes',
      'Kayak',
      'Boat slip',
    ],
  },
  {
    id: 'parking_facilities',
    title: 'Parking and facilities',
    amenities: [
      'Free parking on premises',
      'Free street parking',
      'Pool',
      'Hot tub',
      'Sauna',
      'Elevator',
      'EV charger',
      'Gym',
      'Paid parking off premises',
      'Paid parking on premises',
      'Single level home',
    ],
  },
] as const;

/** Flat list of all catalog amenity labels. */
export const ALL_CATALOG_AMENITIES: readonly string[] = AMENITY_CATEGORIES.flatMap(
  (c) => c.amenities,
);

const CATALOG_SET = new Set<string>(ALL_CATALOG_AMENITIES);

/** Case-insensitive lookup: lowercased label → canonical catalog label. */
const CATALOG_BY_LOWER = new Map<string, string>(
  ALL_CATALOG_AMENITIES.map((a) => [a.toLowerCase(), a]),
);

/**
 * Legacy VibesBNB / scraped labels → catalog label(s).
 * Values may be a single label or array (e.g. Washer/Dryer → Washer + Dryer).
 */
export const LEGACY_AMENITY_ALIASES: Record<string, string | string[]> = {
  wifi: 'WiFi',
  'wi-fi': 'WiFi',
  internet: 'WiFi',
  'wireless internet': 'WiFi',
  workspace: 'Dedicated workspace',
  'dedicated workspace': 'Dedicated workspace',
  parking: 'Free parking on premises',
  'free parking': 'Free parking on premises',
  'private parking': 'Free parking on premises',
  'washer/dryer': ['Washer', 'Dryer'],
  'washer & dryer': ['Washer', 'Dryer'],
  washer: 'Washer',
  dryer: 'Dryer',
  laundry: 'Washer',
  'pet friendly': 'Pets allowed',
  'pets allowed': 'Pets allowed',
  balcony: 'Patio or balcony',
  bbq: 'BBQ grill',
  'bbq grill': 'BBQ grill',
  'barbecue grill': 'BBQ grill',
  'beach access': 'Beach access',
  garden: 'Backyard',
  'mountain view': 'Mountain view',
  kitchen: 'Kitchen',
  pool: 'Pool',
  'swimming pool': 'Pool',
  'hot tub': 'Hot tub',
  jacuzzi: 'Hot tub',
  gym: 'Gym',
  'fitness center': 'Gym',
  'air conditioning': 'Air conditioning',
  ac: 'Air conditioning',
  'a/c': 'Air conditioning',
  heating: 'Heating',
  tv: 'TV',
  television: 'TV',
  'cable tv': 'TV',
  fireplace: 'Indoor fireplace',
  'indoor fireplace': 'Indoor fireplace',
  'self check-in': 'Self check-in',
  'self check in': 'Self check-in',
  'keyless entry': 'Self check-in',
  'ev charger': 'EV charger',
  sauna: 'Sauna',
  essentials: 'Essentials',
  'essentials - towels, bed sheets, soap, and toilet paper': 'Essentials',
};

/** Map a raw amenity string to a catalog label, or null if unknown. */
export function canonicalizeAmenity(raw: string): string | null {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;

  if (CATALOG_SET.has(trimmed)) return trimmed;

  const byLower = CATALOG_BY_LOWER.get(trimmed.toLowerCase());
  if (byLower) return byLower;

  const alias = LEGACY_AMENITY_ALIASES[trimmed.toLowerCase()];
  if (typeof alias === 'string') return alias;
  if (Array.isArray(alias)) return alias[0] ?? null;

  return null;
}

/** Expand legacy aliases that map to multiple catalog labels (e.g. Washer/Dryer). */
export function expandAmenityAliases(raw: string): string[] {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return [];

  if (CATALOG_SET.has(trimmed)) return [trimmed];

  const alias = LEGACY_AMENITY_ALIASES[trimmed.toLowerCase()];
  if (Array.isArray(alias)) return alias.filter((a) => CATALOG_SET.has(a));
  if (typeof alias === 'string' && CATALOG_SET.has(alias)) return [alias];

  const canonical = canonicalizeAmenity(trimmed);
  if (canonical) return [canonical];

  return [trimmed];
}

/** Normalize an amenity array: dedupe, map aliases, preserve unknown legacy labels. */
export function normalizeAmenityList(amenities: unknown): string[] {
  if (!Array.isArray(amenities)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of amenities) {
    const expanded = expandAmenityAliases(String(raw ?? '').trim());
    for (const label of expanded) {
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(label);
      }
    }
  }

  return result;
}

/** Split selected amenities into catalog vs legacy (not in catalog). */
export function splitAmenities(selected: string[]): {
  catalog: string[];
  legacy: string[];
} {
  const catalog: string[] = [];
  const legacy: string[] = [];
  const seen = new Set<string>();

  for (const raw of selected) {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (CATALOG_SET.has(trimmed)) {
      catalog.push(trimmed);
    } else {
      legacy.push(trimmed);
    }
  }

  return { catalog, legacy };
}

/** Whether a label is in the official catalog. */
export function isCatalogAmenity(label: string): boolean {
  return CATALOG_SET.has(label);
}
