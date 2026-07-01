'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PhoneOtpVerification } from '@/components/auth/PhoneOtpVerification';
import { hasVerifiedPhone, pendingPhoneFromUser } from '@/lib/auth/hasVerifiedPhone';
import { safeInternalReturnPath } from '@/lib/auth/safeReturnPath';

function VerifyPhoneContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeInternalReturnPath(searchParams.get('next'));

  if (loading) {
    return (
      <div className="text-center text-muted py-12">Loading…</div>
    );
  }

  if (!user) {
    return (
      <div className="text-center space-y-4">
        <p className="text-muted">Sign in to verify your phone number.</p>
        <Link href={`/login?next=${encodeURIComponent('/verify-phone')}`} className="btn-primary inline-block">
          Sign in
        </Link>
      </div>
    );
  }

  if (hasVerifiedPhone(user)) {
    router.replace(next || '/');
    return (
      <div className="text-center text-muted py-12">Phone already verified. Redirecting…</div>
    );
  }

  const initialPhone = pendingPhoneFromUser(user) || '';

  return (
    <div className="bg-surface shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl rounded-full" />
      <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary-500/20">
        <Phone className="w-8 h-8 text-primary-500" />
      </div>
      <h1 className="text-2xl font-bold text-white text-center mb-2">Verify your phone</h1>
      <p className="text-muted text-center mb-8 text-sm leading-relaxed">
        A verified mobile number is required to book stays and receive WhatsApp updates about your trips.
      </p>
      <PhoneOtpVerification
        initialPhone={initialPhone}
        submitLabel="Verify phone"
        onVerified={() => {
          const dest = next || '/';
          const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
          const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
          const useSupabase = !!url && !!key && url !== 'https://placeholder.supabase.co';
          if (!useSupabase) {
            window.location.assign(dest);
            return;
          }
          router.replace(dest);
          router.refresh();
        }}
      />
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="max-w-md w-full relative">
        <Suspense fallback={<div className="text-center text-muted py-12">Loading…</div>}>
          <VerifyPhoneContent />
        </Suspense>
      </div>
    </div>
  );
}
