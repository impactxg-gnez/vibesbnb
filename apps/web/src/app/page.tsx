import { Hero } from '@/components/home/Hero';
import { SearchBar } from '@/components/search/SearchBar';
import { FeaturedListings } from '@/components/home/FeaturedListings';
import { WellnessCategories } from '@/components/home/WellnessCategories';
import { HowItWorks } from '@/components/home/HowItWorks';

export default function HomePage() {
  return (
    <div>
      <Hero />
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <SearchBar />
      </div>
      <WellnessCategories />
      <FeaturedListings />
      <HowItWorks />
    </div>
  );
}

