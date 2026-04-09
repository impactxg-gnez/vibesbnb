import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(req);
    if ('response' in auth) return auth.response;
    const adminUser = auth.user;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { applicationId, userId } = await req.json();

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Update the application status
    const { error: updateAppError } = await supabaseAdmin
      .from('pending_host_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser.id,
      })
      .eq('id', applicationId);

    if (updateAppError) {
      console.error('Error updating application:', updateAppError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // If we have a user_id, update their role to host
    if (userId) {
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const existingMetadata = existingUser?.user?.user_metadata || {};

      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { user_metadata: { ...existingMetadata, role: 'host' } }
      );

      if (updateUserError) {
        console.error('Error updating user role:', updateUserError);
        // Application is approved but user role update failed
        // This can happen if the user account no longer exists
      }

      // Also update the profiles table if it exists
      try {
        await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            is_host: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
      } catch (e) {
        console.warn('Could not update profiles table:', e);
      }
    }

    // Send notification to the user (if notifications table exists)
    if (userId) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          type: 'host_approved',
          title: 'Host Application Approved!',
          message: 'Congratulations! Your host application has been approved. You can now start listing properties.',
        });
      } catch (e) {
        console.warn('Could not create notification:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in approve-host API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
