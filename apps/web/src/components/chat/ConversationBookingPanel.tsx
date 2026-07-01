'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import { BookingRequestDetails, type BookingRequestInfo } from './BookingRequestDetails';
import { BookingRequestPendingBanner } from './BookingRequestPendingBanner';
import toast from 'react-hot-toast';

type ConversationBookingPanelProps = {
  bookingId: string | null | undefined;
  isHost: boolean;
  /** Admin console: approve/reject on behalf of the host */
  isAdmin?: boolean;
  theme?: 'dark' | 'light';
  showSubmittedBanner?: boolean;
  onBookingUpdated?: () => void;
  /** Fallback when conversation.booking_id is missing */
  propertyId?: string | null;
  travellerId?: string | null;
};

export function ConversationBookingPanel({
  bookingId,
  isHost,
  isAdmin = false,
  theme = 'dark',
  showSubmittedBanner = false,
  onBookingUpdated,
  propertyId,
  travellerId,
}: ConversationBookingPanelProps) {
  const [booking, setBooking] = useState<BookingRequestInfo | null>(null);
  const [resolvedBookingId, setResolvedBookingId] = useState<string | null>(
    bookingId ?? null
  );
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveCheckIn, setApproveCheckIn] = useState('');
  const [approveCheckOut, setApproveCheckOut] = useState('');

  const postBookingAction = async (
    action: 'accept' | 'reject' | 'cancel',
    body: Record<string, unknown>
  ) => {
    if (isAdmin) {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization) {
        throw new Error('No valid session — please sign in again.');
      }
      const bookingIdForPath = String(body.bookingId ?? booking?.id ?? '');
      if (action === 'cancel') {
        throw new Error('Admin cancel is not supported from messages');
      }
      const path =
        action === 'accept'
          ? `/api/admin/bookings/${bookingIdForPath}/accept`
          : `/api/admin/bookings/${bookingIdForPath}/reject`;
      const payload =
        action === 'accept'
          ? {
              checkIn: body.checkIn,
              checkOut: body.checkOut,
            }
          : { reason: body.reason };
      return fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      });
    }

    const path =
      action === 'accept'
        ? '/api/bookings/accept'
        : action === 'reject'
          ? '/api/bookings/reject'
          : '/api/bookings/cancel';
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const canManage = isHost || isAdmin;
  const isLight = theme === 'light';

  const fetchBookingById = useCallback(
    async (id: string) => {
      if (isAdmin) {
        const headers = await getHeadersForAdminFetch();
        if (!headers.Authorization) {
          throw new Error('No valid session — please sign in again.');
        }
        const response = await fetch(`/api/admin/bookings/${id}`, { headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to load booking');
        return data.booking as BookingRequestInfo;
      }

      const supabase = createClient();
      const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
      if (error) throw error;
      return data as BookingRequestInfo;
    },
    [isAdmin]
  );

  const fetchPendingBooking = useCallback(async () => {
    if (!propertyId || !travellerId) return null;

    if (isAdmin) {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization) {
        throw new Error('No valid session — please sign in again.');
      }
      const params = new URLSearchParams({
        propertyId,
        travellerId,
        status: 'pending_approval',
      });
      const response = await fetch(`/api/admin/bookings/lookup?${params}`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to lookup booking');
      return (data.booking as BookingRequestInfo | null) ?? null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('user_id', travellerId)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as BookingRequestInfo | null) ?? null;
  }, [isAdmin, propertyId, travellerId]);

  const refreshBooking = useCallback(
    async (id: string) => {
      const data = await fetchBookingById(id);
      setBooking(data);
      setResolvedBookingId(id);
      return data;
    },
    [fetchBookingById]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        if (bookingId) {
          const data = await fetchBookingById(bookingId);
          if (cancelled) return;
          setBooking(data);
          setResolvedBookingId(bookingId);
          return;
        }

        if (canManage && propertyId && travellerId) {
          const data = await fetchPendingBooking();
          if (cancelled) return;
          if (data) {
            setBooking(data);
            setResolvedBookingId(data.id);
            return;
          }
        }

        if (!cancelled) {
          setBooking(null);
          setResolvedBookingId(null);
        }
      } catch {
        if (!cancelled) {
          setBooking(null);
          setResolvedBookingId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [bookingId, canManage, propertyId, travellerId, fetchBookingById, fetchPendingBooking]);

  const openApproveModal = () => {
    if (!booking?.check_in || !booking?.check_out) return;
    setApproveCheckIn(String(booking.check_in).slice(0, 10));
    setApproveCheckOut(String(booking.check_out).slice(0, 10));
    setApproveModalOpen(true);
  };

  const closeApproveModal = () => {
    if (acting) return;
    setApproveModalOpen(false);
  };

  const submitApprove = async () => {
    if (!booking?.id) return;
    setActing(true);
    try {
      const response = await postBookingAction('accept', {
        bookingId: booking.id,
        checkIn: approveCheckIn,
        checkOut: approveCheckOut,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to approve');
      toast.success(
        isAdmin
          ? 'Booking approved — guest notified to pay and confirm.'
          : 'Booking approved. Guest can pay now.'
      );
      await refreshBooking(booking.id);
      setApproveModalOpen(false);
      onBookingUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setActing(false);
    }
  };

  /** Pre-approve: accept with the guest's requested dates (no date edit). */
  const preapproveBooking = async () => {
    if (!booking?.id) return;
    setActing(true);
    try {
      const response = await postBookingAction('accept', { bookingId: booking.id });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to pre-approve');
      toast.success(
        isAdmin
          ? 'Booking approved — guest notified to pay and confirm.'
          : 'Pre-approved. Guest can pay for their requested dates.'
      );
      await refreshBooking(booking.id);
      onBookingUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to pre-approve');
    } finally {
      setActing(false);
    }
  };

  const hostCancelBooking = async () => {
    if (!booking?.id || isAdmin) return;
    const reason =
      window.prompt(
        'Why are you cancelling? (e.g. guest did not pay in time)\n\nThe traveller will receive this reason.'
      ) || '';
    if (!reason.trim()) {
      toast.error('Cancellation reason is required');
      return;
    }
    setActing(true);
    try {
      const response = await postBookingAction('cancel', {
        bookingId: booking.id,
        reason: reason.trim(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to cancel');
      toast.success('Booking cancelled. Guest has been notified.');
      await refreshBooking(booking.id);
      onBookingUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setActing(false);
    }
  };

  const rejectBooking = async () => {
    if (!booking?.id) return;
    const reason = window.prompt(
      isAdmin
        ? 'Reason for rejecting this booking (sent to the traveller):'
        : 'Reason for declining this request?'
    );
    if (!reason?.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setActing(true);
    try {
      const response = await postBookingAction('reject', {
        bookingId: booking.id,
        reason: reason.trim(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to reject');
      toast.success(
        isAdmin ? 'Booking rejected — guest notified.' : 'Booking rejected. Guest has been notified.'
      );
      await refreshBooking(booking.id);
      onBookingUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setActing(false);
    }
  };

  const hasLookup = Boolean(bookingId || (canManage && propertyId && travellerId));
  if (!hasLookup) return null;

  const panelBorder = isLight ? 'border-gray-200' : 'border-gray-800';
  const panelBg = isLight ? 'bg-gray-50' : 'bg-gray-900/80';
  const mutedText = isLight ? 'text-gray-500' : 'text-gray-500';

  if (loading) {
    return (
      <p className={`text-xs ${mutedText} px-4 py-3 border-b ${panelBorder}`}>
        Loading booking request…
      </p>
    );
  }

  if (!booking || !resolvedBookingId) {
    if (canManage) {
      return (
        <p className={`text-xs ${mutedText} px-4 py-3 border-b ${panelBorder}`}>
          No pending booking request linked to this conversation.
        </p>
      );
    }
    return null;
  }

  const isPending =
    booking.status === 'pending_approval' || booking.status === 'pending';
  const isAccepted =
    booking.status === 'accepted' || booking.status === 'confirmed';

  return (
    <>
      <div className={`shrink-0 px-4 py-3 border-b ${panelBorder} space-y-3 ${panelBg}`}>
        {!canManage && (showSubmittedBanner || isPending) && <BookingRequestPendingBanner />}

        {canManage && (
          <BookingRequestDetails
            booking={booking}
            variant={isLight ? 'light' : 'dark'}
            showGuestName
          />
        )}

        {!canManage && isAccepted && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
            The host approved your request.{' '}
            <Link href="/bookings" className="font-bold underline hover:text-emerald-100">
              Complete payment
            </Link>{' '}
            to secure your stay.
          </div>
        )}

        {canManage && isPending && (
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              onClick={rejectBooking}
              disabled={acting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              <X size={16} />
              Reject
            </button>
            <button
              type="button"
              onClick={preapproveBooking}
              disabled={acting}
              className={
                isLight
                  ? 'px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm font-semibold disabled:opacity-50'
                  : 'px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 text-sm font-semibold disabled:opacity-50'
              }
              title="Approve the guest's requested dates without changes"
            >
              Pre-approve
            </button>
            <button
              type="button"
              onClick={openApproveModal}
              disabled={acting}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check size={16} />
              Approve
            </button>
          </div>
        )}

        {canManage && !isAdmin && (booking.status === 'accepted' || booking.status === 'confirmed') && (
          <div
            className={`flex flex-wrap items-center gap-2 justify-end pt-1 border-t ${
              isLight ? 'border-gray-200' : 'border-white/10'
            }`}
          >
            {booking.status === 'accepted' && (
              <p
                className={`text-xs flex-1 min-w-[140px] ${
                  isLight ? 'text-emerald-700' : 'text-emerald-400'
                }`}
              >
                Approved — awaiting guest payment.
              </p>
            )}
            <button
              type="button"
              onClick={hostCancelBooking}
              disabled={acting}
              className={
                isLight
                  ? 'px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50'
                  : 'px-3 py-1.5 rounded-lg border border-red-500/50 text-red-400 text-xs font-semibold hover:bg-red-950/40 disabled:opacity-50'
              }
            >
              Cancel booking
            </button>
          </div>
        )}

        {isAdmin && booking.status === 'accepted' && (
          <p className="text-xs text-emerald-700">Approved — awaiting guest payment.</p>
        )}
      </div>

      {approveModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-approve-booking-title"
          onClick={closeApproveModal}
        >
          <div
            className={
              isLight
                ? 'bg-white border border-gray-200 rounded-xl max-w-md w-full p-6 shadow-xl'
                : 'bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-xl'
            }
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="chat-approve-booking-title"
              className={`text-xl font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}
            >
              Approve stay
            </h2>
            <p className={`text-sm mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Confirm or adjust check-in and check-out before the guest pays.
            </p>
            <div className="space-y-3 mb-6">
              <div>
                <label
                  className={`block text-xs uppercase tracking-wide mb-1 ${
                    isLight ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  Check-in
                </label>
                <input
                  type="date"
                  value={approveCheckIn}
                  onChange={(e) => setApproveCheckIn(e.target.value)}
                  className={
                    isLight
                      ? 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900'
                      : 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white'
                  }
                />
              </div>
              <div>
                <label
                  className={`block text-xs uppercase tracking-wide mb-1 ${
                    isLight ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  Check-out
                </label>
                <input
                  type="date"
                  value={approveCheckOut}
                  onChange={(e) => setApproveCheckOut(e.target.value)}
                  min={approveCheckIn}
                  className={
                    isLight
                      ? 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900'
                      : 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white'
                  }
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeApproveModal}
                disabled={acting}
                className={
                  isLight
                    ? 'px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50'
                    : 'px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50'
                }
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitApprove}
                disabled={acting || !approveCheckIn || !approveCheckOut}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 font-semibold"
              >
                {acting ? 'Saving…' : 'Approve & notify guest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
