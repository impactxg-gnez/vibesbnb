const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!apiKey) {
    console.error('Error: GOOGLE_GENERATIVE_AI_API_KEY is not set');
    process.exit(1);
}

if (!supabaseUrl || !serviceKey) {
    console.error('Error: Supabase credentials are not set (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const supabase = createClient(supabaseUrl, serviceKey);

async function generateEmbeddings() {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    // 1. Fetch properties that need embeddings
    console.log('Fetching properties...');
    const { data: properties, error } = await supabase
        .from('properties')
        .select('id, name, description, location, amenities')
        .eq('status', 'active');

    if (error) {
        console.error('Error fetching properties:', error);
        return;
    }

    console.log(`Found ${properties.length} properties to process.`);

    for (const property of properties) {
        try {
            // 2. Prepare text for embedding
            const textToEmbed = `
        Name: ${property.name}
        Location: ${property.location}
        Description: ${property.description || ''}
        Amenities: ${(property.amenities || []).join(', ')}
      `.trim();

            console.log(`Generating embedding for: ${property.name}...`);
            const result = await model.embedContent(textToEmbed);
            const embedding = result.embedding.values;

            // 3. Update property with embedding
            const { error: updateError } = await supabase
                .from('properties')
                .update({ embedding })
                .eq('id', property.id);

            if (updateError) {
                console.error(`Error updating property ${property.id}:`, updateError);
            } else {
                console.log(`Successfully updated: ${property.name}`);
            }
        } catch (err) {
            console.error(`Failed to process property ${property.id}:`, err);
        }
    }

    console.log('Finished generating embeddings.');
}

generateEmbeddings();
