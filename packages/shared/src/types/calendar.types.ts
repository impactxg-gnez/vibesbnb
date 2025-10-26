export enum CalendarSource {
  INTERNAL = 'internal',
  ICAL = 'ical',
}

export interface Calendar {
  id: string;
  listingId: string;
  source: CalendarSource;
  icalUrl?: string;
  icalExportToken?: string; // For exporting this listing's calendar
  lastSyncAt?: Date;
  syncEnabled: boolean;
  createdAt: Date;
}

export interface AvailabilityBlock {
  id: string;
  listingId: string;
  startDate: Date;
  endDate: Date;
  isAvailable: boolean;
  reason?: string; // 'booking' | 'host_blocked' | 'ical_blocked'
  source: CalendarSource;
  sourceId?: string; // booking ID or ical calendar ID
}

export interface PriceOverride {
  id: string;
  listingId: string;
  date: Date;
  nightlyPrice: number;
  reason?: string; // 'weekend' | 'holiday' | 'peak_season'
}

export interface DateAvailability {
  date: Date;
  available: boolean;
  price: number;
  minNights: number;
}


