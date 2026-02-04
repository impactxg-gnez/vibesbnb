'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Trash2, 
  Store, 
  Package, 
  Truck, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  Upload,
  X,
  MapPin,
  Save,
  ChevronRight
} from 'lucide-react';
import Image from 'next/image';

interface Dispensary {
  id: string;
  name: string;
  location: string;
  delivery_radius: number;
  status: string;
  latitude: number;
  longitude: number;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  status: string;
}

export default function DispensaryDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'settings'>('overview');
  const [dispensary, setDispensary] = useState<Dispensary | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Flower',
    price: '',
    image: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchDispensaryData();
    }
  }, [user, loading]);

  const fetchDispensaryData = async () => {
    setIsLoading(true);
    try {
      // Fetch dispensary details
      const { data: dispData, error: dispError } = await supabase
        .from('dispensaries')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (dispError && dispError.code !== 'PGRST116') {
        throw dispError;
      }

      if (dispData) {
        setDispensary(dispData);
        // Fetch inventory
        const { data: invData, error: invError } = await supabase
          .from('dispensary_inventory')
          .select('*')
          .eq('dispensary_id', dispData.id);

        if (invError) throw invError;
        setInventory(invData || []);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispensary) return;

    try {
      const { data, error } = await supabase
        .from('dispensary_inventory')
        .insert({
          dispensary_id: dispensary.id,
          name: newItem.name,
          category: newItem.category,
          price: parseFloat(newItem.price),
          image: newItem.image || 'https://images.unsplash.com/photo-1533134842197-09f87b328114?auto=format&fit=crop&q=80&w=400',
        })
        .select()
        .single();

      if (error) throw error;

      setInventory([...inventory, data]);
      setIsAddingItem(false);
      setNewItem({ name: '', category: 'Flower', price: '', image: '' });
      toast.success('Item added to inventory');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;

    try {
      const { error } = await supabase
        .from('dispensary_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInventory(inventory.filter(item => item.id !== id));
      toast.success('Item removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove item');
    }
  };

  const updateRadius = async (radius: number) => {
    if (!dispensary) return;

    try {
      const { error } = await supabase
        .from('dispensaries')
        .update({ delivery_radius: radius })
        .eq('id', dispensary.id);

      if (error) throw error;
      setDispensary({ ...dispensary, delivery_radius: radius });
      toast.success('Delivery radius updated');
    } catch (error: any) {
      toast.error('Failed to update radius');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-surface-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div>
      </div>
    );
  }

  if (!dispensary) {
    return (
      <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-xl w-full bg-surface border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
          <Store className="w-16 h-16 text-primary-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Complete Your Profile</h1>
          <p className="text-muted mb-8">
            Tell us more about your dispensary to start reaching travellers.
          </p>
          
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as any;
              const name = target.elements.dispName.value;
              const location = target.elements.dispLoc.value;
              const radius = parseInt(target.elements.dispRadius.value);
              
              try {
                const { data, error } = await supabase
                  .from('dispensaries')
                  .insert({
                    user_id: user?.id,
                    name,
                    location,
                    delivery_radius: radius,
                    status: 'pending'
                  })
                  .select()
                  .single();
                  
                if (error) throw error;
                setDispensary(data);
                toast.success('Dispensary profile created! We will review it shortly.');
              } catch (err: any) {
                toast.error(err.message || 'Failed to create profile');
              }
            }}
            className="space-y-6 text-left"
          >
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Dispensary Name</label>
              <input required name="dispName" className="input !py-4" placeholder="e.g. Green Haven" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Location Address</label>
              <input required name="dispLoc" className="input !py-4" placeholder="e.g. Miami, FL" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Delivery Radius (miles)</label>
              <input required name="dispRadius" type="number" defaultValue="10" className="input !py-4" />
            </div>
            <button type="submit" className="btn-primary w-full !py-5 text-lg mt-4">
              Save Profile
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark flex">
      {/* Sidebar */}
      <aside className="w-72 bg-surface border-r border-white/5 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,230,118,0.3)]">
            <span className="text-black font-black text-xl">V</span>
          </div>
          <span className="font-bold text-xl tracking-tight">Dispensary</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'overview' ? 'bg-primary-500 text-black font-bold' : 'text-muted hover:bg-white/5'}`}
          >
            <LayoutDashboard size={20} />
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'inventory' ? 'bg-primary-500 text-black font-bold' : 'text-muted hover:bg-white/5'}`}
          >
            <Package size={20} />
            Inventory
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-primary-500 text-black font-bold' : 'text-muted hover:bg-white/5'}`}
          >
            <Settings size={20} />
            Settings
          </button>
        </nav>

        <button 
          onClick={() => signOut()}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome, {dispensary.name}</h1>
            <p className="text-muted flex items-center gap-2">
              <MapPin size={16} className="text-primary-500" />
              {dispensary.location}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest border ${dispensary.status === 'active' ? 'bg-primary-500/10 border-primary-500 text-primary-500' : 'bg-yellow-500/10 border-yellow-500 text-yellow-500'}`}>
            {dispensary.status}
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface p-8 rounded-[2.5rem] border border-white/5">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <Package className="text-blue-500" />
                </div>
                <div className="text-4xl font-bold mb-1">{inventory.length}</div>
                <div className="text-muted font-medium uppercase tracking-wider text-sm">Active Items</div>
              </div>
              
              <div className="bg-surface p-8 rounded-[2.5rem] border border-white/5">
                <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <Truck className="text-primary-500" />
                </div>
                <div className="text-4xl font-bold mb-1">{dispensary.delivery_radius} mi</div>
                <div className="text-muted font-medium uppercase tracking-wider text-sm">Delivery Radius</div>
              </div>

              <div className="bg-surface p-8 rounded-[2.5rem] border border-white/5">
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <Store className="text-purple-500" />
                </div>
                <div className="text-4xl font-bold mb-1">0</div>
                <div className="text-muted font-medium uppercase tracking-wider text-sm">Orders Today</div>
              </div>
            </div>

            <div className="bg-surface rounded-[2.5rem] border border-white/5 p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Truck className="text-primary-500" />
                Delivery Area
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-muted font-medium">Adjust Delivery Radius</span>
                  <span className="text-primary-500 font-bold text-xl">{dispensary.delivery_radius} miles</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="50"
                  value={dispensary.delivery_radius}
                  onChange={(e) => updateRadius(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Save className="text-primary-500 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Service area optimization</h3>
                    <p className="text-muted text-sm leading-relaxed">
                      Increasing your radius allows you to reach more travellers, but ensure you can maintain consistent delivery times.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold mb-2">Product Inventory</h2>
                <p className="text-muted">Manage your stock and categories</p>
              </div>
              <button 
                onClick={() => setIsAddingItem(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={20} />
                Add New Item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory.map(item => (
                <div key={item.id} className="card group">
                  <div className="relative h-48">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <Package className="text-white/10 w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-3 bg-red-500 text-white rounded-2xl shadow-xl hover:bg-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-primary-500 bg-primary-500/10 px-2 py-1 rounded-md mb-2 inline-block">
                          {item.category}
                        </span>
                        <h3 className="font-bold text-xl">{item.name}</h3>
                      </div>
                      <div className="text-2xl font-black text-white">${item.price}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {inventory.length === 0 && !isAddingItem && (
              <div className="text-center py-24 bg-surface rounded-[2.5rem] border border-dashed border-white/10">
                <Package className="w-16 h-16 text-muted mx-auto mb-6 opacity-20" />
                <h3 className="text-xl font-bold text-muted">Your inventory is empty</h3>
                <p className="text-muted/60 mt-2">Start adding products to show them to travellers</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-surface p-10 rounded-[2.5rem] border border-white/5 animate-in fade-in duration-500">
             <h2 className="text-2xl font-bold mb-8">Business Settings</h2>
             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Dispensary Name</label>
                  <input type="text" value={dispensary.name} className="input !py-4" disabled />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Location Address</label>
                  <input type="text" value={dispensary.location} className="input !py-4" disabled />
                </div>
                <div className="pt-4 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl">
                  <p className="text-yellow-500 text-sm font-medium">
                    To change your registered store location, please contact support at partners@vibesbnb.com.
                  </p>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Add Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddingItem(false)} />
          <div className="relative bg-surface border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-300">
            <button 
              onClick={() => setIsAddingItem(false)}
              className="absolute top-8 right-8 text-muted hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-3xl font-bold mb-8">Add New Product</h2>
            
            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Product Name</label>
                <input 
                  required
                  type="text" 
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  className="input !py-4" 
                  placeholder="e.g. Wedding Cake OG"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Category</label>
                  <select 
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                    className="input !py-4 appearance-none"
                  >
                    <option>Flower</option>
                    <option>Edibles</option>
                    <option>Concentrates</option>
                    <option>Vapes</option>
                    <option>Pre-rolls</option>
                    <option>Wellness</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Price ($)</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    value={newItem.price}
                    onChange={e => setNewItem({...newItem, price: e.target.value})}
                    className="input !py-4" 
                    placeholder="25.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Image URL (Optional)</label>
                <input 
                  type="text" 
                  value={newItem.image}
                  onChange={e => setNewItem({...newItem, image: e.target.value})}
                  className="input !py-4" 
                  placeholder="https://..."
                />
              </div>

              <button type="submit" className="btn-primary w-full !py-5 text-lg mt-4">
                Add to Inventory
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
