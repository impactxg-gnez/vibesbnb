'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare } from 'lucide-react';

export type PropertyReview = {
  id: string;
  property_id?: string;
  rating: number;
  comment: string;
  created_at: string;
  is_team_review?: boolean;
  reviewer_name?: string | null;
  user_id?: string;
  profiles?: { full_name?: string | null; avatar_url?: string | null } | null;
};

type PropertyReviewsModalProps = {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  rating?: number;
  reviewCount?: number;
  /** When provided, shown immediately; modal still refetches if empty when opened. */
  initialReviews?: PropertyReview[];
};

export function PropertyReviewsModal({
  open,
  onClose,
  propertyId,
  propertyName,
  rating,
  reviewCount,
  initialReviews,
}: PropertyReviewsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [reviews, setReviews] = useState<PropertyReview[]>(initialReviews ?? []);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialReviews && initialReviews.length > 0) {
      setReviews(initialReviews);
    }
  }, [initialReviews]);

  useEffect(() => {
    if (!open || !propertyId) return;

    if (initialReviews && initialReviews.length > 0) {
      setFetchError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    fetch(`/api/properties/${encodeURIComponent(propertyId)}/reviews`)
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof payload.error === 'string' ? payload.error : 'Could not load reviews'
          );
        }
        return payload.reviews as PropertyReview[];
      })
      .then((data) => {
        if (!cancelled) setReviews(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : 'Could not load reviews');
          setReviews([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, propertyId, initialReviews]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const count = Math.max(reviewCount ?? 0, reviews.length);
  const displayRating =
    rating != null && Number.isFinite(rating) && rating > 0
      ? rating
      : reviews.length > 0
        ? Number(
            (
              reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length
            ).toFixed(1)
          )
        : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 isolate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-reviews-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Close reviews"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="min-w-0">
            <h2
              id="property-reviews-modal-title"
              className="text-lg sm:text-xl font-bold text-white truncate"
            >
              Reviews for {propertyName}
            </h2>
            <p className="text-sm text-gray-400">
              {count} {count === 1 ? 'review' : 'reviews'}
              {displayRating > 0 ? ` · ${displayRating}★` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition text-sm font-semibold"
          >
            Close
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar max-h-[calc(85vh-4.25rem)]">
          {loading ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
              Loading reviews…
            </div>
          ) : fetchError ? (
            <div className="bg-white/5 border border-red-500/30 rounded-2xl p-12 text-center text-red-300">
              {fetchError}
            </div>
          ) : reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className={`bg-white/5 border rounded-2xl p-5 ${
                    review.is_team_review
                      ? 'border-purple-500/30 bg-purple-500/5'
                      : 'border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {review.is_team_review ? (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-primary-500 flex items-center justify-center border border-purple-400/30">
                        <span className="text-white text-xs font-bold">VB</span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          review.profiles?.avatar_url ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${review.user_id || 'guest'}`
                        }
                        className="w-10 h-10 rounded-full border border-white/10"
                        alt="reviewer"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-sm truncate ${
                            review.is_team_review ? 'text-purple-400' : 'text-white'
                          }`}
                        >
                          {review.is_team_review
                            ? review.reviewer_name || 'VibesBNB Team'
                            : review.profiles?.full_name || 'Guest'}
                        </span>
                        {review.is_team_review && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-400 rounded">
                            VibesBNB review
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                      <span className="text-primary-500 text-[10px]">★</span>
                      <span className="text-white text-[10px] font-bold">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm italic">&ldquo;{review.comment}&rdquo;</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-500">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
              <p>No reviews for this property yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
