'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { MapPin, Calendar, Plus, Trash2, Edit2, Map } from 'lucide-react';
import { GoogleMap, MapFallback } from '@/components/map/GoogleMap';

interface Itinerary {
  id: string;
  userId: string;
  bookingId?: string;
  name: string;
  startDate: string;
  endDate: string;
  destination: {
    city: string;
    state: string;
    country: string;
  };
  items: ItineraryItem[];
  createdAt: string;
  updatedAt: string;
}

interface ItineraryItem {
  id: string;
  itineraryId: string;
  type: 'dispensary' | 'restaurant' | 'wellness' | 'activity' | 'transportation' | 'other';
  name: string;
  description?: string;
  address?: string;
  lat?: number;
  lng?: number;
  date: string;
  time?: string;
  duration?: number;
  cost?: number;
  reservationUrl?: string;
  notes?: string;
  order: number;
}

const typeColors = {
  dispensary: 'bg-green-100 text-green-800 border-green-200',
  restaurant: 'bg-orange-100 text-orange-800 border-orange-200',
  wellness: 'bg-purple-100 text-purple-800 border-purple-200',
  activity: 'bg-blue-100 text-blue-800 border-blue-200',
  transportation: 'bg-gray-100 text-gray-800 border-gray-200',
  other: 'bg-pink-100 text-pink-800 border-pink-200',
};

const typeIcons = {
  dispensary: '🌿',
  restaurant: '🍽️',
  wellness: '🧘',
  activity: '🎯',
  transportation: '🚗',
  other: '📍',
};

export default function ItineraryDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && id) {
      fetchItinerary();
    }
  }, [user, id]);

  const fetchItinerary = async () => {
    try {
      const data = await api.get(`/itinerary/${id}`);
      setItinerary(data);
    } catch (error) {
      console.error('Error fetching itinerary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await api.delete(`/itinerary/${id}/items/${itemId}`);
      fetchItinerary();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Itinerary not found</h2>
          <button
            onClick={() => router.push('/itinerary')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to itineraries
          </button>
        </div>
      </div>
    );
  }

  // Group items by date
  const itemsByDate = itinerary.items.reduce((acc, item) => {
    const date = item.date.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, ItineraryItem[]>);

  // Sort dates
  const sortedDates = Object.keys(itemsByDate).sort();

  // Prepare map markers
  const markers = itinerary.items
    .filter(item => item.lat && item.lng)
    .map(item => ({
      lat: item.lat!,
      lng: item.lng!,
      title: item.name,
      icon: typeIcons[item.type],
    }));

  const centerLat = markers.length > 0 ? markers.reduce((sum, m) => sum + m.lat, 0) / markers.length : 40;
  const centerLng = markers.length > 0 ? markers.reduce((sum, m) => sum + m.lng, 0) / markers.length : -100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{itinerary.name}</h1>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{itinerary.destination.city}, {itinerary.destination.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>
                    {new Date(itinerary.startDate).toLocaleDateString()} - {new Date(itinerary.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Map className="w-5 h-5" />
                {viewMode === 'list' ? 'Map View' : 'List View'}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'list' ? (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h2>
                </div>
                <div className="divide-y">
                  {itemsByDate[date]
                    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                    .map((item) => (
                      <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">{typeIcons[item.type]}</span>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${typeColors[item.type]}`}>
                                  {item.type}
                                </span>
                              </div>
                            </div>
                            {item.description && (
                              <p className="text-gray-600 mb-2 ml-11">{item.description}</p>
                            )}
                            <div className="ml-11 space-y-1">
                              {item.time && (
                                <p className="text-sm text-gray-500">⏰ {item.time}</p>
                              )}
                              {item.address && (
                                <p className="text-sm text-gray-500">📍 {item.address}</p>
                              )}
                              {item.duration && (
                                <p className="text-sm text-gray-500">⏱️ {item.duration} minutes</p>
                              )}
                              {item.cost && (
                                <p className="text-sm text-gray-500">💵 ${(item.cost / 100).toFixed(2)}</p>
                              )}
                              {item.notes && (
                                <p className="text-sm text-gray-600 italic mt-2">📝 {item.notes}</p>
                              )}
                              {item.reservationUrl && (
                                <a
                                  href={item.reservationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mt-2"
                                >
                                  View Reservation →
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  {itemsByDate[date].length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                      No activities planned for this day
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sortedDates.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500 mb-4">No items in your itinerary yet</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Add Your First Item
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            {markers.length > 0 ? (
              typeof window !== 'undefined' && (window as any).google ? (
                <GoogleMap
                  center={{ lat: centerLat, lng: centerLng }}
                  zoom={12}
                  markers={markers}
                  className="w-full h-[600px] rounded-lg"
                />
              ) : (
                <MapFallback
                  address={`${itinerary.destination.city}, ${itinerary.destination.state}`}
                  className="w-full h-[600px]"
                />
              )
            ) : (
              <div className="h-[600px] flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No locations to display on map</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          itineraryId={id as string}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchItinerary();
          }}
        />
      )}
    </div>
  );
}

// Add Item Modal Component
function AddItemModal({
  itineraryId,
  onClose,
  onSuccess,
}: {
  itineraryId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    type: 'activity' as ItineraryItem['type'],
    name: '',
    description: '',
    address: '',
    date: '',
    time: '',
    duration: '',
    cost: '',
    reservationUrl: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post(`/itinerary/${itineraryId}/items`, {
        ...formData,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        cost: formData.cost ? parseFloat(formData.cost) * 100 : undefined,
      });
      onSuccess();
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">Add Itinerary Item</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="dispensary">🌿 Dispensary</option>
              <option value="restaurant">🍽️ Restaurant</option>
              <option value="wellness">🧘 Wellness</option>
              <option value="activity">🎯 Activity</option>
              <option value="transportation">🚗 Transportation</option>
              <option value="other">📍 Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reservation URL</label>
            <input
              type="url"
              value={formData.reservationUrl}
              onChange={(e) => setFormData({ ...formData, reservationUrl: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

