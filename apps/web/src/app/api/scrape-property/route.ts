import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { scrapeWithPuppeteer } from '@/lib/scraper-puppeteer';

// Force Node.js runtime (not Edge) to support cheerio and puppeteer
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel function configuration (maxDuration in seconds)
export const maxDuration = 60; // 60 seconds timeout for Puppeteer scraping

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

/**
 * Geocode location using Google Geocoding API
 */
async function geocodeLocation(
  location?: string,
  coordinates?: { lat: number; lng: number }
): Promise<{
  formattedAddress?: string;
  placeId?: string;
  coordinates?: { lat: number; lng: number };
} | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.log('[Geocoding] No Google Maps API key found, skipping geocoding');
    return null;
  }

  try {
    let url = '';
    
    if (coordinates) {
      // Reverse geocoding: coordinates -> address
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.lat},${coordinates.lng}&key=${apiKey}`;
    } else if (location) {
      // Forward geocoding: address -> coordinates
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
    } else {
      return null;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        coordinates: coordinates || {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
      };
    }
  } catch (error) {
    console.error('[Geocoding] Error:', error);
  }

  return null;
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
    // Detect if this is an Esca Management URL
    const isEscaManagement = url.includes('esca-management.com');

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

    // Enhance location data with Google Geocoding
    console.log('[Scraper] Extracted location:', propertyData.location, 'Coordinates:', propertyData.coordinates);
    
    if (propertyData.coordinates || propertyData.location) {
      console.log('[Scraper] Geocoding location...');
      const geocodeResult = await geocodeLocation(
        propertyData.location,
        propertyData.coordinates
      );

      if (geocodeResult) {
        // Use geocoded data if available
        if (geocodeResult.formattedAddress) {
          propertyData.location = geocodeResult.formattedAddress;
        }
        if (geocodeResult.coordinates) {
          propertyData.coordinates = geocodeResult.coordinates;
          propertyData.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${geocodeResult.coordinates.lat},${geocodeResult.coordinates.lng}`;
        }
        console.log('[Scraper] Geocoded location:', propertyData.location);
      } else if (propertyData.coordinates) {
        // If geocoding failed but we have coordinates, still create maps URL
        propertyData.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${propertyData.coordinates.lat},${propertyData.coordinates.lng}`;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Scraper] Completed in ${duration}ms - Images: ${propertyData.images.length}, Location: ${propertyData.location || 'NOT FOUND'}, Amenities: ${propertyData.amenities.length}`);

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
  } else if (url.includes('esca-management.com')) {
    return await scrapeEscaManagement($, html, url);
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

      // Extract location - try multiple paths
      let location = listingData?.sections?.locationModule || 
                     listingData?.location || 
                     listingData?.listing?.location ||
                     listingData?.listing?.publicAddress ||
                     listingData?.publicAddress;
      
      if (location) {
        // Try different location formats
        if (typeof location === 'string') {
          propertyData.location = location;
        } else {
          // Build location string from parts
          const parts = [
            location.city,
            location.locality,
            location.neighborhood,
            location.state,
            location.region,
            location.country,
            location.countryCode
          ].filter(Boolean);
          propertyData.location = parts.join(', ').trim();
        }
        
        // Extract coordinates - try multiple paths
        let coords: { lat: number; lng: number } | null = null;
        
        // Try direct lat/lng
        if (location.lat && location.lng) {
          coords = { lat: location.lat, lng: location.lng };
        } else if (location.latitude && location.longitude) {
          coords = { lat: location.latitude, lng: location.longitude };
        } else if (location.coordinates) {
          // Array format [lat, lng] or [lng, lat]
          if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
            const [val1, val2] = location.coordinates;
            // Check which is which based on reasonable values
            if (Math.abs(val1) <= 90 && Math.abs(val2) <= 180) {
              coords = { lat: val1, lng: val2 };
            } else if (Math.abs(val2) <= 90 && Math.abs(val1) <= 180) {
              coords = { lat: val2, lng: val1 };
            }
          }
        }
        
        // Try nested location objects
        if (!coords && location.geo) {
          const geo = location.geo;
          if (geo.lat && geo.lng) {
            coords = { lat: geo.lat, lng: geo.lng };
          } else if (geo.latitude && geo.longitude) {
            coords = { lat: geo.latitude, lng: geo.longitude };
          }
        }
        
        // Try position object
        if (!coords && location.position) {
          const pos = location.position;
          if (pos.lat && pos.lng) {
            coords = { lat: pos.lat, lng: pos.lng };
          }
        }
        
        if (coords) {
          propertyData.coordinates = coords;
          propertyData.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
        }
      }
      
      // Also try to find coordinates in other parts of the data structure
      if (!propertyData.coordinates) {
        const findCoords = (obj: any, depth = 0): { lat: number; lng: number } | null => {
          if (depth > 10 || !obj || typeof obj !== 'object') return null;
          
          if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
            return { lat: obj.lat, lng: obj.lng };
          }
          if (typeof obj.latitude === 'number' && typeof obj.longitude === 'number') {
            return { lat: obj.latitude, lng: obj.longitude };
          }
          
          // Check common keys
          for (const key of ['location', 'coordinates', 'geo', 'position', 'map']) {
            if (obj[key]) {
              const result = findCoords(obj[key], depth + 1);
              if (result) return result;
            }
          }
          
          return null;
        };
        
        const coords = findCoords(listingData);
        if (coords) {
          propertyData.coordinates = coords;
          propertyData.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
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

      // Extract images - try multiple paths and formats
      const photos: any[] = [];
      
      // Try different paths in the data structure
      const photoSources = [
        listingData?.sections?.photoModule?.images,
        listingData?.sections?.photoModule?.photoList,
        listingData?.listing?.photos,
        listingData?.listing?.pictureList,
        listingData?.photos,
        listingData?.pictureList,
        listingData?.images,
        listingData?.media?.photos,
        listingData?.media?.images
      ].filter(Boolean);
      
      // Collect all photos from all sources
      photoSources.forEach((source: any) => {
        if (Array.isArray(source)) {
          photos.push(...source);
        } else if (typeof source === 'object' && source !== null) {
          // Handle object with photo arrays
          Object.values(source).forEach((value: any) => {
            if (Array.isArray(value)) {
              photos.push(...value);
            }
          });
        }
      });
      
      // Extract image URLs from photos
      const imageUrls = new Set<string>();
      
      photos.forEach((photo: any) => {
        if (typeof photo === 'string') {
          if (isValidImageUrl(photo)) {
            imageUrls.add(photo);
          }
        } else if (typeof photo === 'object' && photo !== null) {
          // Try all possible image URL properties
          const urlProperties = [
            'xxlPictureUrl', 'xlPictureUrl', 'largePictureUrl',
            'pictureUrl', 'url', 'src', 'image', 'photo',
            'mediumPictureUrl', 'smallPictureUrl', 'thumbnailUrl',
            'originalUrl', 'highResUrl', 'fullUrl'
          ];
          
          // Collect ALL image URLs from photo object, prioritizing higher quality
          const foundUrls: string[] = [];
          for (const prop of urlProperties) {
            const url = photo[prop];
            if (typeof url === 'string' && isValidImageUrl(url)) {
              foundUrls.push(url);
            }
          }
          
          // Add the highest quality image first, then others if different
          if (foundUrls.length > 0) {
            // Sort by quality (xxl > xl > large > others)
            foundUrls.sort((a, b) => {
              if (a.includes('xxl') && !b.includes('xxl')) return -1;
              if (b.includes('xxl') && !a.includes('xxl')) return 1;
              if (a.includes('xl') && !b.includes('xl')) return -1;
              if (b.includes('xl') && !a.includes('xl')) return 1;
              if (a.includes('large') && !b.includes('large')) return -1;
              if (b.includes('large') && !a.includes('large')) return 1;
              return 0;
            });
            
            // Add all unique URLs
            foundUrls.forEach(url => {
              if (!Array.from(imageUrls).some(existing => existing === url || existing.includes(url) || url.includes(existing))) {
                imageUrls.add(url);
              }
            });
          }
          
          // Also check nested objects
          if (photo.picture && typeof photo.picture === 'object') {
            for (const prop of urlProperties) {
              const url = photo.picture[prop];
              if (typeof url === 'string' && isValidImageUrl(url)) {
                if (!Array.from(imageUrls).some(existing => existing === url || existing.includes(url) || url.includes(existing))) {
                  imageUrls.add(url);
                }
              }
            }
          }
        }
      });
      
      // Also try to find images in the entire data structure recursively
      const findImagesInObject = (obj: any, depth = 0): void => {
        if (depth > 15 || !obj || typeof obj !== 'object') return;
        
        if (Array.isArray(obj)) {
          obj.forEach(item => {
            if (typeof item === 'string' && isValidImageUrl(item)) {
              imageUrls.add(item);
            } else if (typeof item === 'object') {
              findImagesInObject(item, depth + 1);
            }
          });
          return;
        }
        
        // Check for image-related keys
        const imageKeys = ['url', 'src', 'image', 'photo', 'picture', 'pictureUrl'];
        for (const key in obj) {
          const value = obj[key];
          if (typeof value === 'string' && isValidImageUrl(value)) {
            imageUrls.add(value);
          } else if (imageKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
            if (typeof value === 'string' && isValidImageUrl(value)) {
              imageUrls.add(value);
            } else if (typeof value === 'object' && value !== null) {
              findImagesInObject(value, depth + 1);
            }
          } else if (typeof value === 'object' && value !== null) {
            findImagesInObject(value, depth + 1);
          }
        }
      };
      
      // Search the entire listing data for images
      findImagesInObject(listingData);
      
      // Convert to array and sort by quality
      propertyData.images = Array.from(imageUrls).sort((a, b) => {
        // Prefer higher quality images
        if (a.includes('xxl') && !b.includes('xxl')) return -1;
        if (b.includes('xxl') && !a.includes('xxl')) return 1;
        if (a.includes('xl') && !b.includes('xl')) return -1;
        if (b.includes('xl') && !a.includes('xl')) return 1;
        if (a.includes('large') && !b.includes('large')) return -1;
        if (b.includes('large') && !a.includes('large')) return 1;
        return 0;
      });
      
      console.log(`[Cheerio] Extracted ${propertyData.images.length} images from ${photos.length} photo objects`);

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
    
    // Fallback location extraction if not found in JSON
    if (!propertyData.location) {
      // Try meta tags
      const ogLoc = $('meta[property="og:locality"]').attr('content');
      const ogRegion = $('meta[property="og:region"]').attr('content');
      const ogCountry = $('meta[property="og:country-name"]').attr('content');
      if (ogLoc || ogRegion || ogCountry) {
        propertyData.location = [ogLoc, ogRegion, ogCountry].filter(Boolean).join(', ');
      }
      
      // Try location section
      if (!propertyData.location) {
        const locationSection = $('[data-section-id="LOCATION_DEFAULT"]');
        if (locationSection.length) {
          const h2 = locationSection.find('h2').first();
          if (h2.length) {
            propertyData.location = h2.text().trim();
          } else {
            propertyData.location = locationSection.text().split('\n')[0]?.trim() || '';
          }
        }
      }
      
      // Try title parsing (e.g., "Rental unit in Colva")
      if (!propertyData.location) {
        const title = $('h1').first().text().trim();
        const inMatch = title.match(/in\s+(.+?)(?:\s*·|$)/i);
        if (inMatch) {
          propertyData.location = inMatch[1].trim();
        }
      }
    }
    
    // Try to extract coordinates from JSON-LD if not found
    if (!propertyData.coordinates) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const jsonLd = JSON.parse($(el).html() || '{}');
          if (jsonLd['@type'] === 'Place' || jsonLd['@type'] === 'Accommodation') {
            // Check for geo coordinates
            if (jsonLd.geo) {
              if (jsonLd.geo['@type'] === 'GeoCoordinates') {
                const lat = parseFloat(jsonLd.geo.latitude);
                const lng = parseFloat(jsonLd.geo.longitude);
                if (!isNaN(lat) && !isNaN(lng)) {
                  propertyData.coordinates = { lat, lng };
                  propertyData.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                  return false; // Break the loop
                }
              }
            }
          }
        } catch (e) {
          // Continue
        }
      });
    }
    
    // Try to extract coordinates from data attributes
    if (!propertyData.coordinates) {
      const mapEl = $('[data-lat], [data-latitude], [data-lng], [data-longitude]').first();
      if (mapEl.length) {
        const lat = parseFloat(mapEl.attr('data-lat') || mapEl.attr('data-latitude') || '');
        const lng = parseFloat(mapEl.attr('data-lng') || mapEl.attr('data-longitude') || '');
        if (!isNaN(lat) && !isNaN(lng)) {
          propertyData.coordinates = { lat, lng };
          propertyData.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        }
      }
    }
    
    // Try to extract coordinates from script tags with regex patterns
    if (!propertyData.coordinates) {
      let lat: number | null = null;
      let lng: number | null = null;
      
      $('script:not([src])').each((_, el) => {
        const content = $(el).html() || '';
        if (content.length < 50) return;
        
        // Try to parse as JSON first
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          try {
            const data = JSON.parse(content);
            const findCoords = (obj: any, depth = 0): { lat: number; lng: number } | null => {
              if (depth > 10 || !obj || typeof obj !== 'object') return null;
              if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
                return { lat: obj.lat, lng: obj.lng };
              }
              if (typeof obj.latitude === 'number' && typeof obj.longitude === 'number') {
                return { lat: obj.latitude, lng: obj.longitude };
              }
              for (const key of ['location', 'coordinates', 'geo', 'position']) {
                if (obj[key]) {
                  const result = findCoords(obj[key], depth + 1);
                  if (result) return result;
                }
              }
              return null;
            };
            const coords = findCoords(data);
            if (coords) {
              lat = coords.lat;
              lng = coords.lng;
              return false; // Break
            }
          } catch (e) {
            // Not valid JSON, continue with regex
          }
        }
        
        // Try regex patterns
        const latMatch = content.match(/"lat(?:itude)?"\s*:\s*([-\d.]+)/i);
        const lngMatch = content.match(/"lng|lon(?:gitude)?"\s*:\s*([-\d.]+)/i);
        
        if (latMatch && !lat) lat = parseFloat(latMatch[1]);
        if (lngMatch && !lng) lng = parseFloat(lngMatch[1]);
        
        // Try array format [lat, lng]
        const arrayMatch = content.match(/\[([-\d.]+)\s*,\s*([-\d.]+)\]/);
        if (arrayMatch && !lat && !lng) {
          const val1 = parseFloat(arrayMatch[1]);
          const val2 = parseFloat(arrayMatch[2]);
          if (!isNaN(val1) && !isNaN(val2)) {
            if (Math.abs(val1) <= 90 && Math.abs(val2) <= 180) {
              lat = val1;
              lng = val2;
            } else if (Math.abs(val2) <= 90 && Math.abs(val1) <= 180) {
              lat = val2;
              lng = val1;
            }
          }
        }
        
        if (lat !== null && lng !== null) {
          return false; // Break
        }
      });
      
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        propertyData.coordinates = { lat, lng };
        propertyData.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      }
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
      
      // Try meta tags
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content');
        if (src && isValidImageUrl(src)) {
          images.add(src);
        }
      });
      
      // Try img tags
      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-original-uri');
        if (src && isValidImageUrl(src)) {
          try {
            const absoluteUrl = new URL(src, url).href;
            images.add(absoluteUrl);
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });
      
      // Try background images
      $('[style*="background-image"]').each((_, el) => {
        const style = $(el).attr('style') || '';
        const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
        if (match && match[1]) {
          const src = match[1].trim();
          if (isValidImageUrl(src)) {
            try {
              const absoluteUrl = new URL(src, url).href;
              images.add(absoluteUrl);
            } catch (e) {
              // Invalid URL, skip
            }
          }
        }
      });
      
      // Try data attributes
      $('[data-src], [data-image], [data-photo]').each((_, el) => {
        const src = $(el).attr('data-src') || $(el).attr('data-image') || $(el).attr('data-photo');
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

async function scrapeEscaManagement($: cheerio.CheerioAPI, html: string, url: string): Promise<ScrapedPropertyData> {
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

  // Extract property name
  let rawName = 
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().split('|')[0].trim();
  
  // Remove "Property Listing" prefix if present
  propertyData.name = rawName
    .replace(/^Property\s+Listing[_\s-]*/i, '')
    .replace(/^property-listing[_\s-]*/i, '')
    .trim();

  // Extract location - look for "Ft Lauderdale, Florida" or similar patterns
  const locationText = $('body').text();
  const locationMatch = locationText.match(/(Ft\s+Lauderdale|Fort\s+Lauderdale|Miami|Tampa)[,\s]+(Florida|FL)/i);
  if (locationMatch) {
    propertyData.location = locationMatch[0];
  } else {
    // Fallback: look for location in common selectors
    propertyData.location = 
      $('.location').text().trim() ||
      $('[itemprop="address"]').text().trim() ||
      $('p:contains("Florida")').first().text().trim() ||
      '';
  }

  // Extract full description - combine all paragraph text from the description section
  let descriptionParts: string[] = [];
  
  // Look for description paragraphs - typically after the property name
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    // Skip short paragraphs (likely navigation or metadata)
    if (text.length > 50 && 
        !text.includes('Skip to') && 
        !text.includes('Book Now') &&
        !text.includes('Sign Up') &&
        !text.includes('Copyright')) {
      descriptionParts.push(text);
    }
  });

  // Combine description parts
  propertyData.description = descriptionParts
    .filter((part, index, arr) => {
      // Remove duplicates
      return arr.indexOf(part) === index;
    })
    .join('\n\n')
    .trim();

  // If description is still empty, try meta tags
  if (!propertyData.description) {
    propertyData.description = 
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';
  }

  // Extract property details from text
  const bodyText = $('body').text();
  
  // Extract guests (e.g., "10 Guests")
  const guestMatch = bodyText.match(/(\d+)\s+Guests?/i);
  if (guestMatch) propertyData.guests = parseInt(guestMatch[1]);

  // Extract bedrooms (e.g., "5-bedroom" or "5 Bedrooms")
  const bedroomMatch = bodyText.match(/(\d+)[-\s]bedroom/i) || bodyText.match(/(\d+)\s+Bedrooms?/i);
  if (bedroomMatch) propertyData.bedrooms = parseInt(bedroomMatch[1]);

  // Extract bathrooms (e.g., "4-bathroom" or "4 Bath")
  const bathroomMatch = bodyText.match(/(\d+(?:\.\d+)?)[-\s]bath/i) || bodyText.match(/(\d+(?:\.\d+)?)\s+Baths?/i);
  if (bathroomMatch) propertyData.bathrooms = parseFloat(bathroomMatch[1]);

  // Extract beds (e.g., "6 Beds")
  const bedMatch = bodyText.match(/(\d+)\s+Beds?(?!\s*room)/i);
  if (bedMatch) propertyData.beds = parseInt(bedMatch[1]);

  // Extract price (e.g., "$699 / night" or "From : $699 / night")
  const priceMatch = bodyText.match(/\$(\d+)\s*\/?\s*night/i) || bodyText.match(/From\s*:\s*\$(\d+)/i);
  if (priceMatch) {
    propertyData.price = parseInt(priceMatch[1]);
  }

  // Extract amenities - look for the amenities section
  const amenitiesSet = new Set<string>();
  
  // Try to find amenities in a list or grid
  $('li, .amenity, [class*="amenity"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 50 && !text.includes('Personalize') && !text.includes('Conditions')) {
      const normalized = normalizeAmenity(text);
      if (normalized) {
        amenitiesSet.add(normalized);
      }
    }
  });

  // Also extract from text patterns (e.g., "Air Conditioning", "Home Theater", etc.)
  const amenityKeywords = [
    'Air Conditioning', 'Home Theater', 'Pool', 'Living Room', 'Waterfront Deck',
    'Private Parking', 'Sound System', 'Outdoor Kitchen', 'Full Kitchen Appliances', 'Wi-Fi',
    'WiFi', 'Kitchen', 'Parking', 'Hot Tub', 'Gym', 'Heating', 'TV', 'Washer', 'Dryer',
    'Fireplace', 'Workspace', 'Pet Friendly'
  ];

  amenityKeywords.forEach(keyword => {
    if (bodyText.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))) {
      amenitiesSet.add(normalizeAmenity(keyword));
    }
  });

  propertyData.amenities = Array.from(amenitiesSet);

  // Extract images
  const images = new Set<string>();
  
  // Extract from meta tags
  $('meta[property="og:image"]').each((_, el) => {
    const src = $(el).attr('content');
    if (src && isValidImageUrl(src)) {
      images.add(src);
    }
  });

  // Extract from img tags
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    if (src && isValidImageUrl(src)) {
      try {
        const absoluteUrl = new URL(src, url).href;
        images.add(absoluteUrl);
      } catch (e) {
        // Invalid URL, skip
      }
    }
  });

  // Extract from background images
  $('[style*="background-image"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
    if (match && match[1]) {
      const imageUrl = match[1].trim();
      if (isValidImageUrl(imageUrl)) {
        try {
          const absoluteUrl = new URL(imageUrl, url).href;
          images.add(absoluteUrl);
        } catch (e) {
          // Invalid URL, skip
        }
      }
    }
  });

  propertyData.images = Array.from(images);
  
  // Ensure we have at least one image - try additional sources if needed
  if (propertyData.images.length === 0) {
    // Try to find images in gallery or carousel elements
    $('[class*="gallery"], [class*="carousel"], [class*="slider"], [class*="image"]').each((_, el) => {
      const img = $(el).find('img').first();
      const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
      if (src && isValidImageUrl(src)) {
        try {
          const absoluteUrl = new URL(src, url).href;
          propertyData.images.push(absoluteUrl);
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
    
    // If still no images, try to get the first large image from the page
    if (propertyData.images.length === 0) {
      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
        if (src && isValidImageUrl(src) && !src.includes('icon') && !src.includes('logo')) {
          try {
            const absoluteUrl = new URL(src, url).href;
            propertyData.images.push(absoluteUrl);
            return false; // Break the loop after finding one
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });
    }
    
    // Final fallback: if still no images, add a placeholder
    if (propertyData.images.length === 0) {
      console.warn(`[Scraper] No images found for ${url}, adding placeholder`);
      propertyData.images = ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image+Available'];
    }
  }

  // Try to extract map coordinates from embedded maps or data attributes
  // Look for Google Maps iframe or embed
  const mapIframe = $('iframe[src*="google.com/maps"], iframe[src*="maps.google"]').first();
  if (mapIframe.length) {
    const mapSrc = mapIframe.attr('src') || '';
    const coordMatch = mapSrc.match(/[?&]q=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/) || 
                      mapSrc.match(/@([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    if (coordMatch) {
      propertyData.coordinates = {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2]),
      };
      propertyData.googleMapsUrl = mapSrc;
    }
  }

  // Check for data attributes with coordinates
  const latAttr = $('[data-lat]').first().attr('data-lat');
  const lngAttr = $('[data-lng]').first().attr('data-lng');
  if (latAttr && lngAttr) {
    propertyData.coordinates = {
      lat: parseFloat(latAttr),
      lng: parseFloat(lngAttr),
    };
  }

  // Check for wellness-friendly indicators
  if (bodyText.match(/wellness|yoga|spa|meditation|healing/i)) {
    propertyData.wellnessFriendly = true;
  }

  console.log('[Esca Management] Extracted:', {
    name: propertyData.name,
    location: propertyData.location,
    bedrooms: propertyData.bedrooms,
    bathrooms: propertyData.bathrooms,
    guests: propertyData.guests,
    price: propertyData.price,
    amenities: propertyData.amenities.length,
    images: propertyData.images.length,
    descriptionLength: propertyData.description.length,
  });

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

