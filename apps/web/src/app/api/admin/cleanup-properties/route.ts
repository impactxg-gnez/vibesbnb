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
        message: 'This cleanup only works with Supabase. For localStorage properties, please re-import them.'
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

    console.log('[Cleanup] Fetching all properties...');
    // Fetch all properties
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, name, title, images');
    
    console.log('[Cleanup] Found', properties?.length || 0, 'properties');
    if (fetchError) {
      console.error('[Cleanup] Fetch error:', fetchError);
    }

    if (fetchError) {
      console.error('[Cleanup] Error fetching properties:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!properties || properties.length === 0) {
      console.log('[Cleanup] No properties found in database');
      return NextResponse.json({ 
        message: 'No properties found in database',
        total: 0,
        updated: 0
      });
    }

    let updatedCount = 0;
    const updatePromises: Promise<any>[] = [];

    console.log('[Cleanup] Processing', properties.length, 'properties...');
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
          console.log(`[Cleanup] Property ${property.id}: "${currentName}" -> "${cleanedName}"`);
          updateData.name = cleanedName;
          updateData.title = cleanedName;
          needsUpdate = true;
        }
      }

      // Ensure at least one image exists
      const images = property.images || [];
      if (images.length === 0) {
        console.log(`[Cleanup] Property ${property.id}: Adding placeholder image`);
        // Use a placeholder image - hosts should add their own images
        updateData.images = ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image'];
        needsUpdate = true;
      }

      if (needsUpdate) {
        updatePromises.push(
          Promise.resolve(
            supabase
              .from('properties')
              .update(updateData)
              .eq('id', property.id)
          ).then(({ error }) => {
            if (error) {
              console.error(`[Cleanup] Error updating property ${property.id}:`, error);
              return false;
            }
            console.log(`[Cleanup] Successfully updated property ${property.id}`);
            return true;
          })
        );
        updatedCount++;
      }
    }
    
    console.log('[Cleanup] Found', updatedCount, 'properties that need updates out of', properties.length, 'total');

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

