'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { Search, Home, MapPin, DollarSign, Star, Edit, Eye, Filter, Wand2, Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import Link from 'next/link';
import { setImpersonatedHost } from '@/lib/adminHostImpersonation';

interface Property {
  id: string;
  name: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  images: string[];
  amenities: string[];
  bedrooms?: number;
  bathrooms?: number;
  beds?: number;
  guests?: number;
  status: string;
  host_id?: string;
  host_email?: string;
  host_name?: string;
  description?: string;
  wellness_friendly?: boolean;
  created_at: string;
}

export default function ManageListingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    minPrice: '',
    maxPrice: '',
    status: searchParams.get('status') || 'all',
  });
  const [loadingProperties, setLoadingProperties] = useState(true);

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
      loadProperties();
    }
  }, [user]);

  useEffect(() => {
    let filtered = properties;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.location?.toLowerCase().includes(query) ||
          p.title?.toLowerCase().includes(query)
      );
    }

    // City filter
    if (filters.city) {
      filtered = filtered.filter((p) =>
        p.location?.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    // Price filters
    if (filters.minPrice) {
      filtered = filtered.filter((p) => p.price >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      filtered = filtered.filter((p) => p.price <= Number(filters.maxPrice));
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    setFilteredProperties(filtered);
  }, [searchQuery, filters, properties]);

  const loadProperties = async () => {
    setLoadingProperties(true);
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization)
        throw new Error('No valid session — please sign in again.');
      const response = await fetch('/api/admin/properties', {
        headers: { ...headers },
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error || 'Failed to load properties');

      // For each property, try to get host info
      const propertiesWithHosts = await Promise.all(
        (payload.properties || []).map(async (property: any) => {
          let hostInfo = {};
          if (property.host_id) {
            // In a real app, you'd fetch host details from auth.users or a users table
            hostInfo = {
              host_email: `host-${property.host_id.substring(0, 8)}@example.com`,
              host_name: `Host ${property.host_id.substring(0, 8)}`,
            };
          }
          return { ...property, ...hostInfo };
        })
      );

      setProperties(propertiesWithHosts);
      setFilteredProperties(propertiesWithHosts);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoadingProperties(false);
    }
  };

  const [syncing, setSyncing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleApproveProperty = async (propertyId: string) => {
    setApprovingId(propertyId);
    try {
      const authHeaders = await getHeadersForAdminFetch();
      if (!authHeaders.Authorization)
        throw new Error('No valid session — please sign in again.');
      const response = await fetch('/api/admin/properties', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          propertyId,
          status: 'active',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to approve property');

      toast.success('Property approved and published!');
      loadProperties();
    } catch (error: any) {
      console.error('Error approving property:', error);
      toast.error('Failed to approve property');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectProperty = async (propertyId: string) => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    
    setApprovingId(propertyId);
    try {
      const authHeaders = await getHeadersForAdminFetch();
      if (!authHeaders.Authorization)
        throw new Error('No valid session — please sign in again.');
      const response = await fetch('/api/admin/properties', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          propertyId,
          status: 'draft',
          rejectionReason: reason || 'Property did not meet our listing requirements.',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reject property');

      toast.success('Property rejected and moved to draft');
      loadProperties();
    } catch (error: any) {
      console.error('Error rejecting property:', error);
      toast.error('Failed to reject property');
    } finally {
      setApprovingId(null);
    }
  };

  const handleSyncAllCoordinates = async () => {
    if (!confirm('This will attempt to find precise coordinates for ALL properties using their Google Maps URLs. Proceed?')) return;

    setSyncing(true);
    const toastId = toast.loading('Syncing coordinates for all properties...');

    try {
      const response = await fetch('/api/properties/auto-detect-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyIds: 'all' }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to sync coordinates');

      toast.success(`Successfully synced ${data.summary.successful} property(ies)`, { id: toastId });
      loadProperties();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'An error occurred during sync', { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  if (loading || loadingProperties) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
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
          <h1 className="text-2xl font-bold text-gray-900">Manage Listings</h1>
          <button
            onClick={handleSyncAllCoordinates}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            {syncing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
            Sync All Coordinates
          </button>
        </div>

        {/* Pending Approval Alert */}
        {properties.filter(p => p.status === 'pending_approval').length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800">Properties Awaiting Approval</h3>
                <p className="text-amber-600 text-sm">
                  {properties.filter(p => p.status === 'pending_approval').length} properties need your review
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilters({ ...filters, status: 'pending_approval' })}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium"
            >
              View Pending
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <input
                type="text"
                placeholder="City"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Min Price"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending_approval">⏳ Pending Approval</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No listings found</p>
            </div>
          ) : (
            filteredProperties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-200">
                  {property.images && property.images.length > 0 ? (
                    <img
                      src={property.images[0]}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${property.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : property.status === 'pending_approval'
                            ? 'bg-amber-100 text-amber-800'
                            : property.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {property.status === 'pending_approval' && <Clock className="w-3 h-3" />}
                      {property.status === 'pending_approval' ? 'Pending Approval' : property.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{property.name || property.title}</h3>
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="truncate">{property.location}</span>
                  </div>

                  {/* Property Details */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    {property.bedrooms && <span>🛏️ {property.bedrooms} beds</span>}
                    {property.bathrooms && <span>🚿 {property.bathrooms} baths</span>}
                    {property.guests && <span>👥 {property.guests} guests</span>}
                  </div>

                  {/* Rating and Price */}
                  <div className="flex items-center justify-between mb-3">
                    {property.rating && (
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm text-gray-600">{property.rating.toFixed(1)}</span>
                      </div>
                    )}
                    <div className="text-lg font-bold text-gray-900">
                      ${property.price}
                      <span className="text-sm font-normal text-gray-500">/night</span>
                    </div>
                  </div>

                  {/* Host Info */}
                  {property.host_name && (
                    <div className="text-xs text-gray-500 mb-3">
                      Host: {property.host_name} ({property.host_email})
                    </div>
                  )}

                  {/* Reviews Link */}
                  {property.rating && (
                    <div className="mb-3">
                      <Link
                        href={`/admin/reviews?property=${property.id}`}
                        className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
                      >
                        <Star className="w-4 h-4" />
                        View Reviews ({property.rating.toFixed(1)})
                      </Link>
                    </div>
                  )}

                  {/* Approval Actions for Pending Properties */}
                  {property.status === 'pending_approval' && (
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-200 mb-3">
                      <button
                        onClick={() => handleApproveProperty(property.id)}
                        disabled={approvingId === property.id}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {approvingId === property.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectProperty(property.id)}
                        disabled={approvingId === property.id}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className={`flex items-center gap-2 ${property.status !== 'pending_approval' ? 'pt-3 border-t border-gray-200' : ''}`}>
                    <Link
                      href={`/listings/${property.id}`}
                      target="_blank"
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm text-center flex items-center justify-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                    <Link
                      href={`/host/properties/${property.id}/edit`}
                      onClick={() => {
                        if (property.host_id) {
                          setImpersonatedHost(
                            property.host_id,
                            property.host_name || property.host_email || 'Host'
                          );
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm text-center flex items-center justify-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit as host
                    </Link>
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

