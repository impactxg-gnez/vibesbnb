'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  X,
  Loader2,
  ExternalLink,
  Globe,
  FileText,
  Plus,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import {
  getHostScopeUserId,
  getHostScopeUserIdFromAuthOnly,
} from '@/lib/adminHostImpersonation';
import { unwrapProxiedImageUrl } from '@/lib/propertyImageUrls';
import { PropertyAmenitiesPicker } from '@/components/host/PropertyAmenitiesPicker';
import {
  BULK_CSV_FILENAME,
  BULK_CSV_MAX_BYTES,
  NUMERIC_BOUNDS,
  OPTIONAL_BULK_CSV_COLUMNS,
  REQUIRED_BULK_CSV_COLUMNS,
  type BulkCountField,
  type BulkProperty,
  type ParsedBulkCsvResult,
  buildTemplateCsv,
  getBulkPropertyWarnings,
  isCountSuspicious,
  joinAmenities,
  parseAmenitiesList,
  parseBulkPropertyCsv,
} from '@/lib/bulkPropertyCsv';

interface UrlEntry {
  id: string;
  url: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  propertyCount?: number;
  error?: string;
}

/** Normalize user-pasted URL (add https:// if missing). */
function parseHttpUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return new URL(t);
  } catch {
    try {
      if (!/^https?:\/\//i.test(t)) {
        return new URL(`https://${t}`);
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Canonical URL string for API requests (always includes scheme). */
function normalizeListingUrl(raw: string): string {
  const u = parseHttpUrl(raw);
  return u ? u.href : raw.trim();
}

/**
 * URLs that should use listing scrape (not raw CSV fetch).
 * HTML from a listing page parsed as CSV yields "Missing required columns" — avoid that.
 */
function isExternalListingUrl(raw: string): boolean {
  const u = parseHttpUrl(raw);
  if (!u) return false;

  const h = u.hostname.toLowerCase();
  const path = u.pathname.toLowerCase();

  const knownHosts =
    h.includes('airbnb.') ||
    h.includes('booking.com') ||
    h.includes('vrbo.com') ||
    h.includes('homeaway.') ||
    h.includes('esca-management.com') ||
    h.includes('ammosfl.com') ||
    h.includes('ionica.world');

  if (knownHosts) return true;

  // WordPress / PM sites: single-property paths (e.g. ammosfl.com/property/slug/)
  const looksLikePropertyPage =
    path.includes('/property/') ||
    path.includes('/properties/') ||
    path.includes('/listing/') ||
    path.includes('/holiday-rental/') ||
    path.includes('/vacation-rental/');

  if (looksLikePropertyPage && !path.endsWith('.csv')) {
    return true;
  }

  return false;
}

interface ScrapeApiProperty {
  name?: string;
  description?: string;
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
  beds?: number;
  guests?: number;
  price?: number;
  amenities?: string[];
  images?: string[];
  wellnessFriendly?: boolean;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  coordinates?: { lat?: number; lng?: number };
}

function parseFiniteCoord(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function coordsFromScrape(scraped: ScrapeApiProperty): {
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
} {
  const lat =
    parseFiniteCoord(scraped.latitude) ?? parseFiniteCoord(scraped.coordinates?.lat);
  const lng =
    parseFiniteCoord(scraped.longitude) ?? parseFiniteCoord(scraped.coordinates?.lng);
  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {};
  }
  const googleMapsUrl =
    (typeof scraped.googleMapsUrl === 'string' && scraped.googleMapsUrl.trim()) ||
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return { latitude: lat, longitude: lng, googleMapsUrl };
}

function locationFromScrape(scraped: ScrapeApiProperty): string {
  let location = (scraped.location || '').trim();
  if (!location || location === 'Location not found') {
    const name = scraped.name || '';
    const airbnbMatch = name.match(/in\s+(.+?)(?:\s*·|$)/i);
    if (airbnbMatch) location = airbnbMatch[1].trim();
  }
  return location || 'Location not found';
}

function inferPropertyType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('condo')) return 'Condominium';
  if (n.includes('cabin')) return 'Cabin';
  if (n.includes('villa')) return 'Villa';
  if (n.includes('apartment') || n.includes('flat') || n.includes('rental unit')) return 'Apartment';
  if (n.includes('townhouse')) return 'Townhouse';
  if (n.includes('tiny')) return 'Tiny home';
  return 'House';
}

function scrapedListingToBulkProperty(scraped: ScrapeApiProperty, sourceUrl: string): BulkProperty {
  const name = scraped.name?.trim() || 'Imported listing';
  const amenitiesArr = Array.isArray(scraped.amenities) ? scraped.amenities : [];
  const coords = coordsFromScrape(scraped);
  const property: BulkProperty = {
    name,
    type: inferPropertyType(name),
    guestAccessType: 'An entire place',
    location: locationFromScrape(scraped),
    guests: scraped.guests && scraped.guests > 0 ? scraped.guests : 2,
    bedrooms: scraped.bedrooms && scraped.bedrooms > 0 ? scraped.bedrooms : 1,
    beds: scraped.beds && scraped.beds > 0 ? scraped.beds : 1,
    bathrooms: scraped.bathrooms && scraped.bathrooms > 0 ? scraped.bathrooms : 1,
    price: scraped.price && scraped.price > 0 ? scraped.price : 100,
    cleaningFee: 0,
    description: scraped.description || '',
    amenities: joinAmenities(amenitiesArr),
    wellnessFriendly: Boolean(scraped.wellnessFriendly),
    imageUrls: (scraped.images || [])
      .filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
      .map((u) => unwrapProxiedImageUrl(u)),
    sourceUrl,
    ...coords,
  };
  property.warnings = getBulkPropertyWarnings(property);
  return property;
}

const REVIEW_COUNT_FIELDS: { field: BulkCountField; label: string }[] = [
  { field: 'guests', label: 'Guests' },
  { field: 'bedrooms', label: 'Bedrooms' },
  { field: 'beds', label: 'Beds' },
  { field: 'bathrooms', label: 'Bathrooms' },
  { field: 'price', label: 'Price / night' },
];

export default function BulkImportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedBulkCsvResult | null>(null);
  const [step, setStep] = useState<'upload' | 'review' | 'importing' | 'complete'>('upload');
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [importMode, setImportMode] = useState<'csv' | 'url'>('csv');
  const [urlEntries, setUrlEntries] = useState<UrlEntry[]>([{ id: '1', url: '', status: 'pending' }]);
  const [fetchingUrls, setFetchingUrls] = useState(false);
  const [expandedReviewIndex, setExpandedReviewIndex] = useState<number | null>(null);

  const updateReviewProperty = (index: number, patch: Partial<BulkProperty>) => {
    setParsedData((prev) => {
      if (!prev) return prev;
      const properties = [...prev.properties];
      const next = { ...properties[index], ...patch };
      next.warnings = getBulkPropertyWarnings(next);
      properties[index] = next;
      return { ...prev, properties };
    });
  };

  const updateReviewPropertyAmenities = (index: number, amenities: string[]) => {
    updateReviewProperty(index, { amenities: joinAmenities(amenities) });
  };

  const updateReviewCount = (index: number, field: BulkCountField, raw: string) => {
    const bounds = field === 'price' ? NUMERIC_BOUNDS.price : NUMERIC_BOUNDS[field];
    const n = bounds.integer ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
    if (!Number.isFinite(n) || n < bounds.min || n > bounds.max) return;
    updateReviewProperty(index, { [field]: n });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > BULK_CSV_MAX_BYTES) {
      toast.error('CSV files must be 1MB or smaller');
      input.value = '';
      setParsedData({
        success: false,
        properties: [],
        errors: ['File is larger than 1MB. Split the spreadsheet or remove extra columns.'],
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const result = parseBulkPropertyCsv(text);
      setParsedData(result);
      if (result.success && result.properties.length > 0) {
        setStep('review');
      }
    };
    reader.readAsText(file);
    input.value = '';
  };

  const addUrlEntry = () => {
    setUrlEntries(prev => [...prev, { 
      id: Date.now().toString(), 
      url: '', 
      status: 'pending' 
    }]);
  };

  const removeUrlEntry = (id: string) => {
    if (urlEntries.length > 1) {
      setUrlEntries(prev => prev.filter(entry => entry.id !== id));
    }
  };

  const updateUrlEntry = (id: string, url: string) => {
    setUrlEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, url, status: 'pending' as const } : entry
    ));
  };

  const handleUrlFetch = async () => {
    const validUrls = urlEntries.filter(entry => entry.url.trim());
    
    if (validUrls.length === 0) {
      toast.error('Please enter at least one URL');
      return;
    }

    setFetchingUrls(true);
    
    // Reset all statuses to loading
    setUrlEntries(prev => prev.map(entry => ({
      ...entry,
      status: entry.url.trim() ? 'loading' as const : 'pending' as const,
      propertyCount: undefined,
      error: undefined
    })));

    const allProperties: BulkProperty[] = [];
    const allErrors: string[] = [];
    let successCount = 0;

    // Process one at a time so multiple Airbnb URLs do not spawn parallel Puppeteer runs.
    for (const entry of validUrls) {
      try {
        const resolvedUrl = normalizeListingUrl(entry.url);
        if (isExternalListingUrl(entry.url)) {
          const response = await fetch('/api/scrape-property', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: resolvedUrl }),
          });

          const result = await response.json().catch(() => ({}));

          if (!response.ok || !result.success) {
            const detail =
              typeof result.details === 'string'
                ? result.details
                : typeof result.error === 'string'
                  ? result.error
                  : 'Scrape failed';
            throw new Error(detail);
          }

          const scraped = result.data as ScrapeApiProperty;
          if (!scraped || typeof scraped !== 'object') {
            throw new Error('Invalid scrape response');
          }

          const bulk = scrapedListingToBulkProperty(scraped, resolvedUrl);
          allProperties.push(bulk);
          successCount++;

          setUrlEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? { ...e, status: 'success' as const, propertyCount: 1 }
                : e
            )
          );
        } else {
          const response = await fetch(`/api/fetch-csv?url=${encodeURIComponent(resolvedUrl)}`);

          if (!response.ok) {
            let msg = 'Failed to fetch CSV';
            try {
              const errBody = await response.json();
              if (errBody?.error) msg = String(errBody.error);
            } catch {
              /* ignore */
            }
            throw new Error(msg);
          }

          const text = await response.text();
          const result = parseBulkPropertyCsv(text, { sourceUrl: resolvedUrl });

          if (result.success && result.properties.length > 0) {
            allProperties.push(...result.properties);
            successCount++;

            setUrlEntries((prev) =>
              prev.map((e) =>
                e.id === entry.id
                  ? { ...e, status: 'success' as const, propertyCount: result.properties.length }
                  : e
              )
            );
          } else {
            const errorMsg = result.errors.length > 0 ? result.errors[0] : 'No valid properties found';
            allErrors.push(`${entry.url}: ${errorMsg}`);

            setUrlEntries((prev) =>
              prev.map((e) =>
                e.id === entry.id ? { ...e, status: 'error' as const, error: errorMsg } : e
              )
            );
          }

          if (result.errors.length > 0) {
            allErrors.push(...result.errors.map((err) => `${entry.url}: ${err}`));
          }
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to fetch';
        allErrors.push(`${entry.url}: ${errorMsg}`);

        setUrlEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, status: 'error' as const, error: errorMsg } : e
          )
        );
      }
    }

    if (allProperties.length > 0) {
      setParsedData({
        success: true,
        properties: allProperties,
        errors: allErrors
      });
      setStep('review');
      toast.success(`Loaded ${allProperties.length} properties from ${successCount} URL(s)`);
    } else {
      setParsedData({
        success: false,
        properties: [],
        errors: allErrors.length > 0 ? allErrors : ['No valid properties found in any URL']
      });
      toast.error('No valid properties found in any of the URLs');
    }

    setFetchingUrls(false);
  };

  const handleImport = async () => {
    if (!parsedData || !user) return;

    setStep('importing');
    setImporting(true);

    const supabase = createClient();
    let successCount = 0;
    let failedCount = 0;

    for (const property of parsedData.properties) {
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        // Must match host properties panel: .eq('host_id', getHostScopeUserId(...)) (incl. admin impersonation)
        const userId =
          supabaseUser && user
            ? getHostScopeUserId(user, supabaseUser.id)
            : getHostScopeUserIdFromAuthOnly(user) || user.id;
        const propertyId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const amenitiesArray = parseAmenitiesList(property.amenities);

        const propertyData = {
          id: propertyId,
          host_id: userId,
          name: property.name,
          title: property.name,
          description: property.description,
          location: property.location,
          price: property.price,
          images: (property.imageUrls || []).map((u) => unwrapProxiedImageUrl(u)),
          amenities: amenitiesArray,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          beds: property.beds,
          guests: property.guests,
          status: 'active',
          type: property.type,
          guest_access_type: property.guestAccessType,
          // CSV only has coarse wellnessFriendly — map to outside-only defaults.
          wellness_friendly: property.wellnessFriendly || false,
          wellness_consumption_indoor_allowed: false,
          wellness_consumption_outdoor_allowed: property.wellnessFriendly || false,
          smoking_inside_allowed: false,
          smoking_outside_allowed: false,
          smoke_friendly: false,
          cleaning_fee: property.cleaningFee ?? 0,
          ...(Number.isFinite(property.latitude) && Number.isFinite(property.longitude)
            ? {
                latitude: property.latitude,
                longitude: property.longitude,
                google_maps_url:
                  property.googleMapsUrl ||
                  `https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`,
              }
            : {}),
        };

        const { error } = await supabase.from('properties').insert(propertyData);

        if (error) {
          console.error('Error inserting property:', error);
          failedCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error('Error importing property:', error);
        failedCount++;
      }
    }

    setImportResults({ success: successCount, failed: failedCount });
    setStep('complete');
    setImporting(false);

    if (successCount > 0) {
      toast.success(`${successCount} ${successCount === 1 ? 'property' : 'properties'} imported successfully!`);
      router.refresh();
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} properties failed to import`);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = BULK_CSV_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/host/properties/new"
            className="text-emerald-500 hover:text-emerald-400 mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back to New Property
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Bulk Import Properties</h1>
          <p className="text-gray-400">
            Download our spreadsheet template, fill in listings from any site, then upload. Use listing page links for Airbnb or your own site.
          </p>
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-8">
            {/* Import Mode Selector */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold text-lg mb-4">Choose Import Method</h3>
              <div className="flex gap-3 p-1 bg-gray-800 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setImportMode('csv')}
                  className={`px-4 py-2.5 rounded-lg font-medium transition flex items-center gap-2 ${
                    importMode === 'csv'
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileText size={18} />
                  Upload CSV File
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('url')}
                  className={`px-4 py-2.5 rounded-lg font-medium transition flex items-center gap-2 ${
                    importMode === 'url'
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Globe size={18} />
                  Import from URL
                </button>
              </div>
            </div>

            {/* Template Download */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="text-blue-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-1">Download CSV Template</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Use this VibesBnB format for every listing, whether the data comes from Airbnb, Booking, VRBO, or your own site. Do not upload marketplace CSV exports — copy values into this template instead. Quote locations like &quot;Aspen, Colorado&quot; so commas stay in the right column.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition"
                  >
                    <Download size={16} />
                    Download Template
                  </button>
                </div>
              </div>
            </div>

            {/* CSV File Upload */}
            {importMode === 'csv' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Upload Your CSV File</h3>
                
                <label className="block border-2 border-dashed border-gray-700 rounded-xl p-12 text-center cursor-pointer hover:border-emerald-500 transition">
                  <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-white font-medium mb-2">Click to upload or drag and drop</p>
                  <p className="text-gray-500 text-sm">CSV files only (max 1MB)</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {parsedData && !parsedData.success && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-red-400 font-medium">Error parsing file</p>
                        <ul className="text-red-400/80 text-sm mt-1 list-disc list-inside">
                          {parsedData.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* URL Import */}
            {importMode === 'url' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold text-lg">Import from External URLs</h3>
                  <span className="text-emerald-400 text-sm font-medium">
                    {urlEntries.filter(e => e.url.trim()).length} URL(s)
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Paste <strong className="text-gray-200">Airbnb, Booking.com, VRBO</strong>, or your own listing
                  page links (one property per URL). We scrape those pages. For a spreadsheet, download our template
                  and either upload the file or publish it as CSV (Google Sheets) using the same columns.
                </p>
                
                <div className="space-y-3 mb-4">
                  {urlEntries.map((entry, index) => (
                    <div key={entry.id} className="flex gap-3 items-center">
                      <div className="flex-1 relative">
                        <input
                          type="url"
                          value={entry.url}
                          onChange={(e) => updateUrlEntry(entry.id, e.target.value)}
                          placeholder={`URL ${index + 1}: https://www.airbnb.com/rooms/… or a published CSV link`}
                          disabled={fetchingUrls}
                          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 ${
                            entry.status === 'success' 
                              ? 'border-emerald-500' 
                              : entry.status === 'error' 
                                ? 'border-red-500' 
                                : 'border-gray-700'
                          }`}
                        />
                        {entry.status === 'loading' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 size={18} className="text-emerald-500 animate-spin" />
                          </div>
                        )}
                        {entry.status === 'success' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <span className="text-emerald-400 text-xs">{entry.propertyCount} properties</span>
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          </div>
                        )}
                        {entry.status === 'error' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <AlertTriangle size={18} className="text-red-500" />
                          </div>
                        )}
                      </div>
                      {urlEntries.length > 1 && (
                        <button
                          onClick={() => removeUrlEntry(entry.id)}
                          disabled={fetchingUrls}
                          className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-50 transition"
                          title="Remove URL"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mb-4">
                  <button
                    onClick={addUrlEntry}
                    disabled={fetchingUrls}
                    className="flex-1 px-4 py-2.5 border-2 border-dashed border-gray-700 hover:border-emerald-500 text-gray-400 hover:text-emerald-400 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={18} />
                    Add Another URL
                  </button>
                  <button
                    onClick={handleUrlFetch}
                    disabled={fetchingUrls || urlEntries.every(e => !e.url.trim())}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center gap-2"
                  >
                    {fetchingUrls ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Fetching All...
                      </>
                    ) : (
                      <>
                        <ExternalLink size={18} />
                        Fetch from URLs
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-200 text-sm font-medium mb-2">Tips for external URLs:</p>
                  <ul className="text-blue-200/70 text-xs space-y-1 list-disc list-inside">
                    <li>
                      <strong>Listing pages:</strong> paste the full Airbnb / Booking / VRBO / your-site URL — we scrape
                      one property per link.
                    </li>
                    <li>
                      <strong>Published CSV:</strong> must use the VibesBnB template columns (Google Sheets: File → Share
                      → Publish to web → CSV).
                    </li>
                    <li><strong>Dropbox:</strong> Use the direct download link (change dl=0 to dl=1)</li>
                  </ul>
                </div>

                {parsedData && !parsedData.success && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-red-400 font-medium">Errors encountered</p>
                        <ul className="text-red-400/80 text-sm mt-1 list-disc list-inside max-h-32 overflow-auto">
                          {parsedData.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Required Fields Info */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Required CSV Columns</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {REQUIRED_BULK_CSV_COLUMNS.map((col) => (
                  <div key={col} className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-gray-300 text-sm">{col}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h4 className="text-gray-400 text-sm font-medium mb-2">Optional Columns</h4>
                <p className="text-gray-500 text-sm">
                  {OPTIONAL_BULK_CSV_COLUMNS.join(', ')}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Amenities and image URLs are pipe-separated (e.g. WiFi|Kitchen|Parking). Bathrooms may be decimals
                  (2.5) and must be between 0 and 20.
                </p>
                <p className="text-emerald-400/80 text-sm mt-2">
                  <strong>image_urls</strong> — pipe-separated HTTPS URLs (e.g. https://url1.jpg|https://url2.jpg)
                </p>
              </div>
            </div>

            {/* Admin Notice */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
                <p className="text-amber-200 text-sm">
                  Bulk-imported properties are published as active listings (you can edit or unpublish anytime).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && parsedData && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-white font-semibold text-lg">Review Properties</h3>
                  <p className="text-gray-400 text-sm">
                    {parsedData.properties.length} properties ready to import. Confirm bathrooms, bedrooms, and price — highlighted values look unusually high.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setParsedData(null);
                    setStep('upload');
                    setUrlEntries([{ id: '1', url: '', status: 'pending' }]);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {parsedData.errors.length > 0 && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-400 font-medium text-sm mb-2">
                    {parsedData.errors.length} issue{parsedData.errors.length === 1 ? '' : 's'} with this file:
                  </p>
                  <ul className="text-amber-400/80 text-xs list-disc list-inside max-h-24 overflow-auto">
                    {parsedData.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4 max-h-[70vh] overflow-auto">
                {parsedData.properties.map((prop, index) => {
                  const amenityList = parseAmenitiesList(prop.amenities);
                  const isExpanded = expandedReviewIndex === index;
                  const hasWarnings = (prop.warnings?.length || 0) > 0;

                  return (
                  <div
                    key={index}
                    className={`p-4 bg-gray-800/50 rounded-lg border ${
                      hasWarnings ? 'border-amber-500/40' : 'border-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-white font-medium">{prop.name}</h4>
                        <p className="text-gray-400 text-sm">{prop.location}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {(prop.cleaningFee ?? 0) > 0 && (
                          <p className="text-gray-400 text-xs">+ ${prop.cleaningFee} cleaning / stay</p>
                        )}
                        <p className="text-gray-500 text-xs">{prop.type}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {REVIEW_COUNT_FIELDS.map(({ field, label }) => {
                        const bounds = NUMERIC_BOUNDS[field];
                        const value = prop[field];
                        const suspicious = isCountSuspicious(field, value);
                        return (
                          <label key={field} className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
                            <input
                              type="number"
                              min={bounds.min}
                              max={bounds.max}
                              step={field === 'bathrooms' || field === 'price' ? 0.5 : 1}
                              value={value}
                              onChange={(e) => updateReviewCount(index, field, e.target.value)}
                              className={`w-full px-2 py-1.5 rounded-md bg-gray-900 border text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                suspicious
                                  ? 'border-amber-500 text-amber-300'
                                  : 'border-gray-700 text-white'
                              }`}
                            />
                          </label>
                        );
                      })}
                    </div>

                    {hasWarnings && (
                      <ul className="mt-3 text-amber-300/90 text-xs space-y-1">
                        {prop.warnings!.map((warning) => (
                          <li key={warning} className="flex items-start gap-1.5">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                      {prop.imageUrls && prop.imageUrls.length > 0 && (
                        <span className="text-emerald-400">{prop.imageUrls.length} images</span>
                      )}
                      <span className="text-emerald-400/80">{amenityList.length} amenities</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedReviewIndex(isExpanded ? null : index)}
                      className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      {isExpanded ? 'Hide amenities' : 'Edit amenities (119 available)'}
                    </button>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <PropertyAmenitiesPicker
                          selected={amenityList}
                          onChange={(amenities) => updateReviewPropertyAmenities(index, amenities)}
                          compact
                        />
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setParsedData(null);
                  setStep('upload');
                  setUrlEntries([{ id: '1', url: '', status: 'pending' }]);
                }}
                className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition font-semibold"
              >
                Import {parsedData.properties.length} Properties
              </button>
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Loader2 size={48} className="mx-auto text-emerald-500 animate-spin mb-4" />
            <h3 className="text-white font-semibold text-xl mb-2">Importing Properties...</h3>
            <p className="text-gray-400">Please wait while we import your properties</p>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-4" />
              <h3 className="text-white font-semibold text-2xl mb-2">Import Complete!</h3>
              <p className="text-gray-400 mb-6">
                {importResults.success} {importResults.success === 1 ? 'property' : 'properties'} imported successfully
                {importResults.failed > 0 && `, ${importResults.failed} failed`}
              </p>
              
              <div className="flex gap-4 justify-center">
                <Link
                  href="/host/properties"
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition font-semibold"
                >
                  View My Properties
                </Link>
                <button
                  onClick={() => {
                    setParsedData(null);
                    setStep('upload');
                    setImportResults({ success: 0, failed: 0 });
                    setUrlEntries([{ id: '1', url: '', status: 'pending' }]);
                  }}
                  className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Import More
                </button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-amber-200 font-medium">Next Steps</p>
                  <p className="text-amber-200/70 text-sm mt-1">
                    Your listings are live or ready to view. You can edit details or add photos from your properties dashboard anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
