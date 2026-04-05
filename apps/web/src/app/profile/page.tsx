'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Phone, MapPin, Calendar, Edit2, Save, X, MessageCircle, Building2, CreditCard, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const userRole = user?.user_metadata?.role || 'traveller';
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

  const [payoutData, setPayoutData] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    routingNumber: '',
    accountType: 'checking',
    swiftCode: '',
    currency: 'USD',
  });
  const [editingPayout, setEditingPayout] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [hasPayoutSetup, setHasPayoutSetup] = useState(false);

  const [stats, setStats] = useState({
    totalProperties: 0,
    totalBookings: 0,
    totalEarnings: 0
  });

  const [loadingStats, setLoadingStats] = useState(false);

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

      // Load payout data if it exists
      const payoutInfo = user.user_metadata?.payout_info;
      if (payoutInfo) {
        setPayoutData({
          accountHolderName: payoutInfo.account_holder_name || '',
          bankName: payoutInfo.bank_name || '',
          accountNumber: payoutInfo.account_number_masked || '',
          confirmAccountNumber: '',
          routingNumber: payoutInfo.routing_number_masked || '',
          accountType: payoutInfo.account_type || 'checking',
          swiftCode: payoutInfo.swift_code || '',
          currency: payoutInfo.currency || 'USD',
        });
        setHasPayoutSetup(!!payoutInfo.account_number_masked);
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchHostStats = async () => {
      if (userRole === 'host' && user?.id) {
        setLoadingStats(true);
        try {
          const supabase = createClient();
          
          // Total properties
          const { count: propertyCount, error: propsError } = await supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .eq('host_id', user.id);
          
          // Total bookings for those properties
          const { data: propsData } = await supabase
            .from('properties')
            .select('id')
            .eq('host_id', user.id);
          
          const propIds = propsData?.map(p => p.id) || [];
          
          let bookingCount = 0;
          let totalEarnings = 0;
          
          if (propIds.length > 0) {
            const { data: bookingsData } = await supabase
              .from('bookings')
              .select('total_price, status')
              .in('property_id', propIds);
            
            if (bookingsData) {
              bookingCount = bookingsData.length;
              totalEarnings = bookingsData
                .filter(b => b.status === 'confirmed' || b.status === 'completed')
                .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
            }
          }

          setStats({
            totalProperties: propertyCount || 0,
            totalBookings: bookingCount,
            totalEarnings: totalEarnings
          });
        } catch (error) {
          console.error('Error fetching host stats:', error);
        } finally {
          setLoadingStats(false);
        }
      }
    };
    
    if (userRole === 'host') {
      fetchHostStats();
    }
  }, [userRole, user?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // For hosts: validate that at least one contact method (WhatsApp or email) is provided
      if (userRole === 'host') {
        if (!formData.whatsapp?.trim() && !formData.hostEmail?.trim()) {
          toast.error('Hosts must provide at least one contact method: WhatsApp number or email address');
          setSaving(false);
          return;
        }
        if (!formData.bio?.trim()) {
          toast.error('Hosts must provide an "About Me" bio for their public profile');
          setSaving(false);
          return;
        }
      }
      
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (supabaseUser) {
        // Update user metadata in Supabase
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            ...user?.user_metadata,
            full_name: formData.fullName,
            phone: formData.phone,
            location: formData.location,
            bio: formData.bio,
            whatsapp: formData.whatsapp,
            host_email: formData.hostEmail,
          },
        });
        
        if (updateError) throw updateError;
        
        // Also update the profiles table if it exists
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: supabaseUser.id,
            full_name: formData.fullName,
            bio: formData.bio,
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.warn('Error updating profiles table:', profileError.message);
          // Don't throw here as the auth metadata update succeeded
        }
        
        toast.success('Profile updated successfully!');
        setEditing(false);
        // Refresh the page to show updated data
        router.refresh(); 
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

  const handleSavePayout = async () => {
    // Validation
    if (!payoutData.accountHolderName.trim()) {
      toast.error('Account holder name is required');
      return;
    }
    if (!payoutData.bankName.trim()) {
      toast.error('Bank name is required');
      return;
    }
    if (!payoutData.accountNumber.trim()) {
      toast.error('Account number is required');
      return;
    }
    if (payoutData.accountNumber !== payoutData.confirmAccountNumber) {
      toast.error('Account numbers do not match');
      return;
    }
    if (!payoutData.routingNumber.trim()) {
      toast.error('Routing/IFSC/Sort code is required');
      return;
    }

    setSavingPayout(true);
    try {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      // Mask sensitive data for storage (show only last 4 digits)
      const maskedAccountNumber = '****' + payoutData.accountNumber.slice(-4);
      const maskedRoutingNumber = '****' + payoutData.routingNumber.slice(-4);

      const payoutInfo = {
        account_holder_name: payoutData.accountHolderName,
        bank_name: payoutData.bankName,
        account_number_masked: maskedAccountNumber,
        routing_number_masked: maskedRoutingNumber,
        account_type: payoutData.accountType,
        swift_code: payoutData.swiftCode,
        currency: payoutData.currency,
        updated_at: new Date().toISOString(),
      };

      if (supabaseUser) {
        // Update user metadata
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            ...user?.user_metadata,
            payout_info: payoutInfo,
          },
        });

        if (updateError) throw updateError;

        // Also store in a secure payout_accounts table (with full details encrypted)
        // This is where the actual bank details would be stored securely
        const { error: payoutError } = await supabase
          .from('payout_accounts')
          .upsert({
            user_id: supabaseUser.id,
            account_holder_name: payoutData.accountHolderName,
            bank_name: payoutData.bankName,
            account_number_encrypted: payoutData.accountNumber, // In production, this should be encrypted
            routing_number_encrypted: payoutData.routingNumber, // In production, this should be encrypted
            account_type: payoutData.accountType,
            swift_code: payoutData.swiftCode,
            currency: payoutData.currency,
            status: 'pending_verification',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (payoutError) {
          console.warn('Could not save to payout_accounts table:', payoutError.message);
          // Don't throw - the metadata update succeeded
        }

        toast.success('Payout information saved successfully!');
        setHasPayoutSetup(true);
        setEditingPayout(false);

        // Update the displayed masked values
        setPayoutData(prev => ({
          ...prev,
          accountNumber: maskedAccountNumber,
          confirmAccountNumber: '',
          routingNumber: maskedRoutingNumber,
        }));
      } else {
        // Demo mode fallback
        localStorage.setItem('payoutInfo', JSON.stringify(payoutInfo));
        toast.success('Payout information saved!');
        setHasPayoutSetup(true);
        setEditingPayout(false);
      }
    } catch (error: any) {
      console.error('Error saving payout info:', error);
      toast.error(error.message || 'Failed to save payout information');
    } finally {
      setSavingPayout(false);
    }
  };

  const handleCancelPayout = () => {
    const payoutInfo = user?.user_metadata?.payout_info;
    if (payoutInfo) {
      setPayoutData({
        accountHolderName: payoutInfo.account_holder_name || '',
        bankName: payoutInfo.bank_name || '',
        accountNumber: payoutInfo.account_number_masked || '',
        confirmAccountNumber: '',
        routingNumber: payoutInfo.routing_number_masked || '',
        accountType: payoutInfo.account_type || 'checking',
        swiftCode: payoutInfo.swift_code || '',
        currency: payoutInfo.currency || 'USD',
      });
    } else {
      setPayoutData({
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        routingNumber: '',
        accountType: 'checking',
        swiftCode: '',
        currency: 'USD',
      });
    }
    setEditingPayout(false);
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
                  Bio {userRole === 'host' && <span className="text-red-500 font-bold">* Mandatory for hosts</span>}
                </label>
                {editing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    placeholder={userRole === 'host' ? "Tell your future guests about yourself, your hosting style, and what makes your stays special..." : "Tell us about yourself..."}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                    required={userRole === 'host'}
                  />
                ) : (
                  <div className="text-white whitespace-pre-wrap leading-relaxed">
                    {formData.bio || (userRole === 'host' ? <span className="text-red-500 italic font-bold text-sm">Action Required: Please add a bio to enable your public profile</span> : 'No bio yet')}
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

        {/* Payout Setup Section (for hosts only) */}
        {userRole === 'host' && (
          <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <CreditCard size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Payout Settings</h2>
                    <p className="text-blue-100 text-sm">Configure where you receive your earnings</p>
                  </div>
                </div>
                {!editingPayout && (
                  <button
                    onClick={() => setEditingPayout(true)}
                    className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-gray-100 transition flex items-center gap-2"
                  >
                    <Edit2 size={18} />
                    {hasPayoutSetup ? 'Update' : 'Set Up'}
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {/* Status Banner */}
              {!editingPayout && (
                <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                  hasPayoutSetup 
                    ? 'bg-emerald-500/10 border border-emerald-500/20' 
                    : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  {hasPayoutSetup ? (
                    <>
                      <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-emerald-400 font-medium">Payout Account Configured</p>
                        <p className="text-emerald-400/70 text-sm">Your earnings will be deposited to your bank account.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-amber-400 font-medium">Payout Account Not Set Up</p>
                        <p className="text-amber-400/70 text-sm">Please add your bank details to receive payouts from VibesBnB.</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Security Notice */}
              <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg flex items-start gap-3">
                <Shield className="text-gray-400 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-gray-400 text-sm">
                  Your banking information is encrypted and securely stored. We use bank-level security to protect your data.
                </p>
              </div>

              {editingPayout ? (
                <div className="space-y-6">
                  {/* Account Holder Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Account Holder Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={payoutData.accountHolderName}
                      onChange={(e) => setPayoutData({ ...payoutData, accountHolderName: e.target.value })}
                      placeholder="Full name as it appears on your bank account"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                    />
                  </div>

                  {/* Bank Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={payoutData.bankName}
                      onChange={(e) => setPayoutData({ ...payoutData, bankName: e.target.value })}
                      placeholder="e.g., Chase Bank, Bank of America, HDFC Bank"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Account Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={payoutData.accountNumber}
                        onChange={(e) => setPayoutData({ ...payoutData, accountNumber: e.target.value })}
                        placeholder="Enter your account number"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                      />
                    </div>

                    {/* Confirm Account Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Confirm Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={payoutData.confirmAccountNumber}
                        onChange={(e) => setPayoutData({ ...payoutData, confirmAccountNumber: e.target.value })}
                        placeholder="Re-enter your account number"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Routing Number / IFSC / Sort Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Routing Number / IFSC / Sort Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={payoutData.routingNumber}
                        onChange={(e) => setPayoutData({ ...payoutData, routingNumber: e.target.value })}
                        placeholder="e.g., 021000021 or HDFC0001234"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                      />
                    </div>

                    {/* SWIFT/BIC Code (optional for international) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        SWIFT/BIC Code <span className="text-gray-500">(for international transfers)</span>
                      </label>
                      <input
                        type="text"
                        value={payoutData.swiftCode}
                        onChange={(e) => setPayoutData({ ...payoutData, swiftCode: e.target.value })}
                        placeholder="e.g., CHASUS33"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Account Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Account Type
                      </label>
                      <select
                        value={payoutData.accountType}
                        onChange={(e) => setPayoutData({ ...payoutData, accountType: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      >
                        <option value="checking">Checking / Current Account</option>
                        <option value="savings">Savings Account</option>
                      </select>
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Preferred Currency
                      </label>
                      <select
                        value={payoutData.currency}
                        onChange={(e) => setPayoutData({ ...payoutData, currency: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="INR">INR - Indian Rupee</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6 border-t border-gray-800">
                    <button
                      onClick={handleSavePayout}
                      disabled={savingPayout}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      {savingPayout ? 'Saving...' : 'Save Payout Details'}
                    </button>
                    <button
                      onClick={handleCancelPayout}
                      disabled={savingPayout}
                      className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <X size={18} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : hasPayoutSetup ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Account Holder</label>
                      <div className="flex items-center gap-2 text-white">
                        <User size={18} className="text-gray-500" />
                        <span>{payoutData.accountHolderName}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Bank Name</label>
                      <div className="flex items-center gap-2 text-white">
                        <Building2 size={18} className="text-gray-500" />
                        <span>{payoutData.bankName}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Account Number</label>
                      <div className="flex items-center gap-2 text-white">
                        <CreditCard size={18} className="text-gray-500" />
                        <span>{payoutData.accountNumber}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Routing/IFSC Code</label>
                      <div className="flex items-center gap-2 text-white">
                        <span className="text-gray-500">#</span>
                        <span>{payoutData.routingNumber}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Account Type</label>
                      <div className="text-white capitalize">{payoutData.accountType}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Currency</label>
                      <div className="text-white">{payoutData.currency}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400 mb-4">No payout account configured yet</p>
                  <button
                    onClick={() => setEditingPayout(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Add Bank Account
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Section (for hosts) */}
        {userRole === 'host' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Total Properties</h3>
              <p className="text-3xl font-bold text-white">{loadingStats ? '...' : stats.totalProperties}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Total Bookings</h3>
              <p className="text-3xl font-bold text-white">{loadingStats ? '...' : stats.totalBookings}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Total Earnings</h3>
              <p className="text-3xl font-bold text-white">${loadingStats ? '...' : stats.totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

