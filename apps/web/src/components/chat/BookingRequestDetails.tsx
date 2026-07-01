'use client';

import { Calendar, Users, MapPin, MessageSquare, DollarSign } from 'lucide-react';
import { formatCalendarDate } from '@/lib/dateUtils';

export type BookingRequestInfo = {
  id: string;
  status: string;
  property_name?: string | null;
  location?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  guests?: number | null;
  kids?: number | null;
  pets?: number | null;
  special_requests?: string | null;
  total_price?: number | null;
  guest_name?: string | null;
};

function formatDateRange(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return 'Dates not set';
  const inLabel = formatCalendarDate(checkIn, { month: 'short', day: 'numeric', year: 'numeric' });
  const outLabel = formatCalendarDate(checkOut, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${inLabel} → ${outLabel}`;
}

type BookingRequestDetailsProps = {
  booking: BookingRequestInfo;
  showGuestName?: boolean;
  className?: string;
  variant?: 'dark' | 'light';
};

/** Host-facing summary of what the traveller is trying to book. */
export function BookingRequestDetails({
  booking,
  showGuestName = true,
  className = '',
  variant = 'dark',
}: BookingRequestDetailsProps) {
  const statusLabel = String(booking.status || 'pending').replaceAll('_', ' ');
  const isLight = variant === 'light';

  return (
    <div
      className={
        isLight
          ? `rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3 ${className}`
          : `rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 space-y-3 ${className}`
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={
            isLight
              ? 'text-sm font-bold text-emerald-700 uppercase tracking-wider'
              : 'text-sm font-bold text-emerald-400 uppercase tracking-wider'
          }
        >
          Booking request
        </p>
        <span
          className={
            isLight
              ? 'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-800'
              : 'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-gray-300'
          }
        >
          {statusLabel}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className={`flex items-start gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          <MapPin size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <span className="font-semibold">{booking.property_name || 'Property'}</span>
        </div>
        <div className={`flex items-start gap-2 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
          <Calendar size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <span>{formatDateRange(booking.check_in, booking.check_out)}</span>
        </div>
        <div className={`flex items-start gap-2 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
          <Users size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <span>
            {booking.guests ?? 0} guest{(booking.guests ?? 0) === 1 ? '' : 's'}
            {(booking.kids ?? 0) > 0 ? ` · ${booking.kids} kids` : ''}
            {(booking.pets ?? 0) > 0 ? ` · ${booking.pets} pets` : ''}
          </span>
        </div>
        {booking.total_price != null && (
          <div className={`flex items-start gap-2 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
            <DollarSign size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>${Number(booking.total_price).toLocaleString('en-US')} total</span>
          </div>
        )}
        {showGuestName && booking.guest_name && (
          <p className={isLight ? 'text-gray-500 text-xs' : 'text-gray-400 text-xs'}>
            Guest: {booking.guest_name}
          </p>
        )}
        {booking.special_requests?.trim() && (
          <div
            className={`flex items-start gap-2 pt-1 border-t ${
              isLight ? 'text-gray-600 border-emerald-100' : 'text-gray-300 border-white/10'
            }`}
          >
            <MessageSquare size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="italic">&ldquo;{booking.special_requests.trim()}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  );
}
