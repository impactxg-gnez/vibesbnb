import { Hero } from '@/components/home/Hero';
import { SearchSection } from '@/components/home/SearchSection';
import { FeaturedRetreats } from '@/components/home/FeaturedRetreats';
import { BrowseByVibe } from '@/components/home/BrowseByVibe';
import { WhyUs } from '@/components/home/WhyUs';

export default function HomePage() {
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
