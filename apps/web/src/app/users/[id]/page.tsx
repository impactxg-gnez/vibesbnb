'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Star, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  User,
  ChevronRight,
  Sparkles,
  Award
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';

interface HostProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  role: string;
  created_at: string;
}

interface Property {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  images: string[];
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsCount, setReviewsCount] = useState(0);

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        
        // 1. Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // Fallback if profiles table doesn't exist or user not found
          setProfile({
            id: userId,
            full_name: 'Property Host',
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`,
            bio: 'Welcome to my profile! I am a passionate host on VibesBNB.',
            role: 'host',
            created_at: new Date().toISOString()
          });
        } else {
          setProfile(profileData);
        }

        // 2. Fetch Properties by this host
        const { data: propsData, error: propsError } = await supabase
          .from('properties')
          .select('*')
          .eq('host_id', userId)
          .eq('status', 'active');

        if (propsData) {
          const formattedProps = propsData.map(p => ({
            id: p.id,
            name: p.name || p.title || 'Untitled Property',
            location: p.location || '',
            price: Number(p.price || 0),
            rating: Number(p.rating || 0),
            reviews: 0, // In a real app, join with reviews
            images: p.images || []
          }));
          setProperties(formattedProps);
          
          // Total reviews across all properties (mocked or fetched)
          setReviewsCount(propsData.reduce((acc, p) => acc + (p.reviews_count || 0), 0));
        }

      } catch (err) {
        console.error('System error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) loadProfileData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div>
      </div>
    );
  }

  if (!profile) return <div>Profile not found</div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-white/10 rounded-[2.5rem] p-8 sticky top-28 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-32 h-32 rounded-full border-4 border-primary-500/30 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <img 
                      src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.full_name}`} 
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-primary-500 text-black p-2 rounded-full shadow-lg border-4 border-gray-900">
                    <ShieldCheck size={20} />
                  </div>
                </div>
                
                <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
                <p className="text-primary-400 font-semibold mb-6 flex items-center gap-2">
                  <Award size={18} />
                  Identity Verified
                </p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="text-2xl font-bold text-white">{reviewsCount || '0'}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Reviews</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="text-2xl font-bold text-white">4.9★</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Rating</div>
                  </div>
                </div>
                
                <div className="w-full space-y-4 pt-4 border-t border-white/5">
                  <Link 
                    href="/messages"
                    className="w-full py-4 bg-primary-500 text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    <MessageSquare size={20} />
                    Message Host
                  </Link>
                  <button className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all">
                    Send a Gift
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column: Bio and Listings */}
          <div className="lg:col-span-2 space-y-12">
            {/* Bio Section */}
            <section className="bg-gray-900/50 border border-white/5 rounded-[2.5rem] p-8 md:p-12">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                About {profile.full_name.split(' ')[0]}
                <Sparkles className="text-primary-500" size={24} />
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed mb-8">
                {profile.bio || `Welcome! I've been a member of the VibesBNB community since ${new Date(profile.created_at).getFullYear()}. I love creating unique, memorable experiences for travelers and sharing the best hidden gems of the city.`}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-500/10 rounded-xl text-primary-500">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Location</h4>
                    <p className="text-gray-400 text-sm">Usually response within an hour</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Experience</h4>
                    <p className="text-gray-400 text-sm">Hosting for 3+ years</p>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Properties Section */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">{profile.full_name.split(' ')[0]}'s Listings</h2>
                <span className="text-gray-500 font-bold">{properties.length} active stays</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {properties.map((property) => (
                  <Link 
                    key={property.id} 
                    href={`/listings/${property.id}`}
                    className="group bg-gray-900 border border-white/10 rounded-3xl overflow-hidden hover:border-primary-500/40 transition-all shadow-xl"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img 
                        src={property.images[0] || 'https://via.placeholder.com/800x600'} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        alt={property.name}
                      />
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                        ${property.price} / night
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-xl line-clamp-1 group-hover:text-primary-500 transition-colors uppercase tracking-tight">{property.name}</h3>
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                          <Star size={12} className="text-primary-500 fill-primary-500" />
                          <span className="text-xs font-bold text-white">{property.rating || 'New'}</span>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm flex items-center gap-1 mb-4">
                        <MapPin size={14} />
                        {property.location}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Self Check-In • Wifi</div>
                        <ChevronRight size={20} className="text-primary-500 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              {properties.length === 0 && (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-12 text-center">
                  <User size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500 font-medium">This host hasn't listed any properties yet.</p>
                </div>
              )}
            </section>
          </div>
          
        </div>
      </main>
    </div>
  );
}
