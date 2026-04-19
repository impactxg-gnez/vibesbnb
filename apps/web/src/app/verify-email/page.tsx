'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatAuthErrorMessage } from '@/lib/auth/formatAuthErrorMessage';
import { Mail } from 'lucide-react';

const RESEND_COOLDOWN_MS = 60_000;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const resendInFlightRef = useRef(false);
  const lastResendAtRef = useRef(0);

  const handleResend = async () => {
    if (!email) {
      setError('Email address not found');
      return;
    }

    const now = Date.now();
    if (now - lastResendAtRef.current < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - lastResendAtRef.current)) / 1000);
      setError(`Please wait ${waitSec}s before requesting another email (this avoids rate limits).`);
      return;
    }
    if (resendInFlightRef.current) return;

    resendInFlightRef.current = true;
    lastResendAtRef.current = now;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        },
      });

      if (resendError) throw resendError;
      setMessage('Verification link resent successfully');
    } catch (err: unknown) {
      const raw = err as { message?: string; code?: string; status?: number };
      setError(formatAuthErrorMessage(raw));
    } finally {
      resendInFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/90 shadow-[0_30px_80px_rgba(0,0,0,0.45)] rounded-[2.5rem] p-12 border border-gray-800 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-violet-600/10 blur-3xl rounded-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />

      <div className="w-20 h-20 bg-violet-600/15 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 border border-violet-500/25">
        <Mail className="w-10 h-10 text-emerald-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-4 tracking-tight text-center">Check your email</h1>
      <p className="text-gray-400 mb-8 leading-relaxed text-center">
        We&apos;ve sent a verification link to your inbox. Tap the link to activate your VibesBNB account.
      </p>
      <div className="p-4 bg-gray-800/60 rounded-2xl border border-gray-700/80">
        <p className="text-sm text-gray-400 text-center">
          Can&apos;t find it? Check <span className="text-white font-semibold">Spam</span> or{' '}
          <span className="text-white font-semibold">Promotions</span>.
        </p>
      </div>
      <button
        type="button"
        onClick={handleResend}
        disabled={loading}
        className="mt-8 w-full text-emerald-400 font-bold hover:text-emerald-300 underline decoration-2 underline-offset-4 transition-all disabled:opacity-50"
      >
        {loading ? 'Resending…' : 'Resend verification link'}
      </button>
      {message && <p className="mt-4 text-emerald-400 text-sm font-medium text-center">{message}</p>}
      {error && <p className="mt-4 text-red-400 text-sm font-medium text-center">{error}</p>}
      <p className="mt-10 text-center">
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-300">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-violet-900/10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/4 pointer-events-none" />
      <div className="max-w-md w-full text-center relative">
        <Link href="/" className="inline-flex items-center justify-center mb-10">
          <img src="/logo.png" alt="VibesBNB" className="h-14 w-14 object-contain" />
        </Link>
        <Suspense fallback={<div className="text-white py-12">Loading…</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
