import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { normalizeImageAlts, type ImageAltEntry } from '@/lib/accessibility';

type RouteCtx = { params: { id: string } };

/**
 * Generate or refresh AI/fallback alt text for property images missing host alts.
 * POST /api/properties/[id]/image-alts
 */
export async function POST(_req: NextRequest, { params }: RouteCtx) {
  try {
    const propertyId = params.id;
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createServiceClient();
    const { data: property, error } = await service
      .from('properties')
      .select('id, host_id, name, title, images, image_alts')
      .eq('id', propertyId)
      .maybeSingle();

    if (error || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    if (property.host_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const images: string[] = Array.isArray(property.images) ? property.images.filter(Boolean) : [];
    const existing = normalizeImageAlts(property.image_alts);
    const byUrl = new Map(existing.map((e) => [e.url, e]));
    const propertyName = String(property.name || property.title || 'Listing');

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const next: ImageAltEntry[] = [];

    for (let i = 0; i < images.length; i++) {
      const url = images[i];
      const prev = byUrl.get(url);
      if (prev?.alt && prev.source === 'host') {
        next.push(prev);
        continue;
      }

      let alt = prev?.alt || `${propertyName} — photo ${i + 1}`;
      let source: ImageAltEntry['source'] = prev?.source === 'ai' ? 'ai' : 'fallback';

      if (apiKey && url.startsWith('http')) {
        try {
          const { GoogleGenerativeAI } = await import('@google/generative-ai');
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const prompt = `Write a concise, factual alt text (max 125 characters) for a vacation rental photo. Property name: ${propertyName}. Do not invent amenities you cannot see. Return plain text only.\nImage URL: ${url}\nIf you cannot see the image, describe it as "Photo of ${propertyName}."`;
          const result = await model.generateContent(prompt);
          const text = result.response.text()?.trim();
          if (text) {
            alt = text.slice(0, 125);
            source = 'ai';
          }
        } catch (e) {
          console.warn('[image-alts] AI failed for', url, e);
        }
      }

      next.push({ url, alt, source });
    }

    const { error: upErr } = await service
      .from('properties')
      .update({ image_alts: next, updated_at: new Date().toISOString() })
      .eq('id', propertyId);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, image_alts: next });
  } catch (e) {
    console.error('[image-alts]', e);
    return NextResponse.json({ error: 'Failed to generate alt text' }, { status: 500 });
  }
}
