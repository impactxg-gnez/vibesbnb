'use client';

import Link from 'next/link';
import { Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { phoneFromAuthMetadata } from '@/lib/supabase/profileContactFromUser';

/** Prompt travellers without a phone to add one for WhatsApp updates. */
export function PhoneReminderBanner() {
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  const role = user.user_metadata?.role;
  if (role === 'host' || role === 'admin' || role === 'dispensary') return null;

  const phone = phoneFromAuthMetadata(user.user_metadata as Record<string, unknown>);
  if (phone) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2 text-sm text-amber-900">
        <Phone className="w-4 h-4 shrink-0" aria-hidden />
        <span>
          Add your phone number to receive booking and WhatsApp updates.
        </span>
        <Link
          href="/profile"
          className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
        >
          Update profile
        </Link>
      </div>
    </div>
  );
}
