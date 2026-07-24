'use client';

import { useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';

type AdminTeamReviewFormProps = {
  propertyId: string;
  propertyName?: string;
  onSubmitted?: () => void;
  className?: string;
};

export function AdminTeamReviewForm({
  propertyId,
  propertyName,
  onSubmitted,
  className = '',
}: AdminTeamReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    setSubmitting(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await getHeadersForAdminFetch()),
      };
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          property_id: propertyId,
          rating,
          comment: comment.trim(),
          reviewer_name: 'VibesBNB Team',
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to add team review');
      }

      toast.success('VibesBNB review published on listing');
      setComment('');
      setRating(5);
      onSubmitted?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add VibesBNB review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <h3 className="text-sm font-bold text-gray-900 mb-1">Add VibesBNB review</h3>
      <p className="text-xs text-gray-500 mb-3">
        {propertyName
          ? `Shows on ${propertyName} under About → VibesBNB review.`
          : 'Shows on the listing under About → VibesBNB review.'}
      </p>

      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="focus:outline-none"
            aria-label={`Rate ${star} stars`}
          >
            <Star
              className={`w-6 h-6 transition ${
                star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="text-sm text-gray-600 ml-1">{rating}/5</span>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        placeholder="Write the official VibesBNB review…"
        required
      />

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Publishing…
          </>
        ) : (
          'Publish VibesBNB review'
        )}
      </button>
    </form>
  );
}
