'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  MapPin, 
  Calendar, 
  Star, 
  Home, 
  Users, 
  Share2,
  ChevronLeft
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface HostProfile {
  id: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  created_at: string;
}

interface Property {
  id: string;
  name: string;
  location: string;
  price: number;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  guests: number;
  rating?: number;
  reviews?: number;
  vibesbnb_take?: string;
}

export default function HostProfilePage() {
  const params = useParams();
  const hostId = params.id as string;
  const [host, setHost] = useState<HostProfile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalBookings: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    const fetchHostData = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        
        // Fetch host profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', hostId)
          .single();

        if (profileError) throw profileError;
        setHost(profile);

        // Fetch host properties
        const { data: props, error: propsError } = await supabase
          .from('properties')
          .select('*')
          .eq('host_id', hostId)
          .eq('status', 'active');

        if (propsError) throw propsError;
        setProperties(props || []);

        // Fetch stats (bookings and earnings)
        // Note: For real environment, this would be an aggregation in Supabase
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('total_price, status')
          .in('property_id', props?.map(p => p.id) || []);

        if (!bookingsError && bookings) {
          const totalBookings = bookings.length;
          const totalEarnings = bookings
            .filter(b => b.status === 'confirmed' || b.status === 'completed')
            .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
          
          setStats({
            totalProperties: props?.length || 0,
            totalBookings,
            totalEarnings
          });
        } else {
          setStats({
            totalProperties: props?.length || 0,
            totalBookings: 0,
            totalEarnings: 0
          });
        }

      } catch (error: any) {
        console.error('Error fetching host data:', error);
        toast.error('Failed to load host profile');
      } finally {
        setLoading(false);
      }
    };

    if (hostId) {
      fetchHostData();
    }
  }, [hostId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!host) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-white mb-4">Host not found</h1>
        <Link href="/" className="text-emerald-500 hover:underline">Return to home</Link>
      </div>
    );
  }

  const memberSince = new Date(host.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Back Link */}
        <Link href="/" className="text-gray-400 hover:text-white mb-8 inline-flex items-center gap-2">
          <ChevronLeft size={20} />
          Back to Listings
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Host Info Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center sticky top-24">
              <div className="w-32 h-32 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 overflow-hidden">
                {host.avatar_url ? (
                  <img src={host.avatar_url} alt={host.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-bold text-white">
                    {host.full_name?.[0]?.toUpperCase() || 'H'}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">{host.full_name}</h1>
              <p className="text-gray-400 mb-6 flex items-center justify-center gap-2">
                <Calendar size={18} className="text-emerald-500" />
                Member since {memberSince}
              </p>
              
              <div className="flex justify-center gap-4 mb-8">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied!');
                  }}
                  className="p-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition"
                  title="Share Profile"
                >
                  <Share2 size={20} />
                </button>
              </div>

              {/* Verified Badge */}
              <div className="pt-6 border-t border-gray-800">
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold mb-2">
                  <Star size={18} fill="currentColor" />
                  VibesBNB Verified Host
                </div>
                <p className="text-sm text-gray-500">
                  This host has verified their account and consistently provides great stays.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center shadow-lg">
                <p className="text-3xl font-black text-white mb-1 tracking-tight">{stats.totalProperties}</p>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Properties</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center shadow-lg">
                <p className="text-3xl font-black text-white mb-1 tracking-tight">{stats.totalBookings}</p>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Bookings</p>
              </div>
            </div>

            {/* Bio */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                About {host.full_name}
              </h2>
              <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed relative">
                {host.bio ? (
                  <p className="whitespace-pre-wrap">{host.bio}</p>
                ) : (
                  <p className="italic text-gray-500 font-medium">This host hasn't shared their story yet.</p>
                )}
              </div>
            </div>

            {/* Properties */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Properties by this host</h2>
              {properties.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
                  No properties listed yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {properties.map((property) => (
                    <Link 
                      key={property.id} 
                      href={`/listings/${property.id}`}
                      className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-emerald-500 transition group"
                    >
                      <div className="relative h-48">
                        <img 
                          src={property.images[0] || '/placeholder-property.jpg'} 
                          alt={property.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                        />
                        <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-semibold">
                          ${property.price}/night
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-white mb-1">{property.name}</h3>
                        <p className="text-gray-400 text-sm flex items-center gap-1 mb-3">
                          <MapPin size={14} className="text-emerald-500" />
                          {property.location}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Home size={14} /> {property.bedrooms} Bed
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} /> {property.guests} Guests
                          </span>
                        </div>
                        
                        {/* VibesBNB Take Preview */}
                        {property.vibesbnb_take && (
                          <div className="mt-4 pt-4 border-t border-gray-800">
                            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                              ✨ VibesBNB Take
                            </p>
                            <p className="text-xs text-gray-400 italic line-clamp-2">
                              "{property.vibesbnb_take}"
                            </p>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
