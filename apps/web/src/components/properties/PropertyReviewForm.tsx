'use client';

import { useEffect, useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

type PropertyReviewFormProps = {
  propertyId: string;
  propertyName?: string;
  onSubmitted?: () => void;
  className?: string;
};

type EligibilityState = {
  loading: boolean;
  eligible: boolean;
  hasReview: boolean;
  reason?: string;
  existingStatus?: string;
};

export function PropertyReviewForm({
  propertyId,
  propertyName,
  onSubmitted,
  className = '',
}: PropertyReviewFormProps) {
  const { user } = useAuth();
  const [eligibility, setEligibility] = useState<EligibilityState>({
    loading: true,
    eligible: false,
    hasReview: false,
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !propertyId) {
      setEligibility({ loading: false, eligible: false, hasReview: false });
      return;
    }

    let cancelled = false;
    setEligibility((prev) => ({ ...prev, loading: true }));

    fetch(`/api/properties/${encodeURIComponent(propertyId)}/reviews/eligibility`)
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof payload.error === 'string' ? payload.error : 'Could not check eligibility'
          );
        }
        return payload as {
          eligible: boolean;
          hasReview: boolean;
          reason?: string;
          upcomingCheckout?: string | null;
          existingReview?: { status: string };
        };
      })
      .then((data) => {
        if (cancelled) return;
        setEligibility({
          loading: false,
          eligible: data.eligible,
          hasReview: data.hasReview,
          reason: data.reason,
          existingStatus: data.existingReview?.status,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setEligibility({
            loading: false,
            eligible: false,
            hasReview: false,
            reason: 'Could not verify review eligibility.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, propertyId]);

  if (!user) return null;

  if (eligibility.loading) {
    return (
      <div
        className={`bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-gray-400 ${className}`}
      >
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      </div>
    );
  }

  if (!eligibility.eligible) {
    if (!eligibility.hasReview && eligibility.reason) {
      return (
        <div
          className={`bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-gray-400 ${className}`}
        >
          {eligibility.reason}
        </div>
      );
    }
    if (!eligibility.hasReview) return null;
    return (
      <div
        className={`bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-gray-400 ${className}`}
      >
        {eligibility.reason || 'You have already reviewed this property.'}
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to submit review');
      }

      toast.success(
        typeof payload.message === 'string'
          ? payload.message
          : 'Review submitted for approval'
      );
      setComment('');
      setEligibility({
        loading: false,
        eligible: false,
        hasReview: true,
        reason: 'Your review is pending approval.',
        existingStatus: 'pending',
      });
      onSubmitted?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}
    >
      <h3 className="text-white font-bold mb-1">Share your experience</h3>
      <p className="text-gray-400 text-sm mb-4">
        {propertyName
          ? `How was your stay at ${propertyName}?`
          : 'Tell future guests about your stay.'}
      </p>

      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="focus:outline-none"
            aria-label={`Rate ${star} stars`}
          >
            <Star
              className={`w-7 h-7 transition ${
                star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
              }`}
            />
          </button>
        ))}
        <span className="text-gray-400 text-sm ml-1">{rating}/5</span>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        placeholder="What did you enjoy? What should future guests know?"
        required
      />

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 w-full py-3 rounded-xl bg-primary-500 text-black font-bold hover:bg-primary-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting…
          </>
        ) : (
          'Submit review'
        )}
      </button>
    </form>
  );
}
