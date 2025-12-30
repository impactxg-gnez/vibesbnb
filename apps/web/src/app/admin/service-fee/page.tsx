'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DollarSign, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageServiceFeePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [serviceFee, setServiceFee] = useState(10); // Default 10%
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Load current service fee from storage/API
    const savedFee = localStorage.getItem('serviceFee');
    if (savedFee) {
      setServiceFee(Number(savedFee));
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, you'd save to database
      localStorage.setItem('serviceFee', serviceFee.toString());
      toast.success('Service fee updated successfully');
    } catch (error) {
      toast.error('Failed to update service fee');
    } finally {
      setSaving(false);
    }
  };

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
    return null;
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Service Fee</h1>
          <p className="text-mist-500 mt-1">Update the service fee percentage applied to bookings</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-2xl">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Fee Percentage
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={serviceFee}
                  onChange={(e) => setServiceFee(Number(e.target.value))}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-mist-400 w-5 h-5" />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-mist-500">
                  %
                </span>
              </div>
              <p className="text-sm text-mist-500 mt-2">
                This percentage will be added to all booking totals as a service fee.
              </p>
            </div>

            {/* Example Calculation */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Example Calculation</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Booking Amount:</span>
                  <span>$100.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee ({serviceFee}%):</span>
                  <span>${((100 * serviceFee) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total:</span>
                  <span>${(100 + (100 * serviceFee) / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Service Fee'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

