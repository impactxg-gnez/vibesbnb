import type { SupabaseClient } from '@supabase/supabase-js';

export type ReviewRow = {
  id: string;
  property_id: string;
  user_id?: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  is_team_review?: boolean | null;
  reviewer_name?: string | null;
  status?: string;
};

export type EnrichedReview = ReviewRow & {
  profiles: { full_name?: string | null; avatar_url?: string | null } | null;
};

/** Attach profile names/avatars without relying on a PostgREST FK embed. */
export async function enrichReviewsWithProfiles(
  supabase: SupabaseClient,
  rows: ReviewRow[]
): Promise<EnrichedReview[]> {
  const userIds = [
    ...new Set(
      rows
        .filter((r) => r.user_id && !r.is_team_review)
        .map((r) => r.user_id as string)
    ),
  ];

  const profileMap = new Map<
    string,
    { full_name?: string | null; avatar_url?: string | null }
  >();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id as string, {
        full_name: profile.full_name as string | null | undefined,
        avatar_url: profile.avatar_url as string | null | undefined,
      });
    }
  }

  return rows.map((row) => ({
    ...row,
    profiles:
      row.is_team_review || !row.user_id
        ? null
        : profileMap.get(row.user_id) ?? null,
  }));
}

/** Team reviews first, then newest first within each group. */
export function sortReviewsForDisplay<T extends { is_team_review?: boolean | null }>(
  reviews: T[]
): T[] {
  return [...reviews].sort((a, b) => {
    if (a.is_team_review && !b.is_team_review) return -1;
    if (!a.is_team_review && b.is_team_review) return 1;
    return 0;
  });
}
