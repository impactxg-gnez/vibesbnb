import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { scrapeWithPuppeteer } from '@/lib/scraper-puppeteer';

// Force Node.js runtime (not Edge) to support cheerio and puppeteer
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for scraping

interface ScrapedPropertyData {
  name: string;
  description: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  guests: number;
  price: number;
  amenities: string[];
  images: string[];
  wellnessFriendly: boolean;
  googleMapsUrl?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { url, usePuppeteer } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log('[Scraper] Starting scrape for:', url);

    // Detect if this is an Airbnb URL
    const isAirbnb = url.includes('airbnb.com');

    let propertyData: ScrapedPropertyData;

    // Use Puppeteer by default for Airbnb (better results, more images)
    // Can be overridden with usePuppeteer: false
    const shouldUsePuppeteer = usePuppeteer !== false && isAirbnb;

    if (shouldUsePuppeteer) {
      console.log('[Scraper] Using Puppeteer (browser automation)');
      try {
        propertyData = await scrapeWithPuppeteer(url);
      } catch (puppeteerError: any) {
        console.error('[Scraper] Puppeteer failed, falling back to Cheerio:', puppeteerError.message);
        // Fallback to Cheerio if Puppeteer fails
        propertyData = await scrapeWithCheerio(url, isAirbnb);
      }
    } else {
      console.log('[Scraper] Using Cheerio (fast mode)');
      propertyData = await scrapeWithCheerio(url, isAirbnb);
    }

    const duration = Date.now() - startTime;
    console.log(`[Scraper] Completed in ${duration}ms - Images: ${propertyData.images.length}, Amenities: ${propertyData.amenities.length}`);

