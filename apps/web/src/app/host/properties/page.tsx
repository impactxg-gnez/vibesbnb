'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Home, Edit, Trash2, ExternalLink, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface Property {
  id: string;
  name: string;
  description?: string;
  location: string;
  bedrooms: number;
  bathrooms?: number;
  beds?: number;
  guests?: number;
  price: number;
  images: string[];
  amenities?: string[];
  status: 'active' | 'draft' | 'inactive';
  wellnessFriendly: boolean;
  googleMapsUrl?: string;
}

export default function HostPropertiesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    thisMonthRevenue: 0,
    totalBookings: 0,
    newBookings: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      // Clear any cached mock data from localStorage if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isSupabaseConfigured = supabaseUrl && 
                                    supabaseUrl !== '' &&
                                    supabaseUrl !== 'https://placeholder.supabase.co';
      
      if (isSupabaseConfigured) {
        // Clear localStorage properties cache to prevent showing old mock data
        const propertiesKey = `properties_${user.id}`;
        const cachedProperties = localStorage.getItem(propertiesKey);
        if (cachedProperties) {
          try {
            const parsed = JSON.parse(cachedProperties);
            // Check if it's mock data (has Mountain View Cabin or Beach Villa)
            const isMockData = parsed.some((p: any) => 
              p.name === 'Mountain View Cabin' || 
              p.name === 'Beach Villa' ||
              p.id === '1' || 
              p.id === '2'
            );
            if (isMockData) {
              localStorage.removeItem(propertiesKey);
            }
          } catch (e) {
            // If parsing fails, remove it anyway
            localStorage.removeItem(propertiesKey);
          }
        }
      }
      
      loadProperties();
    }
  }, [user]);

  useEffect(() => {
    if (user && properties.length >= 0) {
      loadStats();
    }
  }, [user, properties.length]);

  const loadProperties = async () => {
    if (!user) return;
    
    setLoadingProperties(true);
    try {
      const supabase = createClient();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isSupabaseConfigured = supabaseUrl && 
                                    supabaseUrl !== '' &&
                                    supabaseUrl !== 'https://placeholder.supabase.co';
      
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      if (isSupabaseConfigured && supabaseUser) {
        // Fetch properties from Supabase
        const { data: propertiesData, error } = await supabase
          .from('properties')
          .select('*')
          .eq('host_id', supabaseUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading properties:', error);
          // If Supabase is configured but there's an error, show empty state
          setProperties([]);
          setStats({
            totalProperties: 0,
            activeListings: 0,
            thisMonthRevenue: 0,
            totalBookings: 0,
            newBookings: 0,
          });
        } else if (propertiesData && propertiesData.length > 0) {
          // Transform Supabase data to Property interface
          const transformedProperties: Property[] = propertiesData.map((p: any) => ({
            id: p.id,
            name: p.name || p.title || 'Untitled Property',
            description: p.description || '',
            location: p.location || '',
            bedrooms: p.bedrooms || 0,
            bathrooms: p.bathrooms,
            beds: p.beds,
            guests: p.guests || 0,
            price: p.price ? Number(p.price) : 0,
            images: p.images || [],
            amenities: p.amenities || [],
            status: (p.status || 'active') as 'active' | 'draft' | 'inactive',
            wellnessFriendly: p.wellness_friendly || false,
            googleMapsUrl: p.google_maps_url,
          }));
          setProperties(transformedProperties);
          // Load stats after properties are loaded
          setTimeout(() => loadStats(), 100);
        } else {
          // No properties found in Supabase - show empty state (don't fall back to localStorage)
          setProperties([]);
          setStats({
            totalProperties: 0,
            activeListings: 0,
            thisMonthRevenue: 0,
            totalBookings: 0,
            newBookings: 0,
          });
        }
      } else {
        // Supabase not configured - fallback to localStorage (for demo mode only)
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      // If Supabase is configured, show empty state on error
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isSupabaseConfigured = supabaseUrl && 
                                    supabaseUrl !== '' &&
                                    supabaseUrl !== 'https://placeholder.supabase.co';
      
      if (isSupabaseConfigured) {
        setProperties([]);
        setStats({
          totalProperties: 0,
          activeListings: 0,
          thisMonthRevenue: 0,
          totalBookings: 0,
          newBookings: 0,
        });
      } else {
        loadFromLocalStorage();
      }
    } finally {
      setLoadingProperties(false);
    }
  };

  const loadFromLocalStorage = () => {
    const savedProperties = localStorage.getItem(`properties_${user?.id}`);
    if (savedProperties) {
      try {
        const parsedProperties = JSON.parse(savedProperties);
        setProperties(parsedProperties);
        // Load stats after properties are loaded
        setTimeout(() => loadStats(), 100);
      } catch (error) {
        console.error('Failed to load properties from localStorage:', error);
        setProperties([]);
        setStats({
          totalProperties: 0,
          activeListings: 0,
          thisMonthRevenue: 0,
          totalBookings: 0,
          newBookings: 0,
        });
      }
    } else {
      setProperties([]);
      setStats({
        totalProperties: 0,
        activeListings: 0,
        thisMonthRevenue: 0,
        totalBookings: 0,
        newBookings: 0,
      });
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      if (supabaseUser) {
        // Get all properties for this host
        const { data: propertiesData } = await supabase
          .from('properties')
          .select('id, status')
          .eq('host_id', supabaseUser.id);

        const totalProperties = propertiesData?.length || 0;
        const activeListings = propertiesData?.filter(p => p.status === 'active').length || 0;

        // Get bookings for this host's properties
        const propertyIds = propertiesData?.map(p => p.id) || [];
        let totalBookings = 0;
        let thisMonthRevenue = 0;
        let newBookings = 0;

        if (propertyIds.length > 0) {
          // Get bookings for this month
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          const { data: bookingsData } = await supabase
            .from('bookings')
            .select('*')
            .in('property_id', propertyIds)
            .eq('status', 'confirmed');

          if (bookingsData) {
            totalBookings = bookingsData.length;
            
            // Calculate this month's revenue
            const thisMonthBookings = bookingsData.filter(b => {
              const bookingDate = new Date(b.created_at);
              return bookingDate >= firstDayOfMonth;
            });
            
            thisMonthRevenue = thisMonthBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
            newBookings = thisMonthBookings.length;
          }
        }

        setStats({
          totalProperties,
          activeListings,
          thisMonthRevenue,
          totalBookings,
          newBookings,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set default stats based on current properties state
      const currentProperties = properties.length > 0 ? properties : [];
      setStats({
        totalProperties: currentProperties.length,
        activeListings: currentProperties.filter(p => p.status === 'active').length,
        thisMonthRevenue: 0,
        totalBookings: 0,
        newBookings: 0,
      });
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    setImporting(true);

    try {
      // Call the scraping API
      const response = await fetch('/api/scrape-property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: importUrl }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to import property');
      }

      const scrapedData = result.data;
      const meta = result.meta || {};

      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      if (!supabaseUser) {
        toast.error('You must be logged in to import properties');
        setImporting(false);
        return;
      }

      // Create imported property with scraped data
      // Generate a unique ID that includes user ID to avoid conflicts
      const propertyId = `${supabaseUser.id}_${Date.now()}`;
      // Extract location from title if not found (e.g., "Rental unit in Beloshi" -> "Beloshi")
      let location = scrapedData.location || '';
      if (!location && scrapedData.name) {
        const locationMatch = scrapedData.name.match(/in\s+(.+?)(?:\s*·|$)/i);
        if (locationMatch) {
          location = locationMatch[1].trim();
        }
      }

      const importedProperty: Property = {
        id: propertyId,
        name: scrapedData.name || 'Imported Property',
        description: scrapedData.description || '',
        location: location || 'Location not found',
        bedrooms: scrapedData.bedrooms || 1,
        bathrooms: scrapedData.bathrooms || 1,
        beds: scrapedData.beds || 1,
        guests: scrapedData.guests || 2,
        price: scrapedData.price || 100,
        images: scrapedData.images || [],
        amenities: scrapedData.amenities || [],
        status: 'draft',
        wellnessFriendly: scrapedData.wellnessFriendly || false,
        googleMapsUrl: scrapedData.googleMapsUrl,
        coordinates: scrapedData.coordinates,
      };

      // Save to Supabase if available
      if (supabaseUser) {
        const { data: insertedProperty, error: insertError } = await supabase
          .from('properties')
          .insert({
            id: propertyId,
            host_id: supabaseUser.id,
            name: importedProperty.name,
            title: importedProperty.name,
            description: importedProperty.description,
            location: importedProperty.location,
            price: importedProperty.price,
            images: importedProperty.images,
            amenities: importedProperty.amenities,
            guests: importedProperty.guests,
            bedrooms: importedProperty.bedrooms,
            bathrooms: importedProperty.bathrooms,
            beds: importedProperty.beds,
            status: 'draft',
            wellness_friendly: importedProperty.wellnessFriendly,
            google_maps_url: importedProperty.googleMapsUrl,
            latitude: importedProperty.coordinates?.lat,
            longitude: importedProperty.coordinates?.lng,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error saving to Supabase:', insertError);
          
          // Check if it's a missing column error
          if (insertError.message?.includes('column') && insertError.message?.includes('does not exist')) {
            toast.error(
              `Database migration required! Please run the migration script in Supabase. Error: ${insertError.message}`,
              { duration: 10000 }
            );
          } else {
            toast.error(`Failed to save property: ${insertError.message}`);
          }
          throw insertError;
        }

        // Reload properties from Supabase to ensure data is fresh
        await loadProperties();
        loadStats(); // Reload stats after adding property
      } else {
        // Fallback to localStorage (demo mode only)
        const existingProperties = JSON.parse(localStorage.getItem(`properties_${user?.id}`) || '[]');
        const updatedProperties = [...existingProperties, importedProperty];
        localStorage.setItem(`properties_${user?.id}`, JSON.stringify(updatedProperties));
        setProperties([...properties, importedProperty]);
        loadStats();
      }
      
      // Enhanced success message with more details
      const details = [];
      if (scrapedData.images?.length) details.push(`${scrapedData.images.length} photos`);
      if (scrapedData.amenities?.length) details.push(`${scrapedData.amenities.length} amenities`);
      if (scrapedData.guests) details.push(`${scrapedData.guests} guests`);
      if (scrapedData.bedrooms) details.push(`${scrapedData.bedrooms} bedrooms`);
      if (scrapedData.bathrooms) details.push(`${scrapedData.bathrooms} bathrooms`);
      
      const method = meta.scrapingMethod === 'puppeteer' ? '🚀 Browser automation' : '⚡ Fast mode';
      const duration = meta.duration ? ` (${(meta.duration / 1000).toFixed(1)}s)` : '';
      
      toast.success(`${method}${duration}\n✅ Imported: ${details.join(', ')}. Review and publish!`, {
        duration: 5000,
      });
      setShowImportModal(false);
      setImportUrl('');
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import property. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      if (supabaseUser) {
        // Delete from Supabase
        const { error } = await supabase
          .from('properties')
          .delete()
          .eq('id', id)
          .eq('host_id', supabaseUser.id);

        if (error) {
          throw error;
        }

        // Update local state
        const updatedProperties = properties.filter(p => p.id !== id);
        setProperties(updatedProperties);
        
        // Also update localStorage as fallback
        if (user) {
          localStorage.setItem(`properties_${user.id}`, JSON.stringify(updatedProperties));
        }

        // Reload stats
        loadStats();
        
        toast.success('Property deleted');
      } else {
        // Fallback to localStorage
        const updatedProperties = properties.filter(p => p.id !== id);
        setProperties(updatedProperties);
        
        if (user) {
          localStorage.setItem(`properties_${user.id}`, JSON.stringify(updatedProperties));
        }
        
        toast.success('Property deleted');
      }
    } catch (error: any) {
      console.error('Error deleting property:', error);
      toast.error(error.message || 'Failed to delete property');
    }
  };

  if (loading || loadingProperties) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-white">Loading properties...</p>
        </div>
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
            <p className="text-3xl font-bold text-white">{stats.totalProperties}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Active Listings</h3>
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.activeListings}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">This Month</h3>
              {stats.newBookings > 0 && (
                <span className="text-emerald-500 text-sm">+{stats.newBookings}</span>
              )}
            </div>
            <p className="text-3xl font-bold text-white">
              ${stats.thisMonthRevenue.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Total Bookings</h3>
              {stats.newBookings > 0 && (
                <span className="text-blue-500 text-sm">{stats.newBookings}</span>
              )}
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalBookings}</p>
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
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-gray-400 text-sm">{property.location}</p>
                    {property.googleMapsUrl && (
                      <a 
                        href={property.googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-400 text-xs"
                      >
                        📍 Map
                      </a>
                    )}
                  </div>
                  
                  {/* Property Details */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <span className="text-gray-400">🛏️ {property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''}</span>
                    {property.bathrooms && (
                      <span className="text-gray-400">🚿 {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
                    )}
                    {property.beds && (
                      <span className="text-gray-400">🛌 {property.beds} bed{property.beds !== 1 ? 's' : ''}</span>
                    )}
                    {property.guests && (
                      <span className="text-gray-400">👥 {property.guests} guest{property.guests !== 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {/* Amenities Preview */}
                  {property.amenities && property.amenities.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {property.amenities.slice(0, 3).map((amenity, idx) => (
                          <span key={idx} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                            {amenity}
                          </span>
                        ))}
                        {property.amenities.length > 3 && (
                          <span className="text-xs text-gray-500 px-2 py-1">
                            +{property.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Price & Image Count */}
                  <div className="flex items-center justify-between mb-4 pt-3 border-t border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">
                        ${property.price}
                        <span className="text-gray-400 text-sm font-normal">/night</span>
                      </span>
                    </div>
                    {property.images.length > 0 && (
                      <span className="text-gray-500 text-xs">
                        📷 {property.images.length} photo{property.images.length !== 1 ? 's' : ''}
                      </span>
                    )}
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
              Paste your Airbnb or other vacation rental listing URL.
              We'll automatically extract all the important details for you!
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
                placeholder="https://www.airbnb.com/rooms/12345678"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                🎯 Best results with Airbnb URLs. Also supports Booking.com, VRBO, and other platforms.
              </p>
            </div>

            {/* Info */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-600/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🚀</div>
                <div>
                  <p className="text-sm text-blue-300 mb-2">
                    <strong>Advanced Browser Automation</strong>
                  </p>
                  <ul className="text-sm text-blue-200 space-y-1 ml-4">
                    <li>📷 <strong>All property photos</strong> (including lazy-loaded images)</li>
                    <li>🏠 Bedrooms, bathrooms, beds, and guest capacity</li>
                    <li>✨ Complete list of amenities</li>
                    <li>📍 Location with Google Maps integration</li>
                    <li>📝 Property name and description</li>
                  </ul>
                  <p className="text-xs text-blue-300 mt-3">
                    💡 For Airbnb URLs, we use browser automation to scroll and load ALL images!
                  </p>
                </div>
              </div>
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



