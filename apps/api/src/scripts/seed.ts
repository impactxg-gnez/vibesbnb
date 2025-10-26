import { FirebaseService } from '../firebase/firebase.service';
import { UserRole, KYCStatus, ListingStatus, WellnessTag, BookingStatus, CancellationPolicy, PayoutStatus } from '@vibesbnb/shared';
import * as bcrypt from 'bcrypt';

async function seed() {
  const firebase = new FirebaseService();
  firebase.onModuleInit();

  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const adminId = await firebase.create('users', {
    email: 'admin@vibesbnb.com',
    passwordHash: adminPasswordHash,
    name: 'Admin User',
    role: UserRole.ADMIN,
    phone: '+1234567890',
    mfaEnabled: false,
    kycStatus: KYCStatus.APPROVED,
  });

  await firebase.create('user_profiles', {
    userId: adminId,
    bio: 'Platform administrator',
    verifiedEmail: true,
    verifiedPhone: true,
  });

  console.log('✅ Created admin user');

  // Create 3 host users
  const hosts: Array<{ id: string; name: string }> = [];
  for (let i = 1; i <= 3; i++) {
    const passwordHash = await bcrypt.hash('password123', 10);
    const hostId = await firebase.create('users', {
      email: `host${i}@vibesbnb.com`,
      passwordHash,
      name: `Host ${i}`,
      role: UserRole.HOST,
      phone: `+123456789${i}`,
      mfaEnabled: false,
      kycStatus: KYCStatus.APPROVED,
      stripeConnectId: `acct_mock_${i}`,
    });

    await firebase.create('user_profiles', {
      userId: hostId,
      bio: `Experienced host passionate about wellness travel. Hosting since 202${i}.`,
      avatar: `https://i.pravatar.cc/150?u=host${i}`,
      languages: ['English', 'Spanish'],
      verifiedEmail: true,
      verifiedPhone: true,
    });

    hosts.push({ id: hostId, name: `Host ${i}` });
  }

  console.log('✅ Created 3 host users');

  // Create 5 guest users
  const guests: Array<{ id: string; name: string }> = [];
  for (let i = 1; i <= 5; i++) {
    const passwordHash = await bcrypt.hash('password123', 10);
    const guestId = await firebase.create('users', {
      email: `guest${i}@vibesbnb.com`,
      passwordHash,
      name: `Guest ${i}`,
      role: UserRole.GUEST,
      phone: `+198765432${i}`,
      mfaEnabled: false,
      kycStatus: KYCStatus.NOT_STARTED,
    });

    await firebase.create('user_profiles', {
      userId: guestId,
      bio: `Wellness enthusiast and traveler`,
      avatar: `https://i.pravatar.cc/150?u=guest${i}`,
      verifiedEmail: true,
      verifiedPhone: false,
    });

    guests.push({ id: guestId, name: `Guest ${i}` });
  }

  console.log('✅ Created 5 guest users');

  // Create 12 listings (4 per host)
  const listings: Array<{ id: string; hostId: string; title: string }> = [];
  const listingData = [
    {
      title: '420-Friendly Mountain Retreat',
      description: 'Cozy cabin in the mountains perfect for relaxation and meditation. Cannabis-friendly property with stunning views.',
      city: 'Boulder',
      state: 'Colorado',
      wellnessTags: [WellnessTag.CANNABIS_FRIENDLY, WellnessTag.MEDITATION_ROOM, WellnessTag.NATURE_RETREAT],
      basePrice: 15000, // $150
      amenities: ['wifi', 'kitchen', 'hot_tub', 'fireplace', 'smoking_allowed'],
    },
    {
      title: 'Yoga Studio Loft',
      description: 'Urban loft with dedicated yoga space. Smoke-free environment, perfect for mindful travelers.',
      city: 'Portland',
      state: 'Oregon',
      wellnessTags: [WellnessTag.YOGA_SPACE, WellnessTag.SMOKE_FREE, WellnessTag.MEDITATION_ROOM],
      basePrice: 12000,
      amenities: ['wifi', 'kitchen', 'workspace', 'gym'],
    },
    {
      title: 'Beachfront Wellness Villa',
      description: 'Luxurious beachfront villa with spa facilities and organic products. Cannabis and vegan-friendly.',
      city: 'Malibu',
      state: 'California',
      wellnessTags: [WellnessTag.CANNABIS_FRIENDLY, WellnessTag.SPA_FACILITIES, WellnessTag.ORGANIC_PRODUCTS, WellnessTag.VEGAN_FRIENDLY],
      basePrice: 30000,
      amenities: ['wifi', 'pool', 'hot_tub', 'beach_access', 'smoking_allowed'],
    },
    {
      title: 'Desert Meditation Dome',
      description: 'Unique geodesic dome in the desert. Perfect for spiritual retreats and stargazing.',
      city: 'Sedona',
      state: 'Arizona',
      wellnessTags: [WellnessTag.MEDITATION_ROOM, WellnessTag.NATURE_RETREAT, WellnessTag.CANNABIS_FRIENDLY],
      basePrice: 18000,
      amenities: ['wifi', 'outdoor_seating', 'fireplace'],
    },
  ];

  for (const host of hosts) {
    for (let i = 0; i < 4; i++) {
      const data = listingData[i % listingData.length];
      const listingId = await firebase.create('listings', {
        hostId: host.id,
        title: `${data.title} ${i + 1}`,
        description: data.description,
        address: {
          street: `${100 + i} Main Street`,
          city: data.city,
          state: data.state,
          country: 'USA',
          zipCode: `9000${i}`,
          lat: 40.7128 + Math.random() * 10,
          lng: -74.006 + Math.random() * 10,
        },
        wellnessTags: data.wellnessTags,
        amenities: data.amenities,
        houseRules: ['no_parties', 'no_events', 'quiet_hours'],
        basePrice: data.basePrice,
        cleaningFee: 5000, // $50
        currency: 'USD',
        maxGuests: 4 + i,
        bedrooms: 2 + i,
        beds: 3 + i,
        bathrooms: 2,
        minNights: 2,
        maxNights: 30,
        instantBook: i % 2 === 0,
        status: ListingStatus.ACTIVE,
      });

      // Create internal calendar for listing
      await firebase.create('calendars', {
        listingId,
        source: 'internal',
        icalExportToken: `export_${listingId}_${Date.now()}`,
        syncEnabled: true,
      });

      // Add mock images
      for (let j = 0; j < 5; j++) {
        await firebase.create('listing_media', {
          listingId,
          url: `https://source.unsplash.com/800x600/?wellness,${data.city.toLowerCase()}`,
          type: 'image',
          width: 800,
          height: 600,
          variants: {
            thumbnail: `https://source.unsplash.com/200x200/?wellness`,
            small: `https://source.unsplash.com/400x300/?wellness`,
            medium: `https://source.unsplash.com/800x600/?wellness`,
            large: `https://source.unsplash.com/1600x1200/?wellness`,
          },
          order: j,
          altText: `${data.title} - Image ${j + 1}`,
        });
      }

      listings.push({ id: listingId, hostId: host.id, title: data.title });
    }
  }

  console.log('✅ Created 12 listings with images');

  // Create 20 bookings
  for (let i = 0; i < 20; i++) {
    const listing = listings[i % listings.length];
    const guest = guests[i % guests.length];
    
    const daysFromNow = (i % 3 === 0) ? -30 : (i % 3 === 1) ? 7 : 30; // Past, near future, far future
    const checkIn = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    const checkOut = new Date(checkIn.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 night stay

    const subtotal = 45000; // $450 for 3 nights
    const cleaningFee = 5000;
    const serviceFee = 4500;
    const taxes = 4360;
    const total = 58860;

    const status = daysFromNow < -7 ? BookingStatus.CHECKED_OUT :
                   daysFromNow < 0 ? BookingStatus.CHECKED_IN :
                   BookingStatus.CONFIRMED;

    const bookingId = await firebase.create('bookings', {
      listingId: listing.id,
      guestId: guest.id,
      hostId: listing.hostId,
      checkIn,
      checkOut,
      guests: 2,
      status,
      subtotal,
      cleaningFee,
      serviceFee,
      taxes,
      total,
      currency: 'USD',
      paymentIntentId: `pi_mock_${i}`,
      payoutStatus: status === BookingStatus.CHECKED_OUT ? PayoutStatus.COMPLETED : PayoutStatus.PENDING,
      cancellationPolicy: CancellationPolicy.MODERATE,
    });

    // Block dates in calendar
    await firebase.create('availability_blocks', {
      listingId: listing.id,
      startDate: checkIn,
      endDate: checkOut,
      isAvailable: false,
      reason: 'booking',
      source: 'internal',
      sourceId: bookingId,
    });

    // Add reviews for completed bookings
    if (status === BookingStatus.CHECKED_OUT) {
      await firebase.create('reviews', {
        bookingId,
        authorId: guest.id,
        targetUserId: listing.hostId,
        targetType: 'host',
        rating: 4 + Math.round(Math.random()),
        comment: 'Great stay! Very peaceful and welcoming. Perfect for a wellness retreat.',
        categories: {
          cleanliness: 5,
          communication: 5,
          checkIn: 4,
          accuracy: 5,
          location: 4,
          value: 4,
        },
      });
    }
  }

  console.log('✅ Created 20 bookings with reviews');

  // Create message threads and messages
  for (let i = 0; i < 10; i++) {
    const listing = listings[i % listings.length];
    const guest = guests[i % guests.length];

    const threadId = await firebase.create('message_threads', {
      listingId: listing.id,
      hostId: listing.hostId,
      guestId: guest.id,
      lastMessageAt: new Date(Date.now() - i * 1000 * 60 * 60),
      unreadCountHost: 0,
      unreadCountGuest: 0,
    });

    // Add messages
    await firebase.create('messages', {
      threadId,
      senderId: guest.id,
      body: 'Hi! Is the property available for next week?',
      read: true,
      sentAt: new Date(Date.now() - i * 1000 * 60 * 60 - 2000),
    });

    await firebase.create('messages', {
      threadId,
      senderId: listing.hostId,
      body: 'Yes! The dates are available. Looking forward to hosting you!',
      read: true,
      sentAt: new Date(Date.now() - i * 1000 * 60 * 60 - 1000),
    });
  }

  console.log('✅ Created 10 message threads with messages');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📝 Test accounts:');
  console.log('Admin: admin@vibesbnb.com / admin123');
  console.log('Hosts: host1@vibesbnb.com / password123 (and host2, host3)');
  console.log('Guests: guest1@vibesbnb.com / password123 (and guest2-5)');
  
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});


