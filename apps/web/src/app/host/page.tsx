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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is already a host, they'll be redirected, but show loading in the meantime
  const userRole = user?.user_metadata?.role || 'traveller';
  if (userRole === 'host') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Redirecting to host dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* Hero Section */}
      <div className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-primary-500/5 blur-[120px] rounded-full -translate-y-1/2" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 px-4 py-2 rounded-full text-primary-500 text-sm font-bold mb-8 uppercase tracking-widest">
              Join the community
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-8 text-white tracking-tight leading-tight">
              Become a <span className="text-primary-500">VibesBNB</span> Host
            </h1>
            <p className="text-xl mb-12 text-muted leading-relaxed">
              Share your wellness-friendly space with travelers who appreciate it. 
              Earn extra income while promoting a healthy lifestyle.
            </p>
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="container mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="bg-surface rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl rounded-full" />
            <h2 className="text-3xl font-bold text-white mb-2">Host Registration</h2>
            <p className="text-muted mb-10">
              Fill out the form below to register as a host and start listing your property.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <label htmlFor="propertyName" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
                  Property Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="propertyName"
                  name="propertyName"
                  value={formData.propertyName}
                  onChange={handleInputChange}
                  required
                  className="input !py-4"
                  placeholder="e.g., Mountain View Cabin"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="propertyType" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
                  Property Type <span className="text-red-400">*</span>
                </label>
                <select
                  id="propertyType"
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleInputChange}
                  required
                  className="input !py-4 appearance-none"
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

              <div className="space-y-2">
                <label htmlFor="location" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
                  Location <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  className="input !py-4"
                  placeholder="e.g., Colorado, USA"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="input !py-4 !rounded-3xl"
                  placeholder="Tell us about your property..."
                />
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="btn-primary w-full !py-5 text-lg shadow-[0_20px_40px_rgba(0,230,118,0.2)]"
              >
                {isRegistering ? 'Registering...' : 'Register as Host'}
              </button>
            </form>
          </div>

          <div className="space-y-12 py-10">
            <div>
              <h2 className="text-4xl font-bold text-white mb-12">Why Host on VibesBNB?</h2>
              <div className="space-y-8">
                <div className="flex gap-6 group">
                  <div className="w-16 h-16 bg-surface border border-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">
                    💰
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">Earn Extra Income</h3>
                    <p className="text-muted leading-relaxed">
                      Turn your extra space into income by hosting like-minded travelers who value wellness.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 group">
                  <div className="w-16 h-16 bg-surface border border-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">
                    🛡️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">Host Protection</h3>
                    <p className="text-muted leading-relaxed">
                      Comprehensive insurance and 24/7 support to protect your property and peace of mind.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 group">
                  <div className="w-16 h-16 bg-surface border border-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">
                    🧘
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">Wellness-Friendly</h3>
                    <p className="text-muted leading-relaxed">
                      Connect with guests who respect and appreciate your wellness-friendly policies and amenities.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary-500/10 border border-primary-500/20 rounded-[2.5rem] p-10 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
               <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Ready to start?</h3>
               <p className="text-white/70 mb-8 relative z-10">
                 Join thousands of hosts earning income from their wellness-friendly spaces. 
                 It's free to list and we take care of the payments.
               </p>
               <button className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-white/90 transition-all">
                 Learn more
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
