'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

type UserCategory = 'host' | 'traveller' | 'service_host' | 'dispensary';

interface LocationData {
  address?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  manualEntry?: boolean;
}

interface ServiceHostData {
  services?: string[];
  serviceAreas?: string[];
  pincodes?: string[];
}

interface AirbnbData {
  listingUrl?: string;
  propertyName?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  guests?: number;
}

interface SignUpData {
  name: string;
  email: string;
  phone: string;
  category: UserCategory;
  location?: LocationData;
  serviceHostData?: ServiceHostData;
  airbnbData?: AirbnbData;
}

const categoryInfo = {
  host: {
    title: 'Host',
    icon: '🏠',
    color: 'from-green-500 to-green-600',
    description: 'Sign up to list your wellness-friendly property and start earning',
  },
  traveller: {
    title: 'Traveller',
    icon: '✈️',
    color: 'from-blue-500 to-blue-600',
    description: 'Sign up to discover amazing wellness-friendly stays worldwide',
  },
  service_host: {
    title: 'Service Host',
    icon: '🧘',
    color: 'from-purple-500 to-purple-600',
    description: 'Sign up to offer your wellness services to travelers',
  },
  dispensary: {
    title: 'Dispensary',
    icon: '🌿',
    color: 'from-yellow-500 to-yellow-600',
    description: 'Sign up to partner with VibesBNB and reach more customers',
  },
};

