'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, MapPin, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PropertyReviewForm } from '@/components/properties/PropertyReviewForm';
import { loginUrlWithNext } from '@/lib/auth/safeReturnPath';
import { reviewInvitePath } from '@/lib/reviews/invitePath';

type InviteProperty = {
  id: string;
  name: string;
  location: string;
  image: string | null;
};

export default function PublicReviewInvitePage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? decodeURIComponent(params.token) : '';
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<InviteProperty | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('This review link is invalid.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/review-invites/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const raw = typeof data.error === 'string' ? data.error : '';
          throw new Error(
            raw && !raw.startsWith('TypeError')
              ? raw
              : 'This review link is invalid or has been disabled.'
          );
        }
        return data as { property: InviteProperty };
      })
      .then((data) => {
        if (cancelled) return;
        setProperty(data.property);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setProperty(null);
          setError(e instanceof Error ? e.message : 'This review link is invalid.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const nextPath = reviewInvitePath(token);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle(nextPath);
    } catch (e) {
      setGoogleLoading(false);
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-lg mx-auto">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
            </div>
          ) : error && !property ? (
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold">Link unavailable</h1>
              <p className="text-gray-400">{error}</p>
              <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm">
                Back to VibesBnB
              </Link>
            </div>
          ) : property ? (
            <>
              <div className="text-center mb-8">
                <p className="text-xs uppercase tracking-wider text-emerald-400/80 mb-2">Guest review</p>
                <h1 className="text-3xl font-bold mb-2">Share your experience</h1>
                <p className="text-gray-400">
                  Sign in with Google and leave a review for this stay. It appears on the listing.
                </p>
              </div>

              <div className="bg-gray-900 rounded-2xl overflow-hidden border border-white/10 mb-6">
                {property.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={property.image}
                    alt={property.name}
                    className="w-full h-48 object-cover"
                  />
                ) : null}
                <div className="p-5">
                  <h2 className="text-xl font-semibold">{property.name}</h2>
                  {property.location ? (
                    <p className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                      <MapPin className="w-4 h-4" />
                      {property.location}
                    </p>
                  ) : null}
                </div>
              </div>

              {authLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
              ) : submitted ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                  <Star className="w-8 h-8 text-emerald-400 mx-auto mb-3 fill-current" />
                  <p className="font-semibold mb-2">Thank you — your review is live.</p>
                  <Link
                    href={`/listings/${property.id}#reviews-section`}
                    className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                  >
                    View it on the listing
                  </Link>
                </div>
              ) : user ? (
                <PropertyReviewForm
                  propertyId={property.id}
                  propertyName={property.name}
                  inviteToken={token}
                  onSubmitted={() => setSubmitted(true)}
                />
              ) : (
                <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
                  <button
                    type="button"
                    onClick={() => void handleGoogle()}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center px-4 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition disabled:opacity-60"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="ml-3 text-sm font-bold">
                      {googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}
                    </span>
                  </button>
                  <p className="text-center text-xs text-gray-500">
                    Or{' '}
                    <Link href={loginUrlWithNext(nextPath)} className="text-emerald-400 hover:text-emerald-300">
                      sign in with email
                    </Link>
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
