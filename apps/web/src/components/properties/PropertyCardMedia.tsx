'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  listingCardMainImageUrl,
  normalizePropertyImages,
} from '@/lib/propertyImageUrls';
import { WellnessConsumptionPill } from '@/components/properties/WellnessConsumptionPill';
import { SmokingPolicyPill } from '@/components/properties/SmokingPolicyPill';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop';

const MAIN_BLUR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P8/AwAI/AL+Xqz2AAAAAElFTkSuQmCC';

export type PropertyCardMediaProps = {
  images: string[];
  alt: string;
  listingHref: string;
  /** When set, shows favorite heart and syncs with `favorites` table */
  propertyId?: string;
  /** Parent batched favorites: avoids one Supabase read per visible card while loading completes */
  favoriteBatchLoading?: boolean;
  /** When parent finished batch load; omit both with `favoriteBatchLoading` to use per-card fetch */
  favoriteFromBatch?: boolean;
  /** Keep parent batched Set in sync after toggle */
  onFavoriteChange?: (propertyId: string, favorited: boolean) => void;
  /** Guest-facing wellness consumption areas — 🌿 INDOOR / OUTDOOR pill when host opted in */
  wellnessConsumptionIndoorAllowed?: boolean;
  wellnessConsumptionOutdoorAllowed?: boolean;
  /** Guest-facing smoking policy (from listing fields) */
  smokingInsideAllowed?: boolean;
  smokingOutsideAllowed?: boolean;
  /** Extra badges top-right (e.g. availability), rendered before listing pills */
  topRightSlot?: React.ReactNode;
  /** Main image area height */
  mainHeightClass?: string;
  className?: string;
  /** First visible cards: eager-load main image for LCP */
  priority?: boolean;
};

