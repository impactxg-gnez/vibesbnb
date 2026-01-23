import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractCoordinatesFromGoogleMapsUrl, searchPlaceByNameAndLocation } from '@/lib/google-maps-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { propertyIds } = await request.json();

        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const isAdmin = user.user_metadata?.role === 'admin';

        // If 'propertyIds' is 'all', and user is admin, fetch all properties
        let queryPropertyIds = propertyIds;
        if (propertyIds === 'all' && isAdmin) {
            const { data: allIds, error: allIdsError } = await supabase
                .from('properties')
                .select('id');

            if (allIdsError) throw allIdsError;
            queryPropertyIds = allIds.map((p: { id: string }) => p.id);
        }

        if (!queryPropertyIds || !Array.isArray(queryPropertyIds) || queryPropertyIds.length === 0) {
            return NextResponse.json(
                { error: 'Property IDs are required' },
                { status: 400 }
            );
        }

        // Fetch properties to get their names, current locations, and URLs
        let fetchQuery = supabase
            .from('properties')
            .select('id, name, location, google_maps_url, source_url')
            .in('id', queryPropertyIds);

        // Non-admins can only sync their own properties
        if (!isAdmin) {
            fetchQuery = fetchQuery.eq('host_id', user.id);
        }

        const { data: properties, error: fetchError } = await fetchQuery;

        if (fetchError) {
            console.error('[Auto-Detect Location] Error fetching properties:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
        }

        const results = [];
        const errors = [];

        for (const property of properties) {
            try {
                let preciseCoords: { lat: number; lng: number; url: string } | null = null;

                // Step 1: Try to extract from existing Google Maps URL if present
                if (property.google_maps_url) {
                    console.log(`[Auto-Detect Location] Trying to extract coordinates from existing URL for ${property.name}`);
                    const coords = await extractCoordinatesFromGoogleMapsUrl(property.google_maps_url);
                    if (coords) {
                        preciseCoords = { ...coords, url: property.google_maps_url };
                        console.log(`[Auto-Detect Location] Successfully extracted coordinates for ${property.name}`);
                    }
                }

                // Step 2: If no coordinates yet, try to search using Google Places API
                if (!preciseCoords) {
                    console.log(`[Auto-Detect Location] Searching Google Places for ${property.name} at ${property.location}`);
                    preciseCoords = await searchPlaceByNameAndLocation(property.name, property.location);
                }

                if (preciseCoords) {
                    // Update the property in the database
                    let updateQuery = supabase
                        .from('properties')
                        .update({
                            latitude: preciseCoords.lat,
                            longitude: preciseCoords.lng,
                            google_maps_url: preciseCoords.url,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', property.id);

                    if (!isAdmin) {
                        updateQuery = updateQuery.eq('host_id', user.id);
                    }

                    const { error: updateError } = await updateQuery;

                    if (updateError) {
                        throw updateError;
                    }

                    results.push({
                        id: property.id,
                        name: property.name,
                        coordinates: { lat: preciseCoords.lat, lng: preciseCoords.lng },
                        success: true
                    });
                } else {
                    errors.push({
                        id: property.id,
                        name: property.name,
                        error: 'Could not find precise location'
                    });
                }
            } catch (err: any) {
                console.error(`[Auto-Detect Location] Error processing property ${property.id}:`, err);
                errors.push({
                    id: property.id,
                    name: property.name,
                    error: err.message || 'Unknown error'
                });
            }
        }

        return NextResponse.json({
            success: true,
            results,
            errors,
            summary: {
                total: queryPropertyIds.length,
                successful: results.length,
                failed: errors.length
            }
        });

    } catch (error: any) {
        console.error('[Auto-Detect Location] Global error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
