import type { Browser as PuppeteerCoreBrowser, Page } from 'puppeteer-core';

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

let browserInstance: PuppeteerCoreBrowser | any = null;

/**
 * Get or create a browser instance (reuse for performance)
 * Supports both local development and serverless (Vercel) environments
 */
async function getBrowser(): Promise<PuppeteerCoreBrowser | any> {
  if (browserInstance && browserInstance.isConnected && browserInstance.isConnected()) {
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
        headless: true,
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
      const maxScrolls = 30; // Increased max scrolls to load more images
      let scrollCount = 0;
      let lastHeight = document.body.scrollHeight;

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollCount++;

        // Check if new content loaded (height changed)
        if (scrollHeight > lastHeight) {
          lastHeight = scrollHeight;
          scrollCount = 0; // Reset counter if new content loaded
        }

        // Stop if we've reached the bottom or hit max scrolls
        if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
          clearInterval(timer);
          // Scroll back to top
          window.scrollTo(0, 0);
          // Wait a bit longer for images to load
          setTimeout(() => resolve(), 1000);
        }
      }, 200); // Slightly slower to allow images to load
    });
  });
  
  // Wait for any lazy-loaded images to finish loading
  await page.waitForTimeout(1000);
  
  // Try to click "Show more photos" or similar buttons if they exist
  try {
    // Try different selectors for "show more" buttons
    const buttonSelectors = [
      'button[data-testid*="show"]',
      'button[data-testid*="more"]',
      '[aria-label*="show" i]',
      '[aria-label*="more" i]',
      'button'
    ];
    
    for (const selector of buttonSelectors) {
      try {
        const buttons = await page.$$(selector);
        for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent?.toLowerCase() || '', button);
          if (text.includes('show') || text.includes('more') || text.includes('photo')) {
            await button.click();
            await page.waitForTimeout(2000);
            await autoScroll(page); // Scroll again after clicking
            break;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
  } catch (e) {
    // Button might not exist or be clickable, continue
  }
}

/**
 * Main scraper function using Puppeteer
 */
export async function scrapeWithPuppeteer(url: string): Promise<ScrapedPropertyData> {
  const isEscaManagement = url.includes('esca-management.com');
  
  if (isEscaManagement) {
    return await scrapeEscaManagementWithPuppeteer(url);
  }
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
    page.on('request', (req: any) => {
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
 * Scrape Esca Management property with Puppeteer
 */
async function scrapeEscaManagementWithPuppeteer(url: string): Promise<ScrapedPropertyData> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log('[Puppeteer Esca] Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for initial content
    
    // Scroll to load lazy images
    console.log('[Puppeteer Esca] Scrolling to load images...');
    await autoScroll(page);
    
    // Try to click "Show more photos" or similar buttons
    try {
      const buttons = await page.$$('button, [role="button"], a[class*="button"]');
      for (const button of buttons) {
        try {
          const text = await page.evaluate((el: Element) => el.textContent?.toLowerCase() || '', button);
          if (text.includes('show more') || 
              text.includes('view all') || 
              text.includes('see more') ||
              text.includes('more photos') ||
              text.includes('all photos')) {
            await button.click();
            await page.waitForTimeout(2000);
            await autoScroll(page); // Scroll again after clicking
            break;
          }
        } catch (e) {
          // Continue to next button
        }
      }
    } catch (e) {
      // Button might not exist, continue
    }
    
    console.log('[Puppeteer Esca] Extracting data...');
    
    const data = await page.evaluate(() => {
      const getTextContent = (selector: string): string => {
        const el = document.querySelector(selector);
        return el?.textContent?.trim() || '';
      };

      let rawName = 
        getTextContent('h1') ||
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        document.title.split('|')[0].trim();
      
      // Remove "Property Listing" prefix if present
      const name = rawName
        .replace(/^Property\s+Listing[_\s-]*/i, '')
        .replace(/^property-listing[_\s-]*/i, '')
        .trim();

      // Extract location
      const bodyText = document.body.textContent || '';
      const locationMatch = bodyText.match(/(Ft\s+Lauderdale|Fort\s+Lauderdale|Miami|Tampa)[,\s]+(Florida|FL)/i);
      const location = locationMatch ? locationMatch[0] : 
        getTextContent('.location') || 
        getTextContent('[itemprop="address"]') || '';

      // Extract full description - combine all meaningful paragraphs
      const descriptionParts: string[] = [];
      document.querySelectorAll('p').forEach(p => {
        const text = p.textContent?.trim() || '';
        if (text.length > 50 && 
            !text.includes('Skip to') && 
            !text.includes('Book Now') &&
            !text.includes('Sign Up') &&
            !text.includes('Copyright')) {
          descriptionParts.push(text);
        }
      });
      const description = descriptionParts
        .filter((part, index, arr) => arr.indexOf(part) === index)
        .join('\n\n')
        .trim() ||
        document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        '';

      // Extract property details
      const extractNumber = (pattern: RegExp): number => {
        const match = bodyText.match(pattern);
        return match ? parseInt(match[1]) : 0;
      };

      const extractFloat = (pattern: RegExp): number => {
        const match = bodyText.match(pattern);
        return match ? parseFloat(match[1]) : 0;
      };

      const guests = extractNumber(/(\d+)\s+Guests?/i);
      const bedrooms = extractNumber(/(\d+)[-\s]bedroom/i) || extractNumber(/(\d+)\s+Bedrooms?/i);
      const bathrooms = extractFloat(/(\d+(?:\.\d+)?)[-\s]bath/i) || extractFloat(/(\d+(?:\.\d+)?)\s+Baths?/i);
      const beds = extractNumber(/(\d+)\s+Beds?(?!\s*room)/i);

      // Extract price
      const priceMatch = bodyText.match(/\$(\d+)\s*\/?\s*night/i) || bodyText.match(/From\s*:\s*\$(\d+)/i);
      const price = priceMatch ? parseInt(priceMatch[1]) : 100;

      // Extract amenities
      const amenitiesSet = new Set<string>();
      const amenityKeywords = [
        'Air Conditioning', 'Home Theater', 'Pool', 'Living Room', 'Waterfront Deck',
        'Private Parking', 'Sound System', 'Outdoor Kitchen', 'Full Kitchen Appliances', 'Wi-Fi',
        'WiFi', 'Kitchen', 'Parking', 'Hot Tub', 'Gym', 'Heating', 'TV', 'Washer', 'Dryer',
        'Fireplace', 'Workspace', 'Pet Friendly'
      ];

      amenityKeywords.forEach(keyword => {
        if (bodyText.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))) {
          amenitiesSet.add(keyword);
        }
      });

      // Also check list items
      document.querySelectorAll('li').forEach(li => {
        const text = li.textContent?.trim() || '';
        if (text && text.length < 50 && !text.includes('Personalize') && !text.includes('Conditions')) {
          amenityKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword.toLowerCase())) {
              amenitiesSet.add(keyword);
            }
          });
        }
      });

      // Extract images - comprehensive approach
      const allImages = new Set<string>();
      const isValidPropertyImage = (url: string, element?: Element): boolean => {
        if (!url || !url.startsWith('http')) return false;
        
        // Skip icons, logos, avatars, small images, brand images
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('icon') || 
            lowerUrl.includes('logo') || 
            lowerUrl.includes('avatar') || 
            lowerUrl.includes('profile') ||
            lowerUrl.includes('sprite') ||
            lowerUrl.includes('favicon') ||
            lowerUrl.includes('brand') ||
            lowerUrl.includes('header') ||
            lowerUrl.includes('nav') ||
            lowerUrl.includes('footer') ||
            lowerUrl.includes('button') ||
            lowerUrl.includes('badge') ||
            lowerUrl.includes('landland') || // Brand name filter
            lowerUrl.includes('lanclanc') || // Brand name filter
            url.match(/\/\d+x\d+\//)) { // Small dimension images like /16x16/
          return false;
        }
        
        // Check if image is in header, nav, or footer elements
        if (element) {
          const parent = element.closest('header, nav, footer, [class*="header"], [class*="nav"], [class*="footer"], [class*="logo"], [class*="brand"]');
          if (parent) {
            return false;
          }
          
          // Check class names for logo/brand indicators
          const classList = Array.from(element.classList || []);
          const hasLogoClass = classList.some(cls => 
            cls.toLowerCase().includes('logo') || 
            cls.toLowerCase().includes('brand') ||
            cls.toLowerCase().includes('icon')
          );
          if (hasLogoClass) {
            return false;
          }
        }
        
        // Check for image file extensions (but be more lenient)
        if (!url.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?|$|&)/i)) {
          // If no extension, check if it looks like an image URL (has image-related paths)
          if (!url.match(/\/(images?|photos?|media|img|pics?|pictures?)\//i)) {
            return false;
          }
        }
        
        // Exclude SVG files only if they're clearly logos (in logo/brand paths)
        if (url.match(/\.svg(\?|$|&)/i)) {
          if (lowerUrl.includes('logo') || lowerUrl.includes('icon') || lowerUrl.includes('brand')) {
            return false;
          }
        }
        
        // Must be a reasonable length (not too short) - reduced from 30 to 20
        if (url.length < 20) {
          return false;
        }
        
        return true;
      };

      // 1. From img tags - check all possible attributes
      // Exclude images in header, nav, footer, and logo areas (but be less aggressive)
      const excludedSelectors = 'header img, nav img, footer img';
      const excludedImages = new Set(Array.from(document.querySelectorAll(excludedSelectors)));
      
      Array.from(document.querySelectorAll('img')).forEach(img => {
        // Skip if in header, nav, or footer (but allow images in content areas even if they have header/nav classes)
        if (excludedImages.has(img)) {
          return;
        }
        
        // Check if parent has logo/brand classes (more specific check)
        const parent = img.closest('[class*="logo"], [class*="brand"], [class*="navbar"]');
        if (parent) {
          // Only skip if it's actually a logo/brand element, not just a container
          const parentClasses = Array.from(parent.classList || []).join(' ').toLowerCase();
          if (parentClasses.includes('logo') || parentClasses.includes('brand') || parentClasses.includes('navbar')) {
            return;
          }
        }
        
        // Check image dimensions if available (but don't exclude if dimensions aren't loaded yet)
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        
        // Only skip very small images if we have actual dimensions (not 0)
        if (width > 0 && height > 0 && (width < 50 || height < 50)) {
          return;
        }
        
        const sources = [
          img.getAttribute('data-original-uri'),
          img.getAttribute('data-original'),
          img.getAttribute('data-src'),
          img.getAttribute('data-lazy-src'),
          img.getAttribute('data-lazy'),
          img.getAttribute('data-url'),
          img.getAttribute('srcset')?.split(',').map(s => s.trim().split(' ')[0]),
          img.src,
          img.currentSrc,
          (img as any).complete ? img.src : null, // Only if image is loaded
        ].flat().filter(Boolean) as string[];
        
        sources.forEach(src => {
          if (src && isValidPropertyImage(src, img)) {
            try {
              const absoluteUrl = new URL(src, window.location.href).href;
              allImages.add(absoluteUrl);
            } catch (e) {
              // Invalid URL, skip
            }
          }
        });
      });

      // 2. From picture elements and source tags
      Array.from(document.querySelectorAll('picture source, source[srcset]')).forEach(source => {
        const srcset = source.getAttribute('srcset');
        if (srcset) {
          srcset.split(',').forEach(src => {
            const url = src.trim().split(' ')[0];
            if (isValidPropertyImage(url)) {
              try {
                const absoluteUrl = new URL(url, window.location.href).href;
                allImages.add(absoluteUrl);
              } catch (e) {
                // Invalid URL, skip
              }
            }
          });
        }
      });

      // 3. From background images in style attributes (exclude header/nav/footer)
      Array.from(document.querySelectorAll('[style*="background-image"]')).forEach(el => {
        // Skip if in header, nav, or footer
        if (el.closest('header, nav, footer, [class*="header"], [class*="nav"], [class*="footer"], [class*="logo"], [class*="brand"]')) {
          return;
        }
        
        const style = el.getAttribute('style') || '';
        const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
        if (match && match[1]) {
          const url = match[1].trim();
          if (isValidPropertyImage(url, el)) {
            try {
              const absoluteUrl = new URL(url, window.location.href).href;
              allImages.add(absoluteUrl);
            } catch (e) {
              // Invalid URL, skip
            }
          }
        }
      });

      // 4. From computed background images (for lazy-loaded images)
      // Exclude header, nav, footer areas
      Array.from(document.querySelectorAll('[class*="image"], [class*="photo"], [class*="gallery"], [class*="carousel"]')).forEach(el => {
        // Skip if in header, nav, or footer
        if (el.closest('header, nav, footer, [class*="header"], [class*="nav"], [class*="footer"], [class*="logo"], [class*="brand"]')) {
          return;
        }
        
        const htmlEl = el as HTMLElement;
        const computedStyle = window.getComputedStyle(htmlEl);
        const bgImage = computedStyle.backgroundImage;
        if (bgImage && bgImage !== 'none') {
          const match = bgImage.match(/url\(['"]?([^'")]+)['"]?\)/);
          if (match && match[1]) {
            const url = match[1].trim();
            if (isValidPropertyImage(url, el)) {
              try {
                const absoluteUrl = new URL(url, window.location.href).href;
                allImages.add(absoluteUrl);
              } catch (e) {
                // Invalid URL, skip
              }
            }
          }
        }
      });

      // 5. From meta tags (only if not brand/logo)
      Array.from(document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]')).forEach(meta => {
        const src = meta.getAttribute('content');
        if (src && isValidPropertyImage(src)) {
          // Additional check for brand images in meta tags
          const lowerSrc = src.toLowerCase();
          if (!lowerSrc.includes('landland') && 
              !lowerSrc.includes('lanclanc') &&
              !lowerSrc.includes('logo') &&
              !lowerSrc.includes('brand')) {
            allImages.add(src);
          }
        }
      });

      // 6. From data attributes on any element (exclude header/nav/footer)
      Array.from(document.querySelectorAll('[data-image], [data-photo], [data-img], [data-src]')).forEach(el => {
        // Skip if in header, nav, or footer
        if (el.closest('header, nav, footer, [class*="header"], [class*="nav"], [class*="footer"], [class*="logo"], [class*="brand"]')) {
          return;
        }
        
        const sources = [
          el.getAttribute('data-image'),
          el.getAttribute('data-photo'),
          el.getAttribute('data-img'),
          el.getAttribute('data-src'),
          el.getAttribute('data-url'),
        ].filter(Boolean) as string[];
        
        sources.forEach(src => {
          if (isValidPropertyImage(src, el)) {
            try {
              const absoluteUrl = new URL(src, window.location.href).href;
              allImages.add(absoluteUrl);
            } catch (e) {
              // Invalid URL, skip
            }
          }
        });
      });

      // 7. From link tags with rel="image_src" or similar
      Array.from(document.querySelectorAll('link[rel*="image"]')).forEach(link => {
        const href = link.getAttribute('href');
        if (href && isValidPropertyImage(href)) {
          try {
            const absoluteUrl = new URL(href, window.location.href).href;
            allImages.add(absoluteUrl);
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });

      // Extract map coordinates
      let coordinates: { lat: number; lng: number } | null = null;
      let googleMapsUrl: string | undefined = undefined;

      // Check for Google Maps iframe
      const mapIframe = document.querySelector('iframe[src*="google.com/maps"], iframe[src*="maps.google"]') as HTMLIFrameElement;
      if (mapIframe && mapIframe.src) {
        const coordMatch = mapIframe.src.match(/[?&]q=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/) || 
                          mapIframe.src.match(/@([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
        if (coordMatch) {
          coordinates = {
            lat: parseFloat(coordMatch[1]),
            lng: parseFloat(coordMatch[2]),
          };
          googleMapsUrl = mapIframe.src;
        }
      }

      // Check for data attributes
      const latEl = document.querySelector('[data-lat]');
      const lngEl = document.querySelector('[data-lng]');
      if (latEl && lngEl) {
        const lat = latEl.getAttribute('data-lat');
        const lng = lngEl.getAttribute('data-lng');
        if (lat && lng) {
          coordinates = {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
          };
        }
      }

      // Check for wellness-friendly
      const wellnessFriendly = /wellness|yoga|spa|meditation|healing/i.test(bodyText);

      // Filter and sort images - prefer larger/higher quality images
      const imageArray = Array.from(allImages).filter(img => {
        if (!img || img.length < 20) return false;
        
        // Additional filtering: exclude brand/logo patterns (but only if clearly a logo)
        const lowerImg = img.toLowerCase();
        
        // Exclude if URL contains brand names
        if (lowerImg.includes('landland') || lowerImg.includes('lanclanc')) {
          return false;
        }
        
        // Only exclude if logo/brand is in the filename or path, not just anywhere
        const urlParts = lowerImg.split('/');
        const filename = urlParts[urlParts.length - 1] || '';
        const pathParts = lowerImg.split('/').slice(-3); // Last 3 path segments
        
        // Check if logo/brand is in filename or last path segments
        const hasLogoInPath = pathParts.some(part => 
          part.includes('logo') || 
          part.includes('brand') || 
          part.includes('header') ||
          part.includes('nav')
        );
        
        if (hasLogoInPath || filename.includes('logo') || filename.includes('brand')) {
          return false;
        }
        
        return true;
      }).sort((a, b) => {
        // Prefer images with larger dimensions in URL or higher quality indicators
        const aHasSize = a.match(/\d+x\d+/);
        const bHasSize = b.match(/\d+x\d+/);
        if (aHasSize && !bHasSize) return -1;
        if (!aHasSize && bHasSize) return 1;
        // Prefer images from CDN or image hosts
        if (a.includes('cdn') && !b.includes('cdn')) return -1;
        if (!a.includes('cdn') && b.includes('cdn')) return 1;
        return 0;
      });

      console.log(`[Puppeteer Esca] Found ${imageArray.length} images`);

      return {
        name,
        description,
        location,
        bedrooms,
        bathrooms,
        beds,
        guests,
        price,
        amenities: Array.from(amenitiesSet),
        images: imageArray.length > 0 ? imageArray : ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image+Available'],
        wellnessFriendly,
        googleMapsUrl,
        coordinates: coordinates || undefined,
      };
    });

    const result = data as ScrapedPropertyData;
    
    // Ensure we have at least one image
    if (result.images.length === 0) {
      console.warn(`[Puppeteer Esca] No images found for ${url}, adding placeholder`);
      result.images = ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image+Available'];
    }
    
    console.log(`[Puppeteer Esca] Extracted: ${result.images.length} images, ${result.amenities.length} amenities`);
    
    return result;
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

    // Helper to check if URL is a valid property image
    const isValidPropertyImage = (url: string): boolean => {
      if (!url || !url.startsWith('http')) return false;
      
      // Exclude icons, logos, avatars, small images
      if (url.includes('icon') || 
          url.includes('logo') || 
          url.includes('avatar') ||
          url.includes('profile') ||
          url.includes('sprite') ||
          url.match(/\/\d+x\d+\//)) { // Small dimension images
        return false;
      }
      
      // Include Airbnb property images
      if (url.includes('airbnb.com/pictures') || 
          url.includes('a0.muscache.com') ||
          url.includes('a1.muscache.com') ||
          url.includes('a2.muscache.com') ||
          url.includes('muscache.com')) {
        return true;
      }
      
      // Include other common image patterns
      if (url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$|&)/i)) {
        return true;
      }
      
      return false;
    };
    
    // Collect all images from multiple sources
    const allImages = new Set<string>();
    
    // 1. Extract from img tags
    Array.from(document.querySelectorAll('img')).forEach(img => {
      const sources = [
        img.getAttribute('data-original-uri'),
        img.getAttribute('data-original'),
        img.getAttribute('data-src'),
        img.getAttribute('data-lazy-src'),
        img.src,
        img.currentSrc
      ].filter(Boolean) as string[];
      
      sources.forEach(src => {
        if (isValidPropertyImage(src)) {
          allImages.add(src);
        }
      });
    });
    
    // 2. Extract from background images in style attributes
    Array.from(document.querySelectorAll('[style*="background-image"]')).forEach(el => {
      const style = el.getAttribute('style') || '';
      const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
      if (match && match[1]) {
        const url = match[1].trim();
        if (isValidPropertyImage(url)) {
          allImages.add(url);
        }
      }
    });
    
    // 3. Extract from data attributes
    Array.from(document.querySelectorAll('[data-src], [data-image], [data-photo]')).forEach(el => {
      const sources = [
        el.getAttribute('data-src'),
        el.getAttribute('data-image'),
        el.getAttribute('data-photo'),
        el.getAttribute('data-url')
      ].filter(Boolean) as string[];
      
      sources.forEach(src => {
        if (isValidPropertyImage(src)) {
          allImages.add(src);
        }
      });
    });
    
    // 4. Extract from JSON data in script tags
    Array.from(document.querySelectorAll('script[type="application/json"]')).forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '{}');
        const findImages = (obj: any, depth = 0): void => {
          if (depth > 15) return; // Prevent infinite recursion
          if (!obj || typeof obj !== 'object') return;
          
          // Check for image arrays
          if (Array.isArray(obj)) {
            obj.forEach(item => {
              if (typeof item === 'string' && isValidPropertyImage(item)) {
                allImages.add(item);
              } else if (typeof item === 'object') {
                findImages(item, depth + 1);
              }
            });
            return;
          }
          
          // Check for common image property names
          const imageKeys = ['url', 'src', 'image', 'photo', 'picture', 'pictureUrl', 
                           'xlPictureUrl', 'xxlPictureUrl', 'largePictureUrl', 
                           'mediumPictureUrl', 'smallPictureUrl', 'thumbnailUrl'];
          
          for (const key in obj) {
            const value = obj[key];
            if (typeof value === 'string' && isValidPropertyImage(value)) {
              allImages.add(value);
            } else if (imageKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
              if (typeof value === 'string' && isValidPropertyImage(value)) {
                allImages.add(value);
              } else if (typeof value === 'object' && value !== null) {
                findImages(value, depth + 1);
              }
            } else if (typeof value === 'object' && value !== null) {
              findImages(value, depth + 1);
            }
          }
        };
        
        findImages(data);
      } catch (e) {
        // Not valid JSON, skip
      }
    });
    
    // 5. Extract from window/global objects (if accessible)
    try {
      const win = window as any;
      if (win.__INITIAL_STATE__) {
        const findImages = (obj: any, depth = 0): void => {
          if (depth > 15) return;
          if (!obj || typeof obj !== 'object') return;
          
          if (Array.isArray(obj)) {
            obj.forEach(item => {
              if (typeof item === 'string' && isValidPropertyImage(item)) {
                allImages.add(item);
              } else if (typeof item === 'object') {
                findImages(item, depth + 1);
              }
            });
            return;
          }
          
          for (const key in obj) {
            const value = obj[key];
            if (typeof value === 'string' && isValidPropertyImage(value)) {
              allImages.add(value);
            } else if (typeof value === 'object' && value !== null) {
              findImages(value, depth + 1);
            }
          }
        };
        findImages(win.__INITIAL_STATE__);
      }
    } catch (e) {
      // Window access might be restricted
    }
    
    // 6. Extract from photo gallery components
    Array.from(document.querySelectorAll('[data-testid*="photo"], [class*="photo"], [class*="image"]')).forEach(el => {
      const htmlEl = el as HTMLElement;
      const sources = [
        el.getAttribute('src'),
        el.getAttribute('data-src'),
        el.getAttribute('data-image'),
        htmlEl.style?.backgroundImage?.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1]
      ].filter(Boolean) as string[];
      
      sources.forEach(src => {
        if (isValidPropertyImage(src)) {
          allImages.add(src);
        }
      });
    });
    
    // Convert to array and sort (prefer higher quality images)
    const uniqueImages = Array.from(allImages).sort((a, b) => {
      // Prefer larger image URLs (often have larger dimensions in URL)
      const aSize = a.match(/(\d+)x(\d+)/)?.[0] || '';
      const bSize = b.match(/(\d+)x(\d+)/)?.[0] || '';
      if (aSize && bSize) {
        return bSize.localeCompare(aSize);
      }
      // Prefer xxl/xl over smaller sizes
      if (a.includes('xxl') && !b.includes('xxl')) return -1;
      if (b.includes('xxl') && !a.includes('xxl')) return 1;
      if (a.includes('xl') && !b.includes('xl')) return -1;
      if (b.includes('xl') && !a.includes('xl')) return 1;
      return 0;
    });

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

    // Get location - try various selectors and data sources
    let location = '';
    
    // Try location section
    const locationSection = document.querySelector('[data-section-id="LOCATION_DEFAULT"]');
    if (locationSection) {
      const h2 = locationSection.querySelector('h2');
      if (h2) {
        location = h2.textContent?.trim() || '';
      }
      if (!location) {
        location = locationSection.textContent?.split('\n')[0]?.trim() || '';
      }
    }
    
    // Try meta tags
    if (!location) {
      const ogLoc = document.querySelector('meta[property="og:locality"]')?.getAttribute('content');
      const ogRegion = document.querySelector('meta[property="og:region"]')?.getAttribute('content');
      const ogCountry = document.querySelector('meta[property="og:country-name"]')?.getAttribute('content');
      if (ogLoc || ogRegion || ogCountry) {
        location = [ogLoc, ogRegion, ogCountry].filter(Boolean).join(', ');
      }
    }
    
    // Try structured data (JSON-LD)
    if (!location) {
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent || '{}');
          if (data['@type'] === 'Place' || data['@type'] === 'Accommodation') {
            const address = data.address || data.location?.address;
            if (address) {
              const parts = [
                address.addressLocality,
                address.addressRegion,
                address.addressCountry
              ].filter(Boolean);
              if (parts.length > 0) {
                location = parts.join(', ');
                break;
              }
            }
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    // Try button with location info
    if (!location) {
      const locationButton = Array.from(document.querySelectorAll('button'))
        .find(btn => {
          const text = btn.textContent || '';
          return text.includes('·') || text.includes(',');
        });
      if (locationButton) {
        location = locationButton.textContent?.trim() || '';
      }
    }
    
    // Try title parsing (e.g., "Rental unit in Colva")
    if (!location) {
      const title = document.querySelector('h1')?.textContent || '';
      const inMatch = title.match(/in\s+(.+?)(?:\s*·|$)/i);
      if (inMatch) {
        location = inMatch[1].trim();
      }
    }

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
  const result: ScrapedPropertyData = {
    ...data,
    price: 100, // Default price (not easily extractable without dates)
  };
  
  if (coordinates) {
    result.coordinates = coordinates;
    result.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
  }

  console.log(`[Puppeteer] Extracted: ${result.images.length} images, Location: "${result.location}", Coordinates: ${coordinates ? `${coordinates.lat}, ${coordinates.lng}` : 'none'}, ${result.amenities.length} amenities`);

  return result;
}

