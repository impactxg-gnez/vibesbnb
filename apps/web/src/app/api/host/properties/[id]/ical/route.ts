import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// GET - List iCal sources and export URL for a property
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, host_id, ical_export_token')
      .eq('id', params.id)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.host_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get iCal sources
    const { data: sources, error: sourcesError } = await supabase
      .from('property_ical_sources')
      .select('*')
      .eq('property_id', params.id)
      .order('created_at', { ascending: false });

    if (sourcesError) {
      throw sourcesError;
    }

    // Generate export URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const exportUrl = `${appUrl}/api/properties/${params.id}/ical/export?token=${property.ical_export_token}`;

    return NextResponse.json({
      exportUrl,
      sources: sources || [],
    });
  } catch (error: any) {
    console.error('Error fetching iCal data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch iCal data' },
      { status: 500 }
    );
  }
}

// POST - Add a new iCal source
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, host_id')
      .eq('id', params.id)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.host_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, ical_url } = body;

    if (!name || !ical_url) {
      return NextResponse.json(
        { error: 'Name and iCal URL are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(ical_url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid iCal URL format' },
        { status: 400 }
      );
    }

    // Create the iCal source
    const { data: source, error: insertError } = await supabase
      .from('property_ical_sources')
      .insert({
        property_id: params.id,
        host_id: user.id,
        name,
        ical_url,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Trigger initial sync
    try {
      await syncICalSource(source.id, params.id, ical_url, user.id);
    } catch (syncError: any) {
      console.warn('Initial sync failed:', syncError);
      // Update sync error but don't fail the request
      await supabase
        .from('property_ical_sources')
        .update({ sync_error: syncError.message })
        .eq('id', source.id);
    }

    return NextResponse.json({ source });
  } catch (error: any) {
    console.error('Error adding iCal source:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add iCal source' },
      { status: 500 }
    );
  }
}

// DELETE - Remove an iCal source
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json({ error: 'Source ID required' }, { status: 400 });
    }

    // Verify ownership and delete
    const { error: deleteError } = await supabase
      .from('property_ical_sources')
      .delete()
      .eq('id', sourceId)
      .eq('host_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    // Also remove any availability entries from this source
    await supabase
      .from('property_availability')
      .delete()
      .eq('ical_source_id', sourceId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting iCal source:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete iCal source' },
      { status: 500 }
    );
  }
}

// Helper function to sync an iCal source
async function syncICalSource(
  sourceId: string,
  propertyId: string,
  icalUrl: string,
  hostId: string
) {
  const serviceSupabase = createServiceClient();

  // Fetch the iCal content
  const response = await fetch(icalUrl, {
    headers: {
      'User-Agent': 'VibesBNB-Calendar-Sync/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`);
  }

  const icalContent = await response.text();

  // Parse the iCal content
  const events = parseICalContent(icalContent);

  // Remove old entries from this source
  await serviceSupabase
    .from('property_availability')
    .delete()
    .eq('property_id', propertyId)
    .eq('ical_source_id', sourceId);

  // Insert new blocked dates
  const blockedDates: any[] = [];

  for (const event of events) {
    // Generate all dates in the range
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      blockedDates.push({
        property_id: propertyId,
        host_id: hostId,
        day: dateKey,
        status: 'blocked',
        source: 'ical_sync',
        ical_source_id: sourceId,
        note: event.summary || 'External booking',
      });
    }
  }

  if (blockedDates.length > 0) {
    // Insert in batches to avoid conflicts
    for (const block of blockedDates) {
      // Check if date is already blocked/booked
      const { data: existing } = await serviceSupabase
        .from('property_availability')
        .select('id, status')
        .eq('property_id', block.property_id)
        .eq('day', block.day)
        .is('room_id', null)
        .single();

      if (!existing) {
        await serviceSupabase
          .from('property_availability')
          .insert(block);
      }
    }
  }

  // Update last synced timestamp
  await serviceSupabase
    .from('property_ical_sources')
    .update({
      last_synced_at: new Date().toISOString(),
      sync_error: null,
    })
    .eq('id', sourceId);
}

// Simple iCal parser
function parseICalContent(content: string): Array<{
  startDate: string;
  endDate: string;
  summary?: string;
}> {
  const events: Array<{ startDate: string; endDate: string; summary?: string }> = [];

  // Split into events
  const eventBlocks = content.split('BEGIN:VEVENT');

  for (let i = 1; i < eventBlocks.length; i++) {
    const block = eventBlocks[i].split('END:VEVENT')[0];
    
    let startDate = '';
    let endDate = '';
    let summary = '';

    // Parse DTSTART
    const dtStartMatch = block.match(/DTSTART[^:]*:(\d{8})/);
    if (dtStartMatch) {
      startDate = `${dtStartMatch[1].slice(0, 4)}-${dtStartMatch[1].slice(4, 6)}-${dtStartMatch[1].slice(6, 8)}`;
    }

    // Parse DTEND
    const dtEndMatch = block.match(/DTEND[^:]*:(\d{8})/);
    if (dtEndMatch) {
      endDate = `${dtEndMatch[1].slice(0, 4)}-${dtEndMatch[1].slice(4, 6)}-${dtEndMatch[1].slice(6, 8)}`;
    }

    // Parse SUMMARY
    const summaryMatch = block.match(/SUMMARY[^:]*:([^\r\n]+)/);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    }

    if (startDate && endDate) {
      events.push({ startDate, endDate, summary });
    }
  }

  return events;
}

