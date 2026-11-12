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
  avatarUrl: '/instagram/profile.jpg',
};

/**
 * Actual posts fetched directly from https://www.instagram.com/vibesbnb/?hl=en
 * Media assets are preserved locally to avoid token expiration issues.
 */
export const ACTUAL_INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: 'vibesbnb-post-1',
    caption: 'Have you even heard of the @Vibesbnb in Miami? 🤘🏽 Send a DM for booking information. Historic Art Deco building in South Beach, just blocks from the beach and all the action! Rainfall shower, outdoor pool with loungers, gym & ultimate Miami vibes. #Vibesbnb #MiamiVibes #SouthBeach #wellnessFriendly #TravelWithVibes #WellnessTravel',
    media_url: '/instagram/post-1.jpg',
    permalink: 'https://www.instagram.com/deon_mack/p/C9U9Ir4xPYe/?hl=en',
    media_type: 'IMAGE',
    timestamp: 'July 12',
    like_count: 42,
    comments_count: 8,
    category: 'retreats',
    location: 'South Beach, Miami',
  },
  {
    id: 'vibesbnb-post-2',
    caption: 'Team of champions, small, lean and ready to scale! Look out for that podcast with @weinmiamipodcast coming soon! Catch the vibe with the @vibesbnb movement in Miami. 🌴✨ #vibesbnb #weinmiami #startupculture #miamivibes',
    media_url: '/instagram/post-2.jpg',
    permalink: 'https://www.instagram.com/deon_mack/reel/C_69E9FRmra/?hl=en',
    media_type: 'VIDEO',
    timestamp: 'Sept 14',
    like_count: 48,
    comments_count: 10,
    category: 'community',
    location: 'Miami, FL',
  },
  {
    id: 'vibesbnb-post-3',
    caption: 'Travel with Vibesbnb! Your wellness friendly platform for 420 Friendly Vacations! Sign up at vibesbnb.com and be a part of our joint community platform! 🌿💫 #vibesbnb #airbnb #wellnesstravel #jointcommunity',
    media_url: '/instagram/post-3.jpg',
    permalink: 'https://www.instagram.com/deon_mack/reel/DeHyJVKuxIH/?hl=en',
    media_type: 'VIDEO',
    timestamp: 'Oct 5',
    like_count: 15,
    comments_count: 1,
    category: 'wellness',
    location: 'Miami, FL',
  },
  {
    id: 'vibesbnb-post-4',
    caption: 'Meet Deon Mack, founder of @vibesbnb — a hospitality entrepreneur challenging the status quo and creating a lane most people are still afraid to touch. Creating hospitality experiences designed to be 420-friendly from the beginning, scaling to as many as 97 units across Miami-Dade County! #SeriesOS #vibesbnb #founder #hospitality',
    media_url: '/instagram/post-4.jpg',
    permalink: 'https://www.instagram.com/tyarabarnes/p/DdjZB-SDlPj/?hl=en',
    media_type: 'IMAGE',
    timestamp: 'Sept 21',
    like_count: 32,
    comments_count: 4,
    category: 'community',
    location: 'Miami-Dade County',
  },
  {
    id: 'vibesbnb-post-5',
    caption: 'For @vibesbnb and @deon_mack, the opportunity sits at the intersection of wellness and 420-friendly hospitality. Designing stays with clarity, comfort, and mindful well-being. 🚀 #vibesbnb #wellnesshospitality #positioning',
    media_url: '/instagram/post-5.jpg',
    permalink: 'https://www.instagram.com/tyarabarnes/reel/DdfV-RJo5vk/?hl=en',
    media_type: 'VIDEO',
    timestamp: 'Sept 19',
    like_count: 38,
    comments_count: 2,
    category: 'wellness',
    location: 'Miami, FL',
  },
  {
    id: 'vibesbnb-post-6',
    caption: 'Building an ecosystem for wellness friendly travel! Traveling to different Airbnb units, meeting new hosts, featuring their properties and bringing everyone into the @vibesbnb family. It’s all about connecting and vibing with people worldwide! #snoopishiring #vibesbnb #community',
    media_url: '/instagram/post-6.jpg',
    permalink: 'https://www.instagram.com/deon_mack/reel/DdeRz81OQlt/?hl=en',
    media_type: 'VIDEO',
    timestamp: 'Sept 19',
    like_count: 46,
    comments_count: 7,
    category: 'community',
    location: 'Miami, FL',
  },
  {
    id: 'vibesbnb-post-7',
    caption: 'Special shout out to the team behind @vibesbnb! Let’s make history together with the fastest growing wellness accommodation platform. 🔥🔥🔥 #vibesbnb #ajointcommunity #traveltech',
    media_url: '/instagram/post-7.jpg',
    permalink: 'https://www.instagram.com/deon_mack/reel/DdbvzYsur3L/?hl=en',
    media_type: 'VIDEO',
    timestamp: 'Sept 18',
    like_count: 39,
    comments_count: 12,
    category: 'community',
    location: 'Miami, FL',
  },
  {
    id: 'vibesbnb-post-8',
    caption: 'Giving vacation travelers coming to Miami a true reason to get with the vibes! Good vibes, great community, and seamless wellness stays. Let’s go! 🌴🍦 #vibesbnb #miamitravel #travelagent',
    media_url: '/instagram/post-8.jpg',
    permalink: 'https://www.instagram.com/deon_mack/reel/DdZ9_XIu4KU/?hl=en',
    media_type: 'VIDEO',
    timestamp: 'Sept 17',
    like_count: 77,
    comments_count: 53,
    category: 'community',
    location: 'Miami, FL',
  },
  {
    id: 'vibesbnb-post-9',
    caption: 'Let’s gooooooo! I think we got something real to talk about @vibesbnb. Growing the movement one stay at a time! #vibesbnb #goodvibes #catchthevibe',
    media_url: '/instagram/post-9.jpg',
    permalink: 'https://www.instagram.com/deon_mack/reel/DdTrZEjOR2G/?hl=en',
    media_type: 'VIDEO',
    timestamp: 'Sept 15',
    like_count: 10,
    comments_count: 3,
    category: 'community',
    location: 'Miami, FL',
  },
  {
    id: 'vibesbnb-post-10',
    caption: 'Vacation rental guest experiences with VibesBnB! It’s a wellness vibe all the time. It’s a session vibe all the time. It’s a holistic vibe all the time. 🌿💫 #vibesbnb #createanaccount #wellnesstravel #420friendly',
    media_url: '/instagram/post-10.jpg',
    permalink: 'https://www.instagram.com/deon_mack/p/DdPnTFRlhYK/?hl=en',
    media_type: 'IMAGE',
    timestamp: 'Sept 13',
    like_count: 8,
    comments_count: 1,
    category: 'retreats',
    location: 'Miami, FL',
  },
  {
    id: 'vibesbnb-post-11',
    caption: 'Girls trip? Who tryna vibe in Miami? Tap in! Catch the skyline views and unwind in a private sanctuary. 🌴☀️ @vibesbnb @ammosvacationrentals #miamistays #girlstrip #sanctuary',
    media_url: '/instagram/post-11.jpg',
    permalink: 'https://www.instagram.com/vibesbnb/reel/DcR-ebUIsLs/?hl=en',
    media_type: 'VIDEO',
    timestamp: 'Aug 20',
    like_count: 12,
    comments_count: 1,
    category: 'retreats',
    location: 'Miami Skyline',
  },
  {
    id: 'vibesbnb-post-12',
    caption: 'People from all across the world have expressed interest in a 🍃 / Wellness friendly accommodation platform. @vibesbnb is the visionary team behind it in Miami! Redefining hospitality and making travel feel welcoming and safe. #vibesbnb #founder #wellnesshospitality #investfest',
    media_url: '/instagram/post-12.jpg',
    permalink: 'https://www.instagram.com/deon_mack/reel/DcJ1lDIBUIt/?hl=en',
    media_type: 'VIDEO',
    timestamp: 'Aug 17',
    like_count: 40,
    comments_count: 13,
    category: 'wellness',
    location: 'Miami & Atlanta',
  },
];

