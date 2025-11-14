import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isSupabaseConfigured = supabaseUrl && 
                                  supabaseUrl !== '' &&
                                  supabaseUrl !== 'https://placeholder.supabase.co' &&
                                  supabaseKey &&
                                  supabaseKey !== '' &&
                                  supabaseKey !== 'placeholder-key';

    if (!isSupabaseConfigured) {
      return NextResponse.json({ 
        error: 'Supabase not configured',
        message: 'This feature only works with Supabase.'
      }, { status: 400 });
    }

    // Fetch all properties that need images
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, name, location, images, google_maps_url');

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({ 
        message: 'No properties found',
        updated: 0
      });
    }

    // Filter properties that need images (empty or only placeholder)
    const propertiesNeedingImages = properties.filter(p => {
      const images = p.images || [];
      return images.length === 0 || 
             (images.length === 1 && images[0].includes('placeholder'));
    });

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
        // Try to get images from Unsplash based on property name and location
        const searchQuery = `${property.name} ${property.location || ''} property vacation rental`.trim();
        const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=3&client_id=${process.env.UNSPLASH_ACCESS_KEY || ''}`;
        
        let newImages: string[] = [];
        
        // If Unsplash API key is available, try to fetch images
        if (process.env.UNSPLASH_ACCESS_KEY) {
          try {
            const unsplashResponse = await fetch(unsplashUrl);
            if (unsplashResponse.ok) {
              const unsplashData = await unsplashResponse.json();
              if (unsplashData.results && unsplashData.results.length > 0) {
                newImages = unsplashData.results.slice(0, 3).map((photo: any) => photo.urls.regular);
              }
            }
          } catch (e) {
            console.error(`Error fetching from Unsplash for property ${property.id}:`, e);
          }
        }
        
        // If no images from Unsplash, try to scrape from Google Images or use a better placeholder
        if (newImages.length === 0) {
          // Use a more descriptive placeholder based on property name
          const propertyName = property.name || 'Property';
          newImages = [`https://via.placeholder.com/800x600/1a1a1a/ffffff?text=${encodeURIComponent(propertyName)}`];
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

