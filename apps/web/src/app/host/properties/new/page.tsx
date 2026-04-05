'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Plus, 
  Trash2, 
  Home, 
  Building2, 
  Warehouse, 
  Hotel, 
  Ship, 
  TreePine, 
  Caravan, 
  Castle,
  Users,
  User,
  UserCheck,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import LocationPicker from '@/components/LocationPicker';
import ImageReorder from '@/components/properties/ImageReorder';
import { applyWatermark } from '@/lib/image-utils';

interface Room {
  id: string;
  name: string;
  price: number;
  guests: number;
  images: File[];
  imagePreviewUrls: string[];
}

// Property type options with icons
const PROPERTY_TYPES = [
  { id: 'house', label: 'House', icon: Home },
  { id: 'apartment', label: 'Flat/Apartment', icon: Building2 },
  { id: 'barn', label: 'Barn', icon: Warehouse },
  { id: 'bnb', label: 'Bed & Breakfast', icon: Hotel },
  { id: 'boat', label: 'Boat', icon: Ship },
  { id: 'cabin', label: 'Cabin', icon: TreePine },
  { id: 'campervan', label: 'Campervan/Motorhome', icon: Caravan },
  { id: 'casa', label: 'Casa Particular', icon: Castle },
  { id: 'castle', label: 'Castle', icon: Castle },
  { id: 'cave', label: 'Cave', icon: Home },
  { id: 'container', label: 'Container', icon: Warehouse },
  { id: 'cottage', label: 'Cottage', icon: Home },
  { id: 'farmhouse', label: 'Farm House', icon: Warehouse },
  { id: 'guesthouse', label: 'Guest House', icon: Hotel },
  { id: 'hotel', label: 'Hotel', icon: Hotel },
  { id: 'houseboat', label: 'Houseboat', icon: Ship },
  { id: 'tent', label: 'Tent/Glamping', icon: TreePine },
  { id: 'townhouse', label: 'Townhouse', icon: Building2 },
  { id: 'treehouse', label: 'Treehouse', icon: TreePine },
  { id: 'villa', label: 'Villa', icon: Home },
];

// Guest access types
const GUEST_ACCESS_TYPES = [
  { 
    id: 'entire', 
    label: 'An entire place', 
    description: 'Guests have the whole place to themselves.',
    icon: Home 
  },
  { 
    id: 'private', 
    label: 'A private room', 
    description: 'Guests sleep in a private room but some areas may be shared with you or others.',
    icon: User 
  },
  { 
    id: 'shared', 
    label: 'A shared room', 
    description: 'Guests sleep in a room or common area that may be shared with you or others.',
    icon: Users 
  },
];

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
  'Beach Access',
  'Mountain View',
  'Garden',
  'BBQ',
  'Balcony',
];

