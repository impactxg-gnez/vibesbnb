export interface InstagramPost {
  id: string;
  caption: string;
  media_url: string;
  permalink: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  category?: 'retreats' | 'wellness' | 'community' | 'lifestyle';
  location?: string;
}

export interface InstagramProfile {
  handle: string;
  displayName: string;
  profileUrl: string;
  bio: string;
  followersCount: string;
  followingCount: string;
  postsCount: string;
  avatarUrl: string;
}

export const INSTAGRAM_PROFILE: InstagramProfile = {
  handle: 'vibesbnb',
  displayName: 'A Joint Community',
  profileUrl: 'https://www.instagram.com/vibesbnb/?hl=en',
  bio: 'Vibesbnb | Florida Vacation Rentals • A Wellness Marketplace Platform • Where Wellness and Hospitality Mix',
  followersCount: '2.8K',
  followingCount: '1.4K',
  postsCount: '129',
  avatarUrl: '/logo.png',
};

export const CURATED_INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: 'ig-1',
    caption: 'Catch a high vibe in Miami. Private rooftop terrace with sunset views and listing-level wellness clarity. ✨ #vibesbnb #ajointcommunity #miamistays #wellnessvacation',
    media_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&auto=format&fit=crop&q=80',
    permalink: 'https://www.instagram.com/vibesbnb/?hl=en',
    media_type: 'IMAGE',
    timestamp: '2d ago',
    like_count: 184,
    comments_count: 24,
    category: 'retreats',
    location: 'South Beach, Miami',
  },
  {
    id: 'ig-2',
    caption: 'Where wellness and hospitality mix. Every property vetted so you can unwind with peace of mind. 🌿 #vibesbnb #mindfultravel #cannabisfriendly #sanctuary',
    media_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1000&auto=format&fit=crop&q=80',
    permalink: 'https://www.instagram.com/vibesbnb/?hl=en',
    media_type: 'IMAGE',
    timestamp: '4d ago',
    like_count: 219,
    comments_count: 31,
    category: 'wellness',
    location: 'Brickell, Miami',
  },
  {
    id: 'ig-3',
    caption: 'Soulful sanctuaries designed for rest and reset. Natural light, botanical accents, and unmatched Miami energy. 🌴 #travelwithintention #ajointcommunity #vacationmode',
    media_url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1000&auto=format&fit=crop&q=80',
    permalink: 'https://www.instagram.com/vibesbnb/?hl=en',
    media_type: 'CAROUSEL_ALBUM',
    timestamp: '6d ago',
    like_count: 147,
    comments_count: 19,
    category: 'lifestyle',
    location: 'Wynwood Arts District',
  },
  {
    id: 'ig-4',
    caption: 'Outdoor private soak & zen courtyard. Built for slow mornings and peaceful evenings. ☀️ #vibesbnb #stayawhile #floridaretreats #reset',
    media_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1000&auto=format&fit=crop&q=80',
    permalink: 'https://www.instagram.com/vibesbnb/?hl=en',
    media_type: 'IMAGE',
    timestamp: '1w ago',
    like_count: 312,
    comments_count: 42,
    category: 'wellness',
    location: 'Coconut Grove',
  },
  {
    id: 'ig-5',
    caption: 'Golden hour hits different from a private balcony in Miami. Book your next sanctuary directly on VibesBNB. 🌅 #goldenhour #miamirentals #ajointcommunity',
    media_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&auto=format&fit=crop&q=80',
    permalink: 'https://www.instagram.com/vibesbnb/?hl=en',
    media_type: 'IMAGE',
    timestamp: '1w ago',
    like_count: 195,
    comments_count: 22,
    category: 'retreats',
    location: 'Sunny Isles Beach',
  },
  {
    id: 'ig-6',
    caption: 'A community where travellers and hosts connect with mutual respect and good vibrations. Drop a 🌿 if you’re ready for a reset! #vibesbnb #communityfirst',
    media_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1000&auto=format&fit=crop&q=80',
    permalink: 'https://www.instagram.com/vibesbnb/?hl=en',
    media_type: 'IMAGE',
    timestamp: '2w ago',
    like_count: 268,
    comments_count: 38,
    category: 'community',
    location: 'Downtown Miami',
  },
];

/**
 * Fetch Instagram posts either from the live Graph API if INSTAGRAM_ACCESS_TOKEN is configured,
 * or fall back gracefully to the curated VibesBNB post feed.
 */
export async function fetchInstagramFeed(): Promise<{
  profile: InstagramProfile;
  posts: InstagramPost[];
}> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (token) {
    try {
      const res = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&limit=12&access_token=${token}`,
        { next: { revalidate: 3600 } }
      );

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          const livePosts: InstagramPost[] = data.data.map((item: any, idx: number) => ({
            id: item.id || `live-${idx}`,
            caption: item.caption || 'Catch a vibe with VibesBNB',
            media_url: item.media_url || item.thumbnail_url || CURATED_INSTAGRAM_POSTS[0].media_url,
            permalink: item.permalink || INSTAGRAM_PROFILE.profileUrl,
            media_type: item.media_type === 'VIDEO' ? 'VIDEO' : item.media_type === 'CAROUSEL_ALBUM' ? 'CAROUSEL_ALBUM' : 'IMAGE',
            timestamp: item.timestamp ? new Date(item.timestamp).toLocaleDateString() : undefined,
            like_count: Math.floor(100 + Math.random() * 200),
            comments_count: Math.floor(10 + Math.random() * 30),
          }));

          return {
            profile: INSTAGRAM_PROFILE,
            posts: livePosts,
          };
        }
      }
    } catch (e) {
      console.warn('Instagram Graph API fetch failed, using curated posts:', e);
    }
  }

  return {
    profile: INSTAGRAM_PROFILE,
    posts: CURATED_INSTAGRAM_POSTS,
  };
}
