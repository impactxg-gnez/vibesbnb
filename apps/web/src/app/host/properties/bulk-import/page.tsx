'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Upload, X, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface ImportedProperty {
  url: string;
  status: 'pending' | 'importing' | 'success' | 'error';
  data?: any;
  error?: string;
}

export default function BulkImportPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [urls, setUrls] = useState<string[]>(['']);
  const [importing, setImporting] = useState(false);
  const [importedProperties, setImportedProperties] = useState<ImportedProperty[]>([]);
  const [importingIndex, setImportingIndex] = useState(-1);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleBulkImport = async () => {
    // Filter out empty URLs
    const validUrls = urls.filter(url => url.trim() !== '');
    
    if (validUrls.length === 0) {
      toast.error('Please enter at least one URL');
      return;
    }

    // Validate all URLs are Esca Management URLs
    const invalidUrls = validUrls.filter(url => !url.includes('esca-management.com'));
    if (invalidUrls.length > 0) {
      toast.error('All URLs must be from esca-management.com');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to import properties');
      return;
    }

    setImporting(true);
    setImportedProperties(validUrls.map(url => ({ url, status: 'pending' })));

    const supabase = createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    const userId = supabaseUser?.id || user.id;

    const importedData: any[] = [];

    // Import each property sequentially
    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i];
      setImportingIndex(i);
      
      setImportedProperties(prev => 
        prev.map((item, idx) => 
          idx === i ? { ...item, status: 'importing' } : item
        )
      );

      try {
        // Call the scraping API
        const response = await fetch('/api/scrape-property', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to import property');
        }

        const scrapedData = result.data;
        
        // Extract location from title if not found
        let location = scrapedData.location || '';
        if (!location && scrapedData.name) {
          const locationMatch = scrapedData.name.match(/in\s+(.+?)(?:\s*·|$)/i);
          if (locationMatch) {
            location = locationMatch[1].trim();
          }
        }

        // Normalize and validate image URLs
        const normalizeImageUrl = (imgUrl: string): string | null => {
          if (!imgUrl || typeof imgUrl !== 'string') return null;
          
          // If it's already a data URL or placeholder, return as-is
          if (imgUrl.startsWith('data:') || imgUrl.startsWith('https://via.placeholder.com')) {
            return imgUrl;
          }
          
          // Try to make it an absolute URL
          try {
            const urlObj = new URL(imgUrl);
            // Prefer HTTPS
            if (urlObj.protocol === 'http:' && urlObj.hostname !== 'localhost') {
              urlObj.protocol = 'https:';
            }
            return urlObj.href;
          } catch (e) {
            // Not absolute, try to make it absolute using the source URL
            try {
              const baseUrl = new URL(url);
              const absoluteUrl = new URL(imgUrl, baseUrl.href);
              if (absoluteUrl.protocol === 'http:' && absoluteUrl.hostname !== 'localhost') {
                absoluteUrl.protocol = 'https:';
              }
              return absoluteUrl.href;
            } catch (e2) {
              console.warn(`[Bulk Import] Failed to normalize image URL: ${imgUrl}`, e2);
              return null;
            }
          }
        };

        // Normalize all image URLs
        let images = (scrapedData.images || [])
          .map(normalizeImageUrl)
          .filter((url: string | null): url is string => url !== null);
        
        // Ensure we have at least one image - add placeholder if none found
        if (images.length === 0) {
          console.warn(`[Bulk Import] No valid images found for ${scrapedData.name || url}, adding placeholder`);
          images = ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image+Available'];
        }

        const propertyData = {
          name: scrapedData.name || 'Imported Property',
          description: scrapedData.description || '',
          location: location || 'Location not found',
          bedrooms: scrapedData.bedrooms || 1,
          bathrooms: scrapedData.bathrooms || 1,
          beds: scrapedData.beds || 1,
          guests: scrapedData.guests || 2,
          price: scrapedData.price || 100,
          images: images, // Use the validated images array
          amenities: scrapedData.amenities || [],
          wellnessFriendly: scrapedData.wellnessFriendly || false,
          smokeFriendly: false,
          googleMapsUrl: scrapedData.googleMapsUrl,
          coordinates: scrapedData.coordinates,
          status: 'draft', // Always save as draft so host can review
        };
        
        console.log(`[Bulk Import] Property ${propertyData.name} - Images: ${images.length}`);

        importedData.push(propertyData);

        setImportedProperties(prev => 
          prev.map((item, idx) => 
            idx === i ? { ...item, status: 'success', data: propertyData } : item
          )
        );
      } catch (error: any) {
        console.error(`Error importing ${url}:`, error);
        setImportedProperties(prev => 
          prev.map((item, idx) => 
            idx === i ? { ...item, status: 'error', error: error.message } : item
          )
        );
      }
    }

    setImportingIndex(-1);

    if (importedData.length === 0) {
      toast.error('No properties were successfully imported');
      setImporting(false);
      return;
    }

    // Save all imported properties
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isSupabaseConfigured = supabaseUrl && 
                                    supabaseUrl !== '' &&
                                    supabaseUrl !== 'https://placeholder.supabase.co';
      
      if (isSupabaseConfigured && supabaseUser) {
        // Save to Supabase
        const propertiesToInsert = importedData.map((data, index) => ({
          id: `${userId}_${Date.now()}_${index}`,
          host_id: supabaseUser.id,
          name: data.name,
          title: data.name,
          description: data.description,
          location: data.location,
          price: data.price,
          images: data.images,
          amenities: data.amenities,
          guests: data.guests,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          beds: data.beds,
          status: 'draft',
          wellness_friendly: data.wellnessFriendly,
          smoke_friendly: data.smokeFriendly,
          google_maps_url: data.googleMapsUrl,
          latitude: data.coordinates?.lat,
          longitude: data.coordinates?.lng,
        }));

        const { error: insertError } = await supabase
          .from('properties')
          .insert(propertiesToInsert);

        if (insertError) {
          throw insertError;
        }

        // Also save to localStorage as backup
        const savedProperties = localStorage.getItem(`properties_${userId}`);
        const parsedProperties = savedProperties ? JSON.parse(savedProperties) : [];
        importedData.forEach((data, index) => {
          parsedProperties.push({
            id: `${userId}_${Date.now()}_${index}`,
            ...data,
          });
        });
        localStorage.setItem(`properties_${userId}`, JSON.stringify(parsedProperties));
      } else {
        // Save to localStorage only
        const savedProperties = localStorage.getItem(`properties_${userId}`);
        const parsedProperties = savedProperties ? JSON.parse(savedProperties) : [];
        importedData.forEach((data, index) => {
          parsedProperties.push({
            id: `${userId}_${Date.now()}_${index}`,
            ...data,
          });
        });
        localStorage.setItem(`properties_${userId}`, JSON.stringify(parsedProperties));
      }

      toast.success(`Successfully imported ${importedData.length} property/properties! They are saved as drafts for review.`);
      router.push('/host/properties');
    } catch (error: any) {
      console.error('Error saving imported properties:', error);
      toast.error(`Failed to save properties: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-earth-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/host/properties')}
            className="text-earth-500 hover:text-earth-400 mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back to Properties
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Bulk Import Properties</h1>
          <p className="text-mist-400">Import multiple properties from Esca Management URLs</p>
        </div>

        {/* URL Input Fields */}
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white">Property URLs</h2>
          </div>

          <div className="space-y-3">
            {urls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  placeholder="Paste property link here"
                  className="flex-1 px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white placeholder-gray-500"
                  disabled={importing}
                />
                {urls.length > 1 && (
                  <button
                    onClick={() => removeUrlField(index)}
                    className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    disabled={importing}
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-mist-400">
              1 URL per line
            </p>
            <button
              onClick={addUrlField}
              className="px-4 py-2 bg-earth-600 text-white rounded-lg hover:bg-earth-700 transition flex items-center gap-2"
              disabled={importing}
            >
              <Upload size={16} />
              Add URL
            </button>
          </div>
        </div>

        {/* Import Status */}
        {importedProperties.length > 0 && (
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Import Status</h2>
            <div className="space-y-2">
              {importedProperties.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    item.status === 'success'
                      ? 'bg-emerald-900/30 border-emerald-700'
                      : item.status === 'error'
                      ? 'bg-red-900/30 border-red-700'
                      : item.status === 'importing'
                      ? 'bg-blue-900/30 border-blue-700'
                      : 'bg-charcoal-800 border-charcoal-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-mist-300 truncate">{item.url}</p>
                      {item.data && (
                        <p className="text-xs text-mist-400 mt-1">
                          {item.data.name} - {item.data.location}
                        </p>
                      )}
                      {item.error && (
                        <p className="text-xs text-red-400 mt-1">{item.error}</p>
                      )}
                    </div>
                    <div className="ml-4">
                      {item.status === 'pending' && (
                        <div className="w-5 h-5 border-2 border-gray-500 rounded-full"></div>
                      )}
                      {item.status === 'importing' && (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      {item.status === 'success' && (
                        <Check className="w-5 h-5 text-earth-500" />
                      )}
                      {item.status === 'error' && (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={() => router.push('/host/properties')}
            disabled={importing}
            className="px-6 py-3 bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkImport}
            disabled={importing || urls.filter(u => u.trim() !== '').length === 0}
            className="px-6 py-3 bg-earth-600 text-white rounded-lg hover:bg-earth-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={20} />
                Import Properties
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

