'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

type UserRole = 'host' | 'traveller' | 'dispensary' | 'service_host';

interface FormData {
  // Common fields
  email: string;
  
  // Personal fields (Host & Traveller)
  firstName?: string;
  lastName?: string;
  dateOfBirth?: {
    month: string;
    day: string;
    year: string;
  };
  
  // Business fields (Dispensary)
  businessName?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  federalTaxId?: string;
}

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = (searchParams.get('role') as UserRole) || 'traveller';
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    dateOfBirth: { month: '', day: '', year: '' },
    businessName: '',
    businessAddress: '',
    city: '',
    state: '',
    zipCode: '',
    federalTaxId: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const roleLabels: Record<UserRole, string> = {
    host: 'Host',
    traveller: 'Traveller',
    dispensary: 'Dispensary',
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateDateField = (field: 'month' | 'day' | 'year', value: string) => {
    setFormData(prev => ({
      ...prev,
      dateOfBirth: { ...prev.dateOfBirth!, [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement registration API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create mock user and log them in
      const mockToken = 'mock-jwt-token-' + Date.now();
      const mockUser = {
        id: 'user-' + Date.now(),
        email: formData.email,
        name: role === 'dispensary' 
          ? formData.businessName 
          : `${formData.firstName} ${formData.lastName}`,
        role: role,
      };
      
      // Save authentication data
      localStorage.setItem('accessToken', mockToken);
      localStorage.setItem('refreshToken', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('userRoles', JSON.stringify([role]));
      localStorage.setItem('activeRole', role);
      
      toast.success('Account created successfully!');
      
      // Navigate to role-specific dashboard
      const roleRoutes = {
        host: '/host/dashboard',
        traveller: '/dashboard',
        service_host: '/service/dashboard',
        dispensary: '/dispensary/dashboard',
      };
      
      router.push(roleRoutes[role] || '/dashboard');
    } catch (error: any) {
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPersonalForm = () => (
    <>
      <input
        type="text"
        required
        value={formData.firstName}
        onChange={(e) => updateField('firstName', e.target.value)}
        className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
        placeholder="First Name"
      />
      
      <input
        type="text"
        required
        value={formData.lastName}
        onChange={(e) => updateField('lastName', e.target.value)}
        className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
        placeholder="Last Name"
      />
      
      <input
        type="email"
        required
        value={formData.email}
        onChange={(e) => updateField('email', e.target.value)}
        className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
        placeholder="Email Address"
      />
      
      <div>
        <label className="block text-gray-400 text-sm mb-2">Date of Birth</label>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            required
            maxLength={2}
            value={formData.dateOfBirth?.month}
            onChange={(e) => updateDateField('month', e.target.value)}
            className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 text-center"
            placeholder="MM"
          />
          <input
            type="text"
            required
            maxLength={2}
            value={formData.dateOfBirth?.day}
            onChange={(e) => updateDateField('day', e.target.value)}
            className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 text-center"
            placeholder="DD"
          />
          <input
            type="text"
            required
            maxLength={4}
            value={formData.dateOfBirth?.year}
            onChange={(e) => updateDateField('year', e.target.value)}
            className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 text-center"
            placeholder="YYYY"
          />
        </div>
      </div>
    </>
  );

  const renderBusinessForm = () => (
    <>
      <input
        type="text"
        required
        value={formData.businessName}
        onChange={(e) => updateField('businessName', e.target.value)}
        className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
        placeholder="Business Name"
      />
      
      <input
        type="text"
        required
        value={formData.businessAddress}
        onChange={(e) => updateField('businessAddress', e.target.value)}
        className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
        placeholder="Business Street Address"
      />
      
      <input
        type="text"
        required
        value={formData.city}
        onChange={(e) => updateField('city', e.target.value)}
        className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
        placeholder="City"
      />
      
      <input
        type="text"
        required
        value={formData.state}
        onChange={(e) => updateField('state', e.target.value)}
        className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
        placeholder="State"
      />
      
      <input
        type="text"
        required
        value={formData.zipCode}
        onChange={(e) => updateField('zipCode', e.target.value)}
        className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
        placeholder="Zip-code"
      />
      
      <input
        type="text"
        required
        value={formData.federalTaxId}
        onChange={(e) => updateField('federalTaxId', e.target.value)}
        className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
        placeholder="Federal Tax ID - EIN"
      />
      
      <input
        type="email"
        required
        value={formData.email}
        onChange={(e) => updateField('email', e.target.value)}
        className="w-full bg-[#4a5568] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
        placeholder="Email Address"
      />
    </>
  );

  return (
    <div className="min-h-screen bg-[#2c3446] px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link
            href="/select-role"
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Go Back
          </Link>
          <h1 className="text-white text-lg font-semibold ml-auto">
            {roleLabels[role]}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {role === 'dispensary' ? renderBusinessForm() : renderPersonalForm()}
          
          {/* Terms Agreement */}
          <div className="text-center text-xs text-gray-400 py-4">
            By continuing you agree that you are 18 years of age or older and have read and accept our{' '}
            <Link href="/terms" className="text-white underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-white underline">
              Privacy Policy
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-500 text-white font-semibold py-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
          >
            {isLoading ? 'Creating account...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}


