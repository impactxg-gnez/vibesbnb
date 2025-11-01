'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

type UserCategory = 'host' | 'traveller' | 'service_host' | 'dispensary';

interface SignUpData {
  name: string;
  email: string;
  phone: string;
  category: UserCategory;
  timestamp: string;
}

const categoryInfo = {
  host: {
    title: 'Host',
    icon: '🏠',
    color: 'from-green-500 to-green-600',
    description: 'Sign up to list your 420-friendly property and start earning',
  },
  traveller: {
    title: 'Traveller',
    icon: '✈️',
    color: 'from-blue-500 to-blue-600',
    description: 'Sign up to discover amazing cannabis-friendly stays worldwide',
  },
  service_host: {
    title: 'Service Host',
    icon: '🧘',
    color: 'from-purple-500 to-purple-600',
    description: 'Sign up to offer your wellness services to travelers',
  },
  dispensary: {
    title: 'Dispensary',
    icon: '🌿',
    color: 'from-yellow-500 to-yellow-600',
    description: 'Sign up to partner with VibesBNB and reach more customers',
  },
};

export default function EarlyAccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = (searchParams.get('category') as UserCategory) || 'traveller';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.email || !formData.phone) {
        toast.error('Please fill in all fields');
        setIsLoading(false);
        return;
      }

      // Create signup data
      const signUpData: SignUpData = {
        ...formData,
        category,
        timestamp: new Date().toISOString(),
      };

      // Store in localStorage (would be API call in production)
      const existingSignups = JSON.parse(localStorage.getItem('earlyAccessSignups') || '[]');
      
      // Check if email already signed up for this category
      const alreadySignedUp = existingSignups.some(
        (signup: SignUpData) => signup.email === formData.email && signup.category === category
      );

      if (alreadySignedUp) {
        toast.error('This email is already registered for early access in this category');
        setIsLoading(false);
        return;
      }

      existingSignups.push(signUpData);
      localStorage.setItem('earlyAccessSignups', JSON.stringify(existingSignups));

      // Log to console for admin to see (in production, this would go to backend)
      console.log('New Early Access Signup:', signUpData);

      toast.success('Successfully signed up for early access!');
      
      // Redirect to thank you page
      router.push(`/thank-you?category=${category}`);
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const info = categoryInfo[category];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Back Button */}
          <Link
            href="/coming-soon"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          {/* Card */}
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 shadow-2xl">
            {/* Icon */}
            <div className="text-center mb-6">
              <div className="text-7xl mb-4">{info.icon}</div>
              <h1 className={`text-3xl font-bold mb-2 bg-gradient-to-r ${info.color} bg-clip-text text-transparent`}>
                {info.title} Early Access
              </h1>
              <p className="text-gray-400 text-sm">
                {info.description}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 transition-all"
                  placeholder="your@email.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-gradient-to-r ${info.color} text-white font-semibold py-4 rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Get Early Access'
                )}
              </button>

              {/* Privacy Note */}
              <p className="text-xs text-gray-500 text-center mt-4">
                By signing up, you agree to receive updates about VibesBNB's launch.
                We respect your privacy and won't spam you.
              </p>
            </form>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Launching April 20, 2026 at 12:00 PM PST
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

