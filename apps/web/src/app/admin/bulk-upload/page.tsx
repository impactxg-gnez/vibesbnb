'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Property {
  id: string;
  name: string;
  bedrooms: number;
  amenities: string[];
  smokeFriendly: boolean;
  images: File[];
  imagePreviewUrls: string[];
}

export default function BulkUploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([
    {
      id: '1',
      name: '',
      bedrooms: 1,
      amenities: [],
      smokeFriendly: false,
      images: [],
      imagePreviewUrls: [],
    },
  ]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  const addProperty = () => {
    setProperties([
      ...properties,
      {
        id: Date.now().toString(),
        name: '',
        bedrooms: 1,
        amenities: [],
        smokeFriendly: false,
        images: [],
        imagePreviewUrls: [],
      },
    ]);
  };

  const removeProperty = (id: string) => {
    setProperties(properties.filter((p) => p.id !== id));
  };

  const updateProperty = (id: string, field: keyof Property, value: any) => {
    setProperties(
      properties.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleImageUpload = (id: string, files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    const property = properties.find((p) => p.id === id);
    if (!property) return;

    // Create preview URLs
    const newPreviewUrls = newFiles.map((file) => URL.createObjectURL(file));

    updateProperty(id, 'images', [...property.images, ...newFiles]);
    updateProperty(id, 'imagePreviewUrls', [
      ...property.imagePreviewUrls,
      ...newPreviewUrls,
    ]);
  };

  const removeImage = (propertyId: string, imageIndex: number) => {
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;

    // Revoke the URL to free memory
    URL.revokeObjectURL(property.imagePreviewUrls[imageIndex]);

    const newImages = property.images.filter((_, i) => i !== imageIndex);
    const newPreviewUrls = property.imagePreviewUrls.filter(
      (_, i) => i !== imageIndex
    );

    updateProperty(propertyId, 'images', newImages);
    updateProperty(propertyId, 'imagePreviewUrls', newPreviewUrls);
  };

  const toggleAmenity = (propertyId: string, amenity: string) => {
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;

    const newAmenities = property.amenities.includes(amenity)
      ? property.amenities.filter((a) => a !== amenity)
      : [...property.amenities, amenity];

    updateProperty(propertyId, 'amenities', newAmenities);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    for (const property of properties) {
      if (!property.name.trim()) {
        toast.error('All properties must have a name');
        return;
      }
      if (property.images.length === 0) {
        toast.error(`${property.name || 'A property'} needs at least one image`);
        return;
      }
    }

    setUploading(true);

    try {
      // TODO: Implement actual upload to your backend/Supabase
      // For now, we'll just simulate the upload
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Here you would upload images to storage and save property data
      console.log('Properties to upload:', properties);

      toast.success(`Successfully uploaded ${properties.length} properties!`);
      
      // Reset form
      setProperties([
        {
          id: Date.now().toString(),
          name: '',
          bedrooms: 1,
          amenities: [],
          smokeFriendly: false,
          images: [],
          imagePreviewUrls: [],
        },
      ]);
    } catch (error) {
      toast.error('Failed to upload properties');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || user.user_metadata?.role !== 'admin') {
    return null;
  }

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
    'Washer',
    'Dryer',
    'Pet Friendly',
    'Workspace',
    'Fireplace',
  ];

  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-emerald-500 hover:text-emerald-400 mb-4 inline-flex items-center"
          >
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Bulk Upload Properties</h1>
          <p className="text-gray-400">
            Upload multiple properties at once. Add as many as you need!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {properties.map((property, index) => (
            <div
              key={property.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Property #{index + 1}
                </h3>
                {properties.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProperty(property.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove Property
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {/* Property Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Property Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={property.name}
                    onChange={(e) =>
                      updateProperty(property.id, 'name', e.target.value)
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., Cozy Mountain Cabin"
                  />
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Number of Bedrooms *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={property.bedrooms}
                    onChange={(e) =>
                      updateProperty(
                        property.id,
                        'bedrooms',
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Wellness-Friendly Toggle */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`smoke-${property.id}`}
                    checked={property.smokeFriendly}
                    onChange={(e) =>
                      updateProperty(property.id, 'smokeFriendly', e.target.checked)
                    }
                    className="w-5 h-5 text-emerald-600 bg-gray-800 border-gray-700 rounded focus:ring-emerald-500"
                  />
                  <label
                    htmlFor={`smoke-${property.id}`}
                    className="text-gray-300 font-medium"
                  >
                    🧘 Wellness-Friendly Property
                  </label>
                </div>

                {/* Amenities */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Amenities
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableAmenities.map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(property.id, amenity)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          property.amenities.includes(amenity)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Property Images * (Click to upload multiple)
                  </label>
                  
                  {/* Image Previews */}
                  {property.imagePreviewUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {property.imagePreviewUrls.map((url, imgIndex) => (
                        <div key={imgIndex} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${imgIndex + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(property.id, imgIndex)}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  <label className="flex items-center justify-center w-full h-32 px-4 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer hover:border-emerald-500 transition">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-400">
                        Click to upload images
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG up to 10MB each
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(property.id, e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}

          {/* Add More Button */}
          <button
            type="button"
            onClick={addProperty}
            className="w-full py-4 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition"
          >
            + Add Another Property
          </button>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : `Upload ${properties.length} ${properties.length === 1 ? 'Property' : 'Properties'}`}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-8 bg-gray-800 text-white py-4 rounded-xl font-semibold hover:bg-gray-700 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

