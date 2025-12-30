'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function HostPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    propertyName: '',
    propertyType: '',
    location: '',
    description: '',
  });

  useEffect(() => {
    if (!loading && user) {
      // Check if user is already a host
      const userRole = user.user_metadata?.role || 'traveller';
      if (userRole === 'host') {
        // Already a host, redirect to dashboard
        router.push('/host/properties');
      }
    } else if (!loading && !user) {
      // Not logged in, redirect to login
      router.push('/login?redirect=/host');
    }
  }, [user, loading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);

    try {
      // Validate form
      if (!formData.propertyName || !formData.propertyType || !formData.location) {
        toast.error('Please fill in all required fields');
        setIsRegistering(false);
        return;
      }

      // Update user role to host in Supabase
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (supabaseUser) {
        // Update user metadata to include host role
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            role: 'host',
            ...user?.user_metadata,
          },
        });

        if (updateError) {
          throw updateError;
        }

        // Refresh the user session to get updated metadata
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        
        // Also update localStorage for demo mode compatibility
        const rolesStr = localStorage.getItem('userRoles');
        const roles = rolesStr ? JSON.parse(rolesStr) : [];
        if (!roles.includes('host')) {
          roles.push('host');
          localStorage.setItem('userRoles', JSON.stringify(roles));
        }

        toast.success('Successfully registered as a host!');
        
        // Force a page refresh to reload user data
        window.location.href = '/host/properties';
      } else {
        // Fallback for demo mode
        const demoUser = localStorage.getItem('demoUser');
        if (demoUser) {
          const parsedUser = JSON.parse(demoUser);
          parsedUser.user_metadata = {
            ...parsedUser.user_metadata,
            role: 'host',
          };
          localStorage.setItem('demoUser', JSON.stringify(parsedUser));
          
          const rolesStr = localStorage.getItem('userRoles');
          const roles = rolesStr ? JSON.parse(rolesStr) : [];
          if (!roles.includes('host')) {
            roles.push('host');
            localStorage.setItem('userRoles', JSON.stringify(roles));
          }
        }
        
        toast.success('Successfully registered as a host!');
        router.push('/host/properties');
      }
    } catch (error: any) {
      console.error('Error registering as host:', error);
      toast.error(error.message || 'Failed to register as host. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-earth-500 mx-auto mb-4"></div>
          <p className="text-mist-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is already a host, they'll be redirected, but show loading in the meantime
  const userRole = user?.user_metadata?.role || 'traveller';
  if (userRole === 'host') {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-earth-500 mx-auto mb-4"></div>
          <p className="text-mist-400">Redirecting to host dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Become a VibesBNB Host
            </h1>
            <p className="text-xl mb-8 text-emerald-50">
              Share your wellness-friendly space with travelers who appreciate it
            </p>
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-charcoal-900 rounded-2xl p-8 border border-charcoal-800">
            <h2 className="text-2xl font-bold text-white mb-6">Host Registration</h2>
            <p className="text-mist-400 mb-8">
              Fill out the form below to register as a host and start listing your property.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="propertyName" className="block text-sm font-medium text-mist-300 mb-2">
                  Property Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="propertyName"
                  name="propertyName"
                  value={formData.propertyName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white"
                  placeholder="e.g., Mountain View Cabin"
                />
              </div>

              <div>
                <label htmlFor="propertyType" className="block text-sm font-medium text-mist-300 mb-2">
                  Property Type <span className="text-red-400">*</span>
                </label>
                <select
                  id="propertyType"
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white"
                >
                  <option value="">Select property type</option>
                  <option value="Cabin">Cabin</option>
                  <option value="House">House</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Bungalow">Bungalow</option>
                  <option value="Condo">Condo</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-mist-300 mb-2">
                  Location <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white"
                  placeholder="e.g., Colorado, USA"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-mist-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white"
                  placeholder="Tell us about your property..."
                />
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full bg-earth-600 hover:bg-earth-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegistering ? 'Registering...' : 'Register as Host'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">Why Host on VibesBNB?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center bg-charcoal-900 p-8 rounded-xl border border-charcoal-800">
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-3 text-white">Earn Extra Income</h3>
            <p className="text-mist-400">
              Turn your extra space into income by hosting like-minded travelers
            </p>
          </div>
          <div className="text-center bg-charcoal-900 p-8 rounded-xl border border-charcoal-800">
            <div className="text-5xl mb-4">🛡️</div>
            <h3 className="text-xl font-semibold mb-3 text-white">Host Protection</h3>
            <p className="text-mist-400">
              Comprehensive insurance and 24/7 support to protect your property
            </p>
          </div>
          <div className="text-center bg-charcoal-900 p-8 rounded-xl border border-charcoal-800">
            <div className="text-5xl mb-4">🧘</div>
            <h3 className="text-xl font-semibold mb-3 text-white">Wellness-Friendly</h3>
            <p className="text-mist-400">
              Connect with guests who respect and appreciate your wellness-friendly policies
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-charcoal-900 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">How Hosting Works</h2>
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-earth-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">Create Your Listing</h3>
                <p className="text-mist-400">
                  Add photos, description, amenities, and your house rules. Set your own pricing and availability.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-earth-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">Welcome Guests</h3>
                <p className="text-mist-400">
                  Receive booking requests from verified guests. Communicate through our secure messaging system.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-earth-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">Get Paid</h3>
                <p className="text-mist-400">
                  Receive payment 24 hours after guest check-in. Choose your preferred payout method.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-2xl p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-white">Ready to Start Hosting?</h2>
          <p className="text-xl text-mist-300 mb-8">
            Complete the registration form above to get started and join thousands of hosts earning income from their wellness-friendly spaces
          </p>
        </div>
      </div>
    </div>
  );
}
