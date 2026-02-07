import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Generate iCal format for property availability
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 });
    }

    const supabase = createClient();

    // Verify token matches property
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, name, ical_export_token')
      .eq('id', params.id)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.ical_export_token !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get all blocked and booked dates
    const { data: availability, error: availError } = await supabase
      .from('property_availability')
      .select('day, status, room_id, booking_id')
      .eq('property_id', params.id)
      .in('status', ['blocked', 'booked'])
      .order('day', { ascending: true });

    if (availError) {
      throw availError;
    }

    // Generate iCal content
    const icalContent = generateICalContent(property, availability || []);

    return new NextResponse(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${property.name.replace(/[^a-zA-Z0-9]/g, '_')}_calendar.ics"`,
      },
    });
  } catch (error: any) {
    console.error('iCal export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export calendar' },
      { status: 500 }
    );
  }
}

function generateICalContent(
  property: { id: string; name: string },
  availability: Array<{ day: string; status: string; room_id?: string | null; booking_id?: string | null }>
): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//VibesBNB//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${property.name}
X-WR-TIMEZONE:UTC
`;

  // Group consecutive days into events
  const events = groupConsecutiveDays(availability);

  events.forEach((event, index) => {
    const startDate = event.startDate.replace(/-/g, '');
    // End date is exclusive in iCal, so add 1 day
    const endDate = addDays(event.endDate, 1).replace(/-/g, '');
    const uid = `${property.id}-${event.startDate}-${index}@vibesbnb.com`;
    const summary = event.status === 'booked' ? 'Booked' : 'Blocked';
    const description = event.status === 'booked' 
      ? 'Reserved by guest' 
      : 'Blocked by host';

    ical += `BEGIN:VEVENT
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${endDate}
DTSTAMP:${timestamp}
UID:${uid}
SUMMARY:${summary}
DESCRIPTION:${description}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
`;
  });

  ical += 'END:VCALENDAR';
  return ical;
}

function groupConsecutiveDays(
  availability: Array<{ day: string; status: string }>
): Array<{ startDate: string; endDate: string; status: string }> {
  if (availability.length === 0) return [];

  const sorted = [...availability].sort((a, b) => a.day.localeCompare(b.day));
  const events: Array<{ startDate: string; endDate: string; status: string }> = [];

  let currentEvent = {
    startDate: sorted[0].day,
    endDate: sorted[0].day,
    status: sorted[0].status,
  };

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const prevDate = new Date(currentEvent.endDate);
    const currDate = new Date(current.day);
    
    // Check if consecutive and same status
    const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1 && current.status === currentEvent.status) {
      // Extend current event
      currentEvent.endDate = current.day;
    } else {
      // Save current event and start new one
      events.push({ ...currentEvent });
      currentEvent = {
        startDate: current.day,
        endDate: current.day,
        status: current.status,
      };
    }
  }

  // Don't forget the last event
  events.push(currentEvent);

  return events;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