export function PropertyCardMedia({
  images,
  alt,
  listingHref,
  propertyId,
  favoriteBatchLoading = false,
  favoriteFromBatch,
  onFavoriteChange,
  wellnessConsumptionIndoorAllowed = false,
  wellnessConsumptionOutdoorAllowed = false,
  smokingInsideAllowed = false,
  smokingOutsideAllowed = false,
  topRightSlot,
  mainHeightClass = 'h-64',
  className = '',
  priority = false,
}: PropertyCardMediaProps) {
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(() => new Set());
  const slides = useMemo(() => {
    const normalized = normalizePropertyImages(images, PLACEHOLDER).filter(
      (url) => !failedSrcs.has(url)
    );
    return normalized.length > 0 ? normalized : [PLACEHOLDER];
  }, [images, failedSrcs]);
  const [index, setIndex] = useState(0);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setFailedSrcs(new Set());
    setIndex(0);
  }, [images]);

  const useBatchFavoriteQuery =
    favoriteBatchLoading ||
    typeof favoriteFromBatch === 'boolean';
  const [isFavorited, setIsFavorited] = useState<boolean>(() =>
    useBatchFavoriteQuery ? Boolean(favoriteFromBatch) : false
  );
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  useEffect(() => {
    if (useBatchFavoriteQuery) {
      if (!favoriteBatchLoading && typeof favoriteFromBatch === 'boolean') {
        setIsFavorited(favoriteFromBatch);
      }
      return;
    }
    if (!user || !propertyId) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('property_id', propertyId)
          .maybeSingle();
        if (!cancelled && data && !error) setIsFavorited(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, propertyId, useBatchFavoriteQuery, favoriteBatchLoading, favoriteFromBatch]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!propertyId) return;
    if (!user) {
      toast.error('Please login to save favorites');
      router.push('/login');
      return;
    }
    setLoadingFavorite(true);
    const next = !isFavorited;
    try {
      const supabase = createClient();
      if (!next) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', propertyId);
        if (error) throw error;
        setIsFavorited(false);
        onFavoriteChange?.(propertyId, false);
        toast.success('Removed from favorites');
      } else {
        const { error } = await supabase.from('favorites').insert({
          user_id: user.id,
          property_id: propertyId,
        });
        if (error) throw error;
        setIsFavorited(true);
        onFavoriteChange?.(propertyId, true);
        toast.success('Added to favorites');
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to update favorite');
    } finally {
      setLoadingFavorite(false);
    }
  };

  const multi = slides.length > 1;
  const safeIndex = Math.min(Math.max(0, index), slides.length - 1);
  const mainSrc = slides[safeIndex] ?? PLACEHOLDER;
  const [mainUseOriginal, setMainUseOriginal] = useState(false);
  const mainDisplaySrc =
    mainSrc.startsWith('data:') || mainUseOriginal ? mainSrc : listingCardMainImageUrl(mainSrc);

  useEffect(() => {
    setMainUseOriginal(false);
  }, [mainSrc]);

  useEffect(() => {
    if (index > slides.length - 1) setIndex(Math.max(0, slides.length - 1));
  }, [index, slides.length]);

  const handleMainImageError = useCallback(() => {
    // Prefer original object URL when a resized/transform URL fails.
    if (!mainUseOriginal && mainDisplaySrc !== mainSrc && !mainSrc.startsWith('data:')) {
      setMainUseOriginal(true);
      return;
    }
    // Dead remote URLs (e.g. expired Airbnb CDN) — skip to next usable slide.
    if (mainSrc !== PLACEHOLDER) {
      setFailedSrcs((prev) => {
        if (prev.has(mainSrc)) return prev;
        const next = new Set(prev);
        next.add(mainSrc);
        return next;
      });
      setMainUseOriginal(false);
    }
  }, [mainDisplaySrc, mainSrc, mainUseOriginal]);

  const handlePrevious = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
    },
    [slides.length]
  );

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
    },
    [slides.length]
  );

  return (
    <div className={`flex flex-col bg-black/20 group relative overflow-hidden rounded-[inherit] ${className}`}>
      <div className={`relative w-full overflow-hidden rounded-[inherit] ${mainHeightClass}`}>
        <Image
          key={`${mainSrc}-${safeIndex}`}
          src={mainDisplaySrc}
          alt={multi ? `${alt} — photo ${safeIndex + 1}` : alt}
          fill
          priority={priority}
          quality={72}
          fetchPriority={priority ? 'high' : 'low'}
          unoptimized={mainSrc.startsWith('data:')}
          placeholder="blur"
          blurDataURL={MAIN_BLUR}
          onError={handleMainImageError}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        <Link
          href={listingHref}
          className="absolute inset-0 z-[2]"
          aria-label={`View listing: ${alt}`}
        />

        {propertyId && (
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={loadingFavorite}
            className={`absolute left-3 top-3 z-[5] p-2.5 backdrop-blur-md rounded-full border transition-all duration-300 ${
              isFavorited
                ? 'bg-rose-500/90 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                : 'bg-black/45 border-white/15 text-white hover:bg-black/60 hover:border-white/25'
            }`}
            aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
          >
            <Heart size={18} className={isFavorited ? 'fill-current' : ''} />
          </button>
        )}

        <div className="absolute right-3 top-3 z-[5] flex flex-col items-end gap-2">
          {topRightSlot}
          <WellnessConsumptionPill
            indoor={wellnessConsumptionIndoorAllowed}
            outdoor={wellnessConsumptionOutdoorAllowed}
          />
          <SmokingPolicyPill inside={smokingInsideAllowed} outside={smokingOutsideAllowed} />
        </div>

        {/* Carousel Navigation */}
        {multi && (
          <>
            <button
              type="button"
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-[5] p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md transform hover:scale-105"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-[5] p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md transform hover:scale-105"
              aria-label="Next image"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>

            {/* Dot Indicators */}
            <div className="absolute bottom-3 left-0 right-0 z-[5] flex justify-center gap-1.5">
              {slides.length <= 5 ? (
                slides.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${
                      i === safeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                    }`}
                  />
                ))
              ) : (
                Array.from({ length: 5 }).map((_, i) => {
                  let dotIndex = i;
                  if (safeIndex > 2) {
                    if (safeIndex >= slides.length - 2) {
                      dotIndex = slides.length - 5 + i;
                    } else {
                      dotIndex = safeIndex - 2 + i;
                    }
                  }
                  
                  return (
                    <div
                      key={dotIndex}
                      className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${
                        dotIndex === safeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                      }`}
                    />
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
