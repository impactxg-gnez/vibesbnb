'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

/** VibesBNB hosts & community — Facebook group */
const HOST_COMMUNITY_FACEBOOK_URL =
  'https://www.facebook.com/groups/645550964117748/?ref=share_group_link&mibextid=wwXIfr&rdid=AYX08ycnTxLRiLps&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1QJyhdFhKg%2F%3Fmibextid%3DwwXIfr#';

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
      <div className="relative py-16 md:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-primary-500/5 blur-[120px] rounded-full -translate-y-1/2" />
        <div className="container mx-auto px-6 relative">
          {/* Phone: single column (stacked). md+: hero | benefits side by side */}
          <div className="grid w-full min-w-0 grid-cols-1 gap-10 md:grid-cols-2 md:gap-10 lg:gap-14 xl:gap-20 items-start">
            {/* Left: hero */}
            <div className="min-w-0 max-w-xl md:max-w-none w-full">
              <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 px-4 py-2 rounded-full text-primary-500 text-sm font-bold mb-8 uppercase tracking-widest">
                Join the community
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 text-white tracking-tight leading-tight">
                Become a <span className="text-primary-500">VibesBNB</span> Host
              </h1>
              <p className="text-lg sm:text-xl mb-10 text-muted leading-relaxed">
                Share your wellness-friendly space with travelers who appreciate it. Create a host account, verify your
                email, and you&apos;re in — hosts are not manually approved. Add listings from your dashboard when you&apos;re
                ready.
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

            {/* Right: why host + community (beside hero from md+; below on phone) */}
            <div className="min-w-0 w-full space-y-10 md:pt-1 lg:pt-2">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8 md:mb-10">Why Host on VibesBNB?</h2>
                <div className="space-y-6 md:space-y-8">
                  <div className="flex gap-5 sm:gap-6 group">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-surface border border-white/5 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-500">
                      💰
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Earn Extra Income</h3>
                      <p className="text-muted text-sm sm:text-base leading-relaxed">
                        Turn your extra space into income by hosting like-minded travelers who value wellness.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-5 sm:gap-6 group">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-surface border border-white/5 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-500">
                      🛡️
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Host Protection</h3>
                      <p className="text-muted text-sm sm:text-base leading-relaxed">
                        Comprehensive insurance and 24/7 support to protect your property and peace of mind.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-5 sm:gap-6 group">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-surface border border-white/5 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-500">
                      🧘
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Wellness-Friendly</h3>
                      <p className="text-muted text-sm sm:text-base leading-relaxed">
                        Connect with guests who respect and appreciate your wellness-friendly policies and amenities.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary-500/10 border border-primary-500/20 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 relative z-10">Join our community</h3>
                <p className="text-white/70 text-sm sm:text-base mb-8 relative z-10">
                  Meet other VibesBNB hosts, swap hosting tips, and hear about product updates first — all in our Facebook
                  group.
                </p>
                <a
                  href={HOST_COMMUNITY_FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-white/90 transition-all relative z-10"
                >
                  Open Facebook group
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-24">
        <div className="w-full max-w-3xl min-w-0">
          <div className="bg-surface rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl rounded-full" />
            <h2 className="text-3xl font-bold text-white mb-2">How it works</h2>
            <ol className="text-muted space-y-4 mt-8 list-decimal list-inside leading-relaxed">
              <li>Choose <strong className="text-white">List my property (Host)</strong> on sign up.</li>
              <li>Confirm your email — you&apos;ll go straight to your host dashboard.</li>
              <li>Add a listing and publish — it can appear in search when marked active.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
