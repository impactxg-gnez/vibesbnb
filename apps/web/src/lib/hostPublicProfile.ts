/**
 * Property statuses shown on public host/user profile pages.
 * Excludes draft (incomplete) and inactive (delisted) from the public portfolio.
 * Includes pending_approval so hosts see imported listings before admin approves.
 */
export const PUBLIC_HOST_PROFILE_PROPERTY_STATUSES = ['active', 'pending_approval'] as const;
