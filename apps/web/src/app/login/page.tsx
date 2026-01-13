'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signInWithGoogle, signInWithGithub } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || 'Failed to sign in');
    } else {
      toast.success('Successfully signed in!');
    }

    setIsLoading(false);
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
    <div className="min-h-screen bg-surface-dark flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      <div className="max-w-md w-full space-y-12 relative">
        {/* Header */}
        <div className="text-center">
           <Link href="/" className="inline-flex items-center space-x-2 group mb-8">
            <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-[0_0_30px_rgba(0,230,118,0.3)]">
              <span className="text-black font-extrabold text-3xl">V</span>
            </div>
          </Link>
          <h2 className="text-4xl font-bold text-white tracking-tight">
            Welcome Back
          </h2>
          <p className="mt-4 text-muted font-medium">
            Sign in to continue your wellness journey.
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-surface shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl rounded-full" />
          <form onSubmit={handleSubmit} className="space-y-8 relative">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input !py-4"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="password" className="block text-sm font-bold text-muted uppercase tracking-wider">
                  Password
                </label>
                <Link href="/forgot-password" shaking-text className="text-xs font-bold text-primary-500 hover:text-primary-400 transition-colors">
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input !py-4"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {/* Remember */}
            <div className="flex items-center px-1">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-white/10 rounded-lg bg-white/5 cursor-pointer"
              />
              <label htmlFor="remember" className="ml-3 text-sm font-medium text-muted cursor-pointer hover:text-white transition-colors">
                Remember my session
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full !py-5 text-lg shadow-[0_20px_40px_rgba(0,230,118,0.2)]"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-surface text-muted font-bold uppercase tracking-widest">Or social login</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="mt-10 grid grid-cols-2 gap-4">
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
              <button 
                onClick={handleGithubSignIn}
                type="button"
                className="w-full flex items-center justify-center px-4 py-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group"
              >
                <svg className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                <span className="ml-3 text-sm font-bold text-muted group-hover:text-white transition-colors">GitHub</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-muted font-medium">
          New to VibesBNB?{' '}
          <Link href="/signup" className="font-bold text-primary-500 hover:text-primary-400 underline decoration-2 underline-offset-4 transition-all hover:translate-x-1 inline-block">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
