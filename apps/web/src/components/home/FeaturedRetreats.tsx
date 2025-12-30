'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Retreat {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  image: string;
  isDataUrl?: boolean;
  amenities: string[];
  badge: string;
}

export function FeaturedRetreats() {
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadFeaturedRetreats = async () => {
      try {
        const supabase = createClient();
        const { data: propertiesData, error } = await supabase
          .from('properties')
          .select('*')
          .eq('status', 'active')
          .eq('wellness_friendly', true)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) {
          console.error('Error loading featured retreats:', error);
          setRetreats([]);
          setLoading(false);
          return;
        }

        const featuredRetreats: Retreat[] = (propertiesData || []).map((p: any) => {
          // Validate and get first valid image
          let imageUrl = 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop';
          let isDataUrl = false;
          
          if (p.images && Array.isArray(p.images) && p.images.length > 0) {
            // Find first valid image URL
            for (const img of p.images) {
              if (!img || typeof img !== 'string' || img.length === 0) continue;
              
              // Check if it's a data URL
              if (img.startsWith('data:')) {
                imageUrl = img;
                isDataUrl = true;
                break;
              }
              
              // Check if it's a valid HTTP/HTTPS URL
              try {
                const url = new URL(img);
                if (url.protocol === 'http:' || url.protocol === 'https:') {
                  imageUrl = img;
                  break;
                }
              } catch (e) {
                // Not a valid URL, continue to next image
                console.warn('[FeaturedRetreats] Invalid image URL:', img);
                continue;
              }
            }
          }
          
          console.log('[FeaturedRetreats] Property:', p.name, 'Image URL:', imageUrl.substring(0, 100), 'IsDataUrl:', isDataUrl);
          
          return {
            id: p.id,
            name: p.name || p.title || 'Property',
            location: p.location || '',
            rating: p.rating ? Number(p.rating) : 4.5,
            reviews: 0, // TODO: Get from reviews table
            price: p.price ? Number(p.price) : 0,
            image: imageUrl,
            isDataUrl: isDataUrl,
            amenities: (p.amenities || []).slice(0, 2),
            badge: 'Wellness-friendly',
          };
        });

        setRetreats(featuredRetreats);
      } catch (error) {
        console.error('Error loading featured retreats:', error);
        setRetreats([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedRetreats();
  }, []);

  if (loading) {
    return null;
  }

  if (retreats.length === 0) {
    return null; // Don't show section if no retreats
  }

  return (
    <div className="container mx-auto px-4 pb-12">
      <h2 className="text-2xl font-bold text-mist-100 mb-6">Featured Retreats</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {retreats.map((retreat, index) => (
          <motion.div
            key={retreat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Link href={`/listings/${retreat.id}`} className="group block">
              <div className="bg-charcoal-900 rounded-3xl overflow-hidden border border-charcoal-800 hover:border-earth-500 transition">
                <div className="relative h-48 bg-charcoal-800">
                  {imageErrors.has(retreat.id) ? (
                    <div className="w-full h-full flex items-center justify-center bg-charcoal-800">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-mist-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-mist-500 text-xs">Image unavailable</p>
                      </div>
                    </div>
                  ) : retreat.isDataUrl ? (
                    // Use regular img tag for data URLs
                    <img
                      src={retreat.image}
                      alt={retreat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      onError={() => {
                        console.error('[FeaturedRetreats] Failed to load data URL image for:', retreat.id);
                        setImageErrors(prev => new Set(prev).add(retreat.id));
                      }}
                    />
                  ) : (
                    // Use Next.js Image for regular URLs, but with unoptimized for external domains
                    <Image
                      src={retreat.image}
                      alt={retreat.name}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-500"
                      onError={(e) => {
                        console.error('[FeaturedRetreats] Failed to load image:', retreat.image, 'for property:', retreat.id);
                        setImageErrors(prev => new Set(prev).add(retreat.id));
                      }}
                      unoptimized={true}
                    />
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="bg-charcoal-900/90 backdrop-blur-sm text-mist-100 text-xs font-medium px-3 py-1.5 rounded-full border border-charcoal-700">
                      {retreat.badge}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-mist-100 font-semibold text-lg mb-1">
                        {retreat.name}
                      </h3>
                      <div className="flex items-center gap-1 text-mist-400 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span>{retreat.location}</span>
                        <span className="mx-1">•</span>
                        <span>{retreat.rating} ({retreat.reviews})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-mist-100 font-semibold">${retreat.price}/night</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    {retreat.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="bg-charcoal-800 text-mist-300 text-xs px-3 py-1 rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
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

