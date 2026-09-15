/**
 * Canonical VibesBnB host bulk-upload CSV: RFC 4180 parse/serialize, header
 * aliases, and numeric bounds so commas in locations/descriptions cannot shift
 * bathrooms/price into the wrong columns.
 */

import { unwrapProxiedImageUrl } from './propertyImageUrls';

export const BULK_CSV_MAX_BYTES = 1024 * 1024;
export const BULK_CSV_TEMPLATE_PATH = '/templates/vibesbnb-property-template.csv';
export const BULK_CSV_FILENAME = 'vibesbnb-property-template.csv';

export const REQUIRED_BULK_CSV_COLUMNS = ['name', 'type', 'location', 'price', 'guests'] as const;

export const OPTIONAL_BULK_CSV_COLUMNS = [
  'guest_access_type',
  'bedrooms',
  'beds',
  'bathrooms',
  'cleaning_fee',
  'description',
  'amenities',
  'wellness_friendly',
  'image_urls',
  'latitude',
  'longitude',
  'google_maps_url',
] as const;

export const BULK_CSV_TEMPLATE_COLUMNS = [
  'name',
  'type',
  'guest_access_type',
  'location',
  'guests',
  'bedrooms',
  'beds',
  'bathrooms',
  'price',
  'cleaning_fee',
  'description',
  'amenities',
  'wellness_friendly',
  'image_urls',
  'latitude',
  'longitude',
  'google_maps_url',
] as const;

export const NUMERIC_BOUNDS = {
  guests: { min: 1, max: 50, integer: true },
  bedrooms: { min: 0, max: 50, integer: true },
  beds: { min: 0, max: 50, integer: true },
  bathrooms: { min: 0, max: 20, integer: false },
  price: { min: 0.01, max: 100_000, integer: false },
  cleaning_fee: { min: 0, max: 100_000, integer: false },
} as const;

export const SUSPICIOUS_THRESHOLDS = {
  bathrooms: 8,
  bedrooms: 12,
  beds: 16,
  guests: 20,
  price: 10_000,
} as const;

const HEADER_ALIASES: Record<string, string> = {
  name: 'name',
  type: 'type',
  location: 'location',
  price: 'price',
  guests: 'guests',
  guest_access_type: 'guest_access_type',
  guestaccesstype: 'guest_access_type',
  guest_access: 'guest_access_type',
  bedrooms: 'bedrooms',
  beds: 'beds',
  bathrooms: 'bathrooms',
  baths: 'bathrooms',
  cleaning_fee: 'cleaning_fee',
  cleaningfee: 'cleaning_fee',
  description: 'description',
  amenities: 'amenities',
  wellness_friendly: 'wellness_friendly',
  wellnessfriendly: 'wellness_friendly',
  image_urls: 'image_urls',
  imageurls: 'image_urls',
  images: 'image_urls',
  latitude: 'latitude',
  lat: 'latitude',
  longitude: 'longitude',
  lng: 'longitude',
  lon: 'longitude',
  google_maps_url: 'google_maps_url',
  googlemapsurl: 'google_maps_url',
};

const MISSING_TEMPLATE_HINT =
  'This file does not match the VibesBnB template. Download the template and copy your listing data into it. Airbnb, Booking, and other marketplace CSV exports are not supported.';

export interface BulkProperty {
  name: string;
  type: string;
  guestAccessType: string;
  location: string;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  price: number;
  cleaningFee?: number;
  description?: string;
  amenities?: string;
  wellnessFriendly?: boolean;
  imageUrls?: string[];
  sourceUrl?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  warnings?: string[];
}

export interface ParsedBulkCsvResult {
  success: boolean;
  properties: BulkProperty[];
  errors: string[];
}

export type BulkCountField = 'guests' | 'bedrooms' | 'beds' | 'bathrooms' | 'price';

const EXAMPLE_ROWS: Record<(typeof BULK_CSV_TEMPLATE_COLUMNS)[number], string>[] = [
  {
    name: 'Mountain View Cabin',
    type: 'Cabin',
    guest_access_type: 'An entire place',
    location: 'Aspen, Colorado',
    guests: '4',
    bedrooms: '2',
    beds: '3',
    bathrooms: '1',
    price: '250',
    cleaning_fee: '75',
    description: 'A cozy cabin with stunning mountain views',
    amenities: 'WiFi|Kitchen|Parking|Fireplace',
    wellness_friendly: 'true',
    image_urls:
      'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800|https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800',
    latitude: '39.1911',
    longitude: '-106.8175',
    google_maps_url: '',
  },
  {
    name: 'Coastal Cottage',
    type: 'House',
    guest_access_type: 'An entire place',
    location: 'Santa Barbara, California',
    guests: '6',
    bedrooms: '3',
    beds: '4',
    bathrooms: '2',
    price: '320',
    cleaning_fee: '90',
    description: 'Bright cottage a short walk from the beach',
    amenities: 'WiFi|Kitchen|Beach Access|Parking',
    wellness_friendly: 'true',
    image_urls:
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800|https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800',
    latitude: '34.4208',
    longitude: '-119.6982',
    google_maps_url: '',
  },
];

