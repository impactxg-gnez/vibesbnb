export enum ListingStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum WellnessTag {
  CANNABIS_FRIENDLY = '420_friendly',
  SMOKE_FREE = 'smoke_free',
  YOGA_SPACE = 'yoga_space',
  MEDITATION_ROOM = 'meditation_room',
  ORGANIC_PRODUCTS = 'organic_products',
  VEGAN_FRIENDLY = 'vegan_friendly',
  SPA_FACILITIES = 'spa_facilities',
  NATURE_RETREAT = 'nature_retreat',
}

export interface Listing {
  id: string;
  hostId: string;
  title: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    lat: number;
    lng: number;
  };
  wellnessTags: WellnessTag[];
  amenities: string[];
  houseRules: string[];
  basePrice: number;
  cleaningFee: number;
  currency: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  minNights: number;
  maxNights: number;
  instantBook: boolean;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListingMedia {
  id: string;
  listingId: string;
  url: string;
  type: 'image' | 'video';
  width: number;
  height: number;
  variants: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
  };
  order: number;
  altText?: string;
}

export interface SearchFilters {
  location?: {
    lat: number;
    lng: number;
    radius: number; // km
  };
  bbox?: {
    neLat: number;
    neLng: number;
    swLat: number;
    swLng: number;
  };
  checkIn?: Date;
  checkOut?: Date;
  guests?: number;
  wellnessTags?: WellnessTag[];
  priceMin?: number;
  priceMax?: number;
  instantBook?: boolean;
}


