import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get user role from request body (sent from client)
    const body = await request.json().catch(() => ({}));
    const userRole = body.role;
    
    // Check if user is admin
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const isSupabaseConfigured = supabaseUrl && 
                                  supabaseUrl !== '' &&
                                  supabaseUrl !== 'https://placeholder.supabase.co' &&
                                  supabaseAnonKey &&
                                  supabaseAnonKey !== '' &&
                                  supabaseAnonKey !== 'placeholder-key';

    if (!isSupabaseConfigured) {
      return NextResponse.json({ 
        error: 'Supabase not configured',
        message: 'This feature only works with Supabase.'
      }, { status: 400 });
    }

    // Use service role key if available (bypasses RLS), otherwise use anon key
    const supabaseKey = supabaseServiceKey || supabaseAnonKey;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('[Grab Images] Fetching all properties (including drafts)...');
    // Fetch all properties (including drafts) - don't filter by status
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, name, location, images, google_maps_url, description, status');
    
    console.log('[Grab Images] Found', properties?.length || 0, 'properties');
    if (fetchError) {
      console.error('[Grab Images] Fetch error:', fetchError);
    }

    if (fetchError) {
      console.error('[Grab Images] Error fetching properties:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!properties || properties.length === 0) {
      console.log('[Grab Images] No properties found in database');
      return NextResponse.json({ 
        message: 'No properties found in database',
        total: 0,
        updated: 0
      });
    }

    // Filter properties that need images (empty or only placeholder)
    // Also check for empty arrays, null, or arrays with empty strings
    const propertiesNeedingImages = properties.filter(p => {
      const images = p.images || [];
      const hasValidImages = Array.isArray(images) && 
                            images.length > 0 && 
                            images.some(img => img && img.trim() !== '' && !img.includes('placeholder'));
      return !hasValidImages;
    });
    
    console.log('[Grab Images] Properties needing images breakdown:', {
      total: properties.length,
      needingImages: propertiesNeedingImages.length,
      withValidImages: properties.length - propertiesNeedingImages.length,
      byStatus: {
        draft: propertiesNeedingImages.filter(p => p.status === 'draft').length,
        active: propertiesNeedingImages.filter(p => p.status === 'active').length,
        other: propertiesNeedingImages.filter(p => !p.status || (p.status !== 'draft' && p.status !== 'active')).length,
      }
    });

    console.log('[Grab Images] Found', propertiesNeedingImages.length, 'properties needing images out of', properties.length, 'total');

    if (propertiesNeedingImages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All properties already have images',
        total: properties.length,
        updated: 0,
      });
    }

    let updatedCount = 0;
    const updatePromises: Promise<any>[] = [];

    // Process each property
    for (const property of propertiesNeedingImages) {
      try {
        let newImages: string[] = [];
        
        // First, try to scrape images from the original source if we have a way to identify it
        // For Esca Management properties, we can try to reconstruct the URL
        const propertyName = property.name || '';
        const location = property.location || '';
        
        // Try to construct Esca Management URL if it's an Esca property
        // Check if property name contains "Esca Management" or if it looks like an Esca property
        const isEscaProperty = propertyName.includes('Esca Management') || 
                              propertyName.includes('Esca') ||
                              (property.google_maps_url && property.google_maps_url.includes('esca'));
        
        if (propertyName && !propertyName.includes('Untitled') && isEscaProperty) {
          // Try multiple URL patterns
          const urlPatterns = [
            // Pattern 1: property-listing_{slug}
            `https://esca-management.com/property-listing_${propertyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}/`,
            // Pattern 2: Try to extract from name if it has a specific format
            propertyName.toLowerCase().includes('the netflix house') ? 'https://esca-management.com/property-listing_the-netflix-house/' : null,
            propertyName.toLowerCase().includes('prima studio') ? 'https://esca-management.com/property-listing_prima-studio/' : null,
          ].filter(Boolean);
          
          for (const escaUrl of urlPatterns) {
            try {
              console.log(`[Grab Images] Trying to scrape from: ${escaUrl}`);
              
              // Call the scrape-property API using the full URL
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                             process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                             'http://localhost:3000';
              
              const scrapeResponse = await fetch(`${baseUrl}/api/scrape-property`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: escaUrl }),
              });
              
              if (scrapeResponse.ok) {
                const scrapeData = await scrapeResponse.json();
                if (scrapeData.success && scrapeData.data?.images && scrapeData.data.images.length > 0) {
                  // Filter out placeholder images
                  newImages = scrapeData.data.images
                    .filter((img: string) => !img.includes('placeholder'))
                    .slice(0, 5); // Get up to 5 images
                  
                  if (newImages.length > 0) {
                    console.log(`[Grab Images] Found ${newImages.length} images for property ${property.id} from ${escaUrl}`);
                    break; // Found images, stop trying other URLs
                  }
                }
              }
            } catch (e) {
              console.error(`[Grab Images] Error scraping images for property ${property.id} from ${escaUrl}:`, e);
            }
          }
        }
        
        // If no images from scraping, try Unsplash
        if (newImages.length === 0 && process.env.UNSPLASH_ACCESS_KEY) {
          const searchQuery = `${propertyName} ${location} property vacation rental`.trim();
          const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=3&client_id=${process.env.UNSPLASH_ACCESS_KEY}`;
          
          try {
            const unsplashResponse = await fetch(unsplashUrl);
            if (unsplashResponse.ok) {
              const unsplashData = await unsplashResponse.json();
              if (unsplashData.results && unsplashData.results.length > 0) {
                newImages = unsplashData.results.slice(0, 3).map((photo: any) => photo.urls.regular);
                console.log(`Found ${newImages.length} images for property ${property.id} from Unsplash`);
              }
            }
          } catch (e) {
            console.error(`Error fetching from Unsplash for property ${property.id}:`, e);
          }
        }
        
        // If still no images, use a descriptive placeholder
        if (newImages.length === 0) {
          const displayName = propertyName || 'Property';
          newImages = [`https://via.placeholder.com/800x600/1a1a1a/ffffff?text=${encodeURIComponent(displayName.substring(0, 30))}`];
        }

        // Update the property with new images
        updatePromises.push(
          Promise.resolve(
            supabase
              .from('properties')
              .update({ images: newImages })
              .eq('id', property.id)
          ).then(({ error }) => {
            if (error) {
              console.error(`Error updating property ${property.id}:`, error);
              return false;
            }
            return true;
          })
        );
        updatedCount++;
      } catch (error: any) {
        console.error(`Error processing property ${property.id}:`, error);
      }
    }

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `Grabbed images for ${updatedCount} properties`,
      total: properties.length,
      updated: updatedCount,
    });

  } catch (error: any) {
    console.error('Error grabbing images:', error);
    return NextResponse.json(
      { error: 'Failed to grab images', details: error.message },
      { status: 500 }
    );
  }
}

