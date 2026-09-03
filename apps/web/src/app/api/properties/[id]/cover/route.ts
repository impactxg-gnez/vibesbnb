import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBrowserClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop';

function isHttpUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== 'string') return false;
  const t = url.trim();
  const lower = t.toLowerCase();
  return (
    (lower.startsWith('https://') || lower.startsWith('http://')) &&
    !lower.startsWith('data:') &&
    !lower.includes('via.placeholder') &&
    !lower.includes('photo-1542718610')
  );
}

function firstUsableImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  let dataFallback: string | null = null;
  for (const raw of images) {
    if (typeof raw !== 'string') continue;
    const url = raw.trim();
    if (!url) continue;
    if (isHttpUrl(url)) return url;
    if (!dataFallback && url.toLowerCase().startsWith('data:image/')) {
      dataFallback = url;
    }
  }
  return dataFallback;
}

function dataUrlToResponse(dataUrl: string): NextResponse | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/i.exec(dataUrl);
  if (!match) return null;
  try {
    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length < 32 || buffer.length > 8_000_000) return null;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return null;
  }
}

/**
 * Card-safe cover for a single listing. Prefers cover_image / http URLs;
 * falls back to serving an embedded data:image so browse never ships base64.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const rawParams = await Promise.resolve(context.params);
  const id = decodeURIComponent(rawParams.id || '').trim();
  if (!id) {
    return NextResponse.redirect(PLACEHOLDER, 302);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey || url.includes('placeholder')) {
    return NextResponse.redirect(PLACEHOLDER, 302);
  }

  const supabase = createBrowserClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: slim, error: slimErr } = await supabase
      .from('properties')
      .select('status, cover_image')
      .eq('id', id)
      .maybeSingle();

    if (slimErr || !slim || slim.status !== 'active') {
      return NextResponse.redirect(PLACEHOLDER, 302);
    }

    if (isHttpUrl(slim.cover_image)) {
      return NextResponse.redirect(slim.cover_image.trim(), 302);
    }

    const { data: full, error: fullErr } = await supabase
      .from('properties')
      .select('images')
      .eq('id', id)
      .maybeSingle();

    if (fullErr || !full) {
      return NextResponse.redirect(PLACEHOLDER, 302);
    }

    const picked = firstUsableImage(full.images);
    if (!picked) {
      return NextResponse.redirect(PLACEHOLDER, 302);
    }
    if (isHttpUrl(picked)) {
      return NextResponse.redirect(picked, 302);
    }
    if (picked.toLowerCase().startsWith('data:image/')) {
      const res = dataUrlToResponse(picked);
      if (res) return res;
    }
  } catch (e) {
    console.warn('[properties/cover]', id, e);
  }

  return NextResponse.redirect(PLACEHOLDER, 302);
}
