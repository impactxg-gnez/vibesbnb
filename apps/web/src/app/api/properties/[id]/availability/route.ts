import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(_request.url);
    const roomId = searchParams.get('roomId');

    let query = supabase
      .from('property_availability')
      .select('day, status, room_id')
      .eq('property_id', params.id);

    if (roomId) {
      // If a specific room is requested, show its specific blocks OR property-wide blocks
      query = query.or(`room_id.is.null,room_id.eq.${roomId}`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ availability: data ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load availability' },
      { status: 500 }
    );
  }
}


