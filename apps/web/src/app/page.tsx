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
    // Redirect hosts to their dashboard by default
    if (!loading && user && user.user_metadata?.role === 'host') {
      router.push('/host/properties');
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 min-h-screen">
      <Hero />
      <SearchSection />
      <FeaturedRetreats />
      <BrowseByVibe />
      <WhyUs />
    </div>
  );
}
