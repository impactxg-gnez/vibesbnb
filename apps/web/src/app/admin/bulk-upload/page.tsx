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
  const [showCsvUpload, setShowCsvUpload] = useState(false);

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

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        // Validate headers
        const requiredHeaders = ['name', 'bedrooms', 'amenities', 'wellness_friendly', 'image_urls'];
        const hasAllHeaders = requiredHeaders.every(h => 
          headers.some(header => header.toLowerCase() === h)
        );

        if (!hasAllHeaders) {
          toast.error('CSV must have columns: name, bedrooms, amenities, wellness_friendly, image_urls');
          return;
        }

        const newProperties: Property[] = [];

        // Parse each line (skip header)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(',').map(v => v.trim());
          const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');
          const bedroomsIndex = headers.findIndex(h => h.toLowerCase() === 'bedrooms');
          const amenitiesIndex = headers.findIndex(h => h.toLowerCase() === 'amenities');
          const smokeFriendlyIndex = headers.findIndex(h => h.toLowerCase() === 'wellness_friendly');
          const imageUrlsIndex = headers.findIndex(h => h.toLowerCase() === 'image_urls');

          const amenitiesStr = values[amenitiesIndex] || '';
          const amenitiesList = amenitiesStr
            .split('|')
            .map(a => a.trim())
            .filter(a => a);

          const imageUrlsStr = values[imageUrlsIndex] || '';
          const imageUrls = imageUrlsStr
            .split('|')
            .map(url => url.trim())
            .filter(url => url);

          newProperties.push({
            id: Date.now().toString() + i,
            name: values[nameIndex] || '',
            bedrooms: parseInt(values[bedroomsIndex]) || 1,
            amenities: amenitiesList,
            smokeFriendly: values[smokeFriendlyIndex]?.toLowerCase() === 'yes' || 
                          values[smokeFriendlyIndex]?.toLowerCase() === 'true',
            images: [],
            imagePreviewUrls: imageUrls, // Use URLs from CSV
          });
        }

        if (newProperties.length > 0) {
          setProperties(newProperties);
          toast.success(`Loaded ${newProperties.length} properties from CSV`);
          setShowCsvUpload(false);
        } else {
          toast.error('No valid properties found in CSV');
        }
      } catch (error) {
        toast.error('Failed to parse CSV file');
        console.error(error);
      }
    };

    reader.readAsText(file);
  };

  const downloadCsvTemplate = () => {
    const template = `name,bedrooms,amenities,wellness_friendly,image_urls
Mountain View Cabin,3,WiFi|Kitchen|Parking|Hot Tub,yes,https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800|https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800
Beachfront Villa,4,WiFi|Kitchen|Pool|Air Conditioning,yes,https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800|https://images.unsplash.com/photo-1507525428034-b723cf961dde?w=800
Urban Loft,2,WiFi|Kitchen|Gym|Workspace,yes,https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800|https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'property-upload-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    for (const property of properties) {
      if (!property.name.trim()) {
        toast.error('All properties must have a name');
        return;
      }
      if (property.images.length === 0 && property.imagePreviewUrls.length === 0) {
        toast.error(`${property.name || 'A property'} needs at least one image or image URL`);
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

        {/* CSV Upload Section */}
        <div className="mb-8 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                📄 Import from CSV
              </h3>
              <p className="text-sm text-gray-400">
                Upload a CSV file to quickly add multiple properties at once
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCsvUpload(!showCsvUpload)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              {showCsvUpload ? 'Hide' : 'Show'} CSV Upload
            </button>
          </div>

          {showCsvUpload && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-6 cursor-pointer hover:border-emerald-500 transition">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-white">
                      Click to upload CSV
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      or drag and drop your file here
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="px-6 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Template
                </button>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <p className="text-sm font-medium text-white mb-2">CSV Format Instructions:</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• <strong className="text-gray-300">name</strong>: Property name (required)</li>
                  <li>• <strong className="text-gray-300">bedrooms</strong>: Number of bedrooms (required)</li>
                  <li>• <strong className="text-gray-300">amenities</strong>: Pipe-separated list (e.g., WiFi|Kitchen|Pool)</li>
                  <li>• <strong className="text-gray-300">wellness_friendly</strong>: yes/no or true/false</li>
                  <li>• <strong className="text-gray-300">image_urls</strong>: Pipe-separated image URLs (e.g., https://example.com/img1.jpg|https://example.com/img2.jpg)</li>
                  <li className="text-emerald-400 mt-2">✅ Tip: Use direct image URLs from Unsplash, Imgur, or your own hosting</li>
                </ul>
              </div>
            </div>
          )}
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

