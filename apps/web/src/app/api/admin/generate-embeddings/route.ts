import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateEmbedding } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for batch processing

export async function POST(req: NextRequest) {
    try {
        const { role } = await req.json().catch(() => ({}));

        // Basic admin check
        if (role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const supabase = createServiceClient();

        // 1. Fetch properties that don't have embeddings yet
        const { data: properties, error: fetchError } = await supabase
            .from('properties')
            .select('id, name, description, location, amenities')
            .is('embedding', null)
            .limit(50); // Process in batches to avoid timeouts

        if (fetchError) throw fetchError;

        if (!properties || properties.length === 0) {
            return NextResponse.json({ message: 'All properties already have embeddings' });
        }

        console.log(`[Admin] Generating embeddings for ${properties.length} properties...`);

        const results = [];
        for (const property of properties) {
            try {
                // Construct a rich text string for the embedding
                const textToEmbed = `
                    Name: ${property.name}
                    Location: ${property.location}
                    Description: ${property.description || ''}
                    Amenities: ${(property.amenities || []).join(', ')}
                `.trim();

                const embedding = await generateEmbedding(textToEmbed);

                const { error: updateError } = await supabase
                    .from('properties')
                    .update({ embedding })
                    .eq('id', property.id);

                if (updateError) throw updateError;

                results.push({ id: property.id, status: 'success' });
            } catch (err: any) {
                console.error(`[Admin] Failed to generate embedding for ${property.id}:`, err.message);
                results.push({ id: property.id, status: 'failed', error: err.message });
            }
        }

        return NextResponse.json({
            processed: results.length,
            success: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'failed').length,
            details: results
        });

    } catch (error: any) {
        console.error('[Admin] Embedding generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
