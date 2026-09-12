'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';
import { useAuth } from '@/contexts/AuthContext';

const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();

export function MicrosoftClarity() {
  const { user } = useAuth();

  useEffect(() => {
    if (!projectId) return;
    Clarity.init(projectId);
  }, []);

  useEffect(() => {
    if (!projectId || !user?.id) return;
    const friendlyName =
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
      (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
      undefined;
    Clarity.identify(user.id, undefined, undefined, friendlyName);
  }, [user?.id, user?.user_metadata?.full_name, user?.user_metadata?.name]);

  return null;
}
