'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Calendar, MapPin, DollarSign } from 'lucide-react';

interface Itinerary {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  destination: {
    city: string;
    state: string;
    country: string;
  };
  estimatedBudget?: number;
  actualSpent?: number;
  currency: string;
}

export default function ItineraryListPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }

    if (user) {
      fetchItineraries();
    }
  }, [user, isLoading, router]);

  const fetchItineraries = async () => {
    try {
      const data = await api.get('/itinerary');
      setItineraries(data);
    } catch (error) {
      console.error('Error fetching itineraries:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your itineraries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Trip Itineraries</h1>
            <p className="text-gray-600 mt-2">Plan your perfect wellness getaway</p>
          </div>
          <button
            onClick={() => router.push('/itinerary/new')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            <Plus className="w-5 h-5" />
            Create Itinerary
          </button>
        </div>

        {itineraries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No itineraries yet
            </h2>
            <p className="text-gray-600 mb-6">
              Start planning your wellness journey with our itinerary planner!
            </p>
            <button
              onClick={() => router.push('/itinerary/new')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Create Your First Itinerary
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itineraries.map((itinerary) => (
              <div
                key={itinerary.id}
                onClick={() => router.push(`/itinerary/${itinerary.id}`)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              >
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {itinerary.title}
                  </h3>
                  {itinerary.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {itinerary.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      {itinerary.destination.city}, {itinerary.destination.state}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(itinerary.startDate).toLocaleDateString()} -{' '}
                      {new Date(itinerary.endDate).toLocaleDateString()}
                    </div>
                    {itinerary.estimatedBudget && (
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Budget: ${(itinerary.estimatedBudget / 100).toFixed(0)} |
                        Spent: ${((itinerary.actualSpent || 0) / 100).toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