export default function EarlyAccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = (searchParams.get('category') as UserCategory) || 'traveller';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  
  // Location data for hosts and dispensaries
  const [locationData, setLocationData] = useState<LocationData>({});
  const [useManualLocation, setUseManualLocation] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  
  // Service host data
  const [serviceHostData, setServiceHostData] = useState<ServiceHostData>({
    services: [],
    serviceAreas: [],
    pincodes: [],
  });
  const [currentService, setCurrentService] = useState('');
  const [currentArea, setCurrentArea] = useState('');
  const [currentPincode, setCurrentPincode] = useState('');
  
  // Airbnb data for hosts
  const [airbnbData, setAirbnbData] = useState<AirbnbData>({});
  const [hasAirbnb, setHasAirbnb] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    setMounted(true);
    
    if ((category === 'host' || category === 'dispensary') && !useManualLocation) {
      if (typeof window !== 'undefined' && window.google?.maps?.places && autocompleteInputRef.current) {
        try {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            autocompleteInputRef.current,
            { types: ['establishment', 'geocode'] }
          );
          
          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current.getPlace();
            
            if (place.geometry) {
              setLocationData({
                address: place.formatted_address || place.name,
                placeId: place.place_id,
                latitude: place.geometry.location.lat(),
                longitude: place.geometry.location.lng(),
                manualEntry: false,
              });
            }
          });
        } catch (error) {
          console.error('Error initializing Google Places:', error);
        }
      }
    }
  }, [category, useManualLocation]);

  const needsLocation = category === 'host' || category === 'dispensary';
  const needsServices = category === 'service_host';
  const isHost = category === 'host';

  const addService = () => {
    if (currentService.trim()) {
      setServiceHostData(prev => ({
        ...prev,
        services: [...(prev.services || []), currentService.trim()],
      }));
      setCurrentService('');
    }
  };

  const removeService = (index: number) => {
    setServiceHostData(prev => ({
      ...prev,
      services: prev.services?.filter((_, i) => i !== index),
    }));
  };

  const addArea = () => {
    if (currentArea.trim()) {
      setServiceHostData(prev => ({
        ...prev,
        serviceAreas: [...(prev.serviceAreas || []), currentArea.trim()],
      }));
      setCurrentArea('');
    }
  };

  const removeArea = (index: number) => {
    setServiceHostData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas?.filter((_, i) => i !== index),
    }));
  };

  const addPincode = () => {
    if (currentPincode.trim()) {
      setServiceHostData(prev => ({
        ...prev,
        pincodes: [...(prev.pincodes || []), currentPincode.trim()],
      }));
      setCurrentPincode('');
    }
  };

  const removePincode = (index: number) => {
    setServiceHostData(prev => ({
      ...prev,
      pincodes: prev.pincodes?.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate basic form
      if (!formData.name || !formData.email || !formData.phone) {
        toast.error('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      // Validate location for hosts and dispensaries
      if (needsLocation) {
        if (useManualLocation) {
          if (!locationData.latitude || !locationData.longitude) {
            toast.error('Please enter latitude and longitude');
            setIsLoading(false);
            return;
          }
        } else {
          if (!locationData.address) {
            toast.error('Please select your location from the dropdown');
            setIsLoading(false);
            return;
          }
        }
      }

      // Validate service host data
      if (needsServices) {
        if (!serviceHostData.services?.length) {
          toast.error('Please add at least one service');
          setIsLoading(false);
          return;
        }
        if (!serviceHostData.serviceAreas?.length) {
          toast.error('Please add at least one service area');
          setIsLoading(false);
          return;
        }
        if (!serviceHostData.pincodes?.length) {
          toast.error('Please add at least one pincode/zipcode');
          setIsLoading(false);
          return;
        }
      }

      // Create signup data (API will generate timestamp)
      const signUpData = {
        ...formData,
        category,
        ...(needsLocation && { location: locationData }),
        ...(needsServices && { serviceHostData }),
        ...(isHost && hasAirbnb && airbnbData.listingUrl && { airbnbData }),
      };

      // Save to Firebase via API (NO localStorage fallback)
      const response = await api.post('/early-access/signup', signUpData);
      console.log('✅ Saved to Firebase:', response);
      toast.success('Successfully signed up for early access!');
      
      // Redirect to thank you page
      router.push(`/thank-you?category=${category}`);
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        toast.error('This email is already registered for early access in this category');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to sign up. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const info = categoryInfo[category];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full">
          {/* Back Button */}
          <Link
            href="/coming-soon"
            className="inline-flex items-center text-mist-400 hover:text-white transition-colors mb-8 group"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          {/* Card */}
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 shadow-2xl">
            {/* Icon */}
            <div className="text-center mb-6">
              <div className="text-7xl mb-4">{info.icon}</div>
              <h1 className={`text-3xl font-bold mb-2 bg-gradient-to-r ${info.color} bg-clip-text text-transparent`}>
                {info.title} Early Access
              </h1>
              <p className="text-mist-400 text-sm">
                {info.description}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-mist-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-mist-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 transition-all"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-mist-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {/* Location Section for Hosts and Dispensaries */}
              {needsLocation && (
                <div className="border-t border-white/10 pt-5 mt-5">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location Information *
                  </h3>

                  {/* Toggle between Google and Manual */}
                  <div className="flex items-center justify-between mb-4 bg-white/5 rounded-xl p-3">
                    <span className="text-sm text-mist-300">
                      {useManualLocation ? 'Manual Entry' : 'Google Search'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUseManualLocation(!useManualLocation);
                        setLocationData({});
                      }}
                      className="text-sm text-green-400 hover:text-green-300 underline"
                    >
                      Switch to {useManualLocation ? 'Google Search' : 'Manual Entry'}
                    </button>
                  </div>

                  {!useManualLocation ? (
                    <div>
                      <label className="block text-sm font-medium text-mist-300 mb-2">
                        Search for your location *
                      </label>
                      <input
                        ref={autocompleteInputRef}
                        type="text"
                        placeholder="Start typing your address or business name..."
                        className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 transition-all"
                      />
                      {locationData.address && (
                        <div className="mt-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <p className="text-sm text-green-400 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Selected: {locationData.address}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-mist-500 mt-2">
                        Powered by Google Places. If you can't find your location, switch to manual entry.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-mist-300 mb-2">
                          Address (Optional)
                        </label>
                        <input
                          type="text"
                          value={locationData.address || ''}
                          onChange={(e) => setLocationData({ ...locationData, address: e.target.value, manualEntry: true })}
                          className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 transition-all"
                          placeholder="Enter your address"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-mist-300 mb-2">
                            Latitude *
                          </label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={locationData.latitude || ''}
                            onChange={(e) => setLocationData({ ...locationData, latitude: parseFloat(e.target.value), manualEntry: true })}
                            className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 transition-all"
                            placeholder="e.g., 37.7749"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-mist-300 mb-2">
                            Longitude *
                          </label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={locationData.longitude || ''}
                            onChange={(e) => setLocationData({ ...locationData, longitude: parseFloat(e.target.value), manualEntry: true })}
                            className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 transition-all"
                            placeholder="e.g., -122.4194"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-mist-500">
                        You can find coordinates using <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">Google Maps</a> (right-click on location)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Airbnb Import Section for Hosts */}
              {isHost && (
                <div className="border-t border-white/10 pt-5 mt-5">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        <svg className="w-5 h-5 mr-2 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                        </svg>
                        Already on Airbnb?
                      </h3>
                      <button
                        type="button"
                        onClick={() => setHasAirbnb(!hasAirbnb)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          hasAirbnb
                            ? 'bg-pink-500 text-white'
                            : 'bg-white/10 text-mist-400 hover:bg-white/20'
                        }`}
                      >
                        {hasAirbnb ? 'Yes' : 'No'}
                      </button>
                    </div>
                    <p className="text-sm text-mist-400 mb-4">
                      Import your property details from Airbnb to save time. We'll help you migrate your listing when we launch!
                    </p>
                  </div>

                  {hasAirbnb && (
                    <div className="space-y-4 bg-pink-500/5 border border-pink-500/20 rounded-xl p-4">
                      <div>
                        <label className="block text-sm font-medium text-mist-300 mb-2">
                          Airbnb Listing URL *
                        </label>
                        <input
                          type="url"
                          required={hasAirbnb}
                          value={airbnbData.listingUrl || ''}
                          onChange={(e) => setAirbnbData({ ...airbnbData, listingUrl: e.target.value })}
                          className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder-gray-500 transition-all"
                          placeholder="https://www.airbnb.com/rooms/..."
                        />
                        <p className="text-xs text-mist-500 mt-2">
                          Paste your Airbnb listing URL. We'll use this to help migrate your property.
                        </p>
                      </div>

                      {/* Optional: Quick property info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-mist-400 mb-1">
                            Property Name (optional)
                          </label>
                          <input
                            type="text"
                            value={airbnbData.propertyName || ''}
                            onChange={(e) => setAirbnbData({ ...airbnbData, propertyName: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                            placeholder="My Cozy Cottage"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-mist-400 mb-1">
                            Property Type (optional)
                          </label>
                          <input
                            type="text"
                            value={airbnbData.propertyType || ''}
                            onChange={(e) => setAirbnbData({ ...airbnbData, propertyType: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                            placeholder="Entire home"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-mist-400 mb-1">
                            Bedrooms
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={airbnbData.bedrooms || ''}
                            onChange={(e) => setAirbnbData({ ...airbnbData, bedrooms: parseInt(e.target.value) || undefined })}
                            className="w-full bg-white/10 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                            placeholder="2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-mist-400 mb-1">
                            Bathrooms
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={airbnbData.bathrooms || ''}
                            onChange={(e) => setAirbnbData({ ...airbnbData, bathrooms: parseFloat(e.target.value) || undefined })}
                            className="w-full bg-white/10 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-mist-400 mb-1">
                            Guests
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={airbnbData.guests || ''}
                            onChange={(e) => setAirbnbData({ ...airbnbData, guests: parseInt(e.target.value) || undefined })}
                            className="w-full bg-white/10 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                            placeholder="4"
                          />
                        </div>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-xs text-blue-300 flex items-start">
                          <svg className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            You can leave the property details blank. We'll help you import everything from Airbnb when VibesBNB launches!
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Service Host Section */}
              {needsServices && (
                <div className="border-t border-white/10 pt-5 mt-5 space-y-6">
                  {/* Services */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Services Offered *
                    </h3>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={currentService}
                        onChange={(e) => setCurrentService(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                        className="flex-1 bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 transition-all"
                        placeholder="e.g., Yoga, Massage, Meditation"
                      />
                      <button
                        type="button"
                        onClick={addService}
                        className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl font-medium transition-all"
                      >
                        Add
                      </button>
                    </div>
                    {serviceHostData.services && serviceHostData.services.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {serviceHostData.services.map((service, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 px-3 py-1 rounded-lg text-sm"
                          >
                            {service}
                            <button
                              type="button"
                              onClick={() => removeService(index)}
                              className="text-purple-300 hover:text-white"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Service Areas */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Service Areas *
                    </h3>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={currentArea}
                        onChange={(e) => setCurrentArea(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArea())}
                        className="flex-1 bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 transition-all"
                        placeholder="e.g., San Francisco, Bay Area"
                      />
                      <button
                        type="button"
                        onClick={addArea}
                        className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl font-medium transition-all"
                      >
                        Add
                      </button>
                    </div>
                    {serviceHostData.serviceAreas && serviceHostData.serviceAreas.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {serviceHostData.serviceAreas.map((area, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 px-3 py-1 rounded-lg text-sm"
                          >
                            {area}
                            <button
                              type="button"
                              onClick={() => removeArea(index)}
                              className="text-purple-300 hover:text-white"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pincodes */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      Pincodes / Zipcodes *
                    </h3>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={currentPincode}
                        onChange={(e) => setCurrentPincode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPincode())}
                        className="flex-1 bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 transition-all"
                        placeholder="e.g., 94102, 10001"
                      />
                      <button
                        type="button"
                        onClick={addPincode}
                        className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl font-medium transition-all"
                      >
                        Add
                      </button>
                    </div>
                    {serviceHostData.pincodes && serviceHostData.pincodes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {serviceHostData.pincodes.map((pincode, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 px-3 py-1 rounded-lg text-sm"
                          >
                            {pincode}
                            <button
                              type="button"
                              onClick={() => removePincode(index)}
                              className="text-purple-300 hover:text-white"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-gradient-to-r ${info.color} text-white font-semibold py-4 rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg mt-6`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Get Early Access'
                )}
              </button>

              {/* Privacy Note */}
              <p className="text-xs text-mist-500 text-center mt-4">
                By signing up, you agree to receive updates about VibesBNB's launch.
                We respect your privacy and won't spam you.
              </p>
            </form>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-mist-400 text-sm">
              Launching April 20, 2026 at 12:00 PM PST
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
