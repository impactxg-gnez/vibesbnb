'use client';

import { useState } from 'react';
import { ProfileMenu } from '@/components/profile/ProfileMenu';

export default function ProfilePage() {
  const [showMenu, setShowMenu] = useState(true);

  // Mock user data - in production, get from auth context
  const user = {
    name: 'Eduardo Illiamson',
    role: 'traveller' as const,
    avatar: undefined,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        <button
          onClick={() => setShowMenu(true)}
          className="btn-primary"
        >
          Open Profile Menu
        </button>
      </div>

      {showMenu && (
        <ProfileMenu
          user={user}
          onClose={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
