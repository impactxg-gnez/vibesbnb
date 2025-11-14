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
        message: 'This cleanup only works with Supabase. For localStorage properties, please re-import them.'
      }, { status: 400 });
    }

    // Fetch all properties
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, name, title, images');

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({ 
        message: 'No properties found to clean up',
        updated: 0
      });
    }

    let updatedCount = 0;
    const updatePromises: Promise<any>[] = [];

    // Process each property
    for (const property of properties) {
      let needsUpdate = false;
      const updateData: any = {};

      // Clean up property name - remove "Property Listing" prefix
      const currentName = property.name || property.title || '';
      if (currentName) {
        const cleanedName = currentName
          .replace(/^Property\s+Listing[_\s-]*/i, '')
          .replace(/^property-listing[_\s-]*/i, '')
          .trim();
        
        if (cleanedName !== currentName && cleanedName.length > 0) {
          updateData.name = cleanedName;
          updateData.title = cleanedName;
          needsUpdate = true;
        }
      }

      // Ensure at least one image exists
      const images = property.images || [];
      if (images.length === 0) {
        // Use a placeholder image - hosts should add their own images
        updateData.images = ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image'];
        needsUpdate = true;
      }

      if (needsUpdate) {
        updatePromises.push(
          supabase
            .from('properties')
            .update(updateData)
            .eq('id', property.id)
            .then(({ error }) => {
              if (error) {
                console.error(`Error updating property ${property.id}:`, error);
                return false;
              }
              return true;
            })
        );
        updatedCount++;
      }
    }

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${updatedCount} properties`,
      total: properties.length,
      updated: updatedCount,
    });

  } catch (error: any) {
    console.error('Error cleaning up properties:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup properties', details: error.message },
      { status: 500 }
    );
  }
}

