import { NextRequest, NextResponse } from 'next/server';
import { resolveHostPropertyAccess } from '@/lib/auth/resolveHostPropertyAccess';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';
import { PROPERTY_UPDATE_KEYS } from '@/lib/propertyWritableColumns';

type RoomPayload = Record<string, unknown> & { id?: unknown; images?: unknown };

/**
 * Rooms sent without an `images` key keep the photos already stored, so a save that could not
 * upload photos still persists the rest of the editor's fields.
 */
function mergeRoomImages(incoming: unknown, existing: unknown): unknown {
  if (!Array.isArray(incoming)) return incoming;

  const existingRooms = Array.isArray(existing) ? (existing as RoomPayload[]) : [];
  const byId = new Map<string, unknown>();
  existingRooms.forEach((room) => {
    if (room && typeof room.id === 'string') byId.set(room.id, room.images);
  });

  return (incoming as RoomPayload[]).map((room, index) => {
    if (!room || typeof room !== 'object' || 'images' in room) return room;
    const previous =
      (typeof room.id === 'string' ? byId.get(room.id) : undefined) ?? existingRooms[index]?.images;
    return Array.isArray(previous) ? { ...room, images: previous } : room;
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveHostPropertyAccess(params.id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const raw = (body?.updates && typeof body.updates === 'object' ? body.updates : body) as Record<
      string,
      unknown
    >;

    const updatePayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (PROPERTY_UPDATE_KEYS.has(key)) {
        updatePayload[key] = value;
      }
    }

    // Never let callers reassign ownership through this endpoint
    delete updatePayload.host_id;
    delete updatePayload.id;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updatePayload.updated_at = new Date().toISOString();

    if (updatePayload.status != null) {
      const status = String(updatePayload.status);
      if (!['active', 'draft', 'inactive', 'pending_approval'].includes(status)) {
        return NextResponse.json({ error: 'Invalid property status' }, { status: 400 });
      }
    }

    if (Array.isArray(updatePayload.rooms)) {
      const { data: current } = await access.db
        .from('properties')
        .select('rooms')
        .eq('id', params.id)
        .maybeSingle();
      updatePayload.rooms = mergeRoomImages(updatePayload.rooms, current?.rooms);
    }

    const { error } = await access.db
      .from('properties')
      .update(updatePayload)
      .eq('id', params.id);

    if (error) {
      throw error;
    }

    void invalidatePropertyListingCaches(params.id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[host/properties PATCH]', error);
    const message = error instanceof Error ? error.message : 'Failed to update property';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
