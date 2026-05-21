'use client';

import { Clock } from 'lucide-react';

/** Shown to travellers after submitting a booking request while awaiting host response. */
export function BookingRequestPendingBanner() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 flex items-start gap-3 mb-3">
      <Clock size={20} className="text-amber-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-200">The host will respond soon</p>
        <p className="text-xs text-amber-200/80 mt-1">
          Your request has been sent. You can message the host here while you wait for them to accept
          or decline. You&apos;ll be able to complete payment after they approve your dates.
        </p>
      </div>
    </div>
  );
}
