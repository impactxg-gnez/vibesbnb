'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { listingCardMainImageUrl, listingThumbImageUrl } from '@/lib/propertyImageUrls';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop';

const MAIN_BLUR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P8/AwAI/AL+Xqz2AAAAAElFTkSuQmCC';

/** Native img avoids one `/_next/image` request per thumb (many cards × many photos = slow or broken tiles). */
function ThumbnailImg({ optimizedSrc, originalSrc }: { optimizedSrc: string; originalSrc: string }) {
  const [mode, setMode] = useState<'opt' | 'orig' | 'ph'>('opt');
  const displaySrc =
    mode === 'ph' ? PLACEHOLDER : mode === 'orig' ? originalSrc : optimizedSrc;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional: small strip, avoid optimizer stampede
    <img
      src={displaySrc}
      alt=""
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      onError={() => {
        if (mode === 'opt' && optimizedSrc !== originalSrc) setMode('orig');
        else setMode('ph');
      }}
      className="h-full w-full object-cover"
    />
  );
}

export type PropertyCardMediaProps = {
  images: string[];
  alt: string;
  listingHref: string;
  /** When set, shows favorite heart and syncs with `favorites` table */
  propertyId?: string;
  /** Top-right wellness pill (INDOOR / OUTDOOR) */
  showWellnessPill?: boolean;
  /** Extra badges top-right (e.g. availability), rendered before wellness pill */
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
  showWellnessPill = false,
  topRightSlot,
  mainHeightClass = 'h-64',
  className = '',
  priority = false,
}: PropertyCardMediaProps) {
  const slides = images.length > 0 ? images : [PLACEHOLDER];
  const [index, setIndex] = useState(0);
  const { user } = useAuth();
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  useEffect(() => {
    if (!user || !propertyId) return;
    let cancelled = false;
    (async () => {
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
  }, [user, propertyId]);

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
    try {
      const supabase = createClient();
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', propertyId);
        if (error) throw error;
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        const { error } = await supabase.from('favorites').insert({
          user_id: user.id,
          property_id: propertyId,
        });
        if (error) throw error;
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to update favorite');
    } finally {
      setLoadingFavorite(false);
    }
  };

  const goTo = useCallback(
    (i: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex(i);
    },
    []
  );

  const multi = slides.length > 1;
  const safeIndex = Math.min(Math.max(0, index), slides.length - 1);
  const mainSrc = slides[safeIndex];
  const [mainUseOriginal, setMainUseOriginal] = useState(false);
  const mainDisplaySrc =
    mainSrc.startsWith('data:') || mainUseOriginal ? mainSrc : listingCardMainImageUrl(mainSrc);

  useEffect(() => {
    setMainUseOriginal(false);
  }, [mainSrc]);

  return (
    <div className={`flex flex-col bg-black/20 ${className}`}>
      <div className={`relative w-full overflow-hidden ${mainHeightClass}`}>
        <Image
          key={`${mainSrc}-${safeIndex}`}
          src={mainDisplaySrc}
          alt={multi ? `${alt} — photo ${safeIndex + 1}` : alt}
          fill
          priority={priority}
          fetchPriority={priority ? 'high' : 'low'}
          unoptimized={mainSrc.startsWith('data:')}
          placeholder="blur"
          blurDataURL={MAIN_BLUR}
          onError={() => {
            if (!mainUseOriginal && mainDisplaySrc !== mainSrc) setMainUseOriginal(true);
          }}
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
          {showWellnessPill && (
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
              <span className="text-lg" aria-hidden>
                🌿
              </span>
              <div className="flex flex-col text-[10px] leading-tight font-bold text-white">
                <span className="flex items-center gap-1">
                  INDOOR <span className="text-emerald-400">✓</span>
                </span>
                <span className="flex items-center gap-1">
                  OUTDOOR <span className="text-emerald-400">✓</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {multi && (
        <div className="flex gap-2 px-3 py-2.5 bg-[#12121a] border-t border-white/5 overflow-x-auto scrollbar-hide">
          {slides.map((src, i) => (
            <button
              key={`thumb-${i}`}
              type="button"
              onClick={goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              className={`relative h-12 w-[4.25rem] flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                i === index
                  ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#12121a] opacity-100'
                  : 'opacity-55 hover:opacity-100 ring-1 ring-white/10'
              }`}
            >
              <ThumbnailImg
                optimizedSrc={listingThumbImageUrl(src)}
                originalSrc={src}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