export function parseCsvRecords(text: string): string[][] {
  let input = text;
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const c = input[i];

    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }

    if (c === '\r' || c === '\n') {
      if (c === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }

    field += c;
    i += 1;
  }

  if (inQuotes || field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function serializeCsvRecords(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n') + '\r\n';
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildTemplateCsv(): string {
  const header = [...BULK_CSV_TEMPLATE_COLUMNS];
  const data = EXAMPLE_ROWS.map((example) =>
    BULK_CSV_TEMPLATE_COLUMNS.map((col) => example[col] ?? '')
  );
  return serializeCsvRecords([header, ...data]);
}

export function parseAmenitiesList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[;,|]/)
    .map((a) => a.trim())
    .filter(Boolean);
}

export function joinAmenities(amenities: string[]): string {
  return amenities.map((a) => a.trim()).filter(Boolean).join('|');
}

export function isCountSuspicious(field: BulkCountField, value: number): boolean {
  const threshold = SUSPICIOUS_THRESHOLDS[field];
  return Number.isFinite(value) && value > threshold;
}

function compactHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function aliasKey(raw: string): string {
  return compactHeader(raw).replace(/_/g, '');
}

function canonicalizeHeader(raw: string): string | null {
  const compact = compactHeader(raw);
  if (!compact) return null;
  return HEADER_ALIASES[compact] ?? HEADER_ALIASES[aliasKey(raw)] ?? null;
}

function isEmptyRow(cells: string[]): boolean {
  return cells.every((c) => !c.trim());
}

function parseFiniteCoord(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function parseBoolean(value: string | undefined): boolean {
  const v = (value || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function parseBoundedNumber(
  raw: string,
  bounds: { min: number; max: number; integer: boolean },
  label: string
): { value: number } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: `${label} is required` };
  }
  const n = bounds.integer ? Number.parseInt(trimmed, 10) : Number.parseFloat(trimmed);
  if (!Number.isFinite(n)) {
    return { error: `${label} "${trimmed}" is not a valid number` };
  }
  if (n < bounds.min || n > bounds.max) {
    return {
      error: `${label} "${trimmed}" is out of range (expected ${bounds.min}–${bounds.max})`,
    };
  }
  return { value: n };
}

function parseOptionalBoundedNumber(
  raw: string | undefined,
  bounds: { min: number; max: number; integer: boolean },
  label: string,
  fallback: number
): { value: number } | { error: string } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { value: fallback };
  return parseBoundedNumber(trimmed, bounds, label);
}

function parseImageUrls(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split('|')
    .map((url) => url.trim())
    .filter((url) => url && (url.startsWith('http://') || url.startsWith('https://')))
    .map((url) => unwrapProxiedImageUrl(url))
    .filter(Boolean);
}

function rowWarnings(property: BulkProperty): string[] {
  const warnings: string[] = [];
  if (isCountSuspicious('bathrooms', property.bathrooms)) {
    warnings.push(`Bathrooms (${property.bathrooms}) looks unusually high — confirm before importing.`);
  }
  if (isCountSuspicious('bedrooms', property.bedrooms)) {
    warnings.push(`Bedrooms (${property.bedrooms}) looks unusually high — confirm before importing.`);
  }
  if (isCountSuspicious('beds', property.beds)) {
    warnings.push(`Beds (${property.beds}) looks unusually high — confirm before importing.`);
  }
  if (isCountSuspicious('guests', property.guests)) {
    warnings.push(`Guests (${property.guests}) looks unusually high — confirm before importing.`);
  }
  if (isCountSuspicious('price', property.price)) {
    warnings.push(`Nightly price ($${property.price}) looks unusually high — confirm before importing.`);
  }
  return warnings;
}

export function getBulkPropertyWarnings(property: BulkProperty): string[] {
  return rowWarnings(property);
}

