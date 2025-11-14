export enum ItineraryItemType {
  ACCOMMODATION = 'accommodation',
  DISPENSARY = 'dispensary',
  RESTAURANT = 'restaurant',
  FOOD_DELIVERY = 'food_delivery',
  WELLNESS_EXPERIENCE = 'wellness_experience',
  SPA = 'spa',
  YOGA = 'yoga',
  MEDITATION = 'meditation',
  TRANSPORTATION = 'transportation',
  ACTIVITY = 'activity',
  LOCAL_ATTRACTION = 'local_attraction',
  CUSTOM = 'custom',
}

export enum ItineraryItemStatus {
  PLANNED = 'planned',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DeliveryType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  DINE_IN = 'dine_in',
}

export interface ItineraryItemLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
}

export interface DispensaryItem {
  productName: string;
  productType: string; // flower, edibles, concentrates, topicals, etc.
  quantity: number;
  price: number;
  thcContent?: string;
  cbdContent?: string;
  notes?: string;
}

export interface RestaurantReservation {
  partySize: number;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  confirmationNumber?: string;
}

export interface WellnessExperience {
  experienceType: string; // yoga_class, spa_treatment, meditation_session, etc.
  duration: number; // in minutes
  instructor?: string;
  level?: string; // beginner, intermediate, advanced
  price: number;
}

export interface Transportation {
  transportType: string; // car_rental, uber, lyft, taxi, shuttle
  pickupLocation?: string;
  dropoffLocation?: string;
  estimatedPrice?: number;
  confirmationNumber?: string;
}

export interface ItineraryItem {
  id: string;
  itineraryId: string;
  type: ItineraryItemType;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  location?: ItineraryItemLocation;
  status: ItineraryItemStatus;
  
  // Type-specific data
  dispensaryItems?: DispensaryItem[];
  deliveryType?: DeliveryType;
  reservation?: RestaurantReservation;
  wellnessExperience?: WellnessExperience;
  transportation?: Transportation;
  
  // Common fields
  price?: number;
  currency?: string;
  confirmationNumber?: string;
  bookingUrl?: string;
  notes?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface Itinerary {
  id: string;
  userId: string;
  bookingId?: string;
  listingId?: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  destination: {
    city: string;
    state: string;
    country: string;
  };
  
  // Budget tracking
  estimatedBudget?: number;
  actualSpent?: number;
  currency: string;
  
  // Sharing & collaboration
  isPublic: boolean;
  sharedWith?: string[]; // User IDs
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateItineraryDto {
  bookingId?: string;
  listingId?: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  destination: {
    city: string;
    state: string;
    country: string;
  };
  estimatedBudget?: number;
  currency?: string;
}

export interface CreateItineraryItemDto {
  type: ItineraryItemType;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  location?: Partial<ItineraryItemLocation>;
  dispensaryItems?: DispensaryItem[];
  deliveryType?: DeliveryType;
  reservation?: Partial<RestaurantReservation>;
  wellnessExperience?: Partial<WellnessExperience>;
  transportation?: Partial<Transportation>;
  price?: number;
  currency?: string;
  notes?: string;
}

export interface NearbyDispensary {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  website?: string;
  rating?: number;
  distance?: number; // in miles
  hours?: {
    [day: string]: string;
  };
  amenities?: string[]; // medical, recreational, delivery, pickup
  specialties?: string[]; // flower, edibles, concentrates
}

export interface NearbyRestaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  website?: string;
  rating?: number;
  priceLevel?: number; // 1-4 ($-$$$$)
  cuisineType?: string[];
  distance?: number;
  deliveryAvailable: boolean;
  reservationsAvailable: boolean;
  dietaryOptions?: string[]; // vegan, vegetarian, gluten-free
}

export interface WellnessActivityOption {
  id: string;
  title: string;
  type: string;
  description: string;
  duration: number;
  price: number;
  location: string;
  rating?: number;
  difficulty?: string;
  provider?: string;
}

