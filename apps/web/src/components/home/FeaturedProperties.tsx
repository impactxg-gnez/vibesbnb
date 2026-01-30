'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Star, MapPin, TrendingUp } from 'lucide-react';

interface FeaturedProperty {
    id: string;
    name: string;
    location: string;
    rating: number;
    reviews: number;
    price: number;
    image: string;
    bookingCount: number;
    amenities: string[];
}

export function FeaturedProperties() {
    const [properties, setProperties] = useState<FeaturedProperty[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadFeaturedProperties = async () => {
            try {
                const supabase = createClient();

                // 1. Fetch active properties
                const { data: propertiesData, error: propError } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('status', 'active')
                    .limit(20);

                if (propError) throw propError;

                // 2. Fetch all bookings to calculate popularity
                const { data: bookingsData, error: bookError } = await supabase
                    .from('bookings')
                    .select('property_id');

                if (bookError) {
                    console.error('Error fetching bookings:', bookError);
                }

                // 3. Count bookings per property
                const bookingCounts: Record<string, number> = {};
                (bookingsData || []).forEach(b => {
                    bookingCounts[b.property_id] = (bookingCounts[b.property_id] || 0) + 1;
                });

                // 4. Combine and sort
                const featured = (propertiesData || []).map((p: any) => ({
                    id: p.id,
                    name: p.name || p.title || 'Property',
                    location: p.location || '',
                    rating: p.rating ? Number(p.rating) : 4.8,
                    reviews: Math.floor(Math.random() * 50) + 10, // Mock reviews for now
                    price: p.price ? Number(p.price) : 0,
                    image: p.images && p.images.length > 0 ? p.images[0] : 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop',
                    bookingCount: bookingCounts[p.id] || 0,
                    amenities: (p.amenities || []).slice(0, 3),
                }));

                // Sort by booking count descending
                featured.sort((a, b) => b.bookingCount - a.bookingCount);

                setProperties(featured.slice(0, 6));
            } catch (error) {
                console.error('Error loading featured properties:', error);
                setProperties([]);
            } finally {
                setLoading(false);
            }
        };

        loadFeaturedProperties();
    }, []);

    if (loading) {
        return (
            <div className="container mx-auto px-6 py-24">
                <div className="h-10 w-64 bg-white/5 animate-pulse rounded-lg mb-12"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-96 bg-white/5 animate-pulse rounded-[2.5rem]"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (properties.length === 0) {
        return null;
    }

    return (
        <div className="container mx-auto px-6 pb-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                    <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
                        Featured <span className="text-primary-500 italic">Properties</span>
                    </h2>
                    <p className="text-muted max-w-xl text-lg">
                        Our most popular stays, loved by travelers worldwide for their exceptional vibes and experiences.
                    </p>
                </div>
                <Link
                    href="/search"
                    className="group flex items-center gap-2 text-primary-500 font-bold hover:text-primary-400 transition-colors bg-white/5 px-6 py-3 rounded-full border border-white/10"
                >
                    Explore All
                    <TrendingUp className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {properties.map((property, index) => (
                    <motion.div
                        key={property.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                    >
                        <Link href={`/listings/${property.id}`} className="group block h-full">
                            <div className="bg-surface rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-primary-500/30 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group-hover:-translate-y-2 h-full flex flex-col relative">

                                {/* Popularity Badge */}
                                {property.bookingCount > 0 && (
                                    <div className="absolute top-6 right-6 z-10">
                                        <div className="bg-primary-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                                            <TrendingUp size={12} />
                                            POPULAR
                                        </div>
                                    </div>
                                )}

                                <div className="relative h-72 overflow-hidden">
                                    <Image
                                        src={property.image}
                                        alt={property.name}
                                        fill
                                        className="object-cover group-hover:scale-110 transition duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity duration-500" />
                                </div>

                                <div className="p-8 flex-1 flex flex-col -mt-12 relative z-10 bg-gradient-to-t from-surface via-surface to-transparent">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-2xl mb-2 group-hover:text-primary-500 transition-colors line-clamp-1">
                                                {property.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-muted text-sm font-medium">
                                                <MapPin className="w-4 h-4 text-primary-500" />
                                                <span>{property.location}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {property.amenities.map((amenity) => (
                                            <span
                                                key={amenity}
                                                className="bg-white/5 text-muted text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/5"
                                            >
                                                {amenity}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-white font-bold">{property.rating}</span>
                                            <Star className="w-4 h-4 text-primary-500 fill-current" />
                                            <span className="text-muted text-xs ml-1">({property.reviews})</span>
                                        </div>
                                        <div>
                                            <span className="text-white font-black text-2xl">${property.price}</span>
                                            <span className="text-muted text-sm ml-1">/ night</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
