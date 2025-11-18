'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Upload, X, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface Room {
  id: string;
  name: string;
  images: File[];
  imagePreviewUrls: string[];
}

export default function NewPropertyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    price: 100,
    wellnessFriendly: false,
    amenities: [] as string[],
  });
  const [rooms, setRooms] = useState<Room[]>([
    { id: Date.now().toString(), name: 'Living Room', images: [], imagePreviewUrls: [] },
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

  const addRoom = () => {
    setRooms([
      ...rooms,
      { id: Date.now().toString(), name: '', images: [], imagePreviewUrls: [] },
    ]);
  };

  const removeRoom = (roomId: string) => {
    if (rooms.length === 1) {
      toast.error('At least one room is required');
      return;
    }
    setRooms(rooms.filter((r) => r.id !== roomId));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Property name is required');
      return;
    }

    // Validate rooms
    const allRoomsValid = rooms.every((r) => r.name.trim() !== '');
    if (!allRoomsValid) {
      toast.error('Please provide a name for all rooms');
      return;
    }

    const totalImages = rooms.reduce((sum, r) => sum + r.imagePreviewUrls.length, 0);
    if (totalImages === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setSaving(true);

    try {
      if (!user) {
        toast.error('You must be logged in to create properties');
        return;
      }

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
          const { data: { user: userData, session }, error: authError } = await supabase.auth.getUser();
          
          if (userData && session) {
            supabaseUser = userData;
            console.log('[New Property] Session loaded successfully, user ID:', supabaseUser.id);
            break;
          }
          
          if (authError) {
            console.log('[New Property] Auth error (attempt', retries + 1, '):', authError.message);
          }
          
          // If no user found, wait a bit and retry (session might still be loading)
          if (retries < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          retries++;
        }
        
        if (!supabaseUser) {
          console.warn('[New Property] No Supabase session available after', maxRetries, 'attempts. Will save to localStorage only.');
        }
      }

      // Convert all room images to data URLs for storage
      const allImageUrls: string[] = [];
      const roomsData: any[] = [];

      for (const room of rooms) {
        const roomImages: string[] = [];
        for (const previewUrl of room.imagePreviewUrls) {
          // If it's already a data URL, use it; otherwise convert the file
          if (previewUrl.startsWith('data:')) {
            roomImages.push(previewUrl);
            allImageUrls.push(previewUrl);
          } else {
            // Find the corresponding file
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
            }
          }
        }
        roomsData.push({
          name: room.name,
          images: roomImages,
        });
      }

      // Use Supabase user ID if available, otherwise use demo user ID
      // This ensures properties are correctly associated with the right host
      const userId = supabaseUser?.id || user.id;
      const propertyId = `${userId}_${Date.now()}`;

      if (isSupabaseConfigured && supabaseUser) {
        // Verify session is still valid before inserting
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (!currentSession || sessionError) {
          console.error('[New Property] Session not available when attempting insert:', sessionError);
          console.error('[New Property] Falling back to localStorage');
          toast.error('Session expired. Please sign in again.');
          
          // Save to localStorage as fallback
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
            status: 'draft',
          };
          parsedProperties.push(backupProperty);
          localStorage.setItem(`properties_${userId}`, JSON.stringify(parsedProperties));
          setSaving(false);
          return;
        }
        
        console.log('[New Property] Session verified, saving property with host_id:', supabaseUser.id);
        console.log('[New Property] Session token exists:', !!currentSession.access_token);
        console.log('[New Property] Property data:', {
          id: propertyId,
          name: formData.name,
          location: formData.location,
          price: formData.price,
          host_id: supabaseUser.id,
        });
        
        const { data: insertedProperty, error: insertError } = await supabase
          .from('properties')
          .insert({
            id: propertyId,
            host_id: supabaseUser.id, // Always use Supabase user ID when saving to Supabase
            name: formData.name,
            title: formData.name,
            description: formData.description,
            location: formData.location,
            price: formData.price,
            images: allImageUrls,
            rooms: roomsData,
            amenities: formData.amenities,
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            guests: formData.guests,
            status: 'draft',
            wellness_friendly: formData.wellnessFriendly,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[New Property] Error saving property to Supabase:', insertError);
          console.error('[New Property] Error details:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
          });
          toast.error(`Failed to save property to database: ${insertError.message}. Check console for details.`);
          
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
            status: 'draft',
          };
          parsedProperties.push(backupProperty);
          localStorage.setItem(`properties_${userId}`, JSON.stringify(parsedProperties));
          console.log('[New Property] Property saved to localStorage as backup due to Supabase error');
          
          throw insertError;
        }
        
        console.log('[New Property] Property saved successfully to Supabase:', insertedProperty);
        console.log('[New Property] Property ID:', insertedProperty?.id);
        console.log('[New Property] Host ID:', insertedProperty?.host_id);
        
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
          guests: formData.guests,
          price: formData.price,
          wellnessFriendly: formData.wellnessFriendly,
          amenities: formData.amenities,
          images: allImageUrls,
          rooms: roomsData,
          status: 'draft',
        };
        parsedProperties.push(backupProperty);
        localStorage.setItem(`properties_${userId}`, JSON.stringify(parsedProperties));
        console.log('[New Property] Property also saved to localStorage as backup');

        toast.success('Property added successfully!');
        router.push('/host/properties');
      } else {
        // Fallback to localStorage (for demo accounts)
        const newProperty = {
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
          status: 'draft',
        };

        const savedProperties = localStorage.getItem(`properties_${userId}`);
        const parsedProperties = savedProperties ? JSON.parse(savedProperties) : [];
        parsedProperties.push(newProperty);
        localStorage.setItem(`properties_${userId}`, JSON.stringify(parsedProperties));

        toast.success('Property added successfully!');
        router.push('/host/properties');
      }
    } catch (error: any) {
      console.error('Error creating property:', error);
      toast.error(error.message || 'Failed to add property. Please try again.');
    } finally {
      setSaving(false);
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
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/host/properties"
            className="text-emerald-500 hover:text-emerald-400 mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back to Properties
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Add New Property</h1>
          <p className="text-gray-400">Fill in the details to list your property</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
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
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                  placeholder="Describe your property, amenities, and what makes it special..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                  placeholder="e.g., Aspen, Colorado"
                />
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
                    Price/Night ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  />
                </div>
              </div>

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
                <label htmlFor="wellnessFriendly" className="ml-2 block text-sm text-gray-300">
                  This is a wellness-friendly property
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

          {/* Images by Room */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Photos by Room</h2>
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
                        <Trash2 size={20} />
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

          {/* Submit */}
          <div className="flex gap-4">
            <Link
              href="/host/properties"
              className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



