'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

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
  amenities: string[];
  images: File[];
  imagePreviewUrls: string[];
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
    amenities: [],
    images: [],
    imagePreviewUrls: [],
  });

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
              amenities: propertyData.amenities || [],
              images: [],
              imagePreviewUrls: propertyData.images || [],
            };

            console.log('Loaded property from Supabase:', loadedProperty);
            setFormData(loadedProperty);
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
                amenities: property.amenities || [],
                images: [],
                imagePreviewUrls: property.images || [],
              };

              console.log('Loaded property from localStorage:', loadedProperty);
              setFormData(loadedProperty);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formData.images.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    const newImages = [...formData.images, ...files];
    const newPreviews = [...formData.imagePreviewUrls];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        setFormData(prev => ({ ...prev, imagePreviewUrls: newPreviews }));
      };
      reader.readAsDataURL(file);
    });

    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
      imagePreviewUrls: formData.imagePreviewUrls.filter((_, i) => i !== index),
    });
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

    if (!user) {
      toast.error('You must be logged in to update properties');
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isSupabaseConfigured = supabaseUrl && 
                                    supabaseUrl !== '' &&
                                    supabaseUrl !== 'https://placeholder.supabase.co';
      
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

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
            amenities: formData.amenities,
            images: formData.imagePreviewUrls,
            updated_at: new Date().toISOString(),
          })
          .eq('id', formData.id)
          .eq('host_id', supabaseUser.id);

        if (error) {
          throw error;
        }

        toast.success('Property updated successfully!');
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
                amenities: formData.amenities,
                images: formData.imagePreviewUrls,
              }
            : p
        );

        localStorage.setItem(`properties_${user.id}`, JSON.stringify(updatedProperties));
        toast.success('Property updated successfully!');
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

          {/* Images */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Photos</h2>

            <label className="block border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-500 transition">
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-white mb-2">Click to upload images</p>
              <p className="text-sm text-gray-500">Maximum 10 images (JPG, PNG)</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {formData.imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {formData.imagePreviewUrls.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

