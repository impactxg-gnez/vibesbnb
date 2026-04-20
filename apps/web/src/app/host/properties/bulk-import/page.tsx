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

interface BulkProperty {
  name: string;
  type: string;
  guestAccessType: string;
  location: string;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  price: number;
  cleaningFee?: number;
  description?: string;
  amenities?: string;
  wellnessFriendly?: boolean;
  smokeFriendly?: boolean;
  imageUrls?: string[];
  sourceUrl?: string;
}

interface ParsedResult {
  success: boolean;
  properties: BulkProperty[];
  errors: string[];
}

interface UrlEntry {
  id: string;
  url: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  propertyCount?: number;
  error?: string;
}

/** URLs that should use listing scrape (not raw CSV fetch). */
function isExternalListingUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    const h = u.hostname.toLowerCase();
    return (
      h.includes('airbnb.') ||
      h.includes('booking.com') ||
      h.includes('vrbo.com') ||
      h.includes('homeaway.') ||
      h.includes('esca-management.com') ||
      h.includes('ammosfl.com')
    );
  } catch {
    return false;
  }
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
  return {
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
    amenities: amenitiesArr.join(';'),
    wellnessFriendly: Boolean(scraped.wellnessFriendly),
    smokeFriendly: false,
    imageUrls: scraped.images?.filter((u) => typeof u === 'string' && u.startsWith('http')) || [],
    sourceUrl,
  };
}

