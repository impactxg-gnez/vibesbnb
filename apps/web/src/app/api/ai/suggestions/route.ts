import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateEmbedding, analyzeSearchQuery, generateMatchReason } from '@/lib/ai';

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        console.log(`[AI Search] Processing query: "${query}"`);

        // 1. Analyze query to get structured filters and a focused "vibe"
        const { location, guests, vibe } = await analyzeSearchQuery(query);
        console.log(`[AI Search] Analyzed: location=${location}, guests=${guests}, vibe="${vibe}"`);

        // 2. Generate embedding for the "vibe"
        const embedding = await generateEmbedding(vibe);

        // 3. Search Supabase using vector similarity
        const supabase = createServiceClient();
        const { data: matches, error } = await supabase.rpc('match_properties', {
            query_embedding: embedding,
            match_threshold: 0.5, // Adjust based on testing
            match_count: 5,
            min_guests: guests || 1,
            location_query: location || null
        });

        if (error) {
            console.error('[AI Search] Supabase RPC error:', error);
            throw error;
        }

        // 4. Enrich results with AI-generated match reasons
        const results = await Promise.all((matches || []).map(async (property: any) => {
            const matchReason = await generateMatchReason(query, property.name, property.description || '');
            return {
                ...property,
                matchReason
            };
        }));

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error('[AI Search] Error:', error);
        return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
    }
}
