'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookingRequestDetails, type BookingRequestInfo } from './BookingRequestDetails';
import { BookingRequestPendingBanner } from './BookingRequestPendingBanner';
import toast from 'react-hot-toast';

type ConversationBookingPanelProps = {
  bookingId: string | null | undefined;
  isHost: boolean;
  showSubmittedBanner?: boolean;
  onBookingUpdated?: () => void;
};

export function ConversationBookingPanel({
  bookingId,
  isHost,
  showSubmittedBanner = false,
  onBookingUpdated,
}: ConversationBookingPanelProps) {
  const [booking, setBooking] = useState<BookingRequestInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    (async () => {
      try {
        const { data, error } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
        if (cancelled) return;
        if (error) throw error;
        setBooking(data as BookingRequestInfo);
      } catch {
        if (!cancelled) setBooking(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const acceptBooking = async () => {
    if (!booking?.id) return;
    setActing(true);
    try {
      const response = await fetch('/api/bookings/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to accept');
      toast.success('Approved. Guest can pay now.');
      const supabase = createClient();
      const { data: refreshed } = await supabase.from('bookings').select('*').eq('id', booking.id).single();
      if (refreshed) setBooking(refreshed as BookingRequestInfo);
      onBookingUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setActing(false);
    }
  };

  const rejectBooking = async () => {
    if (!booking?.id) return;
    const reason = window.prompt('Reason for declining?');
    if (!reason?.trim()) return;
    setActing(true);
    try {
      const response = await fetch('/api/bookings/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, reason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to decline');
      toast.success('Booking declined. Guest has been notified.');
      const supabase = createClient();
      const { data: refreshed } = await supabase.from('bookings').select('*').eq('id', booking.id).single();
      if (refreshed) setBooking(refreshed as BookingRequestInfo);
      onBookingUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to decline');
    } finally {
      setActing(false);
    }
  };

  if (!bookingId) return null;

  if (loading) {
    return (
      <p className="text-xs text-gray-500 px-1 pb-3">Loading booking details…</p>
    );
  }

  if (!booking) return null;

  const isPending = booking.status === 'pending_approval';
  const isAccepted =
    booking.status === 'accepted' ||
    booking.status === 'confirmed';

  return (
    <div className="space-y-3 pb-3">
      {!isHost && (showSubmittedBanner || isPending) && <BookingRequestPendingBanner />}

      {isHost && <BookingRequestDetails booking={booking} />}

      {!isHost && isAccepted && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          The host approved your request.{' '}
          <Link href="/bookings" className="font-bold underline hover:text-emerald-100">
            Complete payment
          </Link>{' '}
          to secure your stay.
        </div>
      )}

      {isHost && isPending && (
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={rejectBooking}
            disabled={acting}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-semibold disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={acceptBooking}
            disabled={acting}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-semibold disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      )}
    </div>
  );
}
