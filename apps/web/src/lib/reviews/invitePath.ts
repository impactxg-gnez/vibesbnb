export function reviewInvitePath(token: string): string {
  return `/review/${encodeURIComponent(token)}`;
}
