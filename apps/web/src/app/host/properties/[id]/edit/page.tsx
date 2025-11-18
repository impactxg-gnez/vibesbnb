'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Upload, X, Plus, Trash2, MapPin, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import LocationPicker from '@/components/LocationPicker';

interface Room {
  id: string;
  name: string;
  images: File[];
  imagePreviewUrls: string[];
}

interface Property {
  id: string;
  name: string;
  description: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  price: number;
  wellnessFriendly: boolean;
  smokeFriendly?: boolean;
  amenities: string[];
  images: File[];
  imagePreviewUrls: string[];
  rooms?: Room[];
  coordinates?: { lat: number; lng: number };
  googleMapsUrl?: string;
}

export default function EditPropertyPage() {
  const params = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [formData, setFormData] = useState<Property>({
    id: '',
    name: '',
    description: '',
    location: '',
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    price: 100,
    wellnessFriendly: false,
    smokeFriendly: false,
    amenities: [],
    images: [],
    imagePreviewUrls: [],
    rooms: [],
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

  useEffect(() => {
    const loadProperty = async () => {
      if (!user) return;

      setLoadingProperty(true);
      try {
        const supabase = createClient();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const isSupabaseConfigured = supabaseUrl && 
                                      supabaseUrl !== '' &&
                                      supabaseUrl !== 'https://placeholder.supabase.co';
        
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();

        if (isSupabaseConfigured && supabaseUser) {
          // Try to load from Supabase
          const { data: propertyData, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', params.id as string)
            .eq('host_id', supabaseUser.id)
            .single();

          if (error) {
            console.error('Error loading property:', error);
            
            // Check if it's a missing column error
            if (error.message?.includes('column') && error.message?.includes('does not exist')) {
              toast.error(
                `Database migration required! Please run the migration script in Supabase. Error: ${error.message}`,
                { duration: 10000 }
              );
            } else {
              toast.error(`Property not found: ${error.message}`);
            }
            router.push('/host/properties');
            return;
          }

          if (propertyData) {
            const loadedProperty: Property = {
              id: propertyData.id,
              name: propertyData.name || propertyData.title || '',
              description: propertyData.description || '',
              location: propertyData.location || '',
              bedrooms: propertyData.bedrooms || 0,
              bathrooms: propertyData.bathrooms || 0,
              guests: propertyData.guests || 0,
              price: propertyData.price ? Number(propertyData.price) : 0,
              wellnessFriendly: propertyData.wellness_friendly || false,
              smokeFriendly: propertyData.smoke_friendly || false,
              amenities: propertyData.amenities || [],
              images: [],
              imagePreviewUrls: propertyData.images || [],
              rooms: propertyData.rooms || [],
            };

            console.log('Loaded property from Supabase:', loadedProperty);
            setFormData(loadedProperty);
            
            // Load rooms if they exist, otherwise create default room from images
            if (propertyData.rooms && Array.isArray(propertyData.rooms) && propertyData.rooms.length > 0) {
              const loadedRooms: Room[] = propertyData.rooms.map((r: any, idx: number) => ({
                id: `room-${idx}-${Date.now()}`,
                name: r.name || `Room ${idx + 1}`,
                images: [],
                imagePreviewUrls: r.images || [],
              }));
              setRooms(loadedRooms);
            } else if (propertyData.images && propertyData.images.length > 0) {
              // Migrate old format: create a default room with all images
              setRooms([
                {
                  id: Date.now().toString(),
                  name: 'All Photos',
                  images: [],
                  imagePreviewUrls: propertyData.images || [],
                },
              ]);
            }
            return;
          }
        }

        // Fallback to localStorage (for demo accounts or when Supabase is not configured)
        const savedProperties = localStorage.getItem(`properties_${user.id}`);
        if (savedProperties) {
          try {
            const parsedProperties = JSON.parse(savedProperties);
            const property = parsedProperties.find((p: any) => p.id === params.id);
            
            if (property) {
              const loadedProperty: Property = {
                id: property.id,
                name: property.name || '',
                description: property.description || '',
                location: property.location || '',
                bedrooms: property.bedrooms || 0,
                bathrooms: property.bathrooms || 0,
                guests: property.guests || 0,
                price: property.price || 0,
                wellnessFriendly: property.wellnessFriendly || false,
                smokeFriendly: property.smokeFriendly || false,
                amenities: property.amenities || [],
                images: [],
                imagePreviewUrls: property.images || [],
                rooms: property.rooms || [],
                coordinates: property.coordinates,
                googleMapsUrl: property.googleMapsUrl,
              };

              console.log('Loaded property from localStorage:', loadedProperty);
              setFormData(loadedProperty);
              
              // Load rooms if they exist, otherwise create default room from images
              if (property.rooms && Array.isArray(property.rooms) && property.rooms.length > 0) {
                const loadedRooms: Room[] = property.rooms.map((r: any, idx: number) => ({
                  id: `room-${idx}-${Date.now()}`,
                  name: r.name || `Room ${idx + 1}`,
                  images: [],
                  imagePreviewUrls: r.images || [],
                }));
                setRooms(loadedRooms);
              } else if (property.images && property.images.length > 0) {
                // Migrate old format: create a default room with all images
                setRooms([
                  {
                    id: Date.now().toString(),
                    name: 'All Photos',
                    images: [],
                    imagePreviewUrls: property.images || [],
                  },
                ]);
              }
              return;
            }
          } catch (e) {
            console.error('Error parsing localStorage properties:', e);
          }
        }

        // Property not found
        toast.error('Property not found');
        router.push('/host/properties');
      } catch (error) {
        console.error('Error loading property:', error);
        toast.error('Failed to load property');
        router.push('/host/properties');
      } finally {
        setLoadingProperty(false);
      }
    };

    if (user) {
      loadProperty();
    }
  }, [params.id, user, router]);

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

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
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

    // If trying to publish, require coordinates
    if (publish && !formData.coordinates) {
      toast.error('Map coordinates are required to publish a property. Please add location coordinates using the map picker.');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to update properties');
      return;
    }

    setSaving(true);
    
    const newStatus = publish ? 'active' : 'draft';

    try {
      const supabase = createClient();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isSupabaseConfigured = supabaseUrl && 
                                    supabaseUrl !== '' &&
                                    supabaseUrl !== 'https://placeholder.supabase.co';
      
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      // Collect all images from rooms
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
            } else {
              // Already a URL, just use it
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

      if (isSupabaseConfigured && supabaseUser) {
        // Save to Supabase
        const { error } = await supabase
          .from('properties')
          .update({
            name: formData.name,
            title: formData.name,
            description: formData.description,
            location: formData.location,
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            guests: formData.guests,
            price: formData.price,
            wellness_friendly: formData.wellnessFriendly,
            smoke_friendly: formData.smokeFriendly || false,
            amenities: formData.amenities,
            images: allImageUrls,
            rooms: roomsData,
            latitude: formData.coordinates?.lat,
            longitude: formData.coordinates?.lng,
            google_maps_url: formData.googleMapsUrl,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', formData.id)
          .eq('host_id', supabaseUser.id);

        if (error) {
          throw error;
        }
        
        // Also update localStorage as backup
        const savedProperties = localStorage.getItem(`properties_${user.id}`);
        const parsedProperties = savedProperties ? JSON.parse(savedProperties) : [];
        const updatedProperties = parsedProperties.map((p: any) =>
          p.id === formData.id
            ? {
                ...p,
                name: formData.name,
                description: formData.description,
                location: formData.location,
                bedrooms: formData.bedrooms,
                bathrooms: formData.bathrooms,
                guests: formData.guests,
                price: formData.price,
                wellnessFriendly: formData.wellnessFriendly,
                smokeFriendly: formData.smokeFriendly || false,
                amenities: formData.amenities,
                images: allImageUrls,
                rooms: roomsData,
                coordinates: formData.coordinates,
                googleMapsUrl: formData.googleMapsUrl,
                status: newStatus,
              }
            : p
        );
        localStorage.setItem(`properties_${user.id}`, JSON.stringify(updatedProperties));
        console.log('[Edit Property] Property also updated in localStorage as backup');

        toast.success(publish ? 'Property published successfully!' : 'Property updated successfully!');
        router.push('/host/properties');
      } else {
        // Fallback to localStorage (for demo accounts)
        const savedProperties = localStorage.getItem(`properties_${user.id}`);
        const parsedProperties = savedProperties ? JSON.parse(savedProperties) : [];
        
        const updatedProperties = parsedProperties.map((p: any) =>
          p.id === formData.id
            ? {
                ...p,
                name: formData.name,
                description: formData.description,
                location: formData.location,
                bedrooms: formData.bedrooms,
                bathrooms: formData.bathrooms,
                guests: formData.guests,
                price: formData.price,
                wellnessFriendly: formData.wellnessFriendly,
                smokeFriendly: formData.smokeFriendly || false,
                amenities: formData.amenities,
                images: allImageUrls,
                rooms: roomsData,
                coordinates: formData.coordinates,
                googleMapsUrl: formData.googleMapsUrl,
                status: newStatus,
              }
            : p
        );

        localStorage.setItem(`properties_${user.id}`, JSON.stringify(updatedProperties));
        toast.success(publish ? 'Property published successfully!' : 'Property updated successfully!');
        router.push('/host/properties');
      }
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast.error(error.message || 'Failed to update property. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingProperty) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-white">Loading property...</p>
        </div>
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
          <h1 className="text-4xl font-bold text-white mb-2">Edit Property</h1>
          <p className="text-gray-400">Update your property details</p>
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
            </div>
          </div>

          {/* Property Features */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Property Features</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, wellnessFriendly: !formData.wellnessFriendly })}
                className={`px-4 py-3 rounded-lg border transition flex items-center justify-center gap-2 ${
                  formData.wellnessFriendly
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-emerald-600'
                }`}
              >
                <span className="text-lg">🧘</span>
                <span>Wellness-Friendly</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, smokeFriendly: !(formData.smokeFriendly || false) })}
                className={`px-4 py-3 rounded-lg border transition flex items-center justify-center gap-2 ${
                  formData.smokeFriendly
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

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <Link
              href="/host/properties"
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition text-center"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={saving}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="submit"
              onClick={(e) => handleSubmit(e, true)}
              disabled={saving}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? 'Saving...' : (
                <>
                  <Power size={18} />
                  Save and Publish
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

