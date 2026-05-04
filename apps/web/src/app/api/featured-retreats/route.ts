import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveFeaturedRetreatsForHome } from '@/lib/featuredRetreatsResolve';

/** Never prerender/ISR this handler — large JSON (reviews × properties) exceeds Vercel ISR body limits. */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { retreats, source, displayCount } = await resolveFeaturedRetreatsForHome(supabase);
    return NextResponse.json(
      { retreats, source, displayCount },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: unknown) {
    console.error('[featured-retreats] GET', error);
    const message = error instanceof Error ? error.message : 'Failed to load featured vibes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
