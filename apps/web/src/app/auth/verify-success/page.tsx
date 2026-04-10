'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2 } from 'lucide-react';

export default function VerifySuccessPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Countdown timer to auto-redirect
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && user) {
      const userRole = user?.user_metadata?.role;
      if (userRole === 'admin') {
        router.push('/admin');
      } else if (userRole === 'host_pending') {
        router.push('/host/properties/new');
      } else if (userRole === 'host') {
        router.push('/host/properties');
      } else {
        router.push('/');
      }
    }
  }, [countdown, user, router]);

  const handleContinue = () => {
    if (user) {
      const userRole = user?.user_metadata?.role;
      if (userRole === 'admin') {
        router.push('/admin');
      } else if (userRole === 'host_pending') {
        router.push('/host/properties/new');
      } else if (userRole === 'host') {
        router.push('/host/properties');
      } else {
        router.push('/');
      }
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-violet-900/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="max-w-md w-full text-center relative">
        <div className="bg-gray-900/95 shadow-2xl rounded-3xl p-10 border border-gray-800">
          <div className="flex justify-center mb-6">
            <div className="rounded-2xl bg-violet-600/20 border border-violet-500/30 p-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Email verified</h1>
          <p className="text-gray-400 mb-6 leading-relaxed">
            Your VibesBNB account is active. Continue to your dashboard below.
          </p>

          {user && (
            <div className="mb-6 p-4 bg-gray-800/60 rounded-xl border border-gray-700/80">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Signed in as</p>
              <p className="text-white font-medium">{user.email}</p>
            </div>
          )}

          <div className="space-y-3">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-semibold hover:bg-emerald-500 transition"
                >
                  Continue
                </button>
                {countdown > 0 && (
                  <p className="text-sm text-gray-500">
                    Redirecting in {countdown}s…
                  </p>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="block w-full bg-emerald-600 text-white py-3.5 rounded-xl font-semibold hover:bg-emerald-500 transition text-center"
              >
                Sign in
              </Link>
            )}
          </div>

          <p className="mt-8 text-sm text-gray-500">
            Need help?{' '}
            <Link href="/" className="text-emerald-400 hover:text-emerald-300 font-medium">
              VibesBNB home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

