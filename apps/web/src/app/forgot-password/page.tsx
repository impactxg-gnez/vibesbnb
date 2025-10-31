'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement forgot password API call
      toast.success('Password reset instructions sent!');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset instructions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1d2e] px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/login"
            className="text-[#4ade80] hover:text-[#22c55e] transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Login
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-white text-3xl font-semibold mb-2">Forgot Password?</h1>
          <p className="text-gray-400 text-base">
            Enter your phone number and we'll send you instructions to reset your password
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Phone Number Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-[#252838] text-white pl-12 pr-4 py-4 rounded-xl border-b-2 border-gray-700 focus:border-[#4ade80] focus:outline-none transition-colors placeholder-gray-500"
              placeholder="Phone number"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#4ade80] text-white font-semibold py-4 rounded-xl hover:bg-[#22c55e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
          >
            {isLoading ? 'Sending...' : 'Send Reset Instructions'}
          </button>
        </form>

        {/* Remember Password */}
        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Remember your password?{' '}
            <Link href="/login" className="text-[#4ade80] hover:text-[#22c55e] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

