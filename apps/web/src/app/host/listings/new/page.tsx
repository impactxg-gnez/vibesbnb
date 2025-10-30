'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { WellnessTag, ListingStatus } from '@vibesbnb/shared';

interface ListingFormData {
  title: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  wellnessTags: string[];
  amenities: string[];
  houseRules: string[];
  basePrice: number;
  cleaningFee: number;
  currency: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  minNights: number;
  maxNights: number;
  instantBook: boolean;
}

const WELLNESS_TAGS = [
  { value: WellnessTag.CANNABIS_FRIENDLY, label: '420 Friendly' },
  { value: WellnessTag.SMOKE_FREE, label: 'Smoke Free' },
  { value: WellnessTag.YOGA_SPACE, label: 'Yoga Space' },
  { value: WellnessTag.MEDITATION_ROOM, label: 'Meditation Room' },
  { value: WellnessTag.ORGANIC_PRODUCTS, label: 'Organic Products' },
  { value: WellnessTag.VEGAN_FRIENDLY, label: 'Vegan Friendly' },
  { value: WellnessTag.SPA_FACILITIES, label: 'Spa Facilities' },
  { value: WellnessTag.NATURE_RETREAT, label: 'Nature Retreat' },
];

const AMENITIES = [
  'wifi',
  'kitchen',
  'hot_tub',
  'pool',
  'fireplace',
  'smoking_allowed',
  'workspace',
  'gym',
  'parking',
  'air_conditioning',
  'heating',
  'washer',
  'dryer',
  'tv',
  'beach_access',
  'outdoor_seating',
];

const HOUSE_RULES = [
  'no_smoking',
  'no_pets',
  'no_parties',
  'no_events',
  'quiet_hours',
];

export default function NewListingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'USA',
      zipCode: '',
    },
    wellnessTags: [],
    amenities: [],
    houseRules: [],
    basePrice: 0,
    cleaningFee: 0,
    currency: 'USD',
    maxGuests: 1,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    minNights: 1,
    maxNights: 30,
    instantBook: false,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    } else if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: checkbox.checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const toggleArrayItem = (field: 'wellnessTags' | 'amenities' | 'houseRules', item: string) => {
    setFormData((prev) => {
      const currentArray = prev[field];
      const newArray = currentArray.includes(item)
        ? currentArray.filter((i) => i !== item)
        : [...currentArray, item];
      return {
        ...prev,
        [field]: newArray,
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const handleCreateListing = async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert prices from dollars to cents
      const listingData = {
        ...formData,
        basePrice: Math.round(formData.basePrice * 100),
        cleaningFee: Math.round(formData.cleaningFee * 100),
        address: {
          ...formData.address,
          lat: 0, // TODO: Add geocoding
          lng: 0,
        },
        status: ListingStatus.DRAFT,
      };

      const response = await api.post('/listings', listingData);
      setListingId(response.id);
      setStep(6); // Move to photo upload step
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
      console.error('Error creating listing:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhotos = async () => {
    setLoading(true);
    setError(null);

    try {
      // Upload photos if any
      if (listingId && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const formData = new FormData();
          formData.append('file', file);

          await api.post(`/listings/${listingId}/media`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        }
      }

      // Submit for review
      if (listingId) {
        await api.post(`/listings/${listingId}/publish`);
        alert('Listing submitted for admin review! You will be notified once it is approved.');
      }

      router.push('/host/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to complete listing submission');
      console.error('Error submitting listing:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 5) {
      handleCreateListing();
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => setStep((prev) => Math.max(1, prev - 1));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">Create New Listing</h1>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 mx-1 rounded ${
                    s <= step ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600 text-center">
              Step {step} of 6
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Cozy Mountain Retreat"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your space..."
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Location</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Street Address</label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ZIP Code</label>
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Property Details */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Property Details</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Guests</label>
                  <input
                    type="number"
                    name="maxGuests"
                    value={formData.maxGuests}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bedrooms</label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Beds</label>
                  <input
                    type="number"
                    name="beds"
                    value={formData.beds}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bathrooms</label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleInputChange}
                    min="0.5"
                    step="0.5"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min Nights</label>
                  <input
                    type="number"
                    name="minNights"
                    value={formData.minNights}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Nights</label>
                  <input
                    type="number"
                    name="maxNights"
                    value={formData.maxNights}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="instantBook"
                  checked={formData.instantBook}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label className="text-sm font-medium">Enable Instant Book</label>
              </div>
            </div>
          )}

          {/* Step 4: Pricing */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Pricing</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Base Price per Night ($)</label>
                <input
                  type="number"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cleaning Fee ($)</label>
                <input
                  type="number"
                  name="cleaningFee"
                  value={formData.cleaningFee}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 5: Amenities & Wellness Tags */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Amenities & Wellness</h2>
              
              <div>
                <label className="block text-sm font-medium mb-3">Wellness Tags</label>
                <div className="grid grid-cols-2 gap-3">
                  {WELLNESS_TAGS.map((tag) => (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => toggleArrayItem('wellnessTags', tag.value)}
                      className={`px-4 py-2 rounded-lg border ${
                        formData.wellnessTags.includes(tag.value)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Amenities</label>
                <div className="grid grid-cols-2 gap-3">
                  {AMENITIES.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleArrayItem('amenities', amenity)}
                      className={`px-4 py-2 rounded-lg border capitalize ${
                        formData.amenities.includes(amenity)
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {amenity.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">House Rules</label>
                <div className="grid grid-cols-2 gap-3">
                  {HOUSE_RULES.map((rule) => (
                    <button
                      key={rule}
                      type="button"
                      onClick={() => toggleArrayItem('houseRules', rule)}
                      className={`px-4 py-2 rounded-lg border capitalize ${
                        formData.houseRules.includes(rule)
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {rule.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Photos */}
          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Upload Photos</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  Click to upload photos
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  or drag and drop (up to 20 photos)
                </p>
              </div>

              {uploadedFiles.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Selected Photos:</p>
                  <ul className="list-disc list-inside">
                    {uploadedFiles.map((file, idx) => (
                      <li key={idx} className="text-sm text-gray-700">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-sm text-gray-600">
                {uploadedFiles.length === 0
                  ? 'You can skip this step and add photos later.'
                  : `${uploadedFiles.length} photo(s) selected`}
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={step === 1 || loading}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            {step < 6 ? (
              <button
                onClick={nextStep}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Continue'}
              </button>
            ) : (
              <button
                onClick={handleUploadPhotos}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Uploading...' : uploadedFiles.length > 0 ? 'Upload & Finish' : 'Skip & Finish'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

