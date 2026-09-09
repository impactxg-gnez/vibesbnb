import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import {
  normalizePropertyImages,
  unwrapProxiedImageUrl,
} from '@/lib/propertyImageUrls';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_GALLERY = 24;

function isHttpUrl(url: string): boolean {
  const t = url.trim();
  if (t.length < 12 || t.length > 4000) return false;
  const lower = t.toLowerCase();
  return (
    (lower.startsWith('https://') || lower.startsWith('http://')) &&
    !lower.startsWith('data:') &&
    !lower.includes('via.placeholder')
  );
}

/**
 * Returns http(s) gallery URLs only (never base64). Used after PDP first paint.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const rawParams = await Promise.resolve(context.params);
  const id = decodeURIComponent(rawParams.id || '').trim();
  if (!id) {
    return NextResponse.json({ images: [] }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey || url.includes('placeholder')) {
    return NextResponse.json({ images: [] }, { status: 503 });
  }

  const supabase = createBrowserClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: slim } = await supabase
      .from('properties')
      .select('status, cover_image')
      .eq('id', id)
      .maybeSingle();

    if (!slim || slim.status !== 'active') {
      return NextResponse.json({ images: [] }, { status: 404 });
    }

    const cover =
      typeof slim.cover_image === 'string' && isHttpUrl(slim.cover_image)
        ? slim.cover_image.trim()
        : null;

    const { data: full, error } = await supabase
      .from('properties')
      .select('images')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn('[properties/gallery]', id, error.message);
    }

    const raw = Array.isArray(full?.images) ? (full!.images as unknown[]) : [];
    const httpOnly: string[] = [];
    const seen = new Set<string>();
    if (cover) {
      seen.add(cover);
      httpOnly.push(cover);
    }
    for (const item of raw) {
      if (typeof item !== 'string') continue;
      const unwrapped = unwrapProxiedImageUrl(item.trim());
      if (!isHttpUrl(unwrapped) || seen.has(unwrapped)) continue;
      seen.add(unwrapped);
      httpOnly.push(unwrapped);
      if (httpOnly.length >= MAX_GALLERY) break;
    }

    const images =
      httpOnly.length > 0
        ? normalizePropertyImages(httpOnly).filter((u) => isHttpUrl(u)).slice(0, MAX_GALLERY)
        : [`/api/properties/${encodeURIComponent(id)}/cover`];

    return NextResponse.json(
      { images, cover_image: cover },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        },
      }
    );
  } catch (e) {
    console.warn('[properties/gallery]', id, e);
    return NextResponse.json(
      { images: [`/api/properties/${encodeURIComponent(id)}/cover`] },
      { status: 200 }
    );
  }
}
