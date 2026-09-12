'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  listingCardMainImageUrl,
  listingThumbImageUrl,
  normalizePropertyImages,
} from '@/lib/propertyImageUrls';
import { WellnessConsumptionPill } from '@/components/properties/WellnessConsumptionPill';
import { VibeMarkerBadge } from '@/components/properties/VibeMarkerBadge';
import { resolveVibeMarker } from '@/lib/consumptionPolicy';
import {
  cachedPropertyGallery,
  loadPropertyGalleryUrls,
} from '@/lib/propertyGalleryCache';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop';

const MAIN_BLUR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P8/AwAI/AL+Xqz2AAAAAElFTkSuQmCC';

const THUMB_COUNT = 4;
const SWIPE_THRESHOLD = 42;

function mergeGalleryUrls(seed: string[], extra: string[]): string[] {
  return normalizePropertyImages([...seed, ...extra], PLACEHOLDER).filter(
    (url) => url !== PLACEHOLDER || seed.length === 0
  );
}

function thumbWindowStart(index: number, total: number, size = THUMB_COUNT): number {
  if (total <= size) return 0;
  const maxStart = total - size;
  return Math.min(maxStart, Math.max(0, index - 1));
}

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
  /** Used with consumption flags for Full Vibe / Balcony Vibe markers */
  hasBalcony?: boolean;
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
  hasBalcony = false,
  topRightSlot,
  mainHeightClass = 'h-64',
  className = '',
  priority = false,
}: PropertyCardMediaProps) {
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(() => new Set());
  const [galleryExtras, setGalleryExtras] = useState<string[]>(() =>
    propertyId ? cachedPropertyGallery(propertyId) ?? [] : []
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const ignoreClickRef = useRef(false);
  const slides = useMemo(() => {
    const normalized = mergeGalleryUrls(images, galleryExtras).filter(
      (url) => !failedSrcs.has(url)
    );
    return normalized.length > 0 ? normalized : [PLACEHOLDER];
  }, [images, galleryExtras, failedSrcs]);
  const [index, setIndex] = useState(0);
  const { user } = useAuth();
  const router = useRouter();
  const vibeMarker = resolveVibeMarker({
    cannabisInside: wellnessConsumptionIndoorAllowed,
    cannabisOutside: wellnessConsumptionOutdoorAllowed,
    hasBalcony,
  });

  useEffect(() => {
    setFailedSrcs(new Set());
    setIndex(0);
    setGalleryExtras(propertyId ? cachedPropertyGallery(propertyId) ?? [] : []);
  }, [images, propertyId]);

  const hydrateGallery = useCallback(() => {
    if (!propertyId) return;
    void loadPropertyGalleryUrls(propertyId).then((urls) => {
      if (urls.length > 0) setGalleryExtras(urls);
    });
  }, [propertyId]);

  useEffect(() => {
    if (!propertyId) return;
    const cached = cachedPropertyGallery(propertyId);
    if (cached?.length) {
      setGalleryExtras(cached);
      return;
    }

    let cancelled = false;
    let idleId: number | null = null;
    const schedule = () => {
      if (cancelled) return;
      const run = () => {
        if (!cancelled) hydrateGallery();
      };
      if (typeof requestIdleCallback === 'function') {
        idleId = requestIdleCallback(run, { timeout: 2000 });
      } else {
        idleId = window.setTimeout(run, 400);
      }
    };

    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      schedule();
    } else {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          io.disconnect();
          schedule();
        },
        { rootMargin: '280px', threshold: 0.01 }
      );
      io.observe(node);
      return () => {
        cancelled = true;
        io.disconnect();
        if (idleId != null) {
          if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idleId);
          window.clearTimeout(idleId);
        }
      };
    }

    return () => {
      cancelled = true;
      if (idleId != null) {
        if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idleId);
        window.clearTimeout(idleId);
      }
    };
  }, [propertyId, hydrateGallery]);

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
  const mainIsLocalProxy =
    mainSrc.startsWith('/') || mainSrc.startsWith('data:');
  const mainDisplaySrc =
    mainIsLocalProxy || mainUseOriginal ? mainSrc : listingCardMainImageUrl(mainSrc);

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
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      hydrateGallery();
      setIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, slides.length - 1)));
    },
    [slides.length, hydrateGallery]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      hydrateGallery();
      setIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
    },
    [slides.length, hydrateGallery]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
      ignoreClickRef.current = true;
      hydrateGallery();
      if (dx < 0) {
        setIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
      } else {
        setIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, slides.length - 1)));
      }
    },
    [slides.length, hydrateGallery]
  );

  const onListingClick = useCallback((e: React.MouseEvent) => {
    if (!ignoreClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    ignoreClickRef.current = false;
  }, []);

  const thumbStart = thumbWindowStart(safeIndex, slides.length);
  const thumbs = slides.slice(thumbStart, thumbStart + THUMB_COUNT);

  return (
    <div
      ref={rootRef}
      className={`flex flex-col bg-black/20 group relative overflow-hidden rounded-[inherit] ${className}`}
    >
      <div
        className={`relative w-full overflow-hidden ${multi ? 'rounded-t-[inherit]' : 'rounded-[inherit]'} ${mainHeightClass}`}
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
      >
        <Image
          key={`${mainSrc}-${safeIndex}`}
          src={mainDisplaySrc}
          alt={multi ? `${alt} — photo ${safeIndex + 1}` : alt}
          fill
          priority={priority}
          quality={72}
          fetchPriority={priority ? 'high' : 'low'}
          unoptimized={mainIsLocalProxy || mainSrc.startsWith('data:')}
          placeholder="blur"
          blurDataURL={MAIN_BLUR}
          onError={handleMainImageError}
          className="object-cover pointer-events-none"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        <Link
          href={listingHref}
          className="absolute inset-0 z-[2]"
          aria-label={`View listing: ${alt}`}
          onClick={onListingClick}
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
          {vibeMarker ? <VibeMarkerBadge marker={vibeMarker} size="sm" /> : null}
          <WellnessConsumptionPill
            indoor={wellnessConsumptionIndoorAllowed}
            outdoor={wellnessConsumptionOutdoorAllowed}
          />
        </div>

        {multi && (
          <>
            <button
              type="button"
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-[5] p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-900 shadow-md"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-[5] p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-900 shadow-md"
              aria-label="Next image"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
            <div className="absolute bottom-2 right-2 z-[5] rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
              {safeIndex + 1}/{slides.length}
            </div>
          </>
        )}
      </div>

      {multi && (
        <div
          className={`grid gap-1 p-1.5 bg-black/25 ${
            thumbs.length >= 4
              ? 'grid-cols-4'
              : thumbs.length === 3
                ? 'grid-cols-3'
                : 'grid-cols-2'
          }`}
        >
          {thumbs.map((url, offset) => {
            const slideIndex = thumbStart + offset;
            const active = slideIndex === safeIndex;
            const thumbSrc = listingThumbImageUrl(url);
            const isLocal = url.startsWith('/') || url.startsWith('data:');
            return (
              <button
                key={`${url}-${slideIndex}`}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(slideIndex);
                }}
                className={`relative h-14 sm:h-16 overflow-hidden rounded-md ring-offset-0 ${
                  active ? 'ring-2 ring-white' : 'ring-1 ring-white/20 opacity-80 hover:opacity-100'
                }`}
                aria-label={`Show photo ${slideIndex + 1}`}
                aria-current={active ? 'true' : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={isLocal ? url : thumbSrc}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
