import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('property_availability')
      .select('day, status')
      .eq('property_id', params.id);

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


