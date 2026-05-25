'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatAuthErrorMessage } from '@/lib/auth/formatAuthErrorMessage';
import toast from 'react-hot-toast';

function isSupabaseConfigured(): boolean {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return !!url && !!key && url !== 'https://placeholder.supabase.co';
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCheckingSession(false);
      return;
    }

    const supabase = createClient();

    const ensureRecoverySession = async () => {
      try {
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            window.history.replaceState(null, '', window.location.pathname);
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSessionReady(!!session);
      } catch {
        setSessionReady(false);
      } finally {
        setCheckingSession(false);
      }
    };

    void ensureRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(!!session);
        setCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isSupabaseConfigured()) {
      toast.error('Password reset is not available in demo mode');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(formatAuthErrorMessage(error));
        return;
      }

      toast.success('Password updated. You are signed in.');
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      <div className="max-w-md w-full space-y-10 relative">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 group mb-8">
            <div className="w-16 h-16 flex items-center justify-center transition-transform group-hover:scale-110 drop-shadow-[0_0_15px_rgba(0,230,118,0.3)]">
              <img src="/logo.png" alt="VibesBNB Logo" className="w-full h-full object-contain" />
            </div>
          </Link>
          <h2 className="text-4xl font-bold text-white tracking-tight">Choose a new password</h2>
          <p className="mt-4 text-muted font-medium">Enter a strong password for your VibesBNB account.</p>
        </div>

        <div className="bg-surface shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary-500/5 blur-3xl rounded-full" />

          {checkingSession ? (
            <p className="text-center text-muted text-sm relative">Verifying reset link…</p>
          ) : !sessionReady ? (
            <div className="relative text-center space-y-4">
              <p className="text-sm text-muted leading-relaxed">
                This reset link is invalid or has expired. Request a new one from the forgot password
                page.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block text-sm font-bold text-primary-500 hover:text-primary-400"
              >
                Request new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 relative">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-bold text-muted uppercase tracking-wider ml-1"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input !py-4 w-full pr-12"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-500 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-bold text-muted uppercase tracking-wider ml-1"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input !py-4 w-full pr-12"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-500 transition-colors"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full !py-5 text-lg shadow-[0_20px_40px_rgba(0,230,118,0.2)]"
              >
                {isLoading ? 'Saving…' : 'Update password'}
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
