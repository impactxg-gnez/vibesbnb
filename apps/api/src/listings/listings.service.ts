import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { StorageService } from '../storage/storage.service';
import { Listing, ListingStatus, ListingMedia, SearchFilters, KYCStatus } from '@vibesbnb/shared';
import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';

@Injectable()
export class ListingsService {
  private mapsClient: GoogleMapsClient;

  constructor(
    private firebase: FirebaseService,
    private storage: StorageService,
  ) {
    this.mapsClient = new GoogleMapsClient({});
  }

  async create(hostId: string, data: Partial<Listing>): Promise<Listing> {
    // Verify host has approved KYC
    const host = await this.firebase.get('users', hostId);
    if (host.kycStatus !== KYCStatus.APPROVED) {
      throw new ForbiddenException('KYC verification required to create listings');
    }

    // Geocode address
    const coordinates = await this.geocodeAddress(data.address);

    const listingId = await this.firebase.create('listings', {
      ...data,
      hostId,
      address: {
        ...data.address,
        lat: coordinates.lat,
        lng: coordinates.lng,
      },
      status: ListingStatus.DRAFT,
      currency: 'USD',
    });

    return this.findById(listingId);
  }

  async findById(id: string): Promise<Listing | null> {
    return this.firebase.get('listings', id);
  }

  async update(id: string, hostId: string, data: Partial<Listing>): Promise<Listing> {
    const listing = await this.findById(id);
    if (!listing || listing.hostId !== hostId) {
      throw new ForbiddenException('Not authorized');
    }

    // Re-geocode if address changed
    if (data.address) {
      const coordinates = await this.geocodeAddress(data.address);
      data.address = {
        ...data.address,
        lat: coordinates.lat,
        lng: coordinates.lng,
      };
    }

    await this.firebase.update('listings', id, data);
    return this.findById(id);
  }

  async delete(id: string, hostId: string): Promise<void> {
    const listing = await this.findById(id);
    if (!listing || listing.hostId !== hostId) {
      throw new ForbiddenException('Not authorized');
    }

    await this.firebase.delete('listings', id);
  }

  async publish(id: string, hostId: string): Promise<Listing> {
    const listing = await this.findById(id);
    if (!listing || listing.hostId !== hostId) {
      throw new ForbiddenException('Not authorized');
    }

    // Validate listing is complete
    if (!listing.title || !listing.description || !listing.address) {
      throw new BadRequestException('Listing incomplete');
    }

    await this.firebase.update('listings', id, {
      status: ListingStatus.PENDING_REVIEW,
    });

    return this.findById(id);
  }

  async search(filters: SearchFilters): Promise<Listing[]> {
    let query: any[] = [
      { field: 'status', op: '==', value: ListingStatus.ACTIVE },
    ];

    if (filters.wellnessTags && filters.wellnessTags.length > 0) {
      query.push({
        field: 'wellnessTags',
        op: 'array-contains-any',
        value: filters.wellnessTags,
      });
    }

    if (filters.instantBook !== undefined) {
      query.push({
        field: 'instantBook',
        op: '==',
        value: filters.instantBook,
      });
    }

    let listings = await this.firebase.query('listings', query);

    // Filter by location (client-side for now)
    if (filters.bbox) {
      listings = listings.filter((listing) => {
        const { lat, lng } = listing.address;
        return (
          lat >= filters.bbox.swLat &&
          lat <= filters.bbox.neLat &&
          lng >= filters.bbox.swLng &&
          lng <= filters.bbox.neLng
        );
      });
    }

    if (filters.location) {
      listings = listings.filter((listing) => {
        const distance = this.calculateDistance(
          filters.location.lat,
          filters.location.lng,
          listing.address.lat,
          listing.address.lng,
        );
        return distance <= filters.location.radius;
      });
    }

    // Filter by price
    if (filters.priceMin || filters.priceMax) {
      listings = listings.filter((listing) => {
        if (filters.priceMin && listing.basePrice < filters.priceMin) return false;
        if (filters.priceMax && listing.basePrice > filters.priceMax) return false;
        return true;
      });
    }

    // Filter by guests
    if (filters.guests) {
      listings = listings.filter((listing) => listing.maxGuests >= filters.guests);
    }

    return listings;
  }

  async uploadMedia(listingId: string, hostId: string, file: Buffer): Promise<ListingMedia> {
    const listing = await this.findById(listingId);
    if (!listing || listing.hostId !== hostId) {
      throw new ForbiddenException('Not authorized');
    }

    const uploadResult = await this.storage.uploadImage(file, `listings/${listingId}`);

    // Get current media count for ordering
    const existingMedia = await this.firebase.query('listing_media', [
      { field: 'listingId', op: '==', value: listingId },
    ]);

    const mediaId = await this.firebase.create('listing_media', {
      listingId,
      url: uploadResult.url,
      type: 'image',
      width: uploadResult.width,
      height: uploadResult.height,
      variants: uploadResult.variants,
      order: existingMedia.length,
    });

    return this.firebase.get('listing_media', mediaId);
  }

  async getMedia(listingId: string): Promise<ListingMedia[]> {
    return this.firebase.query(
      'listing_media',
      [{ field: 'listingId', op: '==', value: listingId }],
      { field: 'order', direction: 'asc' },
    );
  }

  async getHostListings(hostId: string): Promise<Listing[]> {
    return this.firebase.query('listings', [
      { field: 'hostId', op: '==', value: hostId },
    ]);
  }

  private async geocodeAddress(address: any): Promise<{ lat: number; lng: number }> {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      // Return mock coordinates for dev
      return { lat: 40.7128, lng: -74.006 };
    }

    try {
      const response = await this.mapsClient.geocode({
        params: {
          address: `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      });

      if (response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }

      throw new BadRequestException('Address not found');
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new BadRequestException('Failed to geocode address');
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}


