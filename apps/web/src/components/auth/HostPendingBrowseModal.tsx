'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Mail, X, Leaf } from 'lucide-react';
import toast from 'react-hot-toast';

const SESSION_DISMISS_KEY = 'vibesbnb_host_pending_modal_dismissed';

export function HostPendingBrowseModal() {
  const { user, loading } = useAuth();
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const [resending, setResending] = useState(false);

  const role = user?.user_metadata?.role;
  const isHostPending = role === 'host_pending';

  const shouldHideForRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/host');

  useEffect(() => {
    if (loading || !user || !isHostPending || shouldHideForRoute) {
      setOpen(false);
      return;
    }
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') {
        setOpen(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [loading, user, isHostPending, shouldHideForRoute]);

  const handleDismiss = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, []);

  const handleResend = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        },
      });
      if (error) throw error;
      toast.success('Check your inbox for the verification link.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not resend email';
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  if (!open || !user) return null;

  const needsEmailConfirm = !user.email_confirmed_at;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-violet-500/25 bg-[#12121a] shadow-[0_24px_80px_rgba(0,0,0,0.55)] overflow-hidden"
        role="dialog"
        aria-labelledby="host-pending-title"
      >
        <div className="bg-gradient-to-br from-violet-900/40 to-emerald-900/20 px-5 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-600/30 border border-violet-400/20 flex items-center justify-center">
                <Leaf className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p id="host-pending-title" className="text-lg font-bold text-white">
                  Host application in review
                </p>
                <p className="text-sm text-gray-400 mt-0.5">
                  You can explore VibesBNB as a traveller while we review your listing.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {needsEmailConfirm && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3">
              <p className="text-sm text-amber-100/90 flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                <span>
                  <strong className="text-amber-200">Verify your email</strong> to unlock bookings and full
                  traveller features. We&apos;ll also use it to notify you when you&apos;re approved to host.
                </span>
              </p>
              <button
                type="button"
                disabled={resending}
                onClick={handleResend}
                className="mt-3 w-full py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-sm font-semibold border border-amber-500/30 transition-colors disabled:opacity-50"
              >
                {resending ? 'Sending…' : 'Send verification email'}
              </button>
            </div>
          )}

          {!needsEmailConfirm && (
            <p className="text-sm text-gray-400">
              When your property is approved, we&apos;ll email you at{' '}
              <span className="text-gray-200 font-medium">{user.email}</span>.
            </p>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
