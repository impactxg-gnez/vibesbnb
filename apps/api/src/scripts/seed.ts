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

      // Add mock images using Picsum Photos (reliable placeholder service)
      // Different seed values for variety
      const baseSeeds = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];
      const listingSeed = baseSeeds[listings.length % baseSeeds.length];
      
      for (let j = 0; j < 5; j++) {
        const seed = listingSeed + j;
        await firebase.create('listing_media', {
          listingId,
          url: `https://picsum.photos/seed/${seed}/800/600`,
          type: 'image',
          width: 800,
          height: 600,
          variants: {
            thumbnail: `https://picsum.photos/seed/${seed}/200/200`,
            small: `https://picsum.photos/seed/${seed}/400/300`,
            medium: `https://picsum.photos/seed/${seed}/800/600`,
            large: `https://picsum.photos/seed/${seed}/1600/1200`,
          },
          order: j,
          altText: `${data.title} - Image ${j + 1}`,
        });
      }

      listings.push({ id: listingId, hostId: host.id, title: data.title });
    }
  }

  console.log('✅ Created 12 listings with images');

  // Note: Bookings removed - users will create real bookings through the app
  console.log('✅ Skipped dummy bookings - users will create their own');

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


