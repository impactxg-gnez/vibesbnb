'use client';

import { useState, useEffect } from 'react';
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
  const { signUp, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = new URLSearchParams(window.location.search).get('type');
    if (t === 'host') {
      setFormData((f) => ({ ...f, accountType: 'host' }));
    }
  }, []);

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

    try {
      const { error } = await signUp(formData.email, formData.password, formData.name, role);

      if (error) {
        toast.error(error.message || 'Failed to sign up');
      } else {
        toast.success(
          role === 'host'
            ? 'Almost there — check your email to verify your account, then you’ll land on your host dashboard.'
            : 'Account created! Please check your email to verify your account.'
        );
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      toast.error(err.message || 'Failed to sign up');
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

  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="max-w-md w-full space-y-12 relative">
        {/* Header */}
        <div className="text-center">
           <Link href="/" className="inline-flex items-center space-x-2 group mb-8">
            <div className="w-16 h-16 flex items-center justify-center transition-transform group-hover:scale-110 drop-shadow-[0_0_15px_rgba(0,230,118,0.3)]">
              <img src="/logo.png" alt="VibesBNB Logo" className="w-full h-full object-contain" />
            </div>
          </Link>
          <h2 className="text-4xl font-bold text-white tracking-tight">
            Create Account
          </h2>
          <p className="mt-4 text-muted font-medium">
            Start your wellness journey with VibesBNB.
          </p>
        </div>

        {/* Signup Form */}
        <div className="bg-surface shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl rounded-full" />
          <form onSubmit={handleSubmit} className="space-y-6 relative">
            {/* Account Type */}
            <div className="space-y-2">
              <label htmlFor="accountType" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
                Account Type
              </label>
              <select
                id="accountType"
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                className="input appearance-none !py-4"
                disabled={isLoading}
              >
                <option value="traveler">Book stays (Traveler)</option>
                <option value="host">List my property (Host)</option>
              </select>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="input !py-4"
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input !py-4"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input !py-4"
                  placeholder="••••"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
                  Confirm
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input !py-4"
                  placeholder="••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start px-1">
              <input
                id="terms"
                type="checkbox"
                required
                className="h-4 w-4 mt-1 text-primary-500 focus:ring-primary-500 border-white/10 rounded bg-white/5 cursor-pointer"
                disabled={isLoading}
              />
              <label htmlFor="terms" className="ml-3 text-sm text-muted">
                Accept{' '}
                <Link href="/terms" className="text-primary-500 hover:text-primary-400 font-bold hover:underline">
                  Terms
                </Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-primary-500 hover:text-primary-400 font-bold hover:underline">
                  Privacy
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full !py-5 text-lg shadow-[0_20px_40px_rgba(0,230,118,0.2)] mt-4"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-surface text-muted font-bold uppercase tracking-widest">Or social signup</span>
              </div>
            </div>

            {/* Social Signup */}
            <div className="mt-10">
              <button
                onClick={handleGoogleSignIn}
                type="button"
                className="w-full flex items-center justify-center px-4 py-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group"
              >
                <svg className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="ml-3 text-sm font-bold text-muted group-hover:text-white transition-colors">Google</span>
              </button>
            </div>
          </div>
        </div>

        {/* Login Link */}
        <p className="text-center text-muted font-medium">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-primary-500 hover:text-primary-400 underline decoration-2 underline-offset-4 transition-all hover:translate-x-1 inline-block">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