export default function NewPropertyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    propertyType: '',
    guestAccessType: '',
    name: '',
    description: '',
    location: '',
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    guests: 2,
    price: 100,
    wellnessFriendly: false,
    smokeFriendly: false,
    allowExtraGuests: false,
    extraGuestPrice: 50,
    amenities: [] as string[],
    coordinates: undefined as { lat: number; lng: number } | undefined,
  });
  
  const [rooms, setRooms] = useState<Room[]>([
    { id: Date.now().toString(), name: 'Main Photos', price: 100, guests: 2, images: [], imagePreviewUrls: [] },
  ]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Step definitions
  const steps = [
    { id: 'welcome', title: 'Get Started' },
    { id: 'property-type', title: 'Property Type' },
    { id: 'guest-access', title: 'Guest Access' },
    { id: 'location', title: 'Location' },
    { id: 'basics', title: 'Basic Details' },
    { id: 'amenities', title: 'Amenities' },
    { id: 'photos', title: 'Photos' },
    { id: 'pricing', title: 'Pricing' },
    { id: 'review', title: 'Review' },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // Welcome
      case 1: return !!formData.propertyType; // Property type
      case 2: return !!formData.guestAccessType; // Guest access
      case 3: return !!formData.location && !!formData.coordinates; // Location
      case 4: return !!formData.name && formData.guests > 0; // Basics
      case 5: return true; // Amenities (optional)
      case 6: return rooms.some(r => r.imagePreviewUrls.length > 0); // Photos
      case 7: return formData.price > 0; // Pricing
      case 8: return true; // Review
      default: return true;
    }
  };

  const nextStep = () => {
    if (canProceed() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleImageUpload = async (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const toastId = toast.loading('Processing images...', { id: 'image-toast' });

    try {
      const watermarkedPreviews: string[] = [];
      
      for (const file of files) {
        const watermarkedUrl = await applyWatermark(file);
        watermarkedPreviews.push(watermarkedUrl);
      }

      const newPreviews = [...room.imagePreviewUrls, ...watermarkedPreviews];
      
      setRooms(
        rooms.map((r) =>
          r.id === roomId ? { ...r, imagePreviewUrls: newPreviews } : r
        )
      );
      
      toast.success('Images added!', { id: 'image-toast' });
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error('Failed to process some images.', { id: 'image-toast' });
    }
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

  const reorderImages = (roomId: string, newImageUrls: string[]) => {
    setRooms(
      rooms.map((r) => {
        if (r.id === roomId) {
          return {
            ...r,
            imagePreviewUrls: newImageUrls,
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

  const handleSubmit = async () => {
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

      let supabaseUser = null;
      if (isSupabaseConfigured) {
        const { data: { user: userData } } = await supabase.auth.getUser();
        supabaseUser = userData;
      }

      // Collect all images
      const allImageUrls: string[] = [];
      for (const room of rooms) {
        allImageUrls.push(...room.imagePreviewUrls);
      }

      const userId = supabaseUser?.id || user.id;
      const propertyId = `${userId}_${Date.now()}`;

      // Get the display type from property type
      const propertyTypeLabel = PROPERTY_TYPES.find(t => t.id === formData.propertyType)?.label || formData.propertyType;
      const accessTypeLabel = GUEST_ACCESS_TYPES.find(t => t.id === formData.guestAccessType)?.label || formData.guestAccessType;

      const propertyData = {
        id: propertyId,
        host_id: userId,
        name: formData.name,
        title: formData.name,
        description: formData.description,
        location: formData.location,
        price: formData.price,
        images: allImageUrls,
        amenities: formData.amenities,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        beds: formData.beds,
        guests: formData.guests,
        status: 'pending_approval', // Requires admin approval
        type: propertyTypeLabel,
        guest_access_type: accessTypeLabel,
        wellness_friendly: formData.wellnessFriendly,
        smoke_friendly: formData.smokeFriendly,
        allow_extra_guests: formData.allowExtraGuests,
        extra_guest_price: formData.extraGuestPrice,
        latitude: formData.coordinates?.lat,
        longitude: formData.coordinates?.lng,
        google_maps_url: formData.coordinates
          ? `https://www.google.com/maps/search/?api=1&query=${formData.coordinates.lat},${formData.coordinates.lng}`
          : null,
      };

      if (isSupabaseConfigured && supabaseUser) {
        const { error: insertError } = await supabase
          .from('properties')
          .insert(propertyData);

        if (insertError) {
          console.error('Error saving property:', insertError);
          toast.error(`Failed to save: ${insertError.message}`);
          throw insertError;
        }

        // Create admin notification
        try {
          await supabase.from('notifications').insert({
            user_id: supabaseUser.id,
            type: 'property_submitted',
            title: 'Property Submitted for Review',
            message: `Your property "${formData.name}" has been submitted and is pending admin approval.`,
            related_property_id: propertyId,
          });
        } catch (e) {
          console.warn('Could not create notification:', e);
        }

        toast.success('Property submitted for approval! Our team will review it shortly.', { duration: 5000 });
        router.push('/host/properties');
      } else {
        // Fallback to localStorage
        const savedProperties = localStorage.getItem(`properties_${userId}`);
        const parsedProperties = savedProperties ? JSON.parse(savedProperties) : [];
        parsedProperties.push({
          ...propertyData,
          wellnessFriendly: formData.wellnessFriendly,
          smokeFriendly: formData.smokeFriendly,
        });
        localStorage.setItem(`properties_${userId}`, JSON.stringify(parsedProperties));

        toast.success('Property submitted for approval!');
        router.push('/host/properties');
      }
    } catch (error: any) {
      console.error('Error creating property:', error);
      toast.error(error.message || 'Failed to submit property. Please try again.');
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

  // Welcome Screen (Step 0)
  const renderWelcome = () => (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">
          It's easy to get started on VibesBnB
        </h1>

        <div className="space-y-8 mb-12">
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-8 text-2xl font-bold text-white">1</div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-1">Tell us about your place</h3>
              <p className="text-gray-400">
                Share some basic info, such as where it is and how many guests can stay.
              </p>
            </div>
            <div className="w-20 h-20 flex-shrink-0 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl flex items-center justify-center">
              <Home className="w-10 h-10 text-emerald-400" />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-shrink-0 w-8 text-2xl font-bold text-white">2</div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-1">Make it stand out</h3>
              <p className="text-gray-400">
                Add 5 or more photos plus a title and description — we'll help you out.
              </p>
            </div>
            <div className="w-20 h-20 flex-shrink-0 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl flex items-center justify-center">
              <Upload className="w-10 h-10 text-purple-400" />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-shrink-0 w-8 text-2xl font-bold text-white">3</div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-1">Finish up and publish</h3>
              <p className="text-gray-400">
                Choose if you'd like to start with an experienced guest, set a starting price, and publish your listing.
              </p>
            </div>
            <div className="w-20 h-20 flex-shrink-0 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Bulk Upload Option */}
        <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="text-purple-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg mb-1">Have multiple properties?</h3>
              <p className="text-gray-400 text-sm mb-4">
                Use our bulk upload feature to import multiple properties at once from a spreadsheet or external listing.
              </p>
              <Link
                href="/host/properties/bulk-import"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-sm transition"
              >
                <Upload size={16} />
                Bulk Upload Properties
              </Link>
            </div>
          </div>
        </div>

        {/* Admin Approval Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="text-amber-500 flex-shrink-0" size={20} />
            <p className="text-amber-200 text-sm">
              All properties are reviewed by our team before going live to ensure quality and compliance.
            </p>
          </div>
        </div>

        <button
          onClick={nextStep}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition flex items-center justify-center gap-2"
        >
          Get started
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );

  // Property Type Selection (Step 1)
  const renderPropertyType = () => (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mb-8">
        <p className="text-gray-400 text-sm font-medium mb-2">Step 1</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Tell us about your place
        </h1>
        <p className="text-gray-400">
          In this step, we'll ask you which type of property you have and if guests will book the entire place or just a room.
        </p>
      </div>

      <h2 className="text-xl font-semibold text-white mb-6">
        Which of these best describes your place?
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {PROPERTY_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = formData.propertyType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setFormData({ ...formData, propertyType: type.id })}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-white bg-white/10'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <Icon size={28} className={isSelected ? 'text-white' : 'text-gray-400'} />
              <p className={`mt-2 font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                {type.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Guest Access Type (Step 2)
  const renderGuestAccess = () => (
    <div className="max-w-2xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          What type of place will guests have?
        </h1>
      </div>

      <div className="space-y-4">
        {GUEST_ACCESS_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = formData.guestAccessType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setFormData({ ...formData, guestAccessType: type.id })}
              className={`w-full p-6 rounded-xl border-2 transition-all text-left flex items-start gap-4 ${
                isSelected
                  ? 'border-white bg-white/10'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="flex-1">
                <p className={`text-lg font-semibold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                  {type.label}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {type.description}
                </p>
              </div>
              <Icon size={32} className={isSelected ? 'text-white' : 'text-gray-500'} />
            </button>
          );
        })}
      </div>
    </div>
  );

  // Location (Step 3)
  const renderLocation = () => (
    <div className="max-w-2xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Where's your place located?
        </h1>
        <p className="text-gray-400">
          Your address is only shared with guests after they've made a reservation.
        </p>
      </div>

      <LocationPicker
        location={formData.location}
        coordinates={formData.coordinates}
        onLocationChange={(location, coordinates) => {
          setFormData({
            ...formData,
            location,
            coordinates,
          });
        }}
        className="mb-4"
      />

      {formData.coordinates && (
        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 size={20} />
            <span className="font-medium">Location confirmed</span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{formData.location}</p>
        </div>
      )}
    </div>
  );

  // Basic Details (Step 4)
  const renderBasics = () => (
    <div className="max-w-2xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Share some basics about your place
        </h1>
        <p className="text-gray-400">
          You'll add more details later, like bed types and listing description.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-white font-medium mb-2">Property Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
            placeholder="Give your place a catchy name"
          />
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
            placeholder="Tell guests what makes your place special..."
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Guests</label>
            <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, guests: Math.max(1, formData.guests - 1) })}
                className="w-8 h-8 rounded-full border border-gray-600 text-white hover:bg-gray-700 flex items-center justify-center"
              >
                −
              </button>
              <span className="text-white font-medium">{formData.guests}</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, guests: formData.guests + 1 })}
                className="w-8 h-8 rounded-full border border-gray-600 text-white hover:bg-gray-700 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Bedrooms</label>
            <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, bedrooms: Math.max(0, formData.bedrooms - 1) })}
                className="w-8 h-8 rounded-full border border-gray-600 text-white hover:bg-gray-700 flex items-center justify-center"
              >
                −
              </button>
              <span className="text-white font-medium">{formData.bedrooms}</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, bedrooms: formData.bedrooms + 1 })}
                className="w-8 h-8 rounded-full border border-gray-600 text-white hover:bg-gray-700 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Beds</label>
            <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, beds: Math.max(1, formData.beds - 1) })}
                className="w-8 h-8 rounded-full border border-gray-600 text-white hover:bg-gray-700 flex items-center justify-center"
              >
                −
              </button>
              <span className="text-white font-medium">{formData.beds}</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, beds: formData.beds + 1 })}
                className="w-8 h-8 rounded-full border border-gray-600 text-white hover:bg-gray-700 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Bathrooms</label>
            <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, bathrooms: Math.max(0, formData.bathrooms - 1) })}
                className="w-8 h-8 rounded-full border border-gray-600 text-white hover:bg-gray-700 flex items-center justify-center"
              >
                −
              </button>
              <span className="text-white font-medium">{formData.bathrooms}</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, bathrooms: formData.bathrooms + 1 })}
                className="w-8 h-8 rounded-full border border-gray-600 text-white hover:bg-gray-700 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Property Features */}
        <div className="pt-6 border-t border-gray-800">
          <h3 className="text-white font-medium mb-4">Special Features</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, wellnessFriendly: !formData.wellnessFriendly })}
              className={`px-6 py-4 rounded-xl border transition-all duration-300 flex items-center justify-center gap-3 font-bold ${
                formData.wellnessFriendly
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-emerald-500/50'
              }`}
            >
              <span className="text-2xl">🧘</span>
              <span>Wellness-Friendly</span>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, smokeFriendly: !formData.smokeFriendly })}
              className={`px-6 py-4 rounded-xl border transition-all duration-300 flex items-center justify-center gap-3 font-bold ${
                formData.smokeFriendly
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-emerald-500/50'
              }`}
            >
              <span className="text-2xl">🌿</span>
              <span>Smoke-Friendly</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Amenities (Step 5)
  const renderAmenities = () => (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Tell guests what your place has to offer
        </h1>
        <p className="text-gray-400">
          You can add more amenities after you publish.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {availableAmenities.map((amenity) => {
          const isSelected = formData.amenities.includes(amenity);
          return (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`px-4 py-4 rounded-xl border-2 transition text-left ${
                isSelected
                  ? 'bg-white/10 border-white text-white'
                  : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              {amenity}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Photos (Step 6)
  const renderPhotos = () => (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Add some photos of your place
        </h1>
        <p className="text-gray-400">
          You'll need at least 1 photo to get started. Drag to reorder — the first image will be your cover photo.
        </p>
      </div>

      <div className="space-y-6">
        {rooms.map((room) => (
          <div key={room.id} className="border border-gray-700 rounded-xl p-6 bg-gray-900/50">
            <label className="block border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500 transition mb-6">
              <Upload size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-white font-medium mb-1">Click to upload photos</p>
              <p className="text-gray-500 text-sm">or drag and drop</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(room.id, e)}
                className="hidden"
              />
            </label>

            {room.imagePreviewUrls.length > 0 && (
              <ImageReorder
                images={room.imagePreviewUrls}
                onReorder={(newImages) => reorderImages(room.id, newImages)}
                onRemove={(index) => removeImage(room.id, index)}
                roomName="Property"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Pricing (Step 7)
  const renderPricing = () => (
    <div className="max-w-xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Now, set your price
        </h1>
        <p className="text-gray-400">
          You can change it anytime.
        </p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-5xl font-bold text-white">$</span>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
            className="w-32 text-5xl font-bold text-white bg-transparent border-none focus:outline-none text-center"
            min="0"
          />
        </div>
        <p className="text-gray-400">per night</p>
      </div>

      {/* Extra Guest Policy */}
      <div className="mt-8 p-6 bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-medium">Allow extra guests?</h3>
            <p className="text-gray-400 text-sm">Charge extra for guests beyond base capacity</p>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, allowExtraGuests: !formData.allowExtraGuests })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.allowExtraGuests ? 'bg-emerald-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.allowExtraGuests ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {formData.allowExtraGuests && (
          <div className="pt-4 border-t border-gray-800">
            <label className="block text-gray-400 text-sm mb-2">Price per extra guest</label>
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={formData.extraGuestPrice}
                onChange={(e) => setFormData({ ...formData, extraGuestPrice: parseInt(e.target.value) || 0 })}
                className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                min="0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Review (Step 8)
  const renderReview = () => {
    const propertyTypeLabel = PROPERTY_TYPES.find(t => t.id === formData.propertyType)?.label || formData.propertyType;
    const accessTypeLabel = GUEST_ACCESS_TYPES.find(t => t.id === formData.guestAccessType)?.label || formData.guestAccessType;
    const coverImage = rooms[0]?.imagePreviewUrls[0];

    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Review your listing
          </h1>
          <p className="text-gray-400">
            Here's what we'll show to guests. Make sure everything looks good.
          </p>
        </div>

        {/* Preview Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-8">
          {coverImage && (
            <img src={coverImage} alt="Cover" className="w-full h-64 object-cover" />
          )}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{formData.name || 'Untitled Property'}</h2>
                <p className="text-gray-400">{formData.location}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">${formData.price}</p>
                <p className="text-gray-400 text-sm">per night</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-gray-300 text-sm mb-4">
              <span>{propertyTypeLabel}</span>
              <span>•</span>
              <span>{accessTypeLabel}</span>
              <span>•</span>
              <span>{formData.guests} guests</span>
              <span>•</span>
              <span>{formData.bedrooms} bedrooms</span>
              <span>•</span>
              <span>{formData.beds} beds</span>
              <span>•</span>
              <span>{formData.bathrooms} bathrooms</span>
            </div>

            {formData.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.amenities.slice(0, 5).map((amenity) => (
                  <span key={amenity} className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm">
                    {amenity}
                  </span>
                ))}
                {formData.amenities.length > 5 && (
                  <span className="px-3 py-1 text-gray-500 text-sm">
                    +{formData.amenities.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Admin Approval Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Sparkles className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-amber-200 font-medium">Pending Admin Approval</p>
              <p className="text-amber-200/70 text-sm mt-1">
                Your listing will be reviewed by our team before going live. This usually takes 24-48 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderWelcome();
      case 1: return renderPropertyType();
      case 2: return renderGuestAccess();
      case 3: return renderLocation();
      case 4: return renderBasics();
      case 5: return renderAmenities();
      case 6: return renderPhotos();
      case 7: return renderPricing();
      case 8: return renderReview();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      {currentStep > 0 && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-gray-950/95 backdrop-blur border-b border-gray-800 z-50 flex items-center justify-between px-6">
          <Link href="/host/properties" className="text-white hover:text-gray-300">
            <X size={24} />
          </Link>
          
          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-white flex items-center gap-2">
              <HelpCircle size={18} />
              Questions?
            </button>
            <button
              onClick={() => {
                toast.success('Progress saved!');
              }}
              className="px-4 py-2 border border-gray-700 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
            >
              Save & exit
            </button>
          </div>
        </header>
      )}

      {/* Progress Bar */}
      {currentStep > 0 && (
        <div className="fixed top-16 left-0 right-0 h-1 bg-gray-800 z-40">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      )}

      {/* Main Content */}
      <main className={currentStep > 0 ? 'pt-24 pb-32' : 'py-12'}>
        {renderStepContent()}
      </main>

      {/* Footer Navigation */}
      {currentStep > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 h-20 bg-gray-950 border-t border-gray-800 flex items-center justify-between px-6">
          <button
            onClick={prevStep}
            className="px-6 py-3 text-white font-semibold underline hover:text-gray-300 transition"
          >
            Back
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold transition flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit for Approval'
              )}
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
