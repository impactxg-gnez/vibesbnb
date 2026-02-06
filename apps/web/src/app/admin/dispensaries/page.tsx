'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';
import { 
  Leaf, Check, X, MapPin, Truck, Search, Plus, 
  Pause, Play, Trash2, Package, Eye, Edit, Mail, User
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Dispensary {
  id: string;
  user_id: string;
  email: string;
  owner_name: string;
  name: string;
  description: string;
  location: string;
  status: 'pending' | 'active' | 'inactive' | 'paused';
  delivery_radius: number;
  created_at: string;
  latitude?: number;
  longitude?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export default function AdminDispensariesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active' | 'inactive' | 'paused'>('all');
  const [selectedDispensary, setSelectedDispensary] = useState<Dispensary | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [newDispensary, setNewDispensary] = useState({
    name: '',
    email: '',
    owner_name: '',
    location: '',
    delivery_radius: 10,
    description: '',
  });
  const supabase = createClient();

  // Check for filter query param
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'pending') {
      setFilterStatus('pending');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchDispensaries();
  }, [filterStatus]);

  const fetchDispensaries = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('dispensaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDispensaries(data || []);
    } catch (error: any) {
      console.error('Error fetching dispensaries:', error);
      toast.error('Failed to load dispensaries');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'active' | 'inactive' | 'pending' | 'paused') => {
    try {
      const { error } = await supabase
        .from('dispensaries')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      const statusMessages: Record<string, string> = {
        active: 'Dispensary approved and activated',
        paused: 'Dispensary paused',
        inactive: 'Dispensary deactivated',
        pending: 'Dispensary moved to pending',
      };
      
      toast.success(statusMessages[status] || `Status updated to ${status}`);
      fetchDispensaries();
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const deleteDispensary = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this dispensary? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('dispensaries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Dispensary deleted');
      fetchDispensaries();
      setShowDetailModal(false);
    } catch (error: any) {
      toast.error('Failed to delete dispensary');
    }
  };

  const addDispensary = async () => {
    if (!newDispensary.name || !newDispensary.location) {
      toast.error('Name and location are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('dispensaries')
        .insert({
          ...newDispensary,
          status: 'active',
        });

      if (error) throw error;
      
      toast.success('Dispensary added successfully');
      setShowAddModal(false);
      setNewDispensary({
        name: '',
        email: '',
        owner_name: '',
        location: '',
        delivery_radius: 10,
        description: '',
      });
      fetchDispensaries();
    } catch (error: any) {
      toast.error('Failed to add dispensary');
    }
  };

  const openDetails = (dispensary: Dispensary) => {
    setSelectedDispensary(dispensary);
    setShowDetailModal(true);
  };

  const openInventory = (dispensary: Dispensary) => {
    setSelectedDispensary(dispensary);
    // Mock products for now - in production, fetch from database
    setProducts([
      { id: '1', name: 'Product A', price: 25, quantity: 100, category: 'Flower' },
      { id: '2', name: 'Product B', price: 40, quantity: 50, category: 'Edibles' },
      { id: '3', name: 'Product C', price: 35, quantity: 75, category: 'Concentrates' },
    ]);
    setShowInventoryModal(true);
  };

  const filteredDispensaries = dispensaries.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = dispensaries.filter(d => d.status === 'pending').length;
  const activeCount = dispensaries.filter(d => d.status === 'active').length;
  const pausedCount = dispensaries.filter(d => d.status === 'paused').length;

  if (loading) return null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Leaf className="text-primary-500 w-7 h-7" />
              Manage Dispensaries
            </h1>
            <p className="text-gray-500">Review applications, manage partners, and track inventory</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary-500 text-black font-semibold rounded-lg hover:bg-primary-600 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Dispensary
            </button>
          </div>
        </div>

        {/* Clickable Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`bg-white p-6 rounded-xl border-2 shadow-sm text-left transition-all hover:shadow-md ${
              filterStatus === 'pending' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-100'
            }`}
          >
            <div className="text-sm font-medium text-gray-500 mb-1">Pending Approval</div>
            <div className="text-2xl font-bold text-orange-500">{pendingCount}</div>
            {pendingCount > 0 && (
              <div className="text-xs text-orange-600 mt-2 font-medium">Click to review →</div>
            )}
          </button>
          
          <button
            onClick={() => setFilterStatus('active')}
            className={`bg-white p-6 rounded-xl border-2 shadow-sm text-left transition-all hover:shadow-md ${
              filterStatus === 'active' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-100'
            }`}
          >
            <div className="text-sm font-medium text-gray-500 mb-1">Active Partners</div>
            <div className="text-2xl font-bold text-green-500">{activeCount}</div>
          </button>
          
          <button
            onClick={() => setFilterStatus('paused')}
            className={`bg-white p-6 rounded-xl border-2 shadow-sm text-left transition-all hover:shadow-md ${
              filterStatus === 'paused' ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-100'
            }`}
          >
            <div className="text-sm font-medium text-gray-500 mb-1">Paused</div>
            <div className="text-2xl font-bold text-yellow-500">{pausedCount}</div>
          </button>
          
          <button
            onClick={() => setFilterStatus('all')}
            className={`bg-white p-6 rounded-xl border-2 shadow-sm text-left transition-all hover:shadow-md ${
              filterStatus === 'all' ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-100'
            }`}
          >
            <div className="text-sm font-medium text-gray-500 mb-1">Total</div>
            <div className="text-2xl font-bold text-primary-500">{dispensaries.length}</div>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, location, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Dispensary List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Dispensary</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Radius</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading dispensaries...</td>
                  </tr>
                ) : filteredDispensaries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      {filterStatus === 'pending' ? 'No pending applications' : 'No dispensaries found'}
                    </td>
                  </tr>
                ) : (
                  filteredDispensaries.map((dispensary) => (
                    <tr key={dispensary.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{dispensary.name}</div>
                        <div className="text-xs text-gray-500">Applied on {new Date(dispensary.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        {dispensary.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            {dispensary.email}
                          </div>
                        )}
                        {dispensary.owner_name && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <User className="w-3 h-3" />
                            {dispensary.owner_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          {dispensary.location || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Truck className="w-3 h-3" />
                          {dispensary.delivery_radius} mi
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          dispensary.status === 'active' ? 'bg-green-100 text-green-700' :
                          dispensary.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                          dispensary.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {dispensary.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          {/* View Details */}
                          <button
                            onClick={() => openDetails(dispensary)}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* Inventory */}
                          {dispensary.status === 'active' && (
                            <button
                              onClick={() => openInventory(dispensary)}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                              title="View Inventory"
                            >
                              <Package className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Approve */}
                          {dispensary.status === 'pending' && (
                            <button
                              onClick={() => updateStatus(dispensary.id, 'active')}
                              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow-sm"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Pause/Resume */}
                          {dispensary.status === 'active' && (
                            <button
                              onClick={() => updateStatus(dispensary.id, 'paused')}
                              className="p-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition"
                              title="Pause"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )}
                          
                          {dispensary.status === 'paused' && (
                            <button
                              onClick={() => updateStatus(dispensary.id, 'active')}
                              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                              title="Resume"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Reject/Deactivate */}
                          {dispensary.status === 'pending' && (
                            <button
                              onClick={() => updateStatus(dispensary.id, 'inactive')}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Dispensary Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Add New Dispensary</h2>
              <p className="text-sm text-gray-500">Manually add a dispensary partner</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dispensary Name *</label>
                <input
                  type="text"
                  value={newDispensary.name}
                  onChange={(e) => setNewDispensary({...newDispensary, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g. Green Sanctuary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={newDispensary.owner_name}
                  onChange={(e) => setNewDispensary({...newDispensary, owner_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newDispensary.email}
                  onChange={(e) => setNewDispensary({...newDispensary, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="contact@dispensary.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <input
                  type="text"
                  value={newDispensary.location}
                  onChange={(e) => setNewDispensary({...newDispensary, location: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Miami, FL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Radius (miles)</label>
                <input
                  type="number"
                  value={newDispensary.delivery_radius}
                  onChange={(e) => setNewDispensary({...newDispensary, delivery_radius: parseInt(e.target.value) || 10})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newDispensary.description}
                  onChange={(e) => setNewDispensary({...newDispensary, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  rows={3}
                  placeholder="Brief description of the dispensary..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={addDispensary}
                className="px-6 py-2 bg-primary-500 text-black font-semibold rounded-lg hover:bg-primary-600 transition"
              >
                Add Dispensary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispensary Details Modal */}
      {showDetailModal && selectedDispensary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedDispensary.name}</h2>
                <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                  selectedDispensary.status === 'active' ? 'bg-green-100 text-green-700' :
                  selectedDispensary.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                  selectedDispensary.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selectedDispensary.status}
                </span>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase">Owner</div>
                  <div className="text-gray-900">{selectedDispensary.owner_name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase">Email</div>
                  <div className="text-gray-900">{selectedDispensary.email || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase">Location</div>
                  <div className="text-gray-900">{selectedDispensary.location || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase">Delivery Radius</div>
                  <div className="text-gray-900">{selectedDispensary.delivery_radius} miles</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-medium text-gray-500 uppercase">Description</div>
                  <div className="text-gray-900">{selectedDispensary.description || 'No description provided'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-medium text-gray-500 uppercase">Applied On</div>
                  <div className="text-gray-900">{new Date(selectedDispensary.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-between">
              <button
                onClick={() => deleteDispensary(selectedDispensary.id)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <div className="flex gap-2">
                {selectedDispensary.status === 'pending' && (
                  <>
                    <button
                      onClick={() => { updateStatus(selectedDispensary.id, 'inactive'); setShowDetailModal(false); }}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => { updateStatus(selectedDispensary.id, 'active'); setShowDetailModal(false); }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    >
                      Approve
                    </button>
                  </>
                )}
                {selectedDispensary.status === 'active' && (
                  <button
                    onClick={() => { updateStatus(selectedDispensary.id, 'paused'); setShowDetailModal(false); }}
                    className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                )}
                {selectedDispensary.status === 'paused' && (
                  <button
                    onClick={() => { updateStatus(selectedDispensary.id, 'active'); setShowDetailModal(false); }}
                    className="px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && selectedDispensary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary-500" />
                  Inventory - {selectedDispensary.name}
                </h2>
                <p className="text-sm text-gray-500">Manage product inventory</p>
              </div>
              <button onClick={() => setShowInventoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500">{products.length} products</div>
                <button className="px-4 py-2 bg-primary-500 text-black font-semibold rounded-lg hover:bg-primary-600 transition flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              </div>
              <div className="space-y-3">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.category}</div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">${product.price}</div>
                        <div className="text-xs text-gray-500">per unit</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${product.quantity < 20 ? 'text-red-600' : 'text-gray-900'}`}>
                          {product.quantity}
                        </div>
                        <div className="text-xs text-gray-500">in stock</div>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">
                Product inventory management is a preview feature. Full functionality coming soon.
              </p>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
