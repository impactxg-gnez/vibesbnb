'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  defaultDispensaryItemVectorDataUrl,
  resolveDispensaryItemImageUrl,
} from '@/lib/dispensaryInventoryImage';

type DispensaryItemImageProps = {
  image: string | null | undefined;
  category: string;
  name: string;
  alt?: string;
  className?: string;
};

/**
 * Renders dispensary product art with an inline SVG fallback when no image
 * is uploaded or the remote URL fails to load.
 */
export function DispensaryItemImage({
  image,
  category,
  name,
  alt,
  className = '',
}: DispensaryItemImageProps) {
  const placeholderSrc = useMemo(
    () => defaultDispensaryItemVectorDataUrl(category, name),
    [category, name]
  );

  const resolvedSrc = useMemo(
    () => resolveDispensaryItemImageUrl(image, category, name),
    [image, category, name]
  );

  const [src, setSrc] = useState(resolvedSrc);

  useEffect(() => {
    setSrc(resolvedSrc);
  }, [resolvedSrc]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? name}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        setSrc((current) => (current === placeholderSrc ? current : placeholderSrc));
      }}
    />
  );
}
