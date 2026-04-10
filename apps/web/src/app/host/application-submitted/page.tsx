'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Home, Search, Mail } from 'lucide-react';

export default function HostApplicationSubmittedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6 py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] rounded-full -translate-x-1/3 -translate-y-1/4 pointer-events-none" />
      <div className="max-w-lg w-full relative">
        <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-10 shadow-2xl text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-8">
            <img src="/logo.png" alt="VibesBNB" className="h-14 w-14 object-contain" />
          </Link>

          <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-violet-400" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Under admin review</h1>
          <p className="text-gray-400 leading-relaxed mb-2">
            Your property has been submitted for approval. Our team will review your listing shortly.
          </p>
          <p className="text-sm text-gray-500 mb-8 flex items-center justify-center gap-2">
            <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
            We&apos;ll notify you at <span className="text-gray-300 font-medium">{user.email}</span> when
            it&apos;s approved.
          </p>

          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">While you wait</p>
            <Link
              href="/search"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
            >
              <Search className="w-5 h-5" />
              Browse stays as a traveller
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium transition-colors"
            >
              <Home className="w-5 h-5" />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
