'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatAuthErrorMessage } from '@/lib/auth/formatAuthErrorMessage';
import toast from 'react-hot-toast';

function isSupabaseConfigured(): boolean {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return !!url && !!key && url !== 'https://placeholder.supabase.co';
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error('Enter your email address');
      return;
    }

    if (!isSupabaseConfigured()) {
      toast.error('Password reset requires Supabase. Use demo accounts on the login page.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || 'https://vibesbnb.com';

      const redirectTo = `${origin}/auth/callback?type=recovery&next=/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });

      if (error) {
        toast.error(formatAuthErrorMessage(error));
        return;
      }

      setSent(true);
      toast.success('Check your email for a reset link');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="max-w-md w-full space-y-10 relative">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 group mb-8">
            <div className="w-16 h-16 flex items-center justify-center transition-transform group-hover:scale-110 drop-shadow-[0_0_15px_rgba(0,230,118,0.3)]">
              <img src="/logo.png" alt="VibesBNB Logo" className="w-full h-full object-contain" />
            </div>
          </Link>
          <h2 className="text-4xl font-bold text-white tracking-tight">Reset password</h2>
          <p className="mt-4 text-muted font-medium">
            {sent
              ? 'If an account exists for that email, we sent a link to choose a new password.'
              : 'Enter your email and we will send you a secure reset link.'}
          </p>
        </div>

        <div className="bg-surface shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl rounded-full" />

          {sent ? (
            <div className="relative text-center space-y-6">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                <Mail className="w-7 h-7 text-primary-500" />
              </div>
              <p className="text-sm text-muted leading-relaxed">
                The link expires after a short time. Check spam if you do not see it in a few minutes.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-sm font-bold text-primary-500 hover:text-primary-400 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8 relative">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-bold text-muted uppercase tracking-wider ml-1"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input !py-4"
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full !py-5 text-lg shadow-[0_20px_40px_rgba(0,230,118,0.2)]"
              >
                {isLoading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
