'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Search, Home, MapPin, DollarSign, Star, Edit, Eye, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

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
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    minPrice: '',
    maxPrice: '',
    status: 'all',
  });
  const [loadingProperties, setLoadingProperties] = useState(true);

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
      const supabase = createClient();
      const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });

      if (error) throw error;

      // For each property, try to get host info
      const propertiesWithHosts = await Promise.all(
        (data || []).map(async (property) => {
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

  if (loading || loadingProperties) {
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
          <h1 className="text-2xl font-bold text-gray-900">Manage Listings</h1>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-mist-400 w-5 h-5" />
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
              <Home className="w-16 h-16 text-mist-400 mx-auto mb-4" />
              <p className="text-mist-500">No listings found</p>
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
                      <Home className="w-12 h-12 text-mist-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        property.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : property.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {property.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{property.name || property.title}</h3>
                  <div className="flex items-center text-sm text-mist-500 mb-2">
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
                      <span className="text-sm font-normal text-mist-500">/night</span>
                    </div>
                  </div>

                  {/* Host Info */}
                  {property.host_name && (
                    <div className="text-xs text-mist-500 mb-3">
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

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
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
                      className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm text-center flex items-center justify-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
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

