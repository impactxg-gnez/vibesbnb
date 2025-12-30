'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Home, Edit, Trash2, ExternalLink, Upload, Power, Map, CalendarClock, CalendarCheck, History, X, Loader2 } from 'lucide-react';

interface BookingSummaryItem {
  id: string;
  status: string;
  total_price?: number;
  check_in?: string;
  check_out?: string;
  guest_name?: string;
  property_name?: string;
  created_at?: string;
}
import PropertiesMap from '@/components/PropertiesMap';
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
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export default function HostPropertiesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    thisMonthRevenue: 0,
    totalBookings: 0,
    newBookings: 0,
  });
  const [bookingSummary, setBookingSummary] = useState({
    new: 0,
    upcoming: 0,
    previous: 0,
  });
const [bookingBuckets, setBookingBuckets] = useState<{
  new: BookingSummaryItem[];
  upcoming: BookingSummaryItem[];
  previous: BookingSummaryItem[];
}>({
  new: [],
  upcoming: [],
  previous: [],
});
  const [bookingDetails, setBookingDetails] = useState<{
    type: 'new' | 'upcoming' | 'previous';
    title: string;
    description: string;
    bookings: BookingSummaryItem[];
  } | null>(null);
  const [bookingActionLoading, setBookingActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      // Only clear mock data, not real properties
      // We'll be more conservative - only remove if ALL properties are clearly mock data
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isSupabaseConfigured = supabaseUrl && 
                                    supabaseUrl !== '' &&
                                    supabaseUrl !== 'https://placeholder.supabase.co';
      
      if (isSupabaseConfigured) {
        const propertiesKey = `properties_${user.id}`;
        const cachedProperties = localStorage.getItem(propertiesKey);
        if (cachedProperties) {
          try {
            const parsed = JSON.parse(cachedProperties);
            // Only remove if ALL properties are mock data (not just some)
            // This prevents accidentally removing real properties
            const allMockData = parsed.length > 0 && parsed.every((p: any) => 
              p.name === 'Mountain View Cabin' || 
              p.name === 'Beach Villa' ||
              p.name === 'Cedar Grove Cabin' ||
              p.name === 'Lakeside Lodge' ||
              p.id === '1' || 
              p.id === '2' ||
              p.id === '3' ||
              (typeof p.id === 'string' && p.id.length < 5) // Very short IDs are likely mock data
            );
            if (allMockData) {
              console.log('[Properties] Removing mock data from localStorage');
              localStorage.removeItem(propertiesKey);
            } else {
              console.log('[Properties] Keeping localStorage properties (contains real data)');
            }
          } catch (e) {
            // If parsing fails, don't remove - might be corrupted but could contain real data
            console.error('[Properties] Error parsing localStorage, keeping it:', e);
          }
        }
      }
      
      loadProperties();
    }
  }, [user]);

  const loadProperties = useCallback(async () => {
    if (!user) return;
    
    setLoadingProperties(true);
    try {
      const supabase = createClient();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const isSupabaseConfigured = supabaseUrl && 
                                    supabaseUrl !== '' &&
                                    supabaseUrl !== 'https://placeholder.supabase.co' &&
                                    supabaseKey &&
                                    supabaseKey !== '' &&
                                    supabaseKey !== 'placeholder-key';
      
      // If Supabase is not configured, use localStorage immediately
      if (!isSupabaseConfigured) {
        console.log('[Properties] Supabase not configured, loading from localStorage');
        console.log('[Properties] User ID:', user?.id);
        loadFromLocalStorage();
        return;
      }

      // Wait for session to be available (important after sign-in)
      let supabaseUser = null;
      let retries = 0;
      const maxRetries = 5;
      
      while (retries < maxRetries && !supabaseUser) {
        const { data: { user: userData }, error: authError } = await supabase.auth.getUser();
        
        if (userData) {
          supabaseUser = userData;
          console.log('[Properties] Session loaded successfully, user ID:', supabaseUser.id);
          break;
        }
        
        if (authError) {
          console.log('[Properties] Auth error (attempt', retries + 1, '):', authError.message);
        }
        
        // If no user found, wait a bit and retry (session might still be loading)
        if (retries < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        retries++;
      }
      
      // If there's an auth error or no user after retries, fall back to localStorage
      if (!supabaseUser) {
        console.log('[Properties] No Supabase user found after', maxRetries, 'attempts, falling back to localStorage');
        loadFromLocalStorage();
        return;
      }

      if (supabaseUser) {
        // Fetch properties from Supabase
        console.log('[Properties] Loading properties for host_id:', supabaseUser.id);
        const { data: propertiesData, error } = await supabase
          .from('properties')
          .select('*')
          .eq('host_id', supabaseUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Properties] Error loading properties from Supabase:', error);
          console.log('[Properties] Falling back to localStorage due to Supabase error');
          // If Supabase query fails, fall back to localStorage
          loadFromLocalStorage();
          return;
        } else {
          console.log('[Properties] Found properties from Supabase:', propertiesData?.length || 0);
          console.log('[Properties] Properties data:', propertiesData);
          
          let finalProperties: Property[] = [];
          
          if (propertiesData && propertiesData.length > 0) {
            // Transform Supabase data to Property interface
            finalProperties = propertiesData.map((p: any) => {
              // Clean up property name - remove "Property Listing" prefix
              let propertyName = p.name || p.title || 'Untitled Property';
              propertyName = propertyName
                .replace(/^Property\s+Listing[_\s-]*/i, '')
                .replace(/^property-listing[_\s-]*/i, '')
                .trim() || 'Untitled Property';
              
              // Ensure at least one image
              let images = p.images || [];
              if (images.length === 0) {
                images = ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image'];
              }
              
              return {
                id: p.id,
                name: propertyName,
                description: p.description || '',
                location: p.location || '',
                bedrooms: p.bedrooms || 0,
                bathrooms: p.bathrooms,
                beds: p.beds,
                guests: p.guests || 0,
                price: p.price ? Number(p.price) : 0,
                images: images,
                amenities: p.amenities || [],
                status: (p.status || 'active') as 'active' | 'draft' | 'inactive',
                wellnessFriendly: p.wellness_friendly || false,
                googleMapsUrl: p.google_maps_url,
                coordinates: p.latitude && p.longitude ? {
                  lat: p.latitude,
                  lng: p.longitude,
                } : undefined,
              };
            });
          }
          
          // Always check localStorage as backup/fallback
          const savedProperties = localStorage.getItem(`properties_${user.id}`);
          if (savedProperties) {
            try {
              const localStorageProperties = JSON.parse(savedProperties);
              console.log('[Properties] Found', localStorageProperties.length, 'properties in localStorage');
              
              // Merge Supabase and localStorage properties (avoid duplicates)
              const supabaseIds = new Set(finalProperties.map(p => p.id));
              localStorageProperties.forEach((localProp: any) => {
                if (!supabaseIds.has(localProp.id)) {
                  // Property exists in localStorage but not in Supabase - add it
                  // Clean up property name - remove "Property Listing" prefix
                  let propertyName = localProp.name || 'Untitled Property';
                  propertyName = propertyName
                    .replace(/^Property\s+Listing[_\s-]*/i, '')
                    .replace(/^property-listing[_\s-]*/i, '')
                    .trim() || 'Untitled Property';
                  
                  // Ensure at least one image
                  let images = localProp.images || [];
                  if (images.length === 0) {
                    images = ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image'];
                  }
                  
                  finalProperties.push({
                    id: localProp.id,
                    name: propertyName,
                    description: localProp.description || '',
                    location: localProp.location || '',
                    bedrooms: localProp.bedrooms || 0,
                    bathrooms: localProp.bathrooms,
                    beds: localProp.beds,
                    guests: localProp.guests || 0,
                    price: localProp.price ? Number(localProp.price) : 0,
                    images: images,
                    amenities: localProp.amenities || [],
                    status: (localProp.status || 'draft') as 'active' | 'draft' | 'inactive',
                    wellnessFriendly: localProp.wellnessFriendly || false,
                    googleMapsUrl: localProp.googleMapsUrl,
                    coordinates: localProp.coordinates,
                  });
                  console.log('[Properties] Added property from localStorage backup:', localProp.id);
                }
              });
            } catch (e) {
              console.error('[Properties] Error parsing localStorage properties:', e);
            }
          }
          
          // Always sync merged properties back to localStorage for persistence
          if (finalProperties.length > 0) {
            setProperties(finalProperties);
            // Sync back to localStorage to ensure persistence (includes both Supabase and localStorage properties)
            localStorage.setItem(`properties_${user.id}`, JSON.stringify(finalProperties));
            console.log('[Properties] Synced', finalProperties.length, 'properties to localStorage');
            // Load stats after properties are loaded
            setTimeout(() => loadStats(), 100);
          } else {
            // No properties found in Supabase - check localStorage one more time
            console.log('[Properties] No properties found in Supabase for host_id:', supabaseUser.id);
            const savedProperties = localStorage.getItem(`properties_${user.id}`);
            if (savedProperties) {
              try {
                const localStorageProperties = JSON.parse(savedProperties);
                if (localStorageProperties.length > 0) {
                  console.log('[Properties] Found', localStorageProperties.length, 'properties in localStorage fallback');
                  // Transform localStorage properties to Property interface
                  const transformedProperties = localStorageProperties.map((p: any) => ({
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
                    status: (p.status || 'draft') as 'active' | 'draft' | 'inactive',
                    wellnessFriendly: p.wellnessFriendly || p.wellness_friendly || false,
                    googleMapsUrl: p.googleMapsUrl || p.google_maps_url,
                    coordinates: p.coordinates || (p.latitude && p.longitude ? { lat: p.latitude, lng: p.longitude } : undefined),
                  }));
                  setProperties(transformedProperties);
                  setTimeout(() => loadStats(), 100);
                  return;
                }
              } catch (e) {
                console.error('[Properties] Error parsing localStorage in fallback:', e);
              }
            }
            
            // Debug: Check all properties (without host_id filter) to see what's in the database
            console.log('[Properties] Checking all properties in database...');
            const { data: allProperties, error: allError } = await supabase
              .from('properties')
              .select('id, name, host_id, status')
              .limit(10);
            
            if (!allError && allProperties) {
              console.log('[Properties] All properties in database:', allProperties);
              console.log('[Properties] Current user ID:', supabaseUser.id);
              console.log('[Properties] Properties with matching host_id:', allProperties.filter(p => p.host_id === supabaseUser.id));
            }
            
            // No properties found anywhere - show empty state
            setProperties([]);
            setStats({
              totalProperties: 0,
              activeListings: 0,
              thisMonthRevenue: 0,
              totalBookings: 0,
              newBookings: 0,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      // Always try localStorage as fallback, even if Supabase is configured
      console.log('[Properties] Error occurred, falling back to localStorage');
      loadFromLocalStorage();
    } finally {
      setLoadingProperties(false);
    }
  }, [user]);


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
        setBookingSummary({ new: 0, upcoming: 0, previous: 0 });
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
      setBookingSummary({ new: 0, upcoming: 0, previous: 0 });
    }
  };

  const loadStats = useCallback(async () => {
    if (!user) return;

    try {
      const supabase = createClient();
      
      // Wait for user to be available
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.log('[Stats] Auth error while getting user:', authError.message);
      }
      
      if (!supabaseUser) {
        console.log('[Stats] No Supabase user available, skipping stats load');
        return;
      }

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
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const { data: bookingsData } = await supabase
            .from('bookings')
            .select('id,status,total_price,created_at,check_in,check_out,guest_name,property_name,property_id')
            .in('property_id', propertyIds);

          if (bookingsData) {
            const confirmedBookings = bookingsData.filter(b => b.status === 'confirmed');
            totalBookings = confirmedBookings.length;
            
            const thisMonthBookings = confirmedBookings.filter(b => {
              const bookingDate = new Date(b.created_at);
              return bookingDate >= firstDayOfMonth;
            });
            
            thisMonthRevenue = thisMonthBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
            newBookings = thisMonthBookings.length;

            const newPending = bookingsData.filter(b => b.status === 'pending_approval');
            const upcomingBookings = bookingsData.filter(b => {
              if (!b.check_in) return false;
              const checkIn = new Date(b.check_in);
              return ['accepted', 'confirmed'].includes(b.status) && checkIn >= today;
            });
            const previousBookings = bookingsData.filter(b => {
              if (!b.check_out) return false;
              const checkOut = new Date(b.check_out);
              return ['accepted', 'confirmed'].includes(b.status) && checkOut < today;
            });

            setBookingBuckets({
              new: newPending,
              upcoming: upcomingBookings,
              previous: previousBookings,
            });
            setBookingSummary({
              new: newPending.length,
              upcoming: upcomingBookings.length,
              previous: previousBookings.length,
            });

            setBookingDetails((current) =>
              current
                ? {
                    ...current,
                    bookings:
                      current.type === 'new'
                        ? newPending
                        : current.type === 'upcoming'
                        ? upcomingBookings
                        : previousBookings,
                  }
                : null
            );
          } else {
            setBookingSummary({ new: 0, upcoming: 0, previous: 0 });
            setBookingBuckets({ new: [], upcoming: [], previous: [] });
            setBookingDetails(null);
          }
        } else {
          setBookingSummary({ new: 0, upcoming: 0, previous: 0 });
          setBookingBuckets({ new: [], upcoming: [], previous: [] });
          setBookingDetails(null);
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
    }
  }, [user]);

  useEffect(() => {
    if (user && properties.length >= 0) {
      loadStats();
    }
    // Remove selections for properties that no longer exist
    setSelectedProperties((prev) => prev.filter((id) => properties.some((p) => p.id === id)));
  }, [user, properties.length, loadStats]);

  const togglePropertySelection = (propertyId: string) => {
    setSelectedProperties((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
  };

  const openBookingPanel = (type: 'new' | 'upcoming' | 'previous') => {
    const meta = {
      new: {
        title: 'New Booking Requests',
        description: 'Bookings awaiting approval',
      },
      upcoming: {
        title: 'Upcoming Bookings',
        description: 'Accepted bookings with future stays',
      },
      previous: {
        title: 'Previous Bookings',
        description: 'Completed stays',
      },
    }[type];

    setBookingDetails({
      type,
      title: meta.title,
      description: meta.description,
      bookings: bookingBuckets[type] || [],
    });
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString();
  };

  const handleBookingAction = async (bookingId: string, action: 'accept' | 'reject') => {
    try {
      let reason: string | undefined;
      if (action === 'reject') {
        reason = window.prompt('Please provide a reason for rejecting this booking:') || '';
        if (!reason.trim()) {
          toast.error('Rejection reason is required.');
          return;
        }
      }

      setBookingActionLoading(`${action}-${bookingId}`);

      const response = await fetch(`/api/bookings/${action === 'accept' ? 'accept' : 'reject'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          ...(action === 'reject' ? { reason } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} booking`);
      }

      toast.success(
        action === 'accept' ? 'Booking approved and guest notified.' : 'Booking rejected and guest notified.'
      );
      await loadStats();
    } catch (error: any) {
      console.error('Booking action error:', error);
      toast.error(error.message || `Unable to ${action} booking.`);
    } finally {
      setBookingActionLoading(null);
    }
  };

  useEffect(() => {
    setBookingDetails((current) =>
      current
        ? {
            ...current,
            bookings: bookingBuckets[current.type] || [],
          }
        : null
    );
  }, [bookingBuckets]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`host-summary-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `host_id=eq.${user.id}` },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const clearSelectedProperties = () => setSelectedProperties([]);

  const selectAllProperties = () => {
    if (properties.length === 0) return;
    if (selectedProperties.length === properties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(properties.map((p) => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProperties.length === 0) return;
    const idsToDelete = [...selectedProperties];
    if (
      !confirm(
        `Are you sure you want to delete ${idsToDelete.length} propert${idsToDelete.length === 1 ? 'y' : 'ies'}?`
      )
    ) {
      return;
    }

    try {
      const supabase = createClient();
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.log('[Bulk Delete] Auth error:', authError.message);
      }

      if (supabaseUser) {
        const { error } = await supabase
          .from('properties')
          .delete()
          .in('id', idsToDelete)
          .eq('host_id', supabaseUser.id);

        if (error) {
          throw error;
        }
      } else {
        console.log('[Bulk Delete] No Supabase user available, using localStorage fallback');
      }

      const updatedProperties = properties.filter((p) => !idsToDelete.includes(p.id));
      setProperties(updatedProperties);

      if (user) {
        localStorage.setItem(`properties_${user.id}`, JSON.stringify(updatedProperties));
      }

      setSelectedProperties([]);
      loadStats();
      toast.success(
        `Deleted ${idsToDelete.length} propert${idsToDelete.length === 1 ? 'y' : 'ies'} successfully`
      );
    } catch (error: any) {
      console.error('Error deleting properties:', error);
      toast.error(error.message || 'Failed to delete selected properties');
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

      // Check if user is logged in (works for both demo and Supabase users)
      if (!user) {
        toast.error('You must be logged in to import properties');
        setImporting(false);
        return;
      }

      // Try to get Supabase user for database operations
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      // Use Supabase user ID if available, otherwise use demo user ID
      // This ensures properties are correctly associated with the right host
      const userId = supabaseUser?.id || user.id;

      // Create imported property with scraped data
      // Generate a unique ID that includes user ID to avoid conflicts
      const propertyId = `${userId}_${Date.now()}`;
      // Extract location from scraped data
      let location = scrapedData.location || '';
      
      // If location is missing, try to extract from name (e.g., "Rental unit in Beloshi" -> "Beloshi")
      if (!location || location === 'Location not found') {
        if (scrapedData.name) {
          // Try Airbnb pattern: "Rental unit in Beloshi"
          const airbnbMatch = scrapedData.name.match(/in\s+(.+?)(?:\s*·|$)/i);
          if (airbnbMatch) {
            location = airbnbMatch[1].trim();
          } else {
            // Try Esca pattern: "The Netflix House – Fort Lauderdale, FL"
            const escaMatch = scrapedData.name.match(/[–-]\s*(.+?),\s*(FL|Florida)/i);
            if (escaMatch) {
              location = escaMatch[0].replace(/^[–-]\s*/, '').trim();
            }
          }
        }
      }
      
      console.log('[Properties] Location extraction:', {
        originalLocation: scrapedData.location,
        extractedLocation: location,
        propertyName: scrapedData.name,
        hasCoordinates: !!scrapedData.coordinates,
        coordinates: scrapedData.coordinates,
      });

      // Prepare imported property data for review page
      const importedPropertyData = {
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
        wellnessFriendly: scrapedData.wellnessFriendly || false,
        googleMapsUrl: scrapedData.googleMapsUrl,
        coordinates: scrapedData.coordinates,
      };

      // Store imported data in sessionStorage for the review page
      sessionStorage.setItem('importedPropertyData', JSON.stringify(importedPropertyData));
      // Also store the original URL for image URL normalization
      sessionStorage.setItem('importedPropertyUrl', importUrl);
      
      // Enhanced success message with more details
      const details = [];
      if (scrapedData.images?.length) details.push(`${scrapedData.images.length} photos`);
      if (scrapedData.amenities?.length) details.push(`${scrapedData.amenities.length} amenities`);
      if (scrapedData.guests) details.push(`${scrapedData.guests} guests`);
      if (scrapedData.bedrooms) details.push(`${scrapedData.bedrooms} bedrooms`);
      if (scrapedData.bathrooms) details.push(`${scrapedData.bathrooms} bathrooms`);
      
      const method = meta.scrapingMethod === 'puppeteer' ? '🚀 Browser automation' : '⚡ Fast mode';
      const duration = meta.duration ? ` (${(meta.duration / 1000).toFixed(1)}s)` : '';
      
      toast.success(`${method}${duration}\n✅ Imported: ${details.join(', ')}. Please review and publish!`, {
        duration: 5000,
      });
      setShowImportModal(false);
      setImportUrl('');
      
      // Redirect to review page
      router.push('/host/properties/import-review');
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import property. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    const property = properties.find((p) => p.id === id);

    if (!property) {
      toast.error('Property not found');
      return;
    }

    if (
      newStatus === 'active' &&
      (!property.coordinates ||
        typeof property.coordinates.lat !== 'number' ||
        typeof property.coordinates.lng !== 'number')
    ) {
      toast.error('Map coordinates are required to publish this property. Please edit the property and set the location on the map.');
      return;
    }
    
    try {
      const supabase = createClient();
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.log('[Toggle Publish] Auth error:', authError.message);
      }

      if (supabaseUser) {
        const { error } = await supabase
          .from('properties')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('host_id', supabaseUser.id);

        if (error) {
          throw error;
        }
      } else {
        console.log('[Toggle Publish] No Supabase user available, using localStorage fallback');
      }

      const updatedProperties = properties.map(p => 
        p.id === id ? { ...p, status: newStatus as 'active' | 'draft' | 'inactive' } : p
      );
      setProperties(updatedProperties);

      if (user) {
        localStorage.setItem(`properties_${user.id}`, JSON.stringify(updatedProperties));
        console.log('[Toggle Publish] Property status synced to localStorage');
      }

      loadStats();
      toast.success(newStatus === 'active' ? 'Property published!' : 'Property unpublished');
    } catch (error: any) {
      console.error('Error toggling publish status:', error);
      toast.error(error.message || 'Failed to update property status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      const supabase = createClient();
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.log('[Delete] Auth error:', authError.message);
      }

      if (supabaseUser) {
        const { error } = await supabase
          .from('properties')
          .delete()
          .eq('id', id)
          .eq('host_id', supabaseUser.id);

        if (error) {
          throw error;
        }
      } else {
        console.log('[Delete] No Supabase user available, using localStorage fallback');
      }

      const updatedProperties = properties.filter(p => p.id !== id);
      setProperties(updatedProperties);
      
      if (user) {
        localStorage.setItem(`properties_${user.id}`, JSON.stringify(updatedProperties));
      }
      
      loadStats();
      toast.success('Property deleted');
    } catch (error: any) {
      console.error('Error deleting property:', error);
      toast.error(error.message || 'Failed to delete property');
    }
  };

  const selectedCount = selectedProperties.length;
  const isAllSelected = properties.length > 0 && selectedCount === properties.length;

  if (loading || loadingProperties) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-earth-500 mx-auto mb-4"></div>
          <p className="text-white">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Properties</h1>
            <p className="text-mist-400">
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
              href="/host/properties/bulk-import"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
            >
              <Upload size={20} />
              Bulk Import
            </Link>
            <Link
              href="/host/properties/new"
              className="px-4 py-2 bg-earth-600 text-white rounded-lg hover:bg-earth-700 transition flex items-center gap-2"
            >
              <Plus size={20} />
              Add Property
            </Link>
          </div>
        </div>

        {/* Booking Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <button
            onClick={() => openBookingPanel('new')}
            className={`bg-charcoal-900 border rounded-xl p-6 text-left transition ${
              bookingDetails?.type === 'new'
                ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                : 'border-charcoal-800 hover:border-blue-500'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-mist-400 text-sm font-medium">New Requests</h3>
                <p className="text-white text-2xl font-bold">{bookingSummary.new}</p>
              </div>
              <CalendarClock size={24} className="text-blue-400" />
            </div>
            <p className="text-xs text-mist-500">Bookings awaiting approval</p>
          </button>
          <button
            onClick={() => openBookingPanel('upcoming')}
            className={`bg-charcoal-900 border rounded-xl p-6 text-left transition ${
              bookingDetails?.type === 'upcoming'
                ? 'border-earth-500 shadow-lg shadow-emerald-500/30'
                : 'border-charcoal-800 hover:border-earth-500'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-mist-400 text-sm font-medium">Upcoming</h3>
                <p className="text-white text-2xl font-bold">{bookingSummary.upcoming}</p>
              </div>
              <CalendarCheck size={24} className="text-earth-400" />
            </div>
            <p className="text-xs text-mist-500">Accepted bookings with future stays</p>
          </button>
          <button
            onClick={() => openBookingPanel('previous')}
            className={`bg-charcoal-900 border rounded-xl p-6 text-left transition ${
              bookingDetails?.type === 'previous'
                ? 'border-purple-500 shadow-lg shadow-purple-500/30'
                : 'border-charcoal-800 hover:border-purple-500'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-mist-400 text-sm font-medium">Previous</h3>
                <p className="text-white text-2xl font-bold">{bookingSummary.previous}</p>
              </div>
              <History size={24} className="text-purple-400" />
            </div>
            <p className="text-xs text-mist-500">Completed stays</p>
          </button>
        </div>
        {bookingDetails && (
          <div className="mb-8 bg-charcoal-900 border border-charcoal-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white text-xl font-semibold">{bookingDetails.title}</h3>
                <p className="text-mist-400 text-sm">{bookingDetails.description}</p>
              </div>
              <button
                onClick={() => setBookingDetails(null)}
                className="text-mist-400 hover:text-white flex items-center gap-1"
              >
                <X size={16} />
                Close
              </button>
            </div>
            {bookingDetails.bookings.length === 0 ? (
              <p className="text-mist-500 text-sm">No bookings in this category yet.</p>
            ) : (
              <div className="space-y-4">
                {bookingDetails.bookings.map((booking) => {
                  const isPending =
                    typeof booking.status === 'string' && booking.status.includes('pending');
                  const acceptLoading = bookingActionLoading === `accept-${booking.id}`;
                  const rejectLoading = bookingActionLoading === `reject-${booking.id}`;

                  return (
                    <div
                      key={booking.id}
                      className="bg-charcoal-950 border border-charcoal-800 rounded-xl p-4 space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <p className="text-white font-semibold">{booking.property_name || 'Property'}</p>
                          <p className="text-mist-400 text-sm">{booking.guest_name || 'Guest'}</p>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm text-mist-300">
                          <div>
                            <p className="text-mist-500 text-xs">Check-In</p>
                            <p className="font-medium">{formatDate(booking.check_in)}</p>
                          </div>
                          <div>
                            <p className="text-mist-500 text-xs">Check-Out</p>
                            <p className="font-medium">{formatDate(booking.check_out)}</p>
                          </div>
                          <div>
                            <p className="text-mist-500 text-xs">Value</p>
                            <p className="font-medium">
                              ${Number(booking.total_price || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {isPending && (
                        <div className="flex flex-wrap gap-3">
                          <button
                            disabled={acceptLoading}
                            onClick={() => handleBookingAction(booking.id, 'accept')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-earth-600 text-white text-sm font-semibold hover:bg-earth-500 disabled:opacity-60"
                          >
                            {acceptLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Approve
                          </button>
                          <button
                            disabled={rejectLoading}
                            onClick={() => handleBookingAction(booking.id, 'reject')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-60"
                          >
                            {rejectLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-mist-400 text-sm font-medium">Total Properties</h3>
              <Home size={20} className="text-earth-500" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalProperties}</p>
          </div>
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-mist-400 text-sm font-medium">Active Listings</h3>
              <div className="w-2 h-2 bg-earth-500 rounded-full"></div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.activeListings}</p>
          </div>
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-mist-400 text-sm font-medium">This Month</h3>
              {stats.newBookings > 0 && (
                <span className="text-earth-500 text-sm">+{stats.newBookings}</span>
              )}
            </div>
            <p className="text-3xl font-bold text-white">
              ${stats.thisMonthRevenue.toLocaleString()}
            </p>
          </div>
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-mist-400 text-sm font-medium">Total Bookings</h3>
              {stats.newBookings > 0 && (
                <span className="text-blue-500 text-sm">{stats.newBookings}</span>
              )}
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalBookings}</p>
          </div>
        </div>

        {/* Properties Map */}
        {properties.filter(p => p.coordinates).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <Map size={24} />
              Properties Map
            </h2>
            <PropertiesMap properties={properties} height="500px" />
          </div>
        )}

        {/* Properties List */}
        {properties.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 text-sm text-mist-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={selectAllProperties}
                  className="w-4 h-4 text-earth-500 bg-charcoal-800 border-charcoal-700 rounded focus:ring-earth-500"
                />
                Select All
              </label>
              {selectedCount > 0 && (
                <span className="text-mist-400">{selectedCount} selected</span>
              )}
            </div>
            {selectedCount > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={clearSelectedProperties}
                  className="px-3 py-2 text-sm text-mist-400 hover:text-white transition"
                >
                  Clear
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        )}

        {properties.length === 0 ? (
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-12 text-center">
            <Home size={64} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No properties yet</h3>
            <p className="text-mist-400 mb-6">
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
                className="px-6 py-3 bg-earth-600 text-white rounded-lg hover:bg-earth-700 transition flex items-center gap-2"
              >
                <Plus size={20} />
                Add Property
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => {
              const isSelected = selectedProperties.includes(property.id);
              return (
              <div
                key={property.id}
                className={`property-card-glass ${isSelected ? 'ring-2 ring-earth-500 ring-offset-2 ring-offset-charcoal-950' : ''}`}
              >
                {/* Animated Aurora Blob */}
                <div className="property-card-aurora" />
                
                {/* Inner Glow Panel */}
                <div className="property-card-bg" />
                
                {/* Image */}
                <div className="relative h-48 bg-charcoal-800 flex-shrink-0 z-10">
                  <div className="absolute bottom-3 left-3 z-20">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePropertySelection(property.id)}
                      className="w-4 h-4 text-earth-500 bg-white/20 backdrop-blur-sm border-white/30 rounded focus:ring-earth-500"
                      aria-label={`Select ${property.name}`}
                    />
                  </div>
                  {property.images[0] && (
                    <img
                      src={property.images[0]}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3 right-3 z-20">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border border-white/20 ${
                        property.status === 'active'
                          ? 'bg-earth-600/90 text-white'
                          : property.status === 'draft'
                          ? 'bg-yellow-600/90 text-white'
                          : 'bg-charcoal-600/90 text-white'
                      }`}
                    >
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </span>
                  </div>
                  {property.wellnessFriendly && (
                    <div className="absolute top-3 left-3 z-20 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                      <span className="text-white text-xs font-medium">🧘 Wellness-Friendly</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="property-card-content">
                  <h3 className="text-xl font-semibold text-white mb-1 drop-shadow-lg">
                    {property.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-white/80 text-sm">{property.location}</p>
                    {property.googleMapsUrl && (
                      <a 
                        href={property.googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        📍 Map
                      </a>
                    )}
                  </div>
                  
                  {/* Property Details */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <span className="text-white/80">🛏️ {property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''}</span>
                    {property.bathrooms && (
                      <span className="text-white/80">🚿 {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
                    )}
                    {property.beds && (
                      <span className="text-white/80">🛌 {property.beds} bed{property.beds !== 1 ? 's' : ''}</span>
                    )}
                    {property.guests && (
                      <span className="text-white/80">👥 {property.guests} guest{property.guests !== 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {/* Amenities Preview */}
                  {property.amenities && property.amenities.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {property.amenities.slice(0, 3).map((amenity, idx) => (
                          <span key={idx} className="text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full border border-white/30">
                            {amenity}
                          </span>
                        ))}
                        {property.amenities.length > 3 && (
                          <span className="text-xs text-white/70 px-2 py-1">
                            +{property.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Price & Image Count */}
                  <div className="flex items-center justify-between mb-4 pt-3 border-t border-white/20">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">
                        ${property.price}
                        <span className="text-white/70 text-sm font-normal">/night</span>
                      </span>
                    </div>
                    {property.images.length > 0 && (
                      <span className="text-white/70 text-xs">
                        📷 {property.images.length} photo{property.images.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/host/properties/${property.id}/edit`}
                      className="flex-1 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition flex items-center justify-center gap-2 border border-white/30"
                    >
                      <Edit size={16} />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleTogglePublish(property.id, property.status)}
                      disabled={!property.coordinates && property.status !== 'active'}
                      className={`px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 border backdrop-blur-sm ${
                        property.status === 'active'
                          ? 'bg-yellow-600/90 hover:bg-yellow-700/90 text-white border-yellow-500/30'
                          : 'bg-earth-600/90 hover:bg-earth-700/90 text-white border-earth-500/30'
                      } ${!property.coordinates && property.status !== 'active' ? 'opacity-60 cursor-not-allowed' : ''}`}
                      title={
                        property.status === 'active' 
                          ? 'Unpublish' 
                          : !property.coordinates 
                          ? 'Map coordinates required to publish'
                          : 'Publish'
                      }
                    >
                      <Power size={16} />
                      {property.status === 'active' ? 'Unpublish' : 'Publish'}
                      {!property.coordinates && property.status !== 'active' && (
                        <span className="ml-1 text-xs">⚠️</span>
                      )}
                    </button>
                    <Link
                      href={`/listings/${property.id}`}
                      className="px-4 py-2 bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-700 transition flex items-center justify-center"
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
              );
            })}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Import Property from URL</h2>
            <p className="text-mist-400 mb-6">
              Paste your Airbnb or other vacation rental listing URL.
              We'll automatically extract all the important details for you!
            </p>

            {/* URL Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-mist-300 mb-2">
                Property URL
              </label>
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.airbnb.com/rooms/12345678"
                className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
              />
              <p className="text-xs text-mist-500 mt-2">
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
                className="flex-1 px-4 py-3 bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-700 transition"
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