/**
 * Extract coordinates from the page
 */
async function extractCoordinates(page: Page): Promise<{ lat: number; lng: number } | null> {
  try {
    // Try to find coordinates in page scripts or data attributes
    const coords = await page.evaluate(() => {
      // Helper to extract coordinates from an object recursively
      const findCoordsInObject = (obj: any, depth = 0): { lat: number; lng: number } | null => {
        if (depth > 10) return null; // Prevent infinite recursion
        if (!obj || typeof obj !== 'object') return null;
        
        // Check if this object has lat/lng
        if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
          return { lat: obj.lat, lng: obj.lng };
        }
        if (typeof obj.latitude === 'number' && typeof obj.longitude === 'number') {
          return { lat: obj.latitude, lng: obj.longitude };
        }
        if (typeof obj.coordinates?.[0] === 'number' && typeof obj.coordinates?.[1] === 'number') {
          // GeoJSON format: [lng, lat] or [lat, lng]
          return { lat: obj.coordinates[1], lng: obj.coordinates[0] };
        }
        
        // Recursively search in nested objects
        for (const key in obj) {
          if (key === 'location' || key === 'coordinates' || key === 'geo' || key === 'position') {
            const result = findCoordsInObject(obj[key], depth + 1);
            if (result) return result;
          }
        }
        
        return null;
      };
      
      // 1. Try JSON-LD structured data
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent || '{}');
          const coords = findCoordsInObject(data);
          if (coords) return coords;
          
          // Check for geo coordinates in JSON-LD
          if (data.geo) {
            if (data.geo.latitude && data.geo.longitude) {
              return { lat: parseFloat(data.geo.latitude), lng: parseFloat(data.geo.longitude) };
            }
            if (data.geo['@type'] === 'GeoCoordinates') {
              return { lat: parseFloat(data.geo.latitude), lng: parseFloat(data.geo.longitude) };
            }
          }
        } catch (e) {
          // Continue
        }
      }
      
      // 2. Try data attributes on map elements
      const mapElements = document.querySelectorAll('[data-lat], [data-latitude], [data-lng], [data-longitude]');
      for (const el of mapElements) {
        const lat = parseFloat(el.getAttribute('data-lat') || el.getAttribute('data-latitude') || '');
        const lng = parseFloat(el.getAttribute('data-lng') || el.getAttribute('data-longitude') || '');
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
      
      // 3. Try to find coordinates in script tags with comprehensive parsing
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const content = script.textContent || '';
        if (!content || content.length < 50) continue;
        
        // Try to parse as JSON if it looks like JSON
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          try {
            const data = JSON.parse(content);
            const coords = findCoordsInObject(data);
            if (coords) return coords;
          } catch (e) {
            // Not valid JSON, continue with regex
          }
        }
        
        // Look for common coordinate patterns with more variations
        const patterns = [
          // Standard patterns
          /"lat(?:itude)?"\s*:\s*([-\d.]+)/i,
          /"lng|lon(?:gitude)?"\s*:\s*([-\d.]+)/i,
          // With quotes
          /latitude["\s:]+([-\d.]+)/i,
          /longitude["\s:]+([-\d.]+)/i,
          // Array format [lat, lng] or [lng, lat]
          /\[([-\d.]+)\s*,\s*([-\d.]+)\]/,
          // Coordinates object
          /coordinates["\s:]*\{[^}]*lat(?:itude)?["\s:]*([-\d.]+)[^}]*lng|lon(?:gitude)?["\s:]*([-\d.]+)/i,
        ];
        
        let lat: number | null = null;
        let lng: number | null = null;
        
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            if (match.length === 3) {
              // Array format [lat, lng]
              const val1 = parseFloat(match[1]);
              const val2 = parseFloat(match[2]);
              // Assume first is lat, second is lng (common format)
              if (!isNaN(val1) && !isNaN(val2)) {
                // Check if values are reasonable (lat: -90 to 90, lng: -180 to 180)
                if (Math.abs(val1) <= 90 && Math.abs(val2) <= 180) {
                  return { lat: val1, lng: val2 };
                } else if (Math.abs(val2) <= 90 && Math.abs(val1) <= 180) {
                  return { lat: val2, lng: val1 };
                }
              }
            } else if (match[1]) {
              const value = parseFloat(match[1]);
              if (!isNaN(value)) {
                if (pattern.source.includes('lat')) {
                  lat = value;
                } else if (pattern.source.includes('lng') || pattern.source.includes('lon')) {
                  lng = value;
                }
              }
            }
          }
        }
        
        // If we found both lat and lng from different patterns
        if (lat !== null && lng !== null) {
          return { lat, lng };
        }
      }
      
      // 4. Try to find in window object (if accessible)
      try {
        const win = window as any;
        if (win.__INITIAL_STATE__) {
          const coords = findCoordsInObject(win.__INITIAL_STATE__);
          if (coords) return coords;
        }
        if (win.__NEXT_DATA__) {
          const coords = findCoordsInObject(win.__NEXT_DATA__);
          if (coords) return coords;
        }
      } catch (e) {
        // Window access might be restricted
      }
      
      return null;
    });

    if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
      console.log(`[Puppeteer] Extracted coordinates: ${coords.lat}, ${coords.lng}`);
      return coords;
    }
    
    return null;
  } catch (error) {
    console.log('[Puppeteer] Could not extract coordinates:', error);
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

    // Helper to check if URL is a valid property image
    const isValidPropertyImage = (url: string): boolean => {
      if (!url || !url.startsWith('http')) return false;
      if (url.includes('icon') || url.includes('logo') || url.includes('avatar') || url.includes('profile')) {
        return false;
      }
      return true;
    };
    
    // Collect all images from multiple sources
    const allImages = new Set<string>();
    
    // 1. Extract from img tags
    Array.from(document.querySelectorAll('img')).forEach(img => {
      const sources = [
        img.getAttribute('data-original-uri'),
        img.getAttribute('data-original'),
        img.getAttribute('data-src'),
        img.getAttribute('data-lazy-src'),
        img.src,
        img.currentSrc
      ].filter(Boolean) as string[];
      
      sources.forEach(src => {
        if (isValidPropertyImage(src)) {
          allImages.add(src);
        }
      });
    });
    
    // 2. Extract from background images
    Array.from(document.querySelectorAll('[style*="background-image"]')).forEach(el => {
      const style = el.getAttribute('style') || '';
      const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
      if (match && match[1]) {
        const url = match[1].trim();
        if (isValidPropertyImage(url)) {
          allImages.add(url);
        }
      }
    });
    
    // 3. Extract from data attributes
    Array.from(document.querySelectorAll('[data-src], [data-image], [data-photo]')).forEach(el => {
      const sources = [
        el.getAttribute('data-src'),
        el.getAttribute('data-image'),
        el.getAttribute('data-photo'),
        el.getAttribute('data-url')
      ].filter(Boolean) as string[];
      
      sources.forEach(src => {
        if (isValidPropertyImage(src)) {
          allImages.add(src);
        }
      });
    });
    
    // 4. Extract from meta tags
    Array.from(document.querySelectorAll('meta[property="og:image"]')).forEach(meta => {
      const src = meta.getAttribute('content');
      if (src && isValidPropertyImage(src)) {
        allImages.add(src);
      }
    });

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
      images: Array.from(allImages),
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

