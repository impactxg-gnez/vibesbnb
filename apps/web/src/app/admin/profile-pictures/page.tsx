'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Image, Search, Check, X, Loader2, User, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface PendingPicture {
  id: string;
  user_id: string;
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  submitted_at: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

export default function ProfilePicturesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [pictures, setPictures] = useState<PendingPicture[]>([]);
  const [filteredPictures, setFilteredPictures] = useState<PendingPicture[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loadingPictures, setLoadingPictures] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !isAdmin) {
      router.push('/');
    }
  }, [user, loading, router, isAdmin]);

  useEffect(() => {
    if (user && isAdmin) {
      loadPictures();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    let filtered = pictures;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.user_name?.toLowerCase().includes(query) ||
          p.user_email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredPictures(filtered);
  }, [searchQuery, statusFilter, pictures]);

  const loadPictures = async () => {
    setLoadingPictures(true);
    try {
      // Get pending profile pictures
      const { data: picturesData, error: picturesError } = await supabase
        .from('pending_profile_pictures')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (picturesError) {
        console.error('Error loading pictures:', picturesError);
        // If table doesn't exist, show empty state
        if (picturesError.message.includes('does not exist')) {
          setPictures([]);
          setFilteredPictures([]);
          return;
        }
        throw picturesError;
      }

      // Get user profiles for names
      const userIds = [...new Set((picturesData || []).map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      const profileMap = new Map((profilesData || []).map(p => [p.id, p.full_name]));

      const enrichedPictures: PendingPicture[] = (picturesData || []).map(pic => ({
        ...pic,
        user_name: profileMap.get(pic.user_id) || 'Unknown User',
        user_email: `User ${pic.user_id.substring(0, 8)}`,
      }));

      setPictures(enrichedPictures);
      setFilteredPictures(enrichedPictures.filter(p => statusFilter === 'all' || p.status === statusFilter));
    } catch (error) {
      console.error('Error loading pictures:', error);
      toast.error('Failed to load profile pictures');
    } finally {
      setLoadingPictures(false);
    }
  };

  const handleApprove = async (pictureId: string, userId: string, imageUrl: string) => {
    setProcessingId(pictureId);
    try {
      // Update the pending picture status
      const { error: updateError } = await supabase
        .from('pending_profile_pictures')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', pictureId);

      if (updateError) throw updateError;

      // Update the user's profile with approved avatar
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          avatar_url: imageUrl,
          avatar_status: 'approved',
          pending_avatar_url: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Update local state
      setPictures(prev => prev.map(p => 
        p.id === pictureId ? { ...p, status: 'approved' as const } : p
      ));

      toast.success('Profile picture approved!');
    } catch (error: any) {
      console.error('Error approving picture:', error);
      toast.error('Failed to approve profile picture');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (pictureId: string, userId: string) => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    
    setProcessingId(pictureId);
    try {
      // Update the pending picture status
      const { error: updateError } = await supabase
        .from('pending_profile_pictures')
        .update({
          status: 'rejected',
          rejection_reason: reason || 'Image does not meet our community guidelines.',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', pictureId);

      if (updateError) throw updateError;

      // Update the user's profile status
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          avatar_status: 'rejected',
          pending_avatar_url: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Update local state
      setPictures(prev => prev.map(p => 
        p.id === pictureId ? { ...p, status: 'rejected' as const, rejection_reason: reason || undefined } : p
      ));

      toast.success('Profile picture rejected');
    } catch (error: any) {
      console.error('Error rejecting picture:', error);
      toast.error('Failed to reject profile picture');
    } finally {
      setProcessingId(null);
    }
  };

  // Stats
  const pendingCount = pictures.filter(p => p.status === 'pending').length;
  const approvedCount = pictures.filter(p => p.status === 'approved').length;
  const rejectedCount = pictures.filter(p => p.status === 'rejected').length;

  if (loading || loadingPictures) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile Picture Approvals</h1>
            <p className="text-gray-500 text-sm mt-1">Review and approve user profile pictures</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div 
            className={`bg-white p-4 rounded-lg border shadow-sm cursor-pointer transition ${statusFilter === 'pending' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200'}`}
            onClick={() => setStatusFilter('pending')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white p-4 rounded-lg border shadow-sm cursor-pointer transition ${statusFilter === 'approved' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}
            onClick={() => setStatusFilter('approved')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white p-4 rounded-lg border shadow-sm cursor-pointer transition ${statusFilter === 'rejected' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200'}`}
            onClick={() => setStatusFilter('rejected')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by user name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
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

        {/* Pictures Grid */}
        {filteredPictures.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No profile pictures to review</p>
            <p className="text-sm text-gray-400 mt-2">
              {statusFilter === 'pending' 
                ? 'All pending pictures have been reviewed!'
                : 'No pictures match your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPictures.map((picture) => (
              <div
                key={picture.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
              >
                {/* Image Preview */}
                <div 
                  className="relative h-48 bg-gray-100 cursor-pointer"
                  onClick={() => setSelectedImage(picture.image_url)}
                >
                  <img
                    src={picture.image_url}
                    alt={`Profile picture from ${picture.user_name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=Error';
                    }}
                  />
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        picture.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : picture.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {picture.status}
                    </span>
                  </div>
                </div>

                {/* User Info */}
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{picture.user_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(picture.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Rejection Reason */}
                  {picture.status === 'rejected' && picture.rejection_reason && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-600">
                      <strong>Reason:</strong> {picture.rejection_reason}
                    </div>
                  )}

                  {/* Actions */}
                  {picture.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(picture.id, picture.user_id, picture.image_url)}
                        disabled={processingId === picture.id}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {processingId === picture.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(picture.id, picture.user_id)}
                        disabled={processingId === picture.id}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image Preview Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh]">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300"
              >
                <X className="w-8 h-8" />
              </button>
              <img
                src={selectedImage}
                alt="Profile picture preview"
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
