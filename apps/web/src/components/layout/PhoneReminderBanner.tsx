'use client';

import Link from 'next/link';
import { Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { travellerNeedsPhoneVerification } from '@/lib/auth/hasVerifiedPhone';

/** Prompt travellers without a verified phone to complete OTP verification. */
export function PhoneReminderBanner() {
  const { user, loading } = useAuth();

  if (loading || !user) return null;
  if (!travellerNeedsPhoneVerification(user)) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2 text-sm text-amber-900">
        <Phone className="w-4 h-4 shrink-0" aria-hidden />
        <span>
          Verify your phone number to book stays and receive WhatsApp updates.
        </span>
        <Link
          href="/verify-phone"
          className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
        >
          Verify now
        </Link>
      </div>
    </div>
  );
}