export function parseBulkPropertyCsv(
  text: string,
  options?: { sourceUrl?: string }
): ParsedBulkCsvResult {
  const records = parseCsvRecords(text).filter((row, index) => (index === 0 ? true : !isEmptyRow(row)));
  if (records.length < 2) {
    return {
      success: false,
      properties: [],
      errors: ['File must have a header row and at least one data row'],
    };
  }

  const rawHeaders = records[0];
  const headers: string[] = [];
  const seen = new Set<string>();
  const unknownHeaders: string[] = [];

  for (const raw of rawHeaders) {
    const canonical = canonicalizeHeader(raw);
    if (!canonical) {
      const label = raw.trim();
      if (label) unknownHeaders.push(label);
      headers.push('');
      continue;
    }
    if (seen.has(canonical)) {
      return {
        success: false,
        properties: [],
        errors: [`Duplicate column "${canonical}". ${MISSING_TEMPLATE_HINT}`],
      };
    }
    seen.add(canonical);
    headers.push(canonical);
  }

  const missingHeaders = REQUIRED_BULK_CSV_COLUMNS.filter((h) => !seen.has(h));
  if (missingHeaders.length > 0) {
    return {
      success: false,
      properties: [],
      errors: [`Missing required columns: ${missingHeaders.join(', ')}. ${MISSING_TEMPLATE_HINT}`],
    };
  }

  const properties: BulkProperty[] = [];
  const errors: string[] = [];

  if (unknownHeaders.length > 0) {
    errors.push(
      `Ignored unknown column${unknownHeaders.length === 1 ? '' : 's'}: ${unknownHeaders.join(', ')}. Use the downloaded template column names.`
    );
  }

  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    const excelRow = i + 1;

    if (values.length > rawHeaders.length) {
      errors.push(
        `Row ${excelRow}: expected ${rawHeaders.length} columns, found ${values.length}. Check for unquoted commas (quote locations like "Aspen, Colorado") or extra cells.`
      );
      continue;
    }
    while (values.length < rawHeaders.length) values.push('');

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) row[h] = (values[idx] || '').trim();
    });

    if (!row.name || !row.location || !row.price || !row.type || !row.guests) {
      errors.push(`Row ${excelRow}: Missing required fields (name, type, location, price, or guests)`);
      continue;
    }

    const guests = parseBoundedNumber(row.guests, NUMERIC_BOUNDS.guests, 'guests');
    if ('error' in guests) {
      errors.push(`Row ${excelRow}: ${guests.error}`);
      continue;
    }

    const price = parseBoundedNumber(row.price, NUMERIC_BOUNDS.price, 'price');
    if ('error' in price) {
      errors.push(`Row ${excelRow}: ${price.error}`);
      continue;
    }

    const bedrooms = parseOptionalBoundedNumber(
      row.bedrooms,
      NUMERIC_BOUNDS.bedrooms,
      'bedrooms',
      1
    );
    if ('error' in bedrooms) {
      errors.push(`Row ${excelRow}: ${bedrooms.error}`);
      continue;
    }

    const beds = parseOptionalBoundedNumber(row.beds, NUMERIC_BOUNDS.beds, 'beds', 1);
    if ('error' in beds) {
      errors.push(`Row ${excelRow}: ${beds.error}`);
      continue;
    }

    const bathrooms = parseOptionalBoundedNumber(
      row.bathrooms,
      NUMERIC_BOUNDS.bathrooms,
      'bathrooms',
      1
    );
    if ('error' in bathrooms) {
      errors.push(`Row ${excelRow}: ${bathrooms.error}`);
      continue;
    }

    const cleaningFee = parseOptionalBoundedNumber(
      row.cleaning_fee,
      NUMERIC_BOUNDS.cleaning_fee,
      'cleaning_fee',
      0
    );
    if ('error' in cleaningFee) {
      errors.push(`Row ${excelRow}: ${cleaningFee.error}`);
      continue;
    }

    const imageUrls = parseImageUrls(row.image_urls);
    const latitude = parseFiniteCoord(row.latitude);
    const longitude = parseFiniteCoord(row.longitude);
    const hasCoords =
      latitude != null &&
      longitude != null &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;
    const googleMapsUrl =
      row.google_maps_url ||
      (hasCoords
        ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        : undefined);

    const property: BulkProperty = {
      name: row.name,
      type: row.type,
      guestAccessType: row.guest_access_type || 'An entire place',
      location: row.location,
      guests: guests.value,
      bedrooms: bedrooms.value,
      beds: beds.value,
      bathrooms: bathrooms.value,
      price: price.value,
      cleaningFee: cleaningFee.value,
      description: row.description || '',
      amenities: joinAmenities(parseAmenitiesList(row.amenities)),
      wellnessFriendly: parseBoolean(row.wellness_friendly),
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      sourceUrl: options?.sourceUrl,
      ...(hasCoords ? { latitude, longitude, googleMapsUrl } : {}),
    };
    property.warnings = rowWarnings(property);
    properties.push(property);
  }

  return {
    success: properties.length > 0,
    properties,
    errors,
  };
}
