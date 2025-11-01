import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import {
  Itinerary,
  ItineraryItem,
  CreateItineraryDto,
  CreateItineraryItemDto,
  ItineraryItemStatus,
  NearbyDispensary,
  NearbyRestaurant,
  WellnessActivityOption,
} from '@vibesbnb/shared';

@Injectable()
export class ItineraryService {
  constructor(private firebase: FirebaseService) {}

  async createItinerary(userId: string, data: CreateItineraryDto): Promise<Itinerary> {
    const itineraryId = await this.firebase.create('itineraries', {
      ...data,
      userId,
      currency: data.currency || 'USD',
      actualSpent: 0,
      isPublic: false,
      sharedWith: [],
    });

    const itinerary = await this.findById(itineraryId);
    if (!itinerary) {
      throw new Error('Failed to create itinerary');
    }
    return itinerary;
  }

  async findById(id: string): Promise<Itinerary | null> {
    return this.firebase.get('itineraries', id);
  }

  async findByUserId(userId: string): Promise<Itinerary[]> {
    return this.firebase.query('itineraries', [
      { field: 'userId', op: '==', value: userId },
    ]);
  }

  async findByBookingId(bookingId: string): Promise<Itinerary | null> {
    const itineraries = await this.firebase.query('itineraries', [
      { field: 'bookingId', op: '==', value: bookingId },
    ]);
    return itineraries[0] || null;
  }

