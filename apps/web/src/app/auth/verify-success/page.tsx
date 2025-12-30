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
    <div className="min-h-screen bg-charcoal-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="bg-charcoal-900 shadow-lg rounded-xl p-8 border border-charcoal-800">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-earth-500/20 p-4">
              <CheckCircle2 className="w-16 h-16 text-earth-500" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-white mb-4">
            Email Verified!
          </h1>
          <p className="text-mist-400 mb-6">
            Your email address has been successfully verified. You can now access all features of your account.
          </p>

          {/* User Info */}
          {user && (
            <div className="mb-6 p-4 bg-charcoal-800/50 rounded-lg border border-charcoal-700">
              <p className="text-sm text-mist-500 mb-1">Signed in as</p>
              <p className="text-white font-medium">{user.email}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {user ? (
              <>
                <button
                  onClick={handleContinue}
                  className="w-full bg-earth-600 text-white py-3 rounded-lg font-semibold hover:bg-earth-700 transition"
                >
                  Continue to Dashboard
                </button>
                {countdown > 0 && (
                  <p className="text-sm text-mist-500">
                    Redirecting automatically in {countdown} second{countdown !== 1 ? 's' : ''}...
                  </p>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="block w-full bg-earth-600 text-white py-3 rounded-lg font-semibold hover:bg-earth-700 transition text-center"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Help Text */}
          <p className="mt-6 text-sm text-mist-500">
            Need help?{' '}
            <Link href="/contact" className="text-earth-500 hover:text-earth-400">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

