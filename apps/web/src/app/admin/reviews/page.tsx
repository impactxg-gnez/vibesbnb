'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Star, Search, Check, X, Plus, MessageSquarePlus, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { createClient } from '@/lib/supabase/client';

interface Review {
  id: string;
  property_id: string;
  property_name?: string;
  user_id: string | null;
  user_name?: string;
  reviewer_name?: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  is_team_review: boolean;
  created_at: string;
}

interface Property {
  id: string;
  name: string;
}

export default function ReviewsManagementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'user' | 'team'>('all');
  const [loadingReviews, setLoadingReviews] = useState(true);
  
  // Team review form state
  const [showTeamReviewForm, setShowTeamReviewForm] = useState(false);
  const [teamReviewForm, setTeamReviewForm] = useState({
    property_id: '',
    rating: 5,
    comment: '',
  });
  const [submittingTeamReview, setSubmittingTeamReview] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !isAdminUser(user)) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && isAdminUser(user)) {
      loadReviews();
      loadProperties();
    }
  }, [user]);

  useEffect(() => {
    let filtered = reviews;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.property_name?.toLowerCase().includes(query) ||
          r.user_name?.toLowerCase().includes(query) ||
          r.reviewer_name?.toLowerCase().includes(query) ||
          r.comment?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (propertyFilter !== 'all') {
      filtered = filtered.filter((r) => r.property_id === propertyFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((r) => 
        typeFilter === 'team' ? r.is_team_review : !r.is_team_review
      );
    }

    setFilteredReviews(filtered);
  }, [searchQuery, statusFilter, propertyFilter, typeFilter, reviews]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const loadReviews = async () => {
    setLoadingReviews(true);
    try {
      // Get auth token for admin access
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use service approach - fetch all reviews as admin
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error('Reviews error:', reviewsError);
        // If error, try without RLS check
      }

      // Get property names
      const propertyIds = [...new Set((reviewsData || []).map(r => r.property_id))];
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, name')
        .in('id', propertyIds.length > 0 ? propertyIds : ['none']);

      // Get user profiles
      const userIds = [...new Set((reviewsData || []).filter(r => r.user_id).map(r => r.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      // Build property and user maps
      const propertyMap = new Map((propertiesData || []).map(p => [p.id, p.name]));
      const userMap = new Map((profilesData || []).map(u => [u.id, u.full_name]));

      const enrichedReviews: Review[] = (reviewsData || []).map(review => ({
        ...review,
        property_name: propertyMap.get(review.property_id) || 'Unknown Property',
        user_name: review.is_team_review 
          ? (review.reviewer_name || 'VibesBNB Team')
          : (userMap.get(review.user_id) || 'Anonymous User'),
      }));

      setReviews(enrichedReviews);
      setFilteredReviews(enrichedReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleApproveReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'approved' })
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(reviews.map((r) => (r.id === reviewId ? { ...r, status: 'approved' as const } : r)));
      toast.success('Review approved');
    } catch (error: any) {
      console.error('Error approving review:', error);
      toast.error('Failed to approve review');
    }
  };

  const handleRejectReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'rejected' })
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(reviews.map((r) => (r.id === reviewId ? { ...r, status: 'rejected' as const } : r)));
      toast.success('Review rejected');
    } catch (error: any) {
      console.error('Error rejecting review:', error);
      toast.error('Failed to reject review');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(reviews.filter((r) => r.id !== reviewId));
      toast.success('Review deleted');
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const handleSubmitTeamReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamReviewForm.property_id || !teamReviewForm.comment.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmittingTeamReview(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          property_id: teamReviewForm.property_id,
          rating: teamReviewForm.rating,
          comment: teamReviewForm.comment,
          status: 'approved',
          is_team_review: true,
          reviewer_name: 'VibesBNB Team',
          user_id: null,
        });

      if (error) throw error;

      toast.success('Team review added successfully');
      setShowTeamReviewForm(false);
      setTeamReviewForm({ property_id: '', rating: 5, comment: '' });
      loadReviews();
    } catch (error: any) {
      console.error('Error adding team review:', error);
      toast.error('Failed to add team review');
    } finally {
      setSubmittingTeamReview(false);
    }
  };

  // Stats
  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const approvedCount = reviews.filter(r => r.status === 'approved').length;
  const rejectedCount = reviews.filter(r => r.status === 'rejected').length;
  const teamReviewCount = reviews.filter(r => r.is_team_review).length;

  if (loading || loadingReviews) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!user || !isAdminUser(user)) {
    return null;
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reviews Management</h1>
          <button
            onClick={() => setShowTeamReviewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <MessageSquarePlus className="w-5 h-5" />
            Add Team Review
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Team Reviews</p>
            <p className="text-2xl font-bold text-purple-600">{teamReviewCount}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="user">User Reviews</option>
              <option value="team">Team Reviews</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredReviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reviews found</p>
              <p className="text-sm text-gray-400 mt-2">Reviews will appear here once users submit them</p>
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
                              i < review.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          review.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : review.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {review.status}
                      </span>
                      {review.is_team_review && (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          Team Review
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      By {review.is_team_review ? (
                        <span className="font-medium text-purple-600">{review.reviewer_name || 'VibesBNB Team'}</span>
                      ) : (
                        review.user_name
                      )}
                    </p>
                    <p className="text-gray-700">{review.comment}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {review.status === 'pending' && (
                      <>
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
                      </>
                    )}
                    {review.status === 'rejected' && (
                      <button
                        onClick={() => handleApproveReview(review.id)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                        title="Approve (reconsider)"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Team Review Modal */}
        {showTeamReviewForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add VibesBNB Team Review</h2>
                <button
                  onClick={() => setShowTeamReviewForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitTeamReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property *
                  </label>
                  <select
                    value={teamReviewForm.property_id}
                    onChange={(e) => setTeamReviewForm({ ...teamReviewForm, property_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rating *
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setTeamReviewForm({ ...teamReviewForm, rating: star })}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 transition ${
                            star <= teamReviewForm.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300 hover:text-yellow-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-gray-600">{teamReviewForm.rating}/5</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Comment *
                  </label>
                  <textarea
                    value={teamReviewForm.comment}
                    onChange={(e) => setTeamReviewForm({ ...teamReviewForm, comment: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Write your review as the VibesBNB Team..."
                    required
                  />
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm text-purple-700">
                    <strong>Note:</strong> This review will be displayed as a "VibesBNB Team" review on the property listing.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTeamReviewForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTeamReview}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submittingTeamReview ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add Review
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
