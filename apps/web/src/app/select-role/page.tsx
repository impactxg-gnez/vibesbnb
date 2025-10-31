'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Image from 'next/image';

type UserRole = 'host' | 'traveller' | 'service_host' | 'dispensary';

interface RoleOption {
  id: UserRole;
  title: string;
  description: string;
  image: string;
}

const roles: RoleOption[] = [
  {
    id: 'host',
    title: 'Host',
    description: 'List your property',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop',
  },
  {
    id: 'traveller',
    title: 'Traveller',
    description: 'Find your retreat',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop',
  },
  {
    id: 'service_host',
    title: 'Service Host',
    description: 'Offer wellness services',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop',
  },
  {
    id: 'dispensary',
    title: 'Dispensary',
    description: 'Partner with us',
    image: 'https://images.unsplash.com/photo-1628244404289-64e0a3683e4e?w=400&h=300&fit=crop',
  },
];

export default function SelectRolePage() {
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const router = useRouter();
  const itemsPerPage = 4;

  const toggleRole = (roleId: UserRole) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId]
    );
  };

  const handleContinue = async () => {
    if (selectedRoles.length === 0) {
      toast.error('Please select at least one role');
      return;
    }

    // Navigate to registration form for the first selected role
    router.push(`/register?role=${selectedRoles[0]}`);
  };

  const displayedRoles = roles.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-[#1a1d2e] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-semibold mb-2">
            Tell us a little bit about yourself....
          </h1>
          <p className="text-gray-400 text-sm">Select a role:</p>
        </div>

        {/* Role Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {displayedRoles.map((role) => (
            <button
              key={role.id}
              onClick={() => toggleRole(role.id)}
              className={`relative rounded-2xl overflow-hidden transition-all ${
                selectedRoles.includes(role.id)
                  ? 'ring-4 ring-green-500 scale-95'
                  : 'hover:scale-105'
              }`}
            >
              {/* Image */}
              <div className="relative h-40 w-full">
                <Image
                  src={role.image}
                  alt={role.title}
                  fill
                  className="object-cover"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                
                {/* Checkmark */}
                {selectedRoles.includes(role.id) && (
                  <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                
                {/* Text */}
                <div className="absolute bottom-3 left-3 right-3 text-left">
                  <h3 className="text-white font-semibold text-lg">{role.title}</h3>
                  <p className="text-gray-300 text-xs">{role.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Pagination Dots */}
        {roles.length > itemsPerPage && (
          <div className="flex justify-center gap-2 mb-6">
            {Array.from({ length: Math.ceil(roles.length / itemsPerPage) }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentPage === index
                    ? 'bg-green-500 w-6'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        )}

        {/* Selected Roles Count */}
        {selectedRoles.length > 0 && (
          <div className="text-center mb-4">
            <p className="text-gray-400 text-sm">
              {selectedRoles.length} role{selectedRoles.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleContinue}
            disabled={selectedRoles.length === 0}
            className="bg-green-500 text-white px-8 py-3 rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>Continue</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Skip for now */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

