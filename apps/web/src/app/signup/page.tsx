'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: 'traveler',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signInWithGoogle, signInWithGithub } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    // Map 'traveler' to 'traveller' for consistency, 'host' stays as 'host'
    const role = formData.accountType === 'traveler' ? 'traveller' : formData.accountType;
    const { error } = await signUp(formData.email, formData.password, formData.name, role);

    if (error) {
      toast.error(error.message || 'Failed to sign up');
    } else {
      if (role === 'host') {
        toast.success('Account created! Please check your email to verify your account. You will be redirected to the host dashboard after verification.');
      } else {
        toast.success('Account created! Please check your email to verify your account.');
      }
    }

    setIsLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
    }
  };

  const handleGithubSignIn = async () => {
    try {
      await signInWithGithub();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with GitHub');
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-mist-100">
            Join VibesBNB
          </h2>
          <p className="mt-2 text-mist-400">
            Create your account to get started
          </p>
        </div>

        {/* Signup Form */}
        <div className="bg-charcoal-900 shadow-lg rounded-xl p-8 border border-charcoal-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Type */}
            <div>
              <label htmlFor="accountType" className="block text-sm font-medium text-mist-300 mb-2">
                I want to
              </label>
              <select
                id="accountType"
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-charcoal-700 bg-charcoal-800 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-mist-100"
                disabled={isLoading}
              >
                <option value="traveler">Book stays (Traveler)</option>
                <option value="host">List my property (Host)</option>
              </select>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-mist-300 mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-charcoal-700 bg-charcoal-800 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-mist-100 placeholder-gray-500"
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-mist-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-charcoal-700 bg-charcoal-800 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-mist-100 placeholder-gray-500"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-mist-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-charcoal-700 bg-charcoal-800 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-mist-100 placeholder-gray-500"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-mist-500">Must be at least 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-mist-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-charcoal-700 bg-charcoal-800 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-mist-100 placeholder-gray-500"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="h-4 w-4 mt-1 text-earth-600 focus:ring-earth-500 border-charcoal-700 rounded bg-charcoal-800"
                disabled={isLoading}
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-mist-300">
                I agree to the{' '}
                <Link href="/terms" className="text-earth-500 hover:text-earth-400">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-earth-500 hover:text-earth-400">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-earth-600 text-mist-100 py-3 rounded-lg font-semibold hover:bg-earth-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-charcoal-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-charcoal-900 text-mist-500">Or continue with</span>
              </div>
            </div>

            {/* Social Signup */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button 
                onClick={handleGoogleSignIn}
                type="button"
                className="w-full flex items-center justify-center px-4 py-3 border border-charcoal-700 rounded-lg hover:bg-charcoal-800 transition"
              >
                <svg className="w-5 h-5 text-mist-300" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="ml-2 text-sm font-medium text-mist-300">Google</span>
              </button>
              <button 
                onClick={handleGithubSignIn}
                type="button"
                className="w-full flex items-center justify-center px-4 py-3 border border-charcoal-700 rounded-lg hover:bg-charcoal-800 transition"
              >
                <svg className="w-5 h-5 text-mist-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                <span className="ml-2 text-sm font-medium text-mist-300">GitHub</span>
              </button>
            </div>
          </div>
        </div>

        {/* Login Link */}
        <p className="text-center text-sm text-mist-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-earth-500 hover:text-earth-400">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
