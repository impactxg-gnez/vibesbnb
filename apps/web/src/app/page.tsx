'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Hero } from '@/components/home/Hero';
import { SearchSection } from '@/components/home/SearchSection';
import { FeaturedRetreats } from '@/components/home/FeaturedRetreats';
import { BrowseByVibe } from '@/components/home/BrowseByVibe';
import { WhyUs } from '@/components/home/WhyUs';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect hosts to their dashboard
    // Travellers and other roles should stay on the landing page
    if (!loading && user) {
      const userRole = user.user_metadata?.role;
      if (userRole === 'host') {
        router.push('/host/properties');
      }
      // Explicitly do nothing for travellers or other roles - they should see the landing page
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="bg-surface-dark min-h-screen flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 bg-primary-500 rounded-2xl animate-pulse shadow-[0_0_40px_rgba(0,230,118,0.2)]" />
        <div className="text-muted font-bold tracking-widest uppercase text-xs animate-pulse">Loading Vibes</div>
      </div>
    );
  }

  return (
    <div className="bg-surface-dark min-h-screen">
      <Hero />
      <div className="relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <SearchSection />
        <FeaturedRetreats />
        <BrowseByVibe />
        <WhyUs />
      </div>
    </div>
  );
}
