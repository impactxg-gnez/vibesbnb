import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Dynamic import of cheerio to avoid webpack issues
    const cheerio = await import('cheerio');

    // Fetch the property page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch property page');
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract property data
    let propertyData: any = {
      name: '',
      description: '',
      location: '',
      bedrooms: 1,
      bathrooms: 1,
      guests: 2,
      price: 100,
      amenities: [],
      images: [],
      wellnessFriendly: false,
    };

    // Try to extract data based on common patterns
    // Title
    propertyData.name = 
      $('h1').first().text().trim() ||
      $('[property="og:title"]').attr('content') ||
      $('title').text().trim();

    // Description
    propertyData.description = 
      $('[property="og:description"]').attr('content') ||
      $('.description').text().trim() ||
      $('meta[name="description"]').attr('content') ||
      $('p').first().text().trim();

    // Location
    propertyData.location = 
      $('.location').text().trim() ||
      $('[itemprop="address"]').text().trim() ||
      extractTextAfter($, 'Location:') ||
      '';

    // Images - get all image sources
    const images = new Set<string>();
    
    // Open Graph images
    $('meta[property="og:image"]').each((_, el) => {
      const src = $(el).attr('content');
      if (src && isValidImageUrl(src)) {
        images.add(src);
      }
    });

    // Regular img tags
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && isValidImageUrl(src)) {
        // Convert relative URLs to absolute
        const absoluteUrl = new URL(src, url).href;
        images.add(absoluteUrl);
      }
    });

    // Picture sources
    $('picture source, picture img').each((_, el) => {
      const src = $(el).attr('srcset') || $(el).attr('src');
      if (src) {
        const srcUrl = src.split(',')[0].split(' ')[0];
        if (isValidImageUrl(srcUrl)) {
          const absoluteUrl = new URL(srcUrl, url).href;
          images.add(absoluteUrl);
        }
      }
    });

    propertyData.images = Array.from(images);

    // Guest capacity
    const guestText = extractTextAfter($, 'guests') || extractTextAfter($, 'Guest') || '';
    const guestMatch = guestText.match(/(\d+)/);
    if (guestMatch) {
      propertyData.guests = parseInt(guestMatch[1]);
    }

    // Bedrooms
    const bedroomText = extractTextAfter($, 'bedroom') || extractTextAfter($, 'Bedroom') || '';
    const bedroomMatch = bedroomText.match(/(\d+)/);
    if (bedroomMatch) {
      propertyData.bedrooms = parseInt(bedroomMatch[1]);
    }

    // Bathrooms
    const bathroomText = extractTextAfter($, 'bathroom') || extractTextAfter($, 'Bathroom') || '';
    const bathroomMatch = bathroomText.match(/(\d+)/);
    if (bathroomMatch) {
      propertyData.bathrooms = parseInt(bathroomMatch[1]);
    }

    // Price
    const priceText = $('.price').text() || $('[itemprop="price"]').text() || '';
    const priceMatch = priceText.match(/\$?\s*(\d+)/);
    if (priceMatch) {
      propertyData.price = parseInt(priceMatch[1]);
    }

    // Amenities - look for common amenity keywords
    const amenityKeywords = [
      'WiFi', 'Wi-Fi', 'Internet', 'Wireless',
      'Kitchen', 'Kitchenette',
      'Parking', 'Free parking',
      'Pool', 'Swimming pool',
      'Hot tub', 'Jacuzzi',
      'Gym', 'Fitness',
      'Air conditioning', 'AC', 'Climate control',
      'Heating', 'Heat',
      'TV', 'Television',
      'Washer', 'Dryer', 'Laundry',
      'Pet friendly', 'Pets allowed',
      'Workspace', 'Desk',
      'Fireplace',
    ];

    const amenitiesFound = new Set<string>();
    const pageText = $('body').text().toLowerCase();

    amenityKeywords.forEach(keyword => {
      if (pageText.includes(keyword.toLowerCase())) {
        // Normalize amenity names
        if (keyword.toLowerCase().includes('wifi') || keyword.toLowerCase().includes('wi-fi') || keyword.toLowerCase().includes('internet') || keyword.toLowerCase().includes('wireless')) {
          amenitiesFound.add('WiFi');
        } else if (keyword.toLowerCase().includes('kitchen')) {
          amenitiesFound.add('Kitchen');
        } else if (keyword.toLowerCase().includes('parking')) {
          amenitiesFound.add('Parking');
        } else if (keyword.toLowerCase().includes('pool')) {
          amenitiesFound.add('Pool');
        } else if (keyword.toLowerCase().includes('hot tub') || keyword.toLowerCase().includes('jacuzzi')) {
          amenitiesFound.add('Hot Tub');
        } else if (keyword.toLowerCase().includes('gym') || keyword.toLowerCase().includes('fitness')) {
          amenitiesFound.add('Gym');
        } else if (keyword.toLowerCase().includes('air conditioning') || keyword.toLowerCase() === 'ac') {
          amenitiesFound.add('Air Conditioning');
        } else if (keyword.toLowerCase().includes('heating') || keyword.toLowerCase().includes('heat')) {
          amenitiesFound.add('Heating');
        } else if (keyword.toLowerCase().includes('tv') || keyword.toLowerCase().includes('television')) {
          amenitiesFound.add('TV');
        } else if (keyword.toLowerCase().includes('washer') || keyword.toLowerCase().includes('dryer') || keyword.toLowerCase().includes('laundry')) {
          amenitiesFound.add('Washer/Dryer');
        } else if (keyword.toLowerCase().includes('pet')) {
          amenitiesFound.add('Pet Friendly');
        } else if (keyword.toLowerCase().includes('workspace') || keyword.toLowerCase().includes('desk')) {
          amenitiesFound.add('Workspace');
        } else if (keyword.toLowerCase().includes('fireplace')) {
          amenitiesFound.add('Fireplace');
        }
      }
    });

    propertyData.amenities = Array.from(amenitiesFound);

    // Check for wellness/smoke-free mentions
    if (pageText.includes('smoke-free') || pageText.includes('smoking: not allowed') || pageText.includes('no smoking')) {
      propertyData.wellnessFriendly = true;
    }

    return NextResponse.json({ success: true, data: propertyData });

  } catch (error: any) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape property data', details: error.message },
      { status: 500 }
    );
  }
}

function extractTextAfter($: any, keyword: string): string {
  const elements = $('*').filter((_: any, el: any) => {
    return $(el).text().toLowerCase().includes(keyword.toLowerCase());
  });
  
  return elements.first().text().trim();
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Skip tiny images, icons, and common non-property images
  if (url.includes('icon') || url.includes('logo') || url.includes('avatar')) {
    return false;
  }
  
  // Check for image extensions or image hosting patterns
  const imagePatterns = /\.(jpg|jpeg|png|webp|gif)($|\?)/i;
  const imageHosts = /(images|img|photos|media|cdn|cloudinary|unsplash)/i;
  
  return imagePatterns.test(url) || imageHosts.test(url);
}

