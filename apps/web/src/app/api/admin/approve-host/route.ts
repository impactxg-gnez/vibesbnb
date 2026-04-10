import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { hostApplicationApprovedEmailHtml } from '@/lib/email/hostApplicationApproved';

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

    let hostEmail: string | null = null;
    let hostName = 'there';

    if (userId) {
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const existingMetadata = existingUser?.user?.user_metadata || {};
      hostEmail = existingUser?.user?.email ?? null;
      hostName =
        (existingMetadata.full_name as string) ||
        (existingMetadata.name as string) ||
        hostEmail?.split('@')[0] ||
        'there';

      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { ...existingMetadata, role: 'host' },
      });

      if (updateUserError) {
        console.error('Error updating user role:', updateUserError);
      }

      const profilePayload: Record<string, unknown> = {
        id: userId,
        role: 'host',
        is_host: true,
        updated_at: new Date().toISOString(),
      };
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });
      if (profileErr) {
        const { error: retryErr } = await supabaseAdmin.from('profiles').upsert(
          {
            id: userId,
            role: 'host',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
        if (retryErr) console.warn('Could not update profiles table:', retryErr);
      }
    }

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

    if (hostEmail && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://vibesbnb.com');
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'VibesBNB <noreply@vibesbnb.com>',
          to: hostEmail,
          subject: "You're approved to host on VibesBNB",
          html: hostApplicationApprovedEmailHtml({ hostName, appUrl }),
        });
      } catch (e) {
        console.warn('[approve-host] Resend email failed:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in approve-host API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
