import type { Browser, Page } from 'puppeteer-core';

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

let browserInstance: Browser | null = null;

/**
 * Get or create a browser instance (reuse for performance)
 * Supports both local development and serverless (Vercel) environments
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  // Detect environment
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = process.env.VERCEL === '1';

  console.log(`[Puppeteer] Environment: ${isProduction ? 'production' : 'development'}, Vercel: ${isVercel}`);

  if (isProduction && isVercel) {
    // Serverless environment (Vercel)
    try {
      const chromium = await import('@sparticuz/chromium');
      const puppeteerCore = await import('puppeteer-core');
      
      console.log('[Puppeteer] Using @sparticuz/chromium for serverless');
      
      browserInstance = await puppeteerCore.default.launch({
        args: chromium.default.args,
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: await chromium.default.executablePath(),
        headless: chromium.default.headless,
      });
    } catch (error) {
      console.error('[Puppeteer] Failed to load @sparticuz/chromium, falling back to local puppeteer');
      // Fallback to regular puppeteer if chromium fails
      const puppeteer = await import('puppeteer');
      browserInstance = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
        ],
      });
    }
  } else {
    // Local development or VPS
    console.log('[Puppeteer] Using local puppeteer');
    const puppeteer = await import('puppeteer');
    browserInstance = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
      ],
    });
  }

  return browserInstance;
}

/**
 * Auto-scroll the page to load lazy images
 */
async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 300; // Scroll 300px at a time
      const maxScrolls = 20; // Maximum scroll iterations
      let scrollCount = 0;

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollCount++;

        // Stop if we've reached the bottom or hit max scrolls
        if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
          clearInterval(timer);
          // Scroll back to top
          window.scrollTo(0, 0);
          setTimeout(() => resolve(), 500);
        }
      }, 150);
    });
  });
}

/**
 * Main scraper function using Puppeteer
 */
export async function scrapeWithPuppeteer(url: string): Promise<ScrapedPropertyData> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Block unnecessary resources for faster loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Block videos, fonts, and some other heavy resources
      if (['font', 'media', 'websocket'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('[Puppeteer] Navigating to:', url);

    // Navigate to page with timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait a bit for initial content
    await page.waitForTimeout(2000);

    console.log('[Puppeteer] Scrolling to load images...');

    // Scroll to load lazy images
    await autoScroll(page);

    console.log('[Puppeteer] Extracting data...');

    // Detect platform and scrape accordingly
    if (url.includes('airbnb.com')) {
      return await scrapeAirbnbWithPuppeteer(page);
    } else {
      return await scrapeGenericWithPuppeteer(page);
    }
  } catch (error) {
    console.error('[Puppeteer] Error:', error);
    throw error;
  } finally {
    await page.close();
  }
}

/**
 * Scrape Airbnb listing with Puppeteer
 */
