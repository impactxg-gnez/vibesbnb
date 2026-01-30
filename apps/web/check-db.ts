
import { createClient } from './src/lib/supabase/service';

async function checkDb() {
    const supabase = createServiceClient();

    console.log('--- Properties Status ---');
    const { data: properties, error: pError } = await supabase
        .from('properties')
        .select('id, status, location, name');

    if (pError) {
        console.error('Error fetching properties:', pError);
    } else {
        console.log(`Total properties: ${properties?.length}`);
        const statusCounts = properties?.reduce((acc: any, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {});
        console.log('Status counts:', statusCounts);
        console.log('Sample properties:', properties?.slice(0, 5));
    }

    console.log('\n--- Bookings Status ---');
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select('id, property_id, status');

    if (bError) {
        console.error('Error fetching bookings:', bError);
    } else {
        console.log(`Total bookings: ${bookings?.length}`);
        const propertyBookings = bookings?.reduce((acc: any, b) => {
            acc[b.property_id] = (acc[b.property_id] || 0) + 1;
            return acc;
        }, {});
        console.log('Bookings per property (top 5):', Object.entries(propertyBookings || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5));
    }
}

checkDb();