export default function BulkImportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedResult | null>(null);
  const [step, setStep] = useState<'upload' | 'review' | 'importing' | 'complete'>('upload');
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [importMode, setImportMode] = useState<'csv' | 'url'>('csv');
  const [urlEntries, setUrlEntries] = useState<UrlEntry[]>([{ id: '1', url: '', status: 'pending' }]);
  const [fetchingUrls, setFetchingUrls] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const result = parseCSV(text);
      setParsedData(result);
      if (result.success && result.properties.length > 0) {
        setStep('review');
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string, sourceUrl?: string): ParsedResult => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      return { success: false, properties: [], errors: ['File must have a header row and at least one data row'] };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const properties: BulkProperty[] = [];
    const errors: string[] = [];

    const requiredHeaders = ['name', 'type', 'location', 'price', 'guests'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return { success: false, properties: [], errors: [`Missing required columns: ${missingHeaders.join(', ')}`] };
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length < headers.length) {
        errors.push(`Row ${i + 1}: Not enough columns`);
        continue;
      }

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      if (!row.name || !row.location || !row.price) {
        errors.push(`Row ${i + 1}: Missing required fields (name, location, or price)`);
        continue;
      }

      // Parse image URLs if present (pipe-separated)
      const imageUrlsStr = row.image_urls || row.imageurls || row.images || '';
      const imageUrls = imageUrlsStr
        .split('|')
        .map(url => url.trim())
        .filter(url => url && (url.startsWith('http://') || url.startsWith('https://')));

      properties.push({
        name: row.name,
        type: row.type || 'House',
        guestAccessType: row.guestaccesstype || row['guest access type'] || 'An entire place',
        location: row.location,
        guests: parseInt(row.guests) || 2,
        bedrooms: parseInt(row.bedrooms) || 1,
        beds: parseInt(row.beds) || 1,
        bathrooms: parseInt(row.bathrooms) || 1,
        price: parseFloat(row.price) || 100,
        cleaningFee: parseFloat(row.cleaningfee || row.cleaning_fee || row['cleaning fee'] || '0') || 0,
        description: row.description || '',
        amenities: row.amenities || '',
        wellnessFriendly: row.wellnessfriendly?.toLowerCase() === 'true' || row.wellnessfriendly === '1',
        smokeFriendly: row.smokefriendly?.toLowerCase() === 'true' || row.smokefriendly === '1',
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        sourceUrl,
      });
    }

    return {
      success: properties.length > 0,
      properties,
      errors
    };
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
        if (isExternalListingUrl(entry.url)) {
          const response = await fetch('/api/scrape-property', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: entry.url.trim() }),
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

          const bulk = scrapedListingToBulkProperty(scraped, entry.url.trim());
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
          const response = await fetch(`/api/fetch-csv?url=${encodeURIComponent(entry.url)}`);

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
          const result = parseCSV(text, entry.url);

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
        const userId = supabaseUser?.id || user.id;
        const propertyId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const amenitiesArray = property.amenities 
          ? property.amenities.split(';').map(a => a.trim()).filter(Boolean)
          : [];

        const propertyData = {
          id: propertyId,
          host_id: userId,
          name: property.name,
          title: property.name,
          description: property.description,
          location: property.location,
          price: property.price,
          images: property.imageUrls || [],
          amenities: amenitiesArray,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          beds: property.beds,
          guests: property.guests,
          status: 'pending_approval',
          type: property.type,
          guest_access_type: property.guestAccessType,
          wellness_friendly: property.wellnessFriendly,
          smoking_inside_allowed: false,
          smoking_outside_allowed: property.smokeFriendly || false,
          smoke_friendly: property.smokeFriendly || false,
          cleaning_fee: property.cleaningFee ?? 0,
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
      toast.success(`${successCount} properties submitted for approval!`);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} properties failed to import`);
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'type', 'guestAccessType', 'location', 'guests', 'bedrooms', 'beds', 'bathrooms', 'price', 'cleaningFee', 'description', 'amenities', 'wellnessFriendly', 'smokeFriendly', 'image_urls'];
    const exampleRow = ['Mountain View Cabin', 'Cabin', 'An entire place', 'Aspen, Colorado', '4', '2', '3', '1', '250', '75', 'A cozy cabin with stunning mountain views', 'WiFi;Kitchen;Parking;Fireplace', 'true', 'false', 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800|https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800'];
    
    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vibesbnb-property-template.csv';
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
          <p className="text-gray-400">Import multiple properties at once from a CSV file</p>
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
                    Start with our template to ensure your data is formatted correctly. Now supports image URLs!
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
                  Paste <strong className="text-gray-200">Airbnb, Booking.com, or VRBO</strong> listing links (one
                  property per URL), or use a <strong className="text-gray-200">direct CSV</strong> link (e.g. Google
                  Sheets publish). Listing links are scraped on the server — large batches run one URL at a time.
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
                      <strong>Airbnb / Booking / VRBO:</strong> paste the full listing URL — we scrape one property per
                      link (same engine as “Import from URL” on your properties page).
                    </li>
                    <li><strong>Google Sheets:</strong> File → Share → Publish to web → CSV format</li>
                    <li><strong>Dropbox:</strong> Use the direct download link (change dl=0 to dl=1)</li>
                    <li><strong>Direct:</strong> Any publicly accessible CSV file URL</li>
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
                {['name', 'type', 'location', 'price', 'guests'].map((col) => (
                  <div key={col} className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-gray-300 text-sm">{col}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h4 className="text-gray-400 text-sm font-medium mb-2">Optional Columns</h4>
                <p className="text-gray-500 text-sm">
                  bedrooms, beds, bathrooms, cleaningFee (once per stay, USD), description, amenities (separated by ;), wellnessFriendly, smokeFriendly
                </p>
                <p className="text-emerald-400/80 text-sm mt-2">
                  <strong>image_urls</strong> - Pipe-separated image URLs (e.g., https://url1.jpg|https://url2.jpg)
                </p>
              </div>
            </div>

            {/* Admin Notice */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
                <p className="text-amber-200 text-sm">
                  All bulk-imported properties will be submitted for admin approval before going live.
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
                    {parsedData.properties.length} properties ready to import
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
                    {parsedData.errors.length} rows skipped due to errors:
                  </p>
                  <ul className="text-amber-400/80 text-xs list-disc list-inside max-h-24 overflow-auto">
                    {parsedData.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3 max-h-96 overflow-auto">
                {parsedData.properties.map((prop, index) => (
                  <div key={index} className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-white font-medium">{prop.name}</h4>
                        <p className="text-gray-400 text-sm">{prop.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-medium">${prop.price}/night</p>
                        {(prop.cleaningFee ?? 0) > 0 && (
                          <p className="text-gray-400 text-xs">+ ${prop.cleaningFee} cleaning / stay</p>
                        )}
                        <p className="text-gray-500 text-xs">{prop.type}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                      <span>{prop.guests} guests</span>
                      <span>•</span>
                      <span>{prop.bedrooms} bedrooms</span>
                      <span>•</span>
                      <span>{prop.beds} beds</span>
                      <span>•</span>
                      <span>{prop.bathrooms} bath</span>
                      {prop.imageUrls && prop.imageUrls.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">{prop.imageUrls.length} images</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
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
                {importResults.success} properties submitted for approval
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
                    Your properties are pending admin approval. You'll receive a notification once they're reviewed. 
                    Don't forget to add photos to each property!
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