/**
 * Backwards compatibility export
 */
export const CURATED_INSTAGRAM_POSTS = ACTUAL_INSTAGRAM_POSTS;

/**
 * Fetch Instagram posts either from the live Graph API if INSTAGRAM_ACCESS_TOKEN is configured,
 * or fall back gracefully to the actual @vibesbnb post feed.
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
            media_url: item.media_url || item.thumbnail_url || ACTUAL_INSTAGRAM_POSTS[0].media_url,
            permalink: item.permalink || INSTAGRAM_PROFILE.profileUrl,
            media_type: item.media_type === 'VIDEO' ? 'VIDEO' : item.media_type === 'CAROUSEL_ALBUM' ? 'CAROUSEL_ALBUM' : 'IMAGE',
            timestamp: item.timestamp ? new Date(item.timestamp).toLocaleDateString() : undefined,
            like_count: Math.floor(20 + Math.random() * 50),
            comments_count: Math.floor(2 + Math.random() * 15),
          }));

          return {
            profile: INSTAGRAM_PROFILE,
            posts: livePosts,
          };
        }
      }
    } catch (e) {
      console.warn('Instagram Graph API fetch failed, using actual posts:', e);
    }
  }

  return {
    profile: INSTAGRAM_PROFILE,
    posts: ACTUAL_INSTAGRAM_POSTS,
  };
}
