import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for bulk operations

export async function POST(request: NextRequest) {
  try {
    const { propertyIds, sourceUrls } = await request.json();

    if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
      return NextResponse.json(
        { error: 'Property IDs are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch properties with their source URLs
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, name, source_url')
      .in('id', propertyIds)
      .eq('host_id', user.id);

    if (fetchError) {
      console.error('[Re-scrape Coordinates] Error fetching properties:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch properties' },
        { status: 500 }
      );
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json(
        { error: 'No properties found' },
        { status: 404 }
      );
    }

    const results = [];
    const errors = [];

    // Get the base URL for API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'http://localhost:3000';

    // Re-scrape coordinates for each property
    for (const property of properties) {
      // Use provided source URL from request, or fall back to stored source_url
      const sourceUrl = (sourceUrls && sourceUrls[property.id]) || property.source_url;
      
      if (!sourceUrl) {
        errors.push({
          propertyId: property.id,
          propertyName: property.name,
          error: 'No source URL found for this property',
        });
        continue;
      }

      try {
        console.log(`[Re-scrape Coordinates] Scraping ${property.name} from ${sourceUrl}`);
        
        // Call the scrape API to get coordinates
        const scrapeResponse = await fetch(
          `${baseUrl}/api/scrape-property`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: sourceUrl,
              usePuppeteer: true, // Use Puppeteer for better coordinate extraction
            }),
          }
        );

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          throw new Error(`Scraping failed: ${scrapeResponse.statusText} - ${errorText}`);
        }

        const scrapedData = await scrapeResponse.json();

        if (!scrapedData.coordinates) {
          errors.push({
            propertyId: property.id,
            propertyName: property.name,
            error: 'No coordinates found on source page',
          });
          continue;
        }

        // Update the property with new coordinates
        const { error: updateError } = await supabase
          .from('properties')
          .update({
            latitude: scrapedData.coordinates.lat,
            longitude: scrapedData.coordinates.lng,
            google_maps_url: scrapedData.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${scrapedData.coordinates.lat},${scrapedData.coordinates.lng}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', property.id)
          .eq('host_id', user.id);

        if (updateError) {
          throw updateError;
        }

        results.push({
          propertyId: property.id,
          propertyName: property.name,
          coordinates: scrapedData.coordinates,
          success: true,
        });

        console.log(`[Re-scrape Coordinates] Successfully updated ${property.name} with coordinates: ${scrapedData.coordinates.lat}, ${scrapedData.coordinates.lng}`);
      } catch (error: any) {
        console.error(`[Re-scrape Coordinates] Error for ${property.name}:`, error);
        errors.push({
          propertyId: property.id,
          propertyName: property.name,
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: properties.length,
        successful: results.length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error('[Re-scrape Coordinates] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

