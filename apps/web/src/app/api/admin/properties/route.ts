import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 }) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }) };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const isAdmin = user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';
  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }) };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if ('error' in auth) return auth.error;

    const status = request.nextUrl.searchParams.get('status') || 'all';
    const serviceSupabase = createServiceClient();

    let query = serviceSupabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ properties: data || [] });
  } catch (error: any) {
    console.error('Failed to load admin properties:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load properties' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if ('error' in auth) return auth.error;

    const { propertyId, status, rejectionReason } = await request.json();

    if (!propertyId || !status) {
      return NextResponse.json({ error: 'Property ID and status are required' }, { status: 400 });
    }

    if (!['active', 'draft', 'inactive', 'pending_approval'].includes(status)) {
      return NextResponse.json({ error: 'Invalid property status' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();
    const updatePayload: Record<string, any> = { status };

    if (status === 'draft') {
      updatePayload.rejection_reason = rejectionReason || 'Property did not meet our listing requirements.';
    } else if (status === 'active') {
      updatePayload.rejection_reason = null;
    }

    const { error } = await serviceSupabase
      .from('properties')
      .update(updatePayload)
      .eq('id', propertyId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update property:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update property' },
      { status: 500 }
    );
  }
}