    return NextResponse.json({ 
      success: true, 
      data: propertyData,
      meta: {
        scrapingMethod: shouldUsePuppeteer ? 'puppeteer' : 'cheerio',
        duration,
      }
    });

  } catch (error: any) {
    console.error('[Scraper] Error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape property data', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Cheerio-based scraping (fallback method)
 */
async function scrapeWithCheerio(url: string, isAirbnb: boolean): Promise<ScrapedPropertyData> {
  // Fetch the property page
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch property page');
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  if (isAirbnb) {
    return await scrapeAirbnb($, html, url);
  } else {
    return await scrapeGeneric($, url);
  }
}

async function scrapeAirbnb($: cheerio.CheerioAPI, html: string, url: string): Promise<ScrapedPropertyData> {
  const propertyData: ScrapedPropertyData = {
    name: '',
    description: '',
    location: '',
    bedrooms: 0,
    bathrooms: 0,
    beds: 0,
    guests: 0,
    price: 100,
    amenities: [],
    images: [],
    wellnessFriendly: false,
  };

  try {
    // Airbnb embeds data in script tags with type="application/json"
    // Look for the main data object
    let listingData: any = null;

    // Try to find embedded JSON data
    $('script[type="application/json"]').each((_, el) => {
      try {
        const scriptContent = $(el).html();
        if (scriptContent) {
          const jsonData = JSON.parse(scriptContent);
          
          // Look for listing data in various possible locations
          if (jsonData?.data?.presentation?.stayProductDetailPage) {
            listingData = jsonData.data.presentation.stayProductDetailPage;
          } else if (jsonData?.niobeMinimalClientData) {
            listingData = jsonData.niobeMinimalClientData;
          }
        }
      } catch (e) {
        // Continue searching other script tags
      }
    });

    // Also try to find JSON in script tags without type
    if (!listingData) {
      $('script:not([src])').each((_, el) => {
        try {
          const scriptContent = $(el).html() || '';
          
          // Look for window.__INITIAL_STATE__ or similar patterns
          const stateMatch = scriptContent.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
          if (stateMatch) {
            const stateData = JSON.parse(stateMatch[1]);
            if (stateData?.listingInfo) {
              listingData = stateData.listingInfo;
            }
          }
        } catch (e) {
          // Continue searching
        }
      });
    }

    // Extract from structured data
    if (listingData) {
      // Extract title/name
      propertyData.name = 
        listingData?.sections?.titleModule?.title ||
        listingData?.title ||
        listingData?.listing?.title ||
        '';

      // Extract description
      propertyData.description = 
        listingData?.sections?.descriptionModule?.description ||
        listingData?.description ||
        listingData?.listing?.description ||
        '';

      // Extract location
      const location = listingData?.sections?.locationModule || listingData?.location || listingData?.listing?.location;
      if (location) {
        propertyData.location = `${location.city || ''}, ${location.state || ''} ${location.country || ''}`.trim();
        
        // Extract coordinates
        if (location.lat && location.lng) {
          propertyData.coordinates = {
            lat: location.lat,
            lng: location.lng,
          };
          propertyData.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
        }
      }

      // Extract room details
      const overview = listingData?.sections?.overviewModule || listingData?.overview || listingData?.listing;
      if (overview) {
        // Look for structured room data
        const roomDetails = overview?.listingDetails || overview?.details || [];
        
        roomDetails.forEach((detail: any) => {
          const title = (detail.title || '').toLowerCase();
          const value = parseInt(detail.value || '0');
          
          if (title.includes('guest')) propertyData.guests = value;
          if (title.includes('bedroom')) propertyData.bedrooms = value;
          if (title.includes('bed') && !title.includes('bedroom')) propertyData.beds = value;
          if (title.includes('bath')) propertyData.bathrooms = value;
        });
      }

      // Extract images
      const photos = listingData?.sections?.photoModule?.images || 
                    listingData?.listing?.photos || 
                    listingData?.photos || [];
      
      propertyData.images = photos
        .map((photo: any) => {
          // Get the highest quality image URL
          return photo?.xxlPictureUrl || 
                 photo?.xlPictureUrl || 
                 photo?.pictureUrl || 
                 photo?.url ||
                 (typeof photo === 'string' ? photo : null);
        })
        .filter((url: string | null) => url && isValidImageUrl(url));

      // Extract amenities
      const amenitiesData = listingData?.sections?.amenitiesModule?.seeAllAmenitiesGroups || 
                           listingData?.listing?.amenities ||
                           [];
      
      const amenitiesSet = new Set<string>();
      amenitiesData.forEach((group: any) => {
        const items = group?.amenities || group?.items || [];
        items.forEach((amenity: any) => {
          const name = amenity?.title || amenity?.name || '';
          if (name) {
            amenitiesSet.add(normalizeAmenity(name));
          }
        });
      });
      
      propertyData.amenities = Array.from(amenitiesSet).filter(a => a);
    }

    // Fallback to meta tags and DOM parsing if JSON extraction failed
    if (!propertyData.name) {
      propertyData.name = 
        $('h1').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        $('title').text().split('·')[0].trim();
    }

    if (!propertyData.description) {
      propertyData.description = 
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';
    }

    // Try to extract room info from visible text if not found in JSON
    if (propertyData.guests === 0 || propertyData.bedrooms === 0) {
      const overviewText = $('[data-section-id="OVERVIEW_DEFAULT"]').text() ||
                          $('._tqmy57').text() || 
                          $('body').text();
      
      const guestMatch = overviewText.match(/(\d+)\s+guests?/i);
      const bedroomMatch = overviewText.match(/(\d+)\s+bedrooms?/i);
      const bedMatch = overviewText.match(/(\d+)\s+beds?(?!\s*room)/i);
      const bathroomMatch = overviewText.match(/(\d+)\s+bathrooms?/i);

      if (guestMatch && propertyData.guests === 0) propertyData.guests = parseInt(guestMatch[1]);
      if (bedroomMatch && propertyData.bedrooms === 0) propertyData.bedrooms = parseInt(bedroomMatch[1]);
      if (bedMatch && propertyData.beds === 0) propertyData.beds = parseInt(bedMatch[1]);
      if (bathroomMatch && propertyData.bathrooms === 0) propertyData.bathrooms = parseInt(bathroomMatch[1]);
    }

    // Extract images from meta tags if not found in JSON
    if (propertyData.images.length === 0) {
      const images = new Set<string>();
      
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content');
        if (src && isValidImageUrl(src)) {
          images.add(src);
        }
      });

      propertyData.images = Array.from(images);
    }

    // Check for wellness/smoke-free mentions
    const fullText = html.toLowerCase();
    if (fullText.includes('smoke-free') || 
        fullText.includes('no smoking') || 
        fullText.includes('non-smoking')) {
      propertyData.wellnessFriendly = true;
    }

  } catch (error) {
    console.error('Error parsing Airbnb data:', error);
  }

  return propertyData;
}

