'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Search, Save, Sparkles, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SearchSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState({
    defaultSearchLocation: '',
    featuredLocations: '',
    maxPrice: '',
    minPrice: '',
  });

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('searchSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Error loading search settings:', e);
      }
    }
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!user || user.user_metadata?.role !== 'admin') {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Save to localStorage (can be extended to save to Supabase)
      localStorage.setItem('searchSettings', JSON.stringify(settings));
      toast.success('Search settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving search settings:', error);
      toast.error(error.message || 'Failed to save search settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAiSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/generate-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`Success! Processed ${data.processed} properties.`);
      } else {
        toast.error(data.error || 'Failed to sync embeddings');
      }
    } catch (error: any) {
      toast.error('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Search className="w-6 h-6" />
            Search Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Configure default search parameters and featured locations
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Search Location
            </label>
            <input
              type="text"
              value={settings.defaultSearchLocation}
              onChange={(e) => setSettings({ ...settings, defaultSearchLocation: e.target.value })}
              placeholder="e.g., Miami, FL"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Featured Locations (one per line)
            </label>
            <textarea
              value={settings.featuredLocations}
              onChange={(e) => setSettings({ ...settings, featuredLocations: e.target.value })}
              placeholder="Miami, FL&#10;Los Angeles, CA&#10;New York, NY"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Price ($)
              </label>
              <input
                type="number"
                value={settings.minPrice}
                onChange={(e) => setSettings({ ...settings, minPrice: e.target.value })}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Price ($)
              </label>
              <input
                type="number"
                value={settings.maxPrice}
                onChange={(e) => setSettings({ ...settings, maxPrice: e.target.value })}
                placeholder="10000"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        <div className="mt-8 bg-purple-900/5 border border-purple-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">AI Vibe Search Management</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Ensure your properties are searchable by "vibe". This process generates vector embeddings for all active properties that haven't been processed yet.
          </p>
          <div className="flex flex-col gap-4">
            <div className="bg-white/50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
              <p className="font-bold mb-1">Status Check:</p>
              <p>The system will automatically process 50 properties at a time to prevent timeouts.</p>
            </div>
            <button
              onClick={handleAiSync}
              disabled={syncing}
              className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-bold shadow-lg shadow-purple-200"
            >
              {syncing ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  Syncing Embeddings...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-5 h-5" />
                  Sync AI Embeddings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

