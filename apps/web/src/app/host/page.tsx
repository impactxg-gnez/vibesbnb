'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function HostPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const role = user?.user_metadata?.role || 'traveller';
    if (user && (role === 'host' || role === 'host_pending')) {
      router.replace('/host/properties');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const role = user?.user_metadata?.role || 'traveller';
  if (user && (role === 'host' || role === 'host_pending')) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Redirecting to host dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark">
      <div className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-primary-500/5 blur-[120px] rounded-full -translate-y-1/2" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 px-4 py-2 rounded-full text-primary-500 text-sm font-bold mb-8 uppercase tracking-widest">
              Join the community
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-8 text-white tracking-tight leading-tight">
              Become a <span className="text-primary-500">VibesBNB</span> Host
            </h1>
            <p className="text-xl mb-10 text-muted leading-relaxed">
              Share your wellness-friendly space with travelers who appreciate it. Create a host account, verify your
              email, and you&apos;re in — no separate host approval wait. Individual listings are reviewed before they go
              live for guests.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup?type=host"
                className="btn-primary text-center !py-4 px-8 text-lg font-bold rounded-2xl shadow-[0_20px_40px_rgba(0,230,118,0.2)]"
              >
                Create host account
              </Link>
              <Link
                href="/login?redirect=/host/properties"
                className="text-center !py-4 px-8 text-lg font-bold rounded-2xl border border-white/15 text-white hover:bg-white/5 transition"
              >
                Host sign in
              </Link>
            </div>
            {user && role === 'traveller' && (
              <p className="mt-8 text-sm text-muted max-w-xl">
                You&apos;re signed in as a traveler. To host, use <strong className="text-white">Create host account</strong>{' '}
                with the email you want for hosting (or sign out first if you&apos;re using a single email for both).
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="bg-surface rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl rounded-full" />
            <h2 className="text-3xl font-bold text-white mb-2">How it works</h2>
            <ol className="text-muted space-y-4 mt-8 list-decimal list-inside leading-relaxed">
              <li>Choose <strong className="text-white">List my property (Host)</strong> on sign up.</li>
              <li>Confirm your email — you&apos;ll go straight to your host dashboard.</li>
              <li>Add a listing; it&apos;ll be checked for quality before appearing to guests.</li>
            </ol>
          </div>

          <div className="space-y-12 py-10">
            <div>
              <h2 className="text-4xl font-bold text-white mb-12">Why Host on VibesBNB?</h2>
              <div className="space-y-8">
                <div className="flex gap-6 group">
                  <div className="w-16 h-16 bg-surface border border-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">
                    💰
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">Earn Extra Income</h3>
                    <p className="text-muted leading-relaxed">
                      Turn your extra space into income by hosting like-minded travelers who value wellness.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 group">
                  <div className="w-16 h-16 bg-surface border border-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">
                    🛡️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">Host Protection</h3>
                    <p className="text-muted leading-relaxed">
                      Comprehensive insurance and 24/7 support to protect your property and peace of mind.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 group">
                  <div className="w-16 h-16 bg-surface border border-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">
                    🧘
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">Wellness-Friendly</h3>
                    <p className="text-muted leading-relaxed">
                      Connect with guests who respect and appreciate your wellness-friendly policies and amenities.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary-500/10 border border-primary-500/20 rounded-[2.5rem] p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Ready to start?</h3>
              <p className="text-white/70 mb-8 relative z-10">
                It&apos;s free to list and we take care of payments. Your host account is active as soon as you verify
                your email.
              </p>
              <Link
                href="/signup?type=host"
                className="inline-block bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-white/90 transition-all relative z-10"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