async function scrapeAirbnbWithPuppeteer(page: Page): Promise<ScrapedPropertyData> {
  const data = await page.evaluate(() => {
    // Helper function to get text content
    const getTextContent = (selector: string): string => {
      const el = document.querySelector(selector);
      return el?.textContent?.trim() || '';
    };

    // Helper function to extract numbers from text
    const extractNumber = (pattern: RegExp, text: string): number => {
      const match = text.match(pattern);
      return match ? parseInt(match[1]) : 0;
    };

    // Get all images - filter for property photos
    const allImages = Array.from(document.querySelectorAll('img'))
      .map(img => {
        // Get the highest quality image source
        return (
          img.getAttribute('data-original-uri') ||
          img.src ||
          img.getAttribute('data-src') ||
          ''
        );
      })
      .filter(src => {
        if (!src || !src.startsWith('http')) return false;
        
        // Filter for Airbnb property images
        if (src.includes('airbnb.com/pictures') || src.includes('a0.muscache.com')) {
          // Exclude icons, logos, avatars
          if (src.includes('icon') || 
              src.includes('logo') || 
              src.includes('avatar') ||
              src.includes('profile') ||
              src.match(/\/\d+x\d+\//)) { // Small dimension images
            return false;
          }
          return true;
        }
        return false;
      });

    // Remove duplicates and sort by URL (larger images usually have higher numbers)
    const uniqueImages = [...new Set(allImages)];

    // Get body text for parsing
    const bodyText = document.body.textContent || '';

    // Extract room details
    const guests = extractNumber(/(\d+)\s+guests?/i, bodyText);
    const bedrooms = extractNumber(/(\d+)\s+bedrooms?/i, bodyText);
    const beds = extractNumber(/(\d+)\s+beds?(?!\s*room)/i, bodyText);
    const bathrooms = extractNumber(/(\d+(?:\.\d+)?)\s+baths?(?:rooms?)?/i, bodyText);

    // Get property name (title)
    const name = 
      getTextContent('h1') ||
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.title.split('·')[0].trim();

    // Get description
    const description = 
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      '';

    // Get location - try various selectors
    const location = 
      getTextContent('[data-section-id="LOCATION_DEFAULT"] h2') ||
      getTextContent('[data-section-id="LOCATION_DEFAULT"]').split('\n')[0] ||
      Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('·'))?.textContent?.trim() ||
      '';

    // Try to extract amenities
    const amenities = Array.from(
      document.querySelectorAll('[data-section-id="AMENITIES_DEFAULT"] div, [data-section-id="AMENITIES_DEFAULT"] li')
    )
      .map(el => el.textContent?.trim())
      .filter(text => text && text.length > 0 && text.length < 50)
      .filter((value, index, self) => self.indexOf(value) === index); // Unique values

    // Check for wellness/smoke-free
    const wellnessFriendly = bodyText.toLowerCase().includes('smoke-free') ||
                            bodyText.toLowerCase().includes('no smoking') ||
                            bodyText.toLowerCase().includes('non-smoking');

    return {
      name,
      description,
      location,
      bedrooms,
      bathrooms,
      beds,
      guests,
      images: uniqueImages,
      amenities,
      wellnessFriendly,
    };
  });

  // Try to get coordinates from the page
  const coordinates = await extractCoordinates(page);
  if (coordinates) {
    data.coordinates = coordinates;
    data.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
  }

  console.log(`[Puppeteer] Extracted: ${data.images.length} images, ${data.amenities.length} amenities`);

  return {
    ...data,
    price: 100, // Default price (not easily extractable without dates)
  } as ScrapedPropertyData;
}

/**
 * Extract coordinates from the page
 */
async function extractCoordinates(page: Page): Promise<{ lat: number; lng: number } | null> {
  try {
    // Try to find coordinates in page scripts or data attributes
    const coords = await page.evaluate(() => {
      // Look for coordinates in script tags
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const content = script.textContent || '';
        
        // Look for common coordinate patterns
        const latMatch = content.match(/"lat(?:itude)?"\s*:\s*([-\d.]+)/i);
        const lngMatch = content.match(/"lng|lon(?:gitude)?"\s*:\s*([-\d.]+)/i);
        
        if (latMatch && lngMatch) {
          return {
            lat: parseFloat(latMatch[1]),
            lng: parseFloat(lngMatch[1]),
          };
        }
      }
      return null;
    });

    return coords;
  } catch (error) {
    console.log('[Puppeteer] Could not extract coordinates');
    return null;
  }
}

/**
 * Generic scraper for non-Airbnb sites
 */
async function scrapeGenericWithPuppeteer(page: Page): Promise<ScrapedPropertyData> {
  const data = await page.evaluate(() => {
    const getTextContent = (selector: string): string => {
      const el = document.querySelector(selector);
      return el?.textContent?.trim() || '';
    };

    const name = 
      getTextContent('h1') ||
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.title;

    const description = 
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      '';

    // Get all images
    const images = Array.from(document.querySelectorAll('img'))
      .map(img => img.src || img.getAttribute('data-src') || '')
      .filter(src => src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo'));

    const bodyText = document.body.textContent || '';
    
    const extractNumber = (pattern: RegExp): number => {
      const match = bodyText.match(pattern);
      return match ? parseInt(match[1]) : 1;
    };

    return {
      name,
      description,
      location: getTextContent('[itemprop="address"]') || '',
      bedrooms: extractNumber(/(\d+)\s+bedrooms?/i),
      bathrooms: extractNumber(/(\d+)\s+bathrooms?/i),
      beds: extractNumber(/(\d+)\s+beds?/i),
      guests: extractNumber(/(\d+)\s+guests?/i),
      images: [...new Set(images)],
      amenities: [],
      wellnessFriendly: false,
      price: 100,
    };
  });

  return data as ScrapedPropertyData;
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

