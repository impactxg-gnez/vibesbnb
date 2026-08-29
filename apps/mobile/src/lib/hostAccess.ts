import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';

const ROLES_KEY = 'userRoles';
const MODE_KEY = 'vibesbnb_mode';

export type AppMode = 'traveling' | 'hosting';

export function metadataIndicatesHost(user: User | null | undefined): boolean {
  const role = user?.user_metadata?.role;
  return role === 'host' || role === 'host_pending';
}

export async function readStoredRoles(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ROLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function getAppMode(): Promise<AppMode> {
  const mode = await AsyncStorage.getItem(MODE_KEY);
  return mode === 'hosting' ? 'hosting' : 'traveling';
}

export async function setAppMode(mode: AppMode): Promise<void> {
  await AsyncStorage.setItem(MODE_KEY, mode);
}

export async function userHasHostCapability(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (metadataIndicatesHost(user)) return true;
  const roles = await readStoredRoles();
  return roles.includes('host') || roles.includes('host_pending');
}

export async function ensureHostRoleStored(): Promise<void> {
  const roles = await readStoredRoles();
  if (!roles.includes('host')) {
    roles.push('host');
    await AsyncStorage.setItem(ROLES_KEY, JSON.stringify(roles));
  }
  await setAppMode('hosting');
}
