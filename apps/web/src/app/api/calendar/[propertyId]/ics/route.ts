import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { addMonthsUtc, startOfUtcDay } from '@/lib/calendar/syncExternalIcal';
import { loadPlatformOccupancySpans, renderIcsCalendar } from '@/lib/calendar/icsExportPlatform';

export const dynamic = 'force-dynamic';

/**
 * ICS export (next 6 months). Query: ?token= must match properties.ical_export_token
 */
export async function GET(
  request: NextRequest,
  context: { params: { propertyId: string } }
) {
  try {
    const propertyId = context.params.propertyId;
    const token = new URL(request.url).searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 });
    }

    const service = createServiceClient();

    const { data: property, error: propError } = await service
      .from('properties')
      .select('id, name, ical_export_token')
      .eq('id', propertyId)
      .maybeSingle();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.ical_export_token !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const windowStart = startOfUtcDay();
    const windowEndExclusive = addMonthsUtc(windowStart, 6);

    const spans = await loadPlatformOccupancySpans({
      service,
      propertyId,
      windowStart,
      windowEndExclusive,
    });

    const body = renderIcsCalendar({
      propertyId: property.id,
      propertyName: property.name || 'VibesBNB listing',
      spans,
    });

    const fname = `${String(property.name || property.id).replace(/[^a-zA-Z0-9]/g, '_')}.ics`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=120',
        'Content-Disposition': `inline; filename="${fname}"`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to export';
    console.error('[calendar ics]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
