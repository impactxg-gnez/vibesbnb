import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { clampDisplayCount, uniqueOrderedIds } from '@/lib/featuredRetreatsResolve';

const MAX_STORED_IDS = 24;

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('featured_retreats_config')
      .select('property_ids, display_count, updated_at')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      if (error.message?.includes('featured_retreats_config') || error.code === '42P01') {
        return NextResponse.json({
          propertyIds: [] as string[],
          displayCount: 6,
          updatedAt: null,
          migrationRequired: true,
        });
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json({
        propertyIds: [] as string[],
        displayCount: 6,
        updatedAt: null,
        migrationRequired: true,
      });
    }

    const row = data as { property_ids?: string[]; display_count?: number; updated_at?: string };
    return NextResponse.json({
      propertyIds: Array.isArray(row.property_ids) ? row.property_ids : [],
      displayCount: clampDisplayCount(row.display_count),
      updatedAt: row.updated_at ?? null,
      migrationRequired: false,
    });
  } catch (error: unknown) {
    console.error('[admin/featured-retreats] GET', error);
    const message = error instanceof Error ? error.message : 'Failed to load config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const displayCount = body.displayCount !== undefined ? clampDisplayCount(body.displayCount) : undefined;
    let propertyIds: string[] | undefined;
    if (Array.isArray(body.propertyIds)) {
      propertyIds = uniqueOrderedIds(body.propertyIds).slice(0, MAX_STORED_IDS);
    }

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from('featured_retreats_config')
      .select('property_ids, display_count')
      .eq('id', 'default')
      .maybeSingle();

    const nextDisplay = displayCount ?? clampDisplayCount((existing as { display_count?: number })?.display_count);
    const nextIds =
      propertyIds !== undefined
        ? propertyIds
        : uniqueOrderedIds(
            Array.isArray((existing as { property_ids?: unknown[] })?.property_ids)
              ? ((existing as { property_ids: unknown[] }).property_ids as unknown[])
              : []
          ).slice(0, MAX_STORED_IDS);

    const { error } = await supabase.from('featured_retreats_config').upsert(
      {
        id: 'default',
        property_ids: nextIds,
        display_count: nextDisplay,
      },
      { onConflict: 'id' }
    );

    if (error) {
      if (error.message?.includes('featured_retreats_config') || error.code === '42P01') {
        return NextResponse.json(
          {
            error:
              'Database table missing. Run apps/web/SUPABASE_FEATURED_RETREATS_CONFIG.sql in the Supabase SQL editor.',
          },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      propertyIds: nextIds,
      displayCount: nextDisplay,
    });
  } catch (error: unknown) {
    console.error('[admin/featured-retreats] PATCH', error);
    const message = error instanceof Error ? error.message : 'Failed to save config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
