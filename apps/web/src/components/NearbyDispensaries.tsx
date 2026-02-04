'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Leaf, 
  Truck, 
  MapPin, 
  Plus, 
  MessageSquare, 
  ChevronRight,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Dispensary {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  delivery_radius: number;
}

export interface InventoryItem {
  id: string;
  category: string;
  name: string;
  price: number;
  image: string;
}

interface NearbyDispensariesProps {
  propertyLocation: string;
  propertyCoordinates?: { lat: number; lng: number };
  propertyId: string;
  propertyName: string;
  onAddItem?: (item: InventoryItem) => void;
}

// Haversine formula to calculate distance between two points in miles
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8; // Radius of the earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d;
};

export default function NearbyDispensaries({ 
  propertyLocation, 
  propertyCoordinates, 
  propertyId,
  propertyName,
  onAddItem
}: NearbyDispensariesProps) {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [selectedDispensary, setSelectedDispensary] = useState<Dispensary | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (propertyCoordinates) {
      fetchDispensaries();
    }
  }, [propertyCoordinates]);

  const fetchDispensaries = async () => {
    try {
      setLoading(true);
      // Fetch active dispensaries (we'll filter by distance locally for simplicity)
      const { data, error } = await supabase
        .from('dispensaries')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      if (data && propertyCoordinates) {
        // Filter by delivery radius and distance
        const nearby = data.filter((d: any) => {
          if (!d.latitude || !d.longitude) return false;
          const distance = calculateDistance(
            propertyCoordinates.lat,
            propertyCoordinates.lng,
            d.latitude,
            d.longitude
          );
          // Property must be within delivery radius
          return distance <= d.delivery_radius;
        });

        setDispensaries(nearby);
      }
    } catch (error) {
      console.error('Error fetching dispensaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (dispensaryId: string) => {
    try {
      const { data, error } = await supabase
        .from('dispensary_inventory')
        .select('*')
        .eq('dispensary_id', dispensaryId)
        .eq('status', 'active');

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleSelectDispensary = (dispensary: Dispensary) => {
    setSelectedDispensary(dispensary);
    fetchInventory(dispensary.id);
  };

  const handleRequestDispensary = async () => {
    setRequesting(true);
    try {
      const { error } = await supabase
        .from('dispensary_requests')
        .insert({
          property_id: propertyId,
          property_name: propertyName,
          location: propertyLocation,
        });

      if (error) throw error;
      toast.success('Interest registered! We will notify you when a dispensary is available.');
    } catch (error) {
      toast.error('Failed to register interest');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-4 bg-white/5 rounded w-1/4"></div>
        <div className="h-32 bg-white/5 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8 border-t border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center">
            <Leaf className="text-primary-500 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Wellness Supplies</h2>
            <p className="text-muted text-sm">Pre-order from local dispensaries</p>
          </div>
        </div>
      </div>

      {dispensaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!selectedDispensary ? (
            dispensaries.map(disp => (
              <button
                key={disp.id}
                onClick={() => handleSelectDispensary(disp)}
                className="bg-surface border border-white/5 p-6 rounded-[2rem] text-left hover:border-primary-500/30 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-primary-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Truck className="text-primary-500" />
                  </div>
                  <div className="px-3 py-1 bg-primary-500/10 rounded-full text-[10px] font-bold text-primary-500 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    Delivers Here
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1">{disp.name}</h3>
                <p className="text-muted text-xs mb-4 flex items-center gap-1">
                  <MapPin size={12} />
                  {disp.location}
                </p>
                <div className="flex items-center text-primary-500 font-bold text-sm">
                  View Inventory
                  <ChevronRight size={16} />
                </div>
              </button>
            ))
          ) : (
            <div className="col-span-full space-y-6">
              <div className="bg-surface border border-white/5 p-8 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <button 
                    onClick={() => setSelectedDispensary(null)}
                    className="text-primary-500 font-bold text-sm mb-2 flex items-center gap-1 hover:underline"
                  >
                    Back to dispensaries
                  </button>
                  <h3 className="text-3xl font-bold">{selectedDispensary.name}</h3>
                  <p className="text-muted flex items-center gap-2 mt-2">
                    <Truck size={16} className="text-primary-500" />
                    Delivery available to your stay
                  </p>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl">
                   <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center">
                    <Clock className="text-primary-500" />
                   </div>
                   <div>
                     <div className="text-xs text-muted uppercase font-bold tracking-widest">Est. Delivery</div>
                     <div className="font-bold">30-45 minutes</div>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {inventory.map(item => (
                  <div key={item.id} className="bg-surface border border-white/5 rounded-[2rem] overflow-hidden group">
                    <div className="aspect-square relative overflow-hidden">
                      <img 
                        src={item.image || 'https://images.unsplash.com/photo-1533134842197-09f87b328114?auto=format&fit=crop&q=80&w=400'} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                      <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-widest">
                        {item.category}
                      </div>
                    </div>
                    <div className="p-5">
                      <h4 className="font-bold mb-1 truncate">{item.name}</h4>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-lg font-black text-primary-500">${item.price}</span>
                        <button 
                          onClick={() => onAddItem?.(item)}
                          className="p-2 bg-primary-500 text-black rounded-xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,230,118,0.2)]"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {inventory.length === 0 && (
                <div className="text-center py-20 bg-surface rounded-[2.5rem] border border-white/5">
                  <Package className="w-12 h-12 text-muted mx-auto mb-4 opacity-20" />
                  <p className="text-muted">No items currently available.</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface-dark border border-white/5 rounded-3xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="text-muted w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">No Dispensaries Available</h3>
            <p className="text-muted max-w-sm mx-auto">
              There are no dispensaries that deliver to this property as of now, but we will have one soon!
            </p>
          </div>
          <button 
            onClick={handleRequestDispensary}
            disabled={requesting}
            className="btn-secondary !bg-primary-500/10 !border-primary-500/20 !text-primary-500 hover:!bg-primary-500/20 transition-all"
          >
            {requesting ? 'Requesting...' : 'Request a Dispensary Near Here'}
          </button>
        </div>
      )}
    </div>
  );
}
