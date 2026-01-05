'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const { user, resendConfirmationEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    // Try to get email from user object
    if (user?.email) {
      setEmail(user.email);
    } else {
      // Try to get from localStorage (if stored during signup)
      const storedEmail = localStorage.getItem('pendingVerificationEmail');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, [user]);

  useEffect(() => {
    // Countdown timer for resend cooldown
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown} seconds before requesting another email`);
      return;
    }

    setIsResending(true);
    const { error } = await resendConfirmationEmail(email);

    if (error) {
      console.error('[VerifyEmail] Error resending email:', error);
      toast.error(error.message || 'Failed to resend confirmation email. Please check your email address and try again.');
    } else {
      toast.success('Confirmation email sent! Please check your inbox and spam folder.');
      setResendCooldown(60); // 60 second cooldown
    }

    setIsResending(false);
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="bg-charcoal-900 shadow-lg rounded-xl p-8 border border-charcoal-800">
          <div className="text-6xl mb-6">✉️</div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Check Your Email
          </h1>
          <p className="text-mist-400 mb-6">
            We've sent you a verification link. Please check your email and click the link to verify your account.
          </p>
          
          {/* Email Input (if not available from user) */}
          {!user?.email && (
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-mist-300 mb-2 text-left">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border border-charcoal-700 bg-charcoal-800 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-mist-100 placeholder-gray-500"
              />
            </div>
          )}

          {/* Resend Button */}
          <div className="space-y-4">
            <button
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="w-full px-4 py-3 bg-earth-600 hover:bg-earth-700 disabled:bg-charcoal-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
            >
              {isResending
                ? 'Sending...'
                : resendCooldown > 0
                ? `Resend Email (${resendCooldown}s)`
                : 'Resend Confirmation Email'}
            </button>

            <p className="text-sm text-mist-500">
              If you don't see the email, check your spam folder. You can request a new confirmation email above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

