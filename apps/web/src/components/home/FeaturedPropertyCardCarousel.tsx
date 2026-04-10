'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop';

type FeaturedPropertyCardCarouselProps = {
  images: string[];
  alt: string;
  listingHref: string;
  className?: string;
};

export function FeaturedPropertyCardCarousel({
  images,
  alt,
  listingHref,
  className = '',
}: FeaturedPropertyCardCarouselProps) {
  const slides = images.length > 0 ? images : [PLACEHOLDER];
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (dir: -1 | 1) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex((i) => (i + dir + slides.length) % slides.length);
    },
    [slides.length]
  );

  const goTo = useCallback((i: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex(i);
  }, []);

  const multi = slides.length > 1;

  return (
    <div className={`relative h-72 w-full overflow-hidden bg-black/20 ${className}`}>
      {slides.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${
            i === index ? 'z-[1] opacity-100' : 'z-0 opacity-0 pointer-events-none'
          }`}
        >
          <Image
            src={src}
            alt={multi ? `${alt} — photo ${i + 1}` : alt}
            fill
            unoptimized={src.startsWith('data:')}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ))}

      <Link
        href={listingHref}
        className="absolute inset-0 z-[2]"
        aria-label={`View listing: ${alt}`}
      />

      {multi && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={go(-1)}
            className="absolute left-3 top-1/2 z-[3] -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={go(1)}
            className="absolute right-3 top-1/2 z-[3] -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div
            className="absolute bottom-3 left-1/2 z-[3] flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2 py-1.5 backdrop-blur-sm"
            role="tablist"
            aria-label="Property photos"
          >
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Photo ${i + 1}`}
                onClick={goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-primary-500' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