async function scrapeGeneric($: cheerio.CheerioAPI, url: string): Promise<ScrapedPropertyData> {
  const propertyData: ScrapedPropertyData = {
    name: '',
    description: '',
    location: '',
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    guests: 2,
    price: 100,
    amenities: [],
    images: [],
    wellnessFriendly: false,
  };

  // Extract basic info
  propertyData.name = 
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().trim();

  propertyData.description = 
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';

  propertyData.location = 
    $('.location').text().trim() ||
    $('[itemprop="address"]').text().trim() ||
    '';

  // Extract images
  const images = new Set<string>();
  
  $('meta[property="og:image"]').each((_, el) => {
    const src = $(el).attr('content');
    if (src && isValidImageUrl(src)) {
      images.add(src);
    }
  });

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && isValidImageUrl(src)) {
      try {
        const absoluteUrl = new URL(src, url).href;
        images.add(absoluteUrl);
      } catch (e) {
        // Invalid URL, skip
      }
    }
  });

  propertyData.images = Array.from(images);

  // Extract room details from text
  const bodyText = $('body').text();
  const guestMatch = bodyText.match(/(\d+)\s+guests?/i);
  const bedroomMatch = bodyText.match(/(\d+)\s+bedrooms?/i);
  const bedMatch = bodyText.match(/(\d+)\s+beds?(?!\s*room)/i);
  const bathroomMatch = bodyText.match(/(\d+)\s+bathrooms?/i);

  if (guestMatch) propertyData.guests = parseInt(guestMatch[1]);
  if (bedroomMatch) propertyData.bedrooms = parseInt(bedroomMatch[1]);
  if (bedMatch) propertyData.beds = parseInt(bedMatch[1]);
  if (bathroomMatch) propertyData.bathrooms = parseInt(bathroomMatch[1]);

  return propertyData;
}

function normalizeAmenity(amenity: string): string {
  const normalized = amenity.trim();
  
  // Map common variations to standard names
  const amenityMap: { [key: string]: string } = {
    'wifi': 'WiFi',
    'wi-fi': 'WiFi',
    'internet': 'WiFi',
    'wireless internet': 'WiFi',
    'kitchen': 'Kitchen',
    'parking': 'Parking',
    'free parking': 'Parking',
    'pool': 'Pool',
    'swimming pool': 'Pool',
    'hot tub': 'Hot Tub',
    'jacuzzi': 'Hot Tub',
    'gym': 'Gym',
    'fitness center': 'Gym',
    'air conditioning': 'Air Conditioning',
    'ac': 'Air Conditioning',
    'heating': 'Heating',
    'tv': 'TV',
    'television': 'TV',
    'washer': 'Washer/Dryer',
    'dryer': 'Washer/Dryer',
    'laundry': 'Washer/Dryer',
    'workspace': 'Workspace',
    'dedicated workspace': 'Workspace',
    'fireplace': 'Fireplace',
  };

  const lowerNormalized = normalized.toLowerCase();
  return amenityMap[lowerNormalized] || normalized;
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Skip tiny images, icons, and common non-property images
  if (url.includes('icon') || 
      url.includes('logo') || 
      url.includes('avatar') ||
      url.includes('sprite') ||
      url.includes('favicon')) {
    return false;
  }
  
  // Check for image extensions or image hosting patterns
  const imagePatterns = /\.(jpg|jpeg|png|webp|gif)($|\?|&)/i;
  const imageHosts = /(images|img|photos|media|cdn|cloudinary|unsplash|airbnb\.com\/pictures)/i;
  
  return imagePatterns.test(url) || imageHosts.test(url);
}

