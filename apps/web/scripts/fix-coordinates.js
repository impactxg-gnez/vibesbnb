const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// This script can be run with node to identify and fix clustered properties
// Usage: env SUPABASE_URL=... SUPABASE_KEY=... GOOGLE_MAPS_API_KEY=... node fix-coordinates.js

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !supabaseKey || !googleMapsApiKey) {
    console.error('Missing environment variables. Need SUPABASE_URL, SUPABASE_KEY, and GOOGLE_MAPS_API_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchPlace(name, location) {
    const query = encodeURIComponent(`${name} ${location}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${googleMapsApiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
            return data.results[0];
        }
    } catch (e) {
        console.error(`Error searching for ${name}:`, e.message);
    }
    return null;
}

async function run() {
    console.log('Fetching active properties...');
    const { data: properties, error } = await supabase
        .from('properties')
        .select('id, name, location, latitude, longitude, status')
        .eq('status', 'active');

    if (error) {
        console.error('Error fetching properties:', error);
        return;
    }

    console.log(`Checking ${properties.length} properties...`);

    // Group by coordinates to find clusters
    const groups = {};
    properties.forEach(p => {
        if (p.latitude && p.longitude) {
            const key = `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        } else {
            const key = 'missing';
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        }
    });

    const clusters = Object.entries(groups).filter(([key, props]) => key === 'missing' || props.length > 1);

    console.log(`Found ${clusters.length} coordinate groups that are clustered or missing.`);

    for (const [key, props] of clusters) {
        console.log(`Processing group ${key} (${props.length} properties)...`);
        for (const p of props) {
            const result = await searchPlace(p.name, p.location);
            if (result) {
                const { lat, lng } = result.geometry.location;
                const placeId = result.place_id;
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${placeId}`;

                console.log(`  Updating ${p.name}: ${lat}, ${lng}`);

                const { error: updateError } = await supabase
                    .from('properties')
                    .update({
                        latitude: lat,
                        longitude: lng,
                        google_maps_url: mapsUrl,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', p.id);

                if (updateError) {
                    console.error(`    Error updating ${p.name}:`, updateError.message);
                }
            } else {
                console.log(`  No precise location found for ${p.name}`);
            }
        }
    }

    console.log('Finished processing.');
}

run();
