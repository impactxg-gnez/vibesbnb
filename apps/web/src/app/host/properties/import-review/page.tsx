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
      { id: Date.now().toString(), name: '', images: [], imagePreviewUrls: [] },
    ]);
  };

  const removeRoom = (roomId: string) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter((r) => r.id !== roomId));
    }
  };

  const updateRoomName = (roomId: string, name: string) => {
    setRooms(rooms.map((r) => (r.id === roomId ? { ...r, name } : r)));
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
      const isSupabaseConfigured = supabaseUrl && 
                                    supabaseUrl !== '' &&
                                    supabaseUrl !== 'https://placeholder.supabase.co';
      
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

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
          name: room.name,
          images: roomImages,
        });
      }

      const propertyId = `${userId}_${Date.now()}`;

      if (isSupabaseConfigured && supabaseUser) {
        console.log('[Import Review] Saving property with host_id:', supabaseUser.id);
        console.log('[Import Review] Property data:', {
          id: propertyId,
          name: formData.name,
          location: formData.location,
          price: formData.price,
          status: status,
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
          })
          .select()
          .single();

        if (insertError) {
          console.error('[Import Review] Error saving property:', insertError);
          toast.error(`Failed to save property: ${insertError.message}`);
          throw insertError;
        }
        
        console.log('[Import Review] Property saved successfully to Supabase:', insertedProperty);
        
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
            <div className="flex flex-col gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="wellnessFriendly"
                  checked={formData.wellnessFriendly}
                  onChange={(e) =>
                    setFormData({ ...formData, wellnessFriendly: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-700 rounded bg-gray-800"
                />
                <label htmlFor="wellnessFriendly" className="ml-3 block text-sm text-gray-300">
                  This is a wellness-friendly property
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="smokeFriendly"
                  checked={smokeFriendly}
                  onChange={(e) => setSmokeFriendly(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-700 rounded bg-gray-800"
                />
                <label htmlFor="smokeFriendly" className="ml-3 block text-sm text-gray-300">
                  This property is smoke-friendly
                </label>
              </div>
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
                  className={`px-4 py-3 rounded-lg border transition ${
                    formData.amenities.includes(amenity)
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
                    <input
                      type="text"
                      value={room.name}
                      onChange={(e) => updateRoomName(room.id, e.target.value)}
                      placeholder="Room name (e.g., Living Room, Bedroom 1, Kitchen)"
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                      required
                    />
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

