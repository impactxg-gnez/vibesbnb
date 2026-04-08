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
      .from('pending_host_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ applications: data || [] });
  } catch (error: any) {
    console.error('Failed to load host applications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load host applications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if ('error' in auth) return auth.error;

    const { applicationId, status, rejectionReason } = await request.json();

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Application ID and status are required' }, { status: 400 });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();
    const updatePayload: Record<string, any> = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
    };

    if (status === 'rejected') {
      updatePayload.rejection_reason = rejectionReason || 'Application did not meet the current requirements.';
    }

    const { error } = await serviceSupabase
      .from('pending_host_applications')
      .update(updatePayload)
      .eq('id', applicationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update host application:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update host application' },
      { status: 500 }
    );
  }
}
