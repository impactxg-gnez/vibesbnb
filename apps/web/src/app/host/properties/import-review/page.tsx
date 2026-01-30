'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Upload, X, Plus, Check, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import LocationPicker from '@/components/LocationPicker';

interface Room {
  id: string;
  name: string;
  images: File[];
  imagePreviewUrls: string[];
  price?: number;
  guests?: number;
}

interface ImportedPropertyData {
  name: string;
  description: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  guests: number;
  price: number;
  images: string[];
  amenities: string[];
  wellnessFriendly: boolean;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: { lat: number; lng: number };
}

export default function ImportReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [formData, setFormData] = useState<ImportedPropertyData>({
    name: '',
    description: '',
    location: '',
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    guests: 2,
    price: 100,
    images: [],
    amenities: [],
    wellnessFriendly: false,
  });
  const [smokeFriendly, setSmokeFriendly] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([
    { id: Date.now().toString(), name: 'All Photos', images: [], imagePreviewUrls: [] },
  ]);

  const availableAmenities = [
    'WiFi',
    'Kitchen',
    'Parking',
    'Pool',
    'Hot Tub',
    'Gym',
    'Air Conditioning',
    'Heating',
    'TV',
    'Washer/Dryer',
    'Pet Friendly',
    'Workspace',
    'Fireplace',
  ];

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Normalize image URLs to ensure they're absolute and valid
  const normalizeImageUrl = (url: string, baseUrl?: string): string | null => {
    if (!url || typeof url !== 'string') return null;

    // If it's already a data URL, return as-is
    if (url.startsWith('data:')) return url;

    // If it's already a valid absolute URL, return as-is
    try {
      const urlObj = new URL(url);
      // Ensure HTTPS if possible
      if (urlObj.protocol === 'http:' && urlObj.hostname !== 'localhost') {
        urlObj.protocol = 'https:';
      }
      return urlObj.href;
    } catch (e) {
      // Not a valid absolute URL, try to make it absolute
      if (baseUrl) {
        try {
          const base = new URL(baseUrl);
          const absoluteUrl = new URL(url, base.href);
          if (absoluteUrl.protocol === 'http:' && absoluteUrl.hostname !== 'localhost') {
            absoluteUrl.protocol = 'https:';
          }
          return absoluteUrl.href;
        } catch (e2) {
          console.warn('[Import Review] Failed to normalize image URL:', url, e2);
          return null;
        }
      }
      // If no base URL and can't parse, return null
      console.warn('[Import Review] Invalid image URL (no base URL):', url);
      return null;
    }
  };

  useEffect(() => {
    // Load imported data from sessionStorage
    const importedData = sessionStorage.getItem('importedPropertyData');
    if (importedData) {
      try {
        const data = JSON.parse(importedData);
        console.log('[Import Review] Loaded imported data:', {
          name: data.name,
          location: data.location,
          coordinates: data.coordinates,
          hasLocation: !!data.location,
          hasCoordinates: !!data.coordinates,
          locationLength: data.location?.length || 0,
          allKeys: Object.keys(data),
        });

        // If location is missing or "Location not found", try to extract from name
        if (!data.location || data.location === 'Location not found' || data.location.trim() === '') {
          console.log('[Import Review] Location missing, attempting to extract from name:', data.name);
          if (data.name) {
            // Try Esca pattern: "The Netflix House – Fort Lauderdale, FL"
            const escaMatch = data.name.match(/[–-]\s*(.+?),\s*(FL|Florida)/i);
            if (escaMatch) {
              const extractedLocation = escaMatch[0].replace(/^[–-]\s*/, '').trim();
              console.log('[Import Review] Extracted location from name:', extractedLocation);
              data.location = extractedLocation;
            } else {
              // Try Airbnb pattern: "Rental unit in Beloshi"
              const airbnbMatch = data.name.match(/in\s+(.+?)(?:\s*·|$)/i);
              if (airbnbMatch) {
                const extractedLocation = airbnbMatch[1].trim();
                console.log('[Import Review] Extracted location from name (Airbnb pattern):', extractedLocation);
                data.location = extractedLocation;
              }
            }
          }
        }

        console.log('[Import Review] Final location after processing:', data.location);
        setFormData(data);

        // Normalize and filter imported images
        const importedImages = (data.images || []).map((url: string) => {
          // Try to get the original URL from sessionStorage if available
          const originalUrl = sessionStorage.getItem('importedPropertyUrl') || '';
          return normalizeImageUrl(url, originalUrl);
        }).filter((url: string | null): url is string => url !== null);

        console.log('[Import Review] Loaded images:', importedImages.length, 'valid images');

        setRooms([
          {
            id: Date.now().toString(),
            name: 'All Photos',
            images: [],
            imagePreviewUrls: importedImages, // Show all imported images
            price: data.price || 100,
            guests: Math.max(1, Math.floor((data.guests || 2) / 2)), // Default to half of total or 1
          },
        ]);
      } catch (error) {
        console.error('Error loading imported data:', error);
        toast.error('Failed to load imported property data');
        router.push('/host/properties');
      }
    } else {
      toast.error('No imported property data found');
      router.push('/host/properties');
    }
  }, [router]);

  const addRoom = () => {
    setRooms([
      ...rooms,
      {
        id: Date.now().toString(),
        name: '',
        images: [],
        imagePreviewUrls: [],
        price: formData.price,
        guests: 1
      },
    ]);
  };

  const removeRoom = (roomId: string) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter((r) => r.id !== roomId));
    }
  };

  const updateRoomData = (roomId: string, data: Partial<Room>) => {
    setRooms(rooms.map((r) => (r.id === roomId ? { ...r, ...data } : r)));
  };

  const handleImageUpload = (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const newImages = [...room.images, ...files];
    const newPreviews = [...room.imagePreviewUrls];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        setRooms(
          rooms.map((r) =>
            r.id === roomId ? { ...r, images: newImages, imagePreviewUrls: newPreviews } : r
          )
        );
      };
      reader.readAsDataURL(file);
    });

    setRooms(rooms.map((r) => (r.id === roomId ? { ...r, images: newImages } : r)));
  };

  const removeImage = (roomId: string, index: number) => {
    setRooms(
      rooms.map((r) => {
        if (r.id === roomId) {
          return {
            ...r,
            images: r.images.filter((_, i) => i !== index),
            imagePreviewUrls: r.imagePreviewUrls.filter((_, i) => i !== index),
          };
        }
        return r;
      })
    );
  };

  const toggleAmenity = (amenity: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.includes(amenity)
        ? formData.amenities.filter((a) => a !== amenity)
        : [...formData.amenities, amenity],
    });
  };

  const saveProperty = async (status: 'draft' | 'active') => {
    if (!formData.name.trim()) {
      toast.error('Property name is required');
      return;
    }

    const allRoomsValid = rooms.every((r) => r.name.trim() !== '');
    if (!allRoomsValid) {
      toast.error('Please provide a name for all rooms');
      return;
    }

    const totalImages = rooms.reduce((sum, r) => sum + r.imagePreviewUrls.length, 0);
    if (totalImages < 2) {
      toast.error('Please add at least 2 photos');
      return;
    }

    // If publishing, require coordinates
    if (status === 'active' && !formData.coordinates) {
      toast.error('Map coordinates are required to publish a property. Please add location coordinates using the map picker.');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to save properties');
      return;
    }

    const isPublishing = status === 'active';
    if (isPublishing) {
      setPublishing(true);
    } else {
      setSaving(true);
    }

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

      // Wait for session to be available (important after sign-in)
      let supabaseUser = null;
      let retries = 0;
      const maxRetries = 5;

      if (isSupabaseConfigured) {
        while (retries < maxRetries && !supabaseUser) {
          const { data: { user: userData }, error: authError } = await supabase.auth.getUser();

          if (userData) {
            supabaseUser = userData;
            console.log('[Import Review] Session loaded successfully, user ID:', supabaseUser.id);
            break;
          }

          if (authError) {
            console.log('[Import Review] Auth error (attempt', retries + 1, '):', authError.message);
          }

          // If no user found, wait a bit and retry (session might still be loading)
          if (retries < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          retries++;
        }

        if (!supabaseUser) {
          console.warn('[Import Review] No Supabase session available after', maxRetries, 'attempts. Will save to localStorage only.');
        }
      }

      // Use Supabase user ID if available, otherwise use demo user ID
      const userId = supabaseUser?.id || user.id;

      // Collect all images from rooms
      const allImageUrls: string[] = [];
      const roomsData: any[] = [];

      for (const room of rooms) {
        const roomImages: string[] = [];
        for (const previewUrl of room.imagePreviewUrls) {
          if (previewUrl.startsWith('data:')) {
            roomImages.push(previewUrl);
            allImageUrls.push(previewUrl);
          } else {
            const fileIndex = room.imagePreviewUrls.indexOf(previewUrl);
            if (fileIndex < room.images.length) {
              const reader = new FileReader();
              const dataUrl = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(room.images[fileIndex]);
              });
              roomImages.push(dataUrl);
              allImageUrls.push(dataUrl);
            } else {
              roomImages.push(previewUrl);
              allImageUrls.push(previewUrl);
            }
          }
        }
        roomsData.push({
          id: room.id,
          name: room.name,
          images: roomImages,
          price: room.price || formData.price,
          guests: room.guests || 1,
        });
      }

      const propertyId = `${userId}_${Date.now()}`;

      if (isSupabaseConfigured && supabaseUser) {
        // Verify session is still valid before inserting
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (!currentSession || sessionError) {
          console.error('[Import Review] Session not available when attempting insert:', sessionError);
          toast.error('Session expired. Please sign in again.');
          setSaving(false);
          setPublishing(false);
          return;
        }

        console.log('[Import Review] Session verified, saving property with host_id:', supabaseUser.id);
        console.log('[Import Review] Property data:', {
          id: propertyId,
          name: formData.name,
          location: formData.location,
          price: formData.price,
          status: status,
          roomsCount: roomsData.length,
          imagesCount: allImageUrls.length,
        });
        console.log('[Import Review] Full insert data:', {
          id: propertyId,
          host_id: supabaseUser.id,
          name: formData.name,
          location: formData.location,
          rooms: roomsData,
          hasRooms: !!roomsData && roomsData.length > 0,
        });

        const { data: insertedProperty, error: insertError } = await supabase
          .from('properties')
          .insert({
            id: propertyId,
            host_id: supabaseUser.id,
            name: formData.name,
            title: formData.name,
            description: formData.description,
            location: formData.location,
            price: formData.price,
            images: allImageUrls,
            rooms: roomsData,
            amenities: formData.amenities,
            guests: formData.guests,
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            beds: formData.beds,
            status: status,
            wellness_friendly: formData.wellnessFriendly,
            smoke_friendly: smokeFriendly,
            google_maps_url: formData.googleMapsUrl,
            latitude: formData.coordinates?.lat,
            longitude: formData.coordinates?.lng,
            source_url: typeof window !== 'undefined' ? sessionStorage.getItem('importedPropertyUrl') || null : null,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[Import Review] ❌ ERROR SAVING PROPERTY TO SUPABASE:', insertError);
          console.error('[Import Review] Error code:', insertError.code);
          console.error('[Import Review] Error message:', insertError.message);
          console.error('[Import Review] Error details:', insertError.details);
          console.error('[Import Review] Error hint:', insertError.hint);

          // Check if it's a missing column error
          if (insertError.message?.includes('rooms') || insertError.message?.includes('column') || insertError.code === 'PGRST204') {
            const errorMsg = `Database migration required! The 'rooms' column is missing. Please run SUPABASE_FIX_PROPERTIES_TABLE.sql in Supabase SQL Editor. Error: ${insertError.message}`;
            console.error('[Import Review] ⚠️ MISSING COLUMN ERROR - Run SQL migration!');
            toast.error(errorMsg, { duration: 10000 });
          } else {
            toast.error(`Failed to save property: ${insertError.message}. Check console for details.`, { duration: 8000 });
          }

          // Still save to localStorage as backup even if Supabase fails
          const savedProperties = localStorage.getItem(`properties_${userId}`);
          const parsedProperties = savedProperties ? JSON.parse(savedProperties) : [];
          const backupProperty = {
            id: propertyId,
            name: formData.name,
            description: formData.description,
            location: formData.location,
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            guests: formData.guests,
            price: formData.price,
            wellnessFriendly: formData.wellnessFriendly,
            amenities: formData.amenities,
            images: allImageUrls,
            rooms: roomsData,
            status: status,
            googleMapsUrl: formData.googleMapsUrl,
            coordinates: formData.coordinates,
          };
          parsedProperties.push(backupProperty);
          localStorage.setItem(`properties_${userId}`, JSON.stringify(parsedProperties));
          console.log('[Import Review] Property saved to localStorage as backup due to Supabase error');

          setSaving(false);
          setPublishing(false);
          return; // Don't throw, just return so user can see the error
        }

        console.log('[Import Review] Property saved successfully to Supabase:', insertedProperty);
        console.log('[Import Review] Property ID:', insertedProperty?.id);
        console.log('[Import Review] Host ID:', insertedProperty?.host_id);

        // Also save to localStorage as backup
        const savedProperties = localStorage.getItem(`properties_${userId}`);
        const parsedProperties = savedProperties ? JSON.parse(savedProperties) : [];
        const backupProperty = {
          id: propertyId,
          name: formData.name,
          description: formData.description,
          location: formData.location,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          beds: formData.beds,
          guests: formData.guests,
          price: formData.price,
          wellnessFriendly: formData.wellnessFriendly,
          smokeFriendly: smokeFriendly,
          amenities: formData.amenities,
          images: allImageUrls,
          rooms: roomsData,
          status: status,
          coordinates: formData.coordinates,
          googleMapsUrl: formData.googleMapsUrl,
        };
        parsedProperties.push(backupProperty);
        localStorage.setItem(`properties_${userId}`, JSON.stringify(parsedProperties));
        console.log('[Import Review] Property also saved to localStorage as backup');

        toast.success(isPublishing ? 'Property published successfully!' : 'Property saved as draft!');
        // Clear sessionStorage
        sessionStorage.removeItem('importedPropertyData');
        router.push('/host/properties');
      } else {
        // Fallback to localStorage (demo mode only)
        const newProperty = {
          id: propertyId,
          name: formData.name,
          description: formData.description,
          location: formData.location,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          beds: formData.beds,
          guests: formData.guests,
          price: formData.price,
          wellnessFriendly: formData.wellnessFriendly,
          smokeFriendly: smokeFriendly,
          amenities: formData.amenities,
          images: allImageUrls,
          rooms: roomsData,
          status: status,
          coordinates: formData.coordinates,
          googleMapsUrl: formData.googleMapsUrl,
        };

        const savedProperties = localStorage.getItem(`properties_${userId}`);
        const parsedProperties = savedProperties ? JSON.parse(savedProperties) : [];
        parsedProperties.push(newProperty);
        localStorage.setItem(`properties_${userId}`, JSON.stringify(parsedProperties));

        toast.success(isPublishing ? 'Property published successfully!' : 'Property saved as draft!');
        sessionStorage.removeItem('importedPropertyData');
        router.push('/host/properties');
      }
    } catch (error: any) {
      console.error('Error saving property:', error);
      toast.error(error.message || 'Failed to save property. Please try again.');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/host/properties')}
            className="text-emerald-500 hover:text-emerald-400 mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back to Properties
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Review Imported Property</h1>
          <p className="text-gray-400">Review and edit the imported property details before publishing</p>
        </div>

        <div className="space-y-8">
          {/* Basic Info */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Property Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                  placeholder="e.g., Mountain View Cabin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                  placeholder="Describe your property, amenities, and what makes it special..."
                />
                {!formData.description && (
                  <p className="text-yellow-500 text-sm mt-1">
                    ⚠️ Description was not found on the source page. Please add one.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location * {!formData.coordinates && (
                    <span className="text-yellow-500 text-xs ml-2">
                      ⚠️ Map coordinates required for publishing
                    </span>
                  )}
                </label>
                <LocationPicker
                  location={formData.location}
                  coordinates={formData.coordinates}
                  onLocationChange={(location, coordinates) => {
                    setFormData({
                      ...formData,
                      location,
                      coordinates,
                      googleMapsUrl: coordinates
                        ? `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`
                        : undefined,
                    });
                  }}
                  className="mb-2"
                />
                {formData.coordinates && (
                  <p className="text-xs text-emerald-400 mt-1">
                    ✓ Coordinates set: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) =>
                      setFormData({ ...formData, bedrooms: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bathrooms}
                    onChange={(e) =>
                      setFormData({ ...formData, bathrooms: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.guests}
                    onChange={(e) =>
                      setFormData({ ...formData, guests: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Price/Night ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Property Features */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Property Features</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, wellnessFriendly: !formData.wellnessFriendly })}
                className={`px-4 py-3 rounded-lg border transition flex items-center justify-center gap-2 ${formData.wellnessFriendly
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-emerald-600'
                  }`}
              >
                <span className="text-lg">🧘</span>
                <span>Wellness-Friendly</span>
              </button>

              <button
                type="button"
                onClick={() => setSmokeFriendly(!smokeFriendly)}
                className={`px-4 py-3 rounded-lg border transition flex items-center justify-center gap-2 ${smokeFriendly
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-emerald-600'
                  }`}
              >
                <span className="text-lg">🚬</span>
                <span>Smoke-Friendly</span>
              </button>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableAmenities.map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-4 py-3 rounded-lg border transition ${formData.amenities.includes(amenity)
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-emerald-600'
                    }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Photos</h2>
                <p className="text-sm text-gray-400 mt-1">
                  At least 2 photos required. {rooms.reduce((sum, r) => sum + r.imagePreviewUrls.length, 0)} photos added.
                </p>
              </div>
              <button
                type="button"
                onClick={addRoom}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                <Plus size={20} />
                Add Room
              </button>
            </div>

            <div className="space-y-6">
              {rooms.map((room, roomIndex) => (
                <div key={room.id} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => updateRoomData(room.id, { name: e.target.value })}
                        placeholder="Room name (e.g., Suite 101, Villa A)"
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                        required
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400 whitespace-nowrap">Price ($)</label>
                        <input
                          type="number"
                          value={room.price}
                          onChange={(e) => updateRoomData(room.id, { price: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400 whitespace-nowrap">Guests</label>
                        <input
                          type="number"
                          value={room.guests}
                          onChange={(e) => updateRoomData(room.id, { guests: parseInt(e.target.value) || 1 })}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                        />
                      </div>
                    </div>
                    {rooms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRoom(room.id)}
                        className="ml-3 p-2 text-red-500 hover:text-red-400 transition"
                        title="Remove room"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>

                  <label className="block border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500 transition">
                    <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-white text-sm mb-1">Click to upload images for {room.name || 'this room'}</p>
                    <p className="text-xs text-gray-500">Unlimited images (JPG, PNG)</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(room.id, e)}
                      className="hidden"
                    />
                  </label>

                  {room.imagePreviewUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {room.imagePreviewUrls.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`${room.name} - Image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                            onError={(e) => {
                              // Replace broken image with placeholder
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://via.placeholder.com/400x300/1a1a1a/ffffff?text=Image+Failed+to+Load';
                              target.onerror = null; // Prevent infinite loop
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(room.id, index)}
                            className="absolute top-2 right-2 p-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <X size={16} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => saveProperty('draft')}
              disabled={saving || publishing}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={() => saveProperty('active')}
              disabled={saving || publishing}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {publishing ? (
                'Publishing...'
              ) : (
                <>
                  <Check size={20} />
                  Publish Property
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

