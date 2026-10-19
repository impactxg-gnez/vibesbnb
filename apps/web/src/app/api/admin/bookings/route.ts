import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { snapshotGuestContact } from '@/lib/bookings/snapshotGuestContact';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 500;
const MAX_ROWS = 20_000;

type BookingRow = {
  id: string;
  user_id: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_whatsapp?: string | null;
  [key: string]: unknown;
};

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t || null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const serviceSupabase = createServiceClient();
    const bookings: BookingRow[] = [];

    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await serviceSupabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw error;
      }

      const page = (data ?? []) as BookingRow[];
      bookings.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const userIds = [
      ...new Set(bookings.map((b) => b.user_id).filter((id): id is string => Boolean(id))),
    ];

    const profileByUserId = new Map<
      string,
      { phone: string | null; whatsapp: string | null; email: string | null; name: string | null }
    >();

    if (userIds.length > 0) {
      const { data: profiles } = await serviceSupabase
        .from('profiles')
        .select('id, phone, whatsapp, email, full_name')
        .in('id', userIds);

      for (const profile of profiles || []) {
        profileByUserId.set(profile.id, {
          phone: trimOrNull(profile.phone),
          whatsapp: trimOrNull(profile.whatsapp),
          email: trimOrNull(profile.email),
          name: trimOrNull(profile.full_name),
        });
      }
    }

    const snapshotUpdates: Array<{ id: string; patch: Record<string, string> }> = [];

    const enriched = bookings.map((booking) => {
      const contact = booking.user_id ? profileByUserId.get(booking.user_id) : undefined;
      const guest_name =
        trimOrNull(booking.guest_name) || contact?.name || `User ${String(booking.user_id || '').substring(0, 8)}`;
      const guest_email = trimOrNull(booking.guest_email) || contact?.email || null;
      const guest_phone = trimOrNull(booking.guest_phone) || contact?.phone || null;
      const guest_whatsapp =
        trimOrNull(booking.guest_whatsapp) || contact?.whatsapp || guest_phone || null;

      const patch: Record<string, string> = {};
      if (!trimOrNull(booking.guest_name) && guest_name) patch.guest_name = guest_name;
      if (!trimOrNull(booking.guest_email) && guest_email) patch.guest_email = guest_email;
      if (!trimOrNull(booking.guest_phone) && guest_phone) patch.guest_phone = guest_phone;
      if (!trimOrNull(booking.guest_whatsapp) && guest_whatsapp) {
        patch.guest_whatsapp = guest_whatsapp;
      }
      if (Object.keys(patch).length > 0) {
        snapshotUpdates.push({ id: String(booking.id), patch });
      }

      return {
        ...booking,
        guest_name,
        guest_email,
        guest_phone,
        guest_whatsapp,
        profile_email: contact?.email || null,
      };
    });

    if (snapshotUpdates.length > 0) {
      void Promise.all(
        snapshotUpdates.map(({ id, patch }) =>
          serviceSupabase.from('bookings').update(patch).eq('id', id)
        )
      ).catch((err) => {
        console.warn('[admin/bookings] snapshot backfill skipped:', err);
      });
    }

    const missingUserIds = [
      ...new Set(
        bookings
          .filter(
            (b) =>
              b.user_id &&
              !trimOrNull(b.guest_phone) &&
              !trimOrNull(b.guest_email) &&
              !profileByUserId.get(b.user_id)
          )
          .map((b) => b.user_id as string)
      ),
    ].slice(0, 25);

    if (missingUserIds.length > 0) {
      void Promise.all(
        missingUserIds.map(async (userId) => {
          try {
            const snap = await snapshotGuestContact(serviceSupabase, userId);
            const ids = bookings.filter((b) => b.user_id === userId).map((b) => b.id);
            await Promise.all(
              ids.map((id) =>
                serviceSupabase
                  .from('bookings')
                  .update({
                    guest_name: snap.guest_name,
                    guest_email: snap.guest_email,
                    guest_phone: snap.guest_phone,
                    guest_whatsapp: snap.guest_whatsapp,
                  })
                  .eq('id', id)
              )
            );
          } catch {
            /* auth user may already be gone */
          }
        })
      );
    }

    return NextResponse.json({ bookings: enriched, total: enriched.length });
  } catch (error: unknown) {
    console.error('Failed to load admin bookings:', error);
    const message = error instanceof Error ? error.message : 'Failed to load bookings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
