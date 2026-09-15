import { randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ReviewInviteRow = {
  id: string;
  token: string;
  property_id: string;
  created_by: string | null;
  created_at: string;
  revoked_at: string | null;
};

export function generateReviewInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

export { reviewInvitePath } from './invitePath';

export async function getActiveReviewInvite(
  supabase: SupabaseClient,
  propertyId: string
): Promise<ReviewInviteRow | null> {
  const { data, error } = await supabase
    .from('review_invites')
    .select('id, token, property_id, created_by, created_at, revoked_at')
    .eq('property_id', propertyId)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    console.error('[getActiveReviewInvite]', error);
    throw new Error(error.message);
  }
  return (data as ReviewInviteRow | null) ?? null;
}

export async function getReviewInviteByToken(
  supabase: SupabaseClient,
  token: string
): Promise<ReviewInviteRow | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('review_invites')
    .select('id, token, property_id, created_by, created_at, revoked_at')
    .eq('token', trimmed)
    .maybeSingle();

  if (error) {
    console.error('[getReviewInviteByToken]', error);
    throw new Error(error.message);
  }
  const row = (data as ReviewInviteRow | null) ?? null;
  if (!row || row.revoked_at) return null;
  return row;
}
