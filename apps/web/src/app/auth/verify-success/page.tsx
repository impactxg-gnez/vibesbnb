'use client';

import { Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, PartyPopper } from 'lucide-react';
import { useVerificationConfetti } from '@/components/auth/useVerificationConfetti';

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

function VerifySuccessInner() {
  useVerificationConfetti();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const nextPath = useMemo(() => safeNextPath(searchParams.get('next')), [searchParams]);

  const destinationForRole = useCallback(() => {
    if (nextPath) return nextPath;
    const role = user?.user_metadata?.role;
    if (role === 'admin') return '/admin';
    if (role === 'host_pending' || role === 'host') return '/host/properties';
    return '/';
  }, [user, nextPath]);

  const handleBrowse = () => {
    router.push(destinationForRole());
  };

  const handleBrowseHome = () => {
    router.push('/');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
      <div
        className="absolute inset-0 bg-gray-950/85 backdrop-blur-md"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-emerald-500/20 blur-[80px]" />
        <div className="absolute -bottom-10 right-1/4 h-72 w-72 rounded-full bg-violet-600/25 blur-[90px]" />
        <div className="absolute top-1/3 right-10 h-40 w-40 rounded-full bg-amber-400/15 blur-[60px]" />
      </div>

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-success-title"
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 p-1 shadow-[0_32px_80px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-400 via-violet-500 to-amber-400" />

          <div className="px-8 pb-8 pt-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-violet-600/30 ring-2 ring-emerald-400/40">
              <PartyPopper className="h-10 w-10 text-emerald-300" strokeWidth={1.75} />
            </div>

            <div className="mb-2 flex items-center justify-center gap-2 text-amber-300/90">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">You&apos;re in</span>
              <Sparkles className="h-5 w-5" />
            </div>

            <h1
              id="verify-success-title"
              className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
            >
              Email verified!
            </h1>
            <p className="mt-3 text-base leading-relaxed text-gray-400">
              Welcome to VibesBNB — your account is live. Explore stays, catch a vibe, and make yourself at home.
            </p>

            {!loading && user && (
              <p className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                Signed in as{' '}
                <span className="font-semibold text-white">{user.email}</span>
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3">
              {!loading && user ? (
                <>
                  <button
                    type="button"
                    onClick={handleBrowse}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-base font-bold text-gray-950 shadow-lg shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-emerald-500"
                  >
                    {user.user_metadata?.role === 'host_pending' || user.user_metadata?.role === 'host'
                      ? 'Go to host dashboard'
                      : user.user_metadata?.role === 'admin'
                        ? 'Open admin'
                        : 'Start exploring'}
                  </button>
                  <button
                    type="button"
                    onClick={handleBrowseHome}
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-3.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                  >
                    Browse the site
                  </button>
                </>
              ) : !loading ? (
                <Link
                  href="/login"
                  className="block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-center text-base font-bold text-gray-950"
                >
                  Sign in to continue
                </Link>
              ) : (
                <div className="h-12 animate-pulse rounded-xl bg-white/10" />
              )}
            </div>

            <p className="mt-8 text-xs text-gray-500">
              <Link href="/" className="text-emerald-400/90 hover:text-emerald-300">
                VibesBNB home
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifySuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
          Loading…
        </div>
      }
    >
      <VerifySuccessInner />
    </Suspense>
  );
}
