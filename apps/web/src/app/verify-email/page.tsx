'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) {
      setError('Email address not found');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        }
      });
      
      if (error) throw error;
      setMessage('Verification link resent successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-12 border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl rounded-full" />
      <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 border border-primary-500/20">
        ??
      </div>
      <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">
        Check Your Email
      </h1>
      <p className="text-muted mb-8 leading-relaxed">
        We've sent you a verification link. Please check your inbox and click the link to activate your account.
      </p>
      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
        <p className="text-sm text-muted">
          Can't find it? Check your <span className="text-white font-bold">Spam</span> or <span className="text-white font-bold">Promotions</span> folder.
        </p>
      </div>
      <button 
        onClick={handleResend}
        disabled={loading}
        className="mt-8 text-primary-500 font-bold hover:text-primary-400 underline decoration-2 underline-offset-4 transition-all hover:scale-105 inline-block disabled:opacity-50"
      >
        {loading ? 'Resending...' : 'Resend verification link'}
      </button>
      {message && <p className="mt-4 text-green-400 text-sm font-medium">{message}</p>}
      {error && <p className="mt-4 text-red-400 text-sm font-medium">{error}</p>}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      <div className="max-w-md w-full text-center relative">
        <Suspense fallback={<div className="text-white">Loading...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
