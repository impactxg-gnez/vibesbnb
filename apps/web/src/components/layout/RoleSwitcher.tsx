'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';
import toast from 'react-hot-toast';

type UserRole = 'host' | 'traveller' | 'service_host' | 'dispensary';

interface RoleConfig {
  id: UserRole;
  label: string;
  icon: string;
  route: string;
}

const roleConfigs: RoleConfig[] = [
  { id: 'host', label: 'Host', icon: '🏠', route: '/host/dashboard' },
  { id: 'traveller', label: 'Traveller', icon: '✈️', route: '/dashboard' },
  { id: 'service_host', label: 'Service Host', icon: '💆', route: '/service/dashboard' },
  { id: 'dispensary', label: 'Dispensary', icon: '🌿', route: '/dispensary/dashboard' },
];

export function RoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole>('traveller');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load user roles from localStorage (should be from API in production)
    const rolesStr = localStorage.getItem('userRoles');
    const activeRoleStr = localStorage.getItem('activeRole');
    
    if (rolesStr) {
      const roles = JSON.parse(rolesStr) as UserRole[];
      setUserRoles(roles);
      
      if (activeRoleStr && roles.includes(activeRoleStr as UserRole)) {
        setActiveRole(activeRoleStr as UserRole);
      } else if (roles.length > 0) {
        setActiveRole(roles[0]);
      }
    }
  }, []);

  const handleRoleSwitch = (roleId: UserRole) => {
    if (roleId === activeRole) {
      setIsOpen(false);
      return;
    }

    setActiveRole(roleId);
    localStorage.setItem('activeRole', roleId);
    setIsOpen(false);

    const roleConfig = roleConfigs.find((r) => r.id === roleId);
    if (roleConfig) {
      toast.success(`Switched to ${roleConfig.label} mode`);
      router.push(roleConfig.route);
    }
  };

  const handleManageRoles = () => {
    setIsOpen(false);
    router.push('/select-role');
  };

  // Don't show if user has no roles or only one role
  if (userRoles.length === 0) {
    return null;
  }

  const activeRoleConfig = roleConfigs.find((r) => r.id === activeRole);
  const availableRoles = roleConfigs.filter((r) => userRoles.includes(r.id));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gray-700/50 hover:bg-gray-700 transition-colors border border-gray-600"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{activeRoleConfig?.icon}</span>
          <div className="text-left">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Current Role</div>
            <div className="text-sm font-medium text-white">
              {activeRoleConfig?.label}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 right-0 mt-2 bg-[#2d3748] rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden">
            {/* Current Roles */}
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Switch Role
              </div>
              {availableRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSwitch(role.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{role.icon}</span>
                    <span className="text-sm font-medium text-white">
                      {role.label}
                    </span>
                  </div>
                  {activeRole === role.id && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Manage Roles */}
            <div className="border-t border-gray-700 py-2">
              <button
                onClick={handleManageRoles}
                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <span>✨</span>
                <span>Manage Roles</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

