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
};

/** Host-facing summary of what the traveller is trying to book. */
export function BookingRequestDetails({
  booking,
  showGuestName = true,
  className = '',
}: BookingRequestDetailsProps) {
  const statusLabel = String(booking.status || 'pending').replaceAll('_', ' ');

  return (
    <div
      className={`rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
          Booking request
        </p>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-gray-300">
          {statusLabel}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2 text-white">
          <MapPin size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <span className="font-semibold">{booking.property_name || 'Property'}</span>
        </div>
        <div className="flex items-start gap-2 text-gray-300">
          <Calendar size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>{formatDateRange(booking.check_in, booking.check_out)}</span>
        </div>
        <div className="flex items-start gap-2 text-gray-300">
          <Users size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>
            {booking.guests ?? 0} guest{(booking.guests ?? 0) === 1 ? '' : 's'}
            {(booking.kids ?? 0) > 0 ? ` · ${booking.kids} kids` : ''}
            {(booking.pets ?? 0) > 0 ? ` · ${booking.pets} pets` : ''}
          </span>
        </div>
        {booking.total_price != null && (
          <div className="flex items-start gap-2 text-gray-300">
            <DollarSign size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>${Number(booking.total_price).toLocaleString('en-US')} total</span>
          </div>
        )}
        {showGuestName && booking.guest_name && (
          <p className="text-gray-400 text-xs">Guest: {booking.guest_name}</p>
        )}
        {booking.special_requests?.trim() && (
          <div className="flex items-start gap-2 text-gray-300 pt-1 border-t border-white/10">
            <MessageSquare size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="italic">&ldquo;{booking.special_requests.trim()}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  );
}
