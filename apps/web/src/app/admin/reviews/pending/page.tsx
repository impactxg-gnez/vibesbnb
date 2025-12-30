'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Star, Search, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Review {
  id: string;
  property_id: string;
  property_name: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function PendingReviewsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.user_metadata?.role === 'admin') {
      loadReviews();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredReviews(
        reviews.filter(
          (r) =>
            r.property_name?.toLowerCase().includes(query) ||
            r.user_name?.toLowerCase().includes(query) ||
            r.comment?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredReviews(reviews);
    }
  }, [searchQuery, reviews]);

  const loadReviews = async () => {
    // In a real app, you'd fetch from a reviews table with status='pending'
    const mockReviews: Review[] = [
      {
        id: '2',
        property_id: 'prop2',
        property_name: 'Beachfront Villa',
        user_id: 'user2',
        user_name: 'Jane Smith',
        rating: 4,
        comment: 'Great location, but could use better WiFi.',
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ];
    setReviews(mockReviews);
    setFilteredReviews(mockReviews);
  };

  const handleApproveReview = async (reviewId: string) => {
    try {
      setReviews(reviews.map((r) => (r.id === reviewId ? { ...r, status: 'approved' as const } : r)));
      setFilteredReviews(
        filteredReviews.map((r) => (r.id === reviewId ? { ...r, status: 'approved' as const } : r))
      );
      toast.success('Review approved');
    } catch (error) {
      toast.error('Failed to approve review');
    }
  };

  const handleRejectReview = async (reviewId: string) => {
    try {
      setReviews(reviews.map((r) => (r.id === reviewId ? { ...r, status: 'rejected' as const } : r)));
      setFilteredReviews(
        filteredReviews.map((r) => (r.id === reviewId ? { ...r, status: 'rejected' as const } : r))
      );
      toast.success('Review rejected');
    } catch (error) {
      toast.error('Failed to reject review');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!user || user.user_metadata?.role !== 'admin') {
    return null;
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pending Reviews</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-mist-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search pending reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredReviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Star className="w-16 h-16 text-mist-400 mx-auto mb-4" />
              <p className="text-mist-500">No pending reviews</p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{review.property_name}</h3>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating ? 'text-yellow-400 fill-current' : 'text-mist-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        pending
                      </span>
                    </div>
                    <p className="text-sm text-mist-500 mb-2">By {review.user_name}</p>
                    <p className="text-gray-700">{review.comment}</p>
                    <p className="text-xs text-mist-400 mt-2">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleApproveReview(review.id)}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                      title="Approve"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRejectReview(review.id)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                      title="Reject"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

