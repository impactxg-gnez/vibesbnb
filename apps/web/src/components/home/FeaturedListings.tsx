'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { resolveWellnessConsumptionFlags } from '@/lib/wellnessConsumption';
import {
  FULLY_420_GLOW_CLASS,
  isFully420Friendly,
} from '@/lib/consumptionPolicy';
import { propertyHasBalcony } from '@/lib/propertyAmenities';
import {
  listingCardMainImageUrl,
  primaryPropertyImageUrl,
} from '@/lib/propertyImageUrls';
import { toTravelerPrice } from '@/lib/platformPricing';
import { WellnessConsumptionPill } from '@/components/properties/WellnessConsumptionPill';
import { BalconyAvailableTag } from '@/components/properties/BalconyAvailableTag';
import { PropertyCardFeatureRow } from '@/components/properties/PropertyCardFeatureRow';

const FEATURED_PLACEHOLDER =
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop';

function FeaturedListingImage({ images, alt }: { images: string[]; alt: string }) {
  const [src, setSrc] = useState(() => primaryPropertyImageUrl(images, FEATURED_PLACEHOLDER));
  const [useOriginal, setUseOriginal] = useState(false);
  const displaySrc =
    src.startsWith('data:') || useOriginal ? src : listingCardMainImageUrl(src);

  useEffect(() => {
    setSrc(primaryPropertyImageUrl(images, FEATURED_PLACEHOLDER));
    setUseOriginal(false);
  }, [images]);

  return (
    <Image
      src={displaySrc}
      alt={alt}
      fill
      unoptimized={src.startsWith('data:')}
      className="object-cover group-hover:scale-110 transition-transform duration-500"
      onError={() => {
        if (!useOriginal && displaySrc !== src && !src.startsWith('data:')) {
          setUseOriginal(true);
          return;
        }
        const next = images.find((url) => url && url !== src) || FEATURED_PLACEHOLDER;
        if (next !== src) {
          setSrc(next);
          setUseOriginal(false);
        } else if (src !== FEATURED_PLACEHOLDER) {
          setSrc(FEATURED_PLACEHOLDER);
          setUseOriginal(false);
        }
      }}
    />
  );
}
interface Listing {
  id: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  images: string[];
  amenities: string[];
  type: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  verified: boolean;
  wellnessFriendly?: boolean;
  wellnessConsumptionIndoor?: boolean;
  wellnessConsumptionOutdoor?: boolean;
}

export function FeaturedListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    const loadFeaturedListings = async () => {
      try {
        const res = await fetch('/api/properties/browse?limit=3', { method: 'GET' });
        if (!res.ok) {
          setListings([]);
          return;
        }
        const payload = await res.json();
        const propertiesData = (payload.properties ?? []) as Record<string, unknown>[];
        const featuredListings: Listing[] = propertiesData.map((p) => {
          const consumption = resolveWellnessConsumptionFlags(p as Record<string, unknown>);
          return {
            id: String(p.id),
            title: (p.name ?? p.title ?? 'Property') as string,
            location: (p.location ?? '') as string,
            price: p.price != null ? Number(p.price) : 0,
            rating: p.rating != null ? Number(p.rating) : 4.5,
            images: (Array.isArray(p.images) ? p.images : []) as string[],
            amenities: (Array.isArray(p.amenities) ? p.amenities : []) as string[],
            type: (p.type ?? 'Property') as string,
            guests: Number(p.guests) || 2,
            bedrooms: Number(p.bedrooms) || 1,
            bathrooms: (() => {
              const b = Number(p.bathrooms);
              return Number.isFinite(b) && b >= 0 ? b : 1;
            })(),
            verified: true,
            wellnessFriendly: p.wellness_friendly === true,
            wellnessConsumptionIndoor: consumption.indoor,
            wellnessConsumptionOutdoor: consumption.outdoor,
          };
        });
        
        setListings(featuredListings);
      } catch (error) {
        console.error('Error loading featured listings:', error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedListings();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center text-gray-500">Loading featured stays…</div>
      </section>
    );
  }

  return (
    <section ref={ref} className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Stays</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Premium wellness-friendly stays loved by our community
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {listings.map((listing, index) => {
            const fully420 = isFully420Friendly(
              !!listing.wellnessConsumptionIndoor,
              !!listing.wellnessConsumptionOutdoor
            );
            return (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <Link
                href={`/listings/${listing.id}`}
                className={`group block bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 ${
                  fully420 ? FULLY_420_GLOW_CLASS : ''
                }`}
              >
                <div className="relative h-72 overflow-hidden bg-gray-200">
                  <FeaturedListingImage
                    images={listing.images}
                    alt={listing.title}
                  />
                  {listing.verified && (
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-900">Verified</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 z-10">
                    <WellnessConsumptionPill indoor={!!listing.wellnessConsumptionIndoor} outdoor={!!listing.wellnessConsumptionOutdoor} />
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                          {listing.title}
                        </h3>
                        {propertyHasBalcony(listing.amenities) ? (
                          <BalconyAvailableTag className="border-sky-500/40 bg-sky-500/10 text-sky-800" />
                        ) : null}
                      </div>
                      <p className="text-gray-600">{listing.location}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-bold text-gray-900">{listing.rating}</span>
                    </div>
                  </div>
                  
                  <PropertyCardFeatureRow
                    propertyType={listing.type}
                    guests={listing.guests}
                    bedrooms={listing.bedrooms}
                    bathrooms={listing.bathrooms}
                    className="mt-3 text-gray-600 [&_svg]:text-gray-500"
                  />
                  
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl font-bold text-gray-900">${toTravelerPrice(listing.price)}</span>
                    <span className="text-gray-600">/ night</span>
                  </div>
                </div>
              </Link>
            </motion.div>
            );
          })}
        </div>
        
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors"
          >
            View all stays
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
