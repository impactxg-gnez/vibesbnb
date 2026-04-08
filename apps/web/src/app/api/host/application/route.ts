import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { propertyName, propertyType, location, description, email, name } = await req.json();
    const hasPropertyDetails = Boolean(propertyName && propertyType && location);
    const hasBasicSignupDetails = Boolean(email && name);

    if (!hasPropertyDetails && !hasBasicSignupDetails) {
      return NextResponse.json(
        { error: 'Either host property details or signup name/email are required' },
        { status: 400 }
      );
    }

    const cookieSupabase = createServerClient();
    const { data: { user } } = await cookieSupabase.auth.getUser();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co') {
      // In demo mode, just return success
      return NextResponse.json({ success: true, message: 'Demo mode' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const applicationEmail = user?.email || email;
    const displayName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      name ||
      applicationEmail?.split('@')[0] ||
      'Host';

    if (!applicationEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    let existingApplication = null;

    if (user?.id) {
      const byUserId = await supabase
        .from('pending_host_applications')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!byUserId.error && byUserId.data) {
        existingApplication = byUserId.data;
      }
    }

    if (!existingApplication) {
      const byEmail = await supabase
        .from('pending_host_applications')
        .select('id, status')
        .eq('email', applicationEmail)
        .maybeSingle();

      if (!byEmail.error && byEmail.data) {
        existingApplication = byEmail.data;
      }
    }

    const payload = {
      user_id: user?.id || null,
      email: applicationEmail,
      name: displayName,
      phone: user?.user_metadata?.phone || null,
      location: location || null,
      property_name: propertyName || null,
      property_type: propertyType || null,
      description: description || null,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    };

    let error = null;

    if (existingApplication) {
      const result = await supabase
        .from('pending_host_applications')
        .update(payload)
        .eq('id', existingApplication.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('pending_host_applications')
        .insert(payload);
      error = result.error;
    }

    // Support older schemas that do not yet have the new columns.
    if (error && (error.message.includes('user_id') || error.message.includes('submitted_at'))) {
      const legacyPayload = {
        email: applicationEmail,
        name: displayName,
        phone: user?.user_metadata?.phone || null,
        location: location || null,
        property_name: propertyName || null,
        property_type: propertyType || null,
        description: description || null,
        status: 'pending',
      };

      if (existingApplication) {
        const retry = await supabase
          .from('pending_host_applications')
          .update(legacyPayload)
          .eq('id', existingApplication.id);
        error = retry.error;
      } else {
        const retry = await supabase
          .from('pending_host_applications')
          .insert(legacyPayload);
        error = retry.error;
      }
    }

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An application with this email already exists', code: '23505' }, { status: 400 });
      }
      console.error('Database error in host application route:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Server error in host application route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
