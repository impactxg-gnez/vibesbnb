import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const bookings = data || [];
    const userIds = [...new Set(bookings.map((b) => b.user_id).filter(Boolean))];

    const profileByUserId = new Map<
      string,
      { phone: string | null; whatsapp: string | null; email: string | null }
    >();

    if (userIds.length > 0) {
      const { data: profiles } = await serviceSupabase
        .from('profiles')
        .select('id, phone, whatsapp, email')
        .in('id', userIds);

      for (const profile of profiles || []) {
        profileByUserId.set(profile.id, {
          phone: profile.phone?.trim() || null,
          whatsapp: profile.whatsapp?.trim() || null,
          email: profile.email?.trim() || null,
        });
      }
    }

    const enriched = bookings.map((booking) => {
      const contact = profileByUserId.get(booking.user_id);
      return {
        ...booking,
        guest_phone: contact?.phone || null,
        guest_whatsapp: contact?.whatsapp || null,
        profile_email: contact?.email || null,
      };
    });

    return NextResponse.json({ bookings: enriched });
  } catch (error: unknown) {
    console.error('Failed to load admin bookings:', error);
    const message = error instanceof Error ? error.message : 'Failed to load bookings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
