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
      // Auto-redirect based on user role
      const userRole = user?.user_metadata?.role;
      if (userRole === 'admin') {
        router.push('/admin');
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="bg-gray-900 shadow-lg rounded-xl p-8 border border-gray-800">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-emerald-500/20 p-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-white mb-4">
            Email Verified!
          </h1>
          <p className="text-gray-400 mb-6">
            Your email address has been successfully verified. You can now access all features of your account.
          </p>

          {/* User Info */}
          {user && (
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-500 mb-1">Signed in as</p>
              <p className="text-white font-medium">{user.email}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {user ? (
              <>
                <button
                  onClick={handleContinue}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
                >
                  Continue to Dashboard
                </button>
                {countdown > 0 && (
                  <p className="text-sm text-gray-500">
                    Redirecting automatically in {countdown} second{countdown !== 1 ? 's' : ''}...
                  </p>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="block w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition text-center"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Help Text */}
          <p className="mt-6 text-sm text-gray-500">
            Need help?{' '}
            <Link href="/contact" className="text-emerald-500 hover:text-emerald-400">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

