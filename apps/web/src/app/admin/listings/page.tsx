'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Listing {
  id: string;
  title: string;
  description: string;
  hostId: string;
  status: string;
  basePrice: number;
  cleaningFee: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  wellnessTags: string[];
  amenities: string[];
  houseRules: string[];
  createdAt: Date;
}

interface ListingMedia {
  id: string;
  url: string;
  type: string;
}

export default function AdminListingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [pendingListings, setpendingListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [listingMedia, setListingMedia] = useState<ListingMedia[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendModal, setShowSuspendModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }

    if (!isLoading && user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchPendingListings();
    }
  }, [user]);

  const fetchPendingListings = async () => {
    try {
      const listings = await api.get('/admin/listings/pending');
      setpendingListings(listings);
    } catch (error) {
      console.error('Error fetching pending listings:', error);
    } finally {
      setLoadingListings(false);
    }
  };

  const fetchListingMedia = async (listingId: string) => {
    try {
      const media = await api.get(`/listings/${listingId}/media`);
      setListingMedia(media);
    } catch (error) {
      console.error('Error fetching listing media:', error);
      setListingMedia([]);
    }
  };

  const handleViewListing = async (listing: Listing) => {
    setSelectedListing(listing);
    await fetchListingMedia(listing.id);
  };

  const handleApprove = async (listingId: string) => {
    if (!confirm('Are you sure you want to approve this listing?')) return;

    setActionLoading(true);
    try {
      await api.post(`/admin/listings/${listingId}/approve`);
      alert('Listing approved successfully!');
      setSelectedListing(null);
      await fetchPendingListings();
    } catch (error: any) {
      alert('Error approving listing: ' + (error.message || 'Unknown error'));
      console.error('Error approving listing:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (listingId: string) => {
    if (!suspendReason.trim()) {
      alert('Please provide a reason for suspension');
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/admin/listings/${listingId}/suspend`, {
        reason: suspendReason,
      });
      alert('Listing suspended successfully!');
      setShowSuspendModal(false);
      setSelectedListing(null);
      setSuspendReason('');
      await fetchPendingListings();
    } catch (error: any) {
      alert('Error suspending listing: ' + (error.message || 'Unknown error'));
      console.error('Error suspending listing:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Listing Approvals</h1>
          <p className="text-gray-600 mt-2">Review and approve pending listings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Listings List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">
                Pending Listings ({pendingListings.length})
              </h2>
            </div>
            <div className="divide-y max-h-[calc(100vh-200px)] overflow-y-auto">
              {loadingListings ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : pendingListings.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No pending listings
                </div>
              ) : (
                pendingListings.map((listing) => (
                  <button
                    key={listing.id}
                    onClick={() => handleViewListing(listing)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedListing?.id === listing.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {listing.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {listing.address?.city}, {listing.address?.state}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      ${(listing.basePrice / 100).toFixed(2)} / night
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Listing Details */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            {selectedListing ? (
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedListing.title}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {selectedListing.address?.street}, {selectedListing.address?.city},{' '}
                      {selectedListing.address?.state} {selectedListing.address?.zipCode}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    Pending Review
                  </span>
                </div>

                {/* Photos */}
                {listingMedia.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Photos</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {listingMedia.map((media) => (
                        <img
                          key={media.id}
                          src={media.url}
                          alt="Listing"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedListing.description}
                  </p>
                </div>

                {/* Property Details */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Property Details</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>Max Guests: {selectedListing.maxGuests}</li>
                      <li>Bedrooms: {selectedListing.bedrooms}</li>
                      <li>Beds: {selectedListing.beds}</li>
                      <li>Bathrooms: {selectedListing.bathrooms}</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Pricing</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>
                        Base Price: ${(selectedListing.basePrice / 100).toFixed(2)} /
                        night
                      </li>
                      <li>
                        Cleaning Fee: ${(selectedListing.cleaningFee / 100).toFixed(2)}
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Wellness Tags */}
                {selectedListing.wellnessTags && selectedListing.wellnessTags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Wellness Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedListing.wellnessTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {tag.replace(/_/g, ' ').replace('420', '420')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {selectedListing.amenities && selectedListing.amenities.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedListing.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          {amenity.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* House Rules */}
                {selectedListing.houseRules && selectedListing.houseRules.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">House Rules</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedListing.houseRules.map((rule) => (
                        <span
                          key={rule}
                          className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                        >
                          {rule.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t">
                  <button
                    onClick={() => handleApprove(selectedListing.id)}
                    disabled={actionLoading}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {actionLoading ? 'Processing...' : '✓ Approve Listing'}
                  </button>
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    disabled={actionLoading}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    ✗ Reject Listing
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <p className="text-gray-500">Select a listing to review</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Reject Listing</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this listing:
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSuspendReason('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSuspend(selectedListing.id)}
                disabled={actionLoading || !suspendReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