  async updateItinerary(
    id: string,
    userId: string,
    data: Partial<Itinerary>,
  ): Promise<Itinerary> {
    const itinerary = await this.findById(id);
    if (!itinerary || itinerary.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    await this.firebase.update('itineraries', id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update itinerary');
    }
    return updated;
  }

  async deleteItinerary(id: string, userId: string): Promise<void> {
    const itinerary = await this.findById(id);
    if (!itinerary || itinerary.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Delete all itinerary items
    const items = await this.getItineraryItems(id);
    for (const item of items) {
      await this.firebase.delete('itinerary_items', item.id);
    }

    await this.firebase.delete('itineraries', id);
  }

  // Itinerary Items
  async addItineraryItem(
    itineraryId: string,
    userId: string,
    data: CreateItineraryItemDto,
  ): Promise<ItineraryItem> {
    const itinerary = await this.findById(itineraryId);
    if (!itinerary || itinerary.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const itemId = await this.firebase.create('itinerary_items', {
      ...data,
      itineraryId,
      status: ItineraryItemStatus.PLANNED,
      currency: data.currency || itinerary.currency,
    });

    // Update itinerary's actualSpent if item has a price
    if (data.price) {
      const newSpent = (itinerary.actualSpent || 0) + data.price;
      await this.firebase.update('itineraries', itineraryId, {
        actualSpent: newSpent,
      });
    }

    return this.firebase.get('itinerary_items', itemId);
  }

  async getItineraryItems(itineraryId: string): Promise<ItineraryItem[]> {
    return this.firebase.query(
      'itinerary_items',
      [{ field: 'itineraryId', op: '==', value: itineraryId }],
      { field: 'startTime', direction: 'asc' },
    );
  }

  async updateItineraryItem(
    itemId: string,
    userId: string,
    data: Partial<ItineraryItem>,
  ): Promise<ItineraryItem> {
    const item = await this.firebase.get('itinerary_items', itemId);
    if (!item) {
      throw new NotFoundException('Itinerary item not found');
    }

    const itinerary = await this.findById(item.itineraryId);
    if (!itinerary || itinerary.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Update actualSpent if price changed
    if (data.price !== undefined && data.price !== item.price) {
      const priceDiff = (data.price || 0) - (item.price || 0);
      const newSpent = (itinerary.actualSpent || 0) + priceDiff;
      await this.firebase.update('itineraries', itinerary.id, {
        actualSpent: newSpent,
      });
    }

    await this.firebase.update('itinerary_items', itemId, data);
    return this.firebase.get('itinerary_items', itemId);
  }

  async deleteItineraryItem(itemId: string, userId: string): Promise<void> {
    const item = await this.firebase.get('itinerary_items', itemId);
    if (!item) {
      throw new NotFoundException('Itinerary item not found');
    }

    const itinerary = await this.findById(item.itineraryId);
    if (!itinerary || itinerary.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Update actualSpent
    if (item.price) {
      const newSpent = Math.max(0, (itinerary.actualSpent || 0) - item.price);
      await this.firebase.update('itineraries', itinerary.id, {
        actualSpent: newSpent,
      });
    }

    await this.firebase.delete('itinerary_items', itemId);
  }

  // Discovery endpoints for nearby services
  async getNearbyDispensaries(
    lat: number,
    lng: number,
    radius: number = 10,
  ): Promise<NearbyDispensary[]> {
    // Mock data for now - in production, integrate with Leafly, Weedmaps, or similar APIs
    return [
      {
        id: 'disp1',
        name: 'Green Valley Wellness',
        address: '123 Main St',
        city: 'Boulder',
        state: 'CO',
        zipCode: '80302',
        phone: '(303) 555-0123',
        website: 'https://greenvalley.com',
        rating: 4.8,
        distance: 2.3,
        hours: {
          monday: '9:00 AM - 8:00 PM',
          tuesday: '9:00 AM - 8:00 PM',
          wednesday: '9:00 AM - 8:00 PM',
          thursday: '9:00 AM - 8:00 PM',
          friday: '9:00 AM - 9:00 PM',
          saturday: '10:00 AM - 9:00 PM',
          sunday: '10:00 AM - 7:00 PM',
        },
        amenities: ['medical', 'recreational', 'delivery', 'pickup'],
        specialties: ['flower', 'edibles', 'concentrates', 'topicals'],
      },
      {
        id: 'disp2',
        name: 'Mountain Herb Co.',
        address: '456 Pearl St',
        city: 'Boulder',
        state: 'CO',
        zipCode: '80302',
        phone: '(303) 555-0456',
        rating: 4.6,
        distance: 3.1,
        amenities: ['recreational', 'pickup'],
        specialties: ['flower', 'pre-rolls', 'edibles'],
      },
    ];
  }

  async getNearbyRestaurants(
    lat: number,
    lng: number,
    radius: number = 5,
  ): Promise<NearbyRestaurant[]> {
    // Mock data - in production, integrate with Yelp, Google Places, or DoorDash API
    return [
      {
        id: 'rest1',
        name: 'Blissful Bowls',
        address: '789 Wellness Way',
        city: 'Boulder',
        state: 'CO',
        phone: '(303) 555-0789',
        website: 'https://blissfulbowls.com',
        rating: 4.7,
        priceLevel: 2,
        cuisineType: ['healthy', 'bowls', 'vegan'],
        distance: 1.2,
        deliveryAvailable: true,
        reservationsAvailable: false,
        dietaryOptions: ['vegan', 'vegetarian', 'gluten-free', 'organic'],
      },
      {
        id: 'rest2',
        name: 'Zenith Restaurant',
        address: '321 Calm St',
        city: 'Boulder',
        state: 'CO',
        phone: '(303) 555-0321',
        rating: 4.9,
        priceLevel: 3,
        cuisineType: ['fusion', 'organic', 'farm-to-table'],
        distance: 2.8,
        deliveryAvailable: true,
        reservationsAvailable: true,
        dietaryOptions: ['vegetarian', 'gluten-free', 'organic'],
      },
    ];
  }

  async getWellnessActivities(
    city: string,
    state: string,
  ): Promise<WellnessActivityOption[]> {
    // Mock data - in production, integrate with ClassPass, Mindbody, or similar APIs
    return [
      {
        id: 'act1',
        title: 'Sunrise Yoga Flow',
        type: 'yoga',
        description: 'Start your day with an energizing vinyasa flow overlooking the mountains',
        duration: 60,
        price: 2500, // $25
        location: 'Mountain View Studio, Boulder',
        rating: 4.9,
        difficulty: 'intermediate',
        provider: 'Zen Mountain Yoga',
      },
      {
        id: 'act2',
        title: 'CBD Massage Therapy',
        type: 'spa',
        description: 'Therapeutic massage with CBD-infused oils for deep relaxation',
        duration: 90,
        price: 12000, // $120
        location: 'Wellness Spa Boulder',
        rating: 4.8,
        provider: 'Boulder Wellness Center',
      },
      {
        id: 'act3',
        title: 'Guided Forest Meditation',
        type: 'meditation',
        description: 'Connect with nature through guided mindfulness practice in the forest',
        duration: 45,
        price: 3500, // $35
        location: 'Chautauqua Park Trailhead',
        rating: 4.7,
        difficulty: 'beginner',
        provider: 'Mountain Mindfulness',
      },
    ];
  }
}

