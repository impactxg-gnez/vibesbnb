'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Home, Edit, Trash2, ExternalLink, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface Property {
  id: string;
  name: string;
  location: string;
  bedrooms: number;
  price: number;
  images: string[];
  status: 'active' | 'draft' | 'inactive';
  wellnessFriendly: boolean;
}

export default function HostPropertiesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Load mock properties (replace with actual API call)
    const mockProperties: Property[] = [
      {
        id: '1',
        name: 'Mountain View Cabin',
        location: 'Aspen, Colorado',
        bedrooms: 3,
        price: 250,
        images: ['https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400&h=300&fit=crop'],
        status: 'active',
        wellnessFriendly: true,
      },
      {
        id: '2',
        name: 'Beach Villa',
        location: 'Malibu, California',
        bedrooms: 4,
        price: 450,
        images: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=400&h=300&fit=crop'],
        status: 'active',
        wellnessFriendly: true,
      },
    ];
    setProperties(mockProperties);
  }, []);

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    setImporting(true);

    try {
      // TODO: Implement actual API call to scrape/import property
      // This would call your backend to extract property details from the URL
      // For now, we'll simulate the import
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock imported property
      const importedProperty: Property = {
        id: Date.now().toString(),
        name: 'Imported Property',
        location: 'Location from URL',
        bedrooms: 2,
        price: 150,
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop'],
        status: 'draft',
        wellnessFriendly: false,
      };

      setProperties([...properties, importedProperty]);
      toast.success('Property imported! Please review and publish.');
      setShowImportModal(false);
      setImportUrl('');
    } catch (error) {
      toast.error('Failed to import property. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      setProperties(properties.filter(p => p.id !== id));
      toast.success('Property deleted');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Properties</h1>
            <p className="text-gray-400">
              Manage your listings and earnings
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Upload size={20} />
              Import from URL
            </button>
            <Link
              href="/host/properties/new"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2"
            >
              <Plus size={20} />
              Add Property
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Total Properties</h3>
              <Home size={20} className="text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-white">{properties.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Active Listings</h3>
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            </div>
            <p className="text-3xl font-bold text-white">
              {properties.filter(p => p.status === 'active').length}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">This Month</h3>
              <span className="text-emerald-500 text-sm">+12%</span>
            </div>
            <p className="text-3xl font-bold text-white">$3,240</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Total Bookings</h3>
              <span className="text-blue-500 text-sm">24</span>
            </div>
            <p className="text-3xl font-bold text-white">156</p>
          </div>
        </div>

        {/* Properties List */}
        {properties.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Home size={64} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No properties yet</h3>
            <p className="text-gray-400 mb-6">
              Get started by adding your first property or importing from an existing listing
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Upload size={20} />
                Import from URL
              </button>
              <Link
                href="/host/properties/new"
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2"
              >
                <Plus size={20} />
                Add Property
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-emerald-600 transition group"
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-800">
                  {property.images[0] && (
                    <img
                      src={property.images[0]}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        property.status === 'active'
                          ? 'bg-emerald-600 text-white'
                          : property.status === 'draft'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-600 text-white'
                      }`}
                    >
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </span>
                  </div>
                  {property.wellnessFriendly && (
                    <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-white text-xs font-medium">🧘 Wellness-Friendly</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-emerald-500 transition">
                    {property.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-3">{property.location}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">{property.bedrooms} bedrooms</span>
                    <span className="text-white font-bold text-lg">
                      ${property.price}
                      <span className="text-gray-400 text-sm font-normal">/night</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/host/properties/${property.id}/edit`}
                      className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2"
                    >
                      <Edit size={16} />
                      Edit
                    </Link>
                    <Link
                      href={`/listings/${property.id}`}
                      className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center justify-center"
                      target="_blank"
                    >
                      <ExternalLink size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(property.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Import Property from URL</h2>
            <p className="text-gray-400 mb-6">
              Paste the URL of your property listing from any vacation rental platform.
              We'll automatically extract the details for you!
            </p>

            {/* URL Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Property URL
              </label>
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/listings/12345"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Paste any property listing URL (e.g., from Airbnb, Booking.com, VRBO, or your management platform)
              </p>
            </div>

            {/* Info */}
            <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-300">
                <strong>Note:</strong> We'll import the property details including name, description,
                amenities, photos, and pricing. You can review and edit everything before publishing.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportUrl('');
                }}
                className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                disabled={importing}
              >
                Cancel
              </button>
              <button
                onClick={handleImportFromUrl}
                disabled={importing || !importUrl.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Import Property
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



