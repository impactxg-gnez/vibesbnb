export const GUEST_ID_BUCKET = 'guest-id-docs';

export type GuestIdDocument = {
  slot: number;
  storage_path: string;
  file_name: string;
};

export function requiredGuestIdCount(adults: number, kids: number): number {
  return Math.max(1, Math.floor(Number(adults) || 0)) + Math.max(0, Math.floor(Number(kids) || 0));
}

export function guestIdSlotLabel(slot: number, adults: number): string {
  if (slot === 0) return 'You (lead guest)';
  if (slot < adults) return `Adult ${slot + 1}`;
  return `Child ${slot - adults + 1}`;
}

export function parseGuestIdDocuments(raw: unknown): GuestIdDocument[] {
  if (!Array.isArray(raw)) return [];
  const out: GuestIdDocument[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const slot = Number(rec.slot);
    const storage_path = String(rec.storage_path || '').trim();
    const file_name = String(rec.file_name || '').trim();
    if (!Number.isInteger(slot) || slot < 0 || !storage_path) continue;
    out.push({ slot, storage_path, file_name: file_name || `guest-${slot}` });
  }
  return out;
}

export function guestIdDocumentsComplete(
  docs: GuestIdDocument[],
  adults: number,
  kids: number
): boolean {
  const need = requiredGuestIdCount(adults, kids);
  if (docs.length < need) return false;
  const slots = new Set(docs.map((d) => d.slot));
  for (let i = 0; i < need; i += 1) {
    if (!slots.has(i)) return false;
  }
  return true;
}

export function assertGuestIdPathsOwnedByUser(
  docs: GuestIdDocument[],
  userId: string
): boolean {
  const prefix = `${userId}/`;
  return docs.every((d) => d.storage_path.startsWith(prefix) && !d.storage_path.includes('..'));
}

/**
 * New checkouts must upload IDs. Empty `guest_id_documents` is treated as a legacy
 * booking created before this gate so existing confirmed stays keep their address.
 */
export function bookingGuestIdsReady(booking: {
  guests?: unknown;
  kids?: unknown;
  guest_id_documents?: unknown;
}): boolean {
  const raw = booking.guest_id_documents;
  if (raw == null) return true;
  const docs = parseGuestIdDocuments(raw);
  if (docs.length === 0 && Array.isArray(raw) && raw.length === 0) return true;
  return guestIdDocumentsComplete(
    docs,
    Number(booking.guests) || 1,
    Number(booking.kids) || 0
  );
}
