'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Phone, MapPin, Calendar, Edit2, Save, X, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    whatsapp: '',
    hostEmail: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        location: user.user_metadata?.location || '',
        bio: user.user_metadata?.bio || '',
        whatsapp: user.user_metadata?.whatsapp || '',
        hostEmail: user.user_metadata?.host_email || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const userRole = user?.user_metadata?.role || 'traveller';
      
      // For hosts: validate that at least one contact method (WhatsApp or email) is provided
      if (userRole === 'host') {
        if (!formData.whatsapp?.trim() && !formData.hostEmail?.trim()) {
          toast.error('Hosts must provide at least one contact method: WhatsApp number or email address');
          setSaving(false);
          return;
        }
      }
      
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (supabaseUser) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            location: formData.location,
            bio: formData.bio,
            whatsapp: formData.whatsapp,
            host_email: formData.hostEmail,
            ...user?.user_metadata,
          },
        });
        
        if (updateError) throw updateError;
        
        toast.success('Profile updated successfully!');
        setEditing(false);
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        // Fallback for demo mode
        const updatedMetadata = {
          ...user?.user_metadata,
          full_name: formData.fullName,
          phone: formData.phone,
          location: formData.location,
          bio: formData.bio,
          whatsapp: formData.whatsapp,
          host_email: formData.hostEmail,
        };
        localStorage.setItem('userMetadata', JSON.stringify(updatedMetadata));
        toast.success('Profile updated successfully!');
        setEditing(false);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
      // Reset form data
      if (user) {
        setFormData({
          fullName: user.user_metadata?.full_name || '',
          email: user.email || '',
          phone: user.user_metadata?.phone || '',
          location: user.user_metadata?.location || '',
          bio: user.user_metadata?.bio || '',
          whatsapp: user.user_metadata?.whatsapp || '',
          hostEmail: user.user_metadata?.host_email || '',
        });
      }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userRole = user.user_metadata?.role || 'traveller';
  const memberSince = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-400">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-emerald-600">
                    {formData.fullName?.[0]?.toUpperCase() || formData.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                
                {/* User Info */}
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {formData.fullName || 'User'}
                  </h2>
                  <div className="flex items-center gap-4 text-emerald-50">
                    <span className="capitalize">{userRole}</span>
                    <span>•</span>
                    <span>Member since {memberSince}</span>
                  </div>
                </div>
              </div>

              {/* Edit Button */}
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-white text-emerald-700 rounded-lg hover:bg-gray-100 transition flex items-center gap-2"
                >
                  <Edit2 size={18} />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8">
            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  />
                ) : (
                  <div className="flex items-center gap-3 text-white">
                    <User size={20} className="text-gray-500" />
                    <span>{formData.fullName || 'Not set'}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email Address
                </label>
                <div className="flex items-center gap-3 text-white">
                  <Mail size={20} className="text-gray-500" />
                  <span>{formData.email}</span>
                  {!editing && (
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                      Cannot be changed
                    </span>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Phone Number
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                  />
                ) : (
                  <div className="flex items-center gap-3 text-white">
                    <Phone size={20} className="text-gray-500" />
                    <span>{formData.phone || 'Not set'}</span>
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Location
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="City, Country"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                  />
                ) : (
                  <div className="flex items-center gap-3 text-white">
                    <MapPin size={20} className="text-gray-500" />
                    <span>{formData.location || 'Not set'}</span>
                  </div>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Bio
                </label>
                {editing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                  />
                ) : (
                  <div className="text-white">
                    {formData.bio || 'No bio yet'}
                  </div>
                )}
              </div>

              {/* Host Contact Information (only for hosts) */}
              {userRole === 'host' && (
                <>
                  <div className="pt-6 border-t border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Contact Information for Bookings</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      At least one contact method (WhatsApp or Email) is required to receive booking notifications.
                    </p>
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      WhatsApp Number <span className="text-gray-500">(optional)</span>
                    </label>
                    {editing ? (
                      <input
                        type="tel"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                      />
                    ) : (
                      <div className="flex items-center gap-3 text-white">
                        <MessageCircle size={20} className="text-gray-500" />
                        <span>{formData.whatsapp || 'Not set'}</span>
                      </div>
                    )}
                  </div>

                  {/* Host Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Booking Email Address <span className="text-gray-500">(optional)</span>
                    </label>
                    {editing ? (
                      <input
                        type="email"
                        value={formData.hostEmail}
                        onChange={(e) => setFormData({ ...formData, hostEmail: e.target.value })}
                        placeholder="bookings@example.com"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                      />
                    ) : (
                      <div className="flex items-center gap-3 text-white">
                        <Mail size={20} className="text-gray-500" />
                        <span>{formData.hostEmail || formData.email || 'Not set'}</span>
                      </div>
                    )}
                    {!editing && !formData.hostEmail && formData.email && (
                      <p className="text-xs text-gray-500 mt-1">Using account email as fallback</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons (when editing) */}
            {editing && (
              <div className="flex gap-4 mt-8 pt-6 border-t border-gray-800">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section (for hosts) */}
        {userRole === 'host' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Total Properties</h3>
              <p className="text-3xl font-bold text-white">2</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Total Bookings</h3>
              <p className="text-3xl font-bold text-white">156</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Total Earnings</h3>
              <p className="text-3xl font-bold text-white">$24,580</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

