'use client';

import { useEffect, useRef, useState } from 'react';

export type HostPayoutPreviewData = {
  guestTotal: number;
  hostFee: number;
  hostAmount: number;
  hostFeePercent: number;
  lodgingGross: number;
  nights: number;
};

export function useHostPayoutPreview(params: {
  bookingId?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  enabled?: boolean;
  extraHeaders?: () => Promise<Record<string, string>>;
}) {
  const { bookingId, checkIn, checkOut, enabled = true, extraHeaders } = params;
  const extraHeadersRef = useRef(extraHeaders);
  extraHeadersRef.current = extraHeaders;

  const [preview, setPreview] = useState<HostPayoutPreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !bookingId) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const headers = extraHeadersRef.current ? await extraHeadersRef.current() : {};
          const qs = new URLSearchParams({ bookingId });
          if (checkIn) qs.set('checkIn', String(checkIn).slice(0, 10));
          if (checkOut) qs.set('checkOut', String(checkOut).slice(0, 10));
          const response = await fetch(`/api/bookings/payout-preview?${qs}`, {
            headers,
            cache: 'no-store',
          });
          const data = await response.json();
          if (cancelled) return;
          if (!response.ok) {
            setPreview(null);
            return;
          }
          setPreview({
            guestTotal: Number(data.guestTotal) || 0,
            hostFee: Number(data.hostFee) || 0,
            hostAmount: Number(data.hostAmount) || 0,
            hostFeePercent: Number(data.hostFeePercent) || 0,
            lodgingGross: Number(data.lodgingGross) || 0,
            nights: Number(data.nights) || 0,
          });
        } catch {
          if (!cancelled) setPreview(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bookingId, checkIn, checkOut, enabled]);

  return { preview, loading };
}
