import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { normalizeSignupEmail } from '@/lib/auth/validateSignupEmail';

export const dynamic = 'force-dynamic';

const EMAIL_RE =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function isMissingTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    Boolean(error.message?.includes('admin_notification_emails')) ||
    Boolean(error.message?.toLowerCase().includes('does not exist'))
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const service = createServiceClient();
    const { data, error } = await service
      .from('admin_notification_emails')
      .select('id, email, label, enabled, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json({
          emails: [],
          migrationRequired: true,
        });
      }
      throw error;
    }

    return NextResponse.json({
      emails: data || [],
      migrationRequired: false,
    });
  } catch (e: unknown) {
    console.error('[admin/notification-emails GET]', e);
    const message = e instanceof Error ? e.message : 'Failed to load notification emails';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const email = normalizeSignupEmail(String(body.email || ''));
    const label =
      typeof body.label === 'string' ? body.label.trim().slice(0, 120) : null;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from('admin_notification_emails')
      .insert({
        email,
        label: label || null,
        enabled: true,
        created_by: auth.user.id.startsWith('demo-') ? null : auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .select('id, email, label, enabled, created_at, updated_at')
      .single();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json(
          {
            error:
              'admin_notification_emails table missing. Run SUPABASE_ADMIN_NOTIFICATION_EMAILS.sql in Supabase.',
            migrationRequired: true,
          },
          { status: 503 }
        );
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'That email is already on the list.' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ email: data });
  } catch (e: unknown) {
    console.error('[admin/notification-emails POST]', e);
    const message = e instanceof Error ? e.message : 'Failed to add email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
    if (typeof body.label === 'string') patch.label = body.label.trim().slice(0, 120) || null;

    if (Object.keys(patch).length === 1) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from('admin_notification_emails')
      .update(patch)
      .eq('id', id)
      .select('id, email, label, enabled, created_at, updated_at')
      .single();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json(
          {
            error:
              'admin_notification_emails table missing. Run SUPABASE_ADMIN_NOTIFICATION_EMAILS.sql in Supabase.',
            migrationRequired: true,
          },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ email: data });
  } catch (e: unknown) {
    console.error('[admin/notification-emails PATCH]', e);
    const message = e instanceof Error ? e.message : 'Failed to update email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const id =
      request.nextUrl.searchParams.get('id') ||
      String((await request.json().catch(() => ({}))).id || '');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const service = createServiceClient();
    const { error } = await service
      .from('admin_notification_emails')
      .delete()
      .eq('id', id);

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json(
          {
            error:
              'admin_notification_emails table missing. Run SUPABASE_ADMIN_NOTIFICATION_EMAILS.sql in Supabase.',
            migrationRequired: true,
          },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('[admin/notification-emails DELETE]', e);
    const message = e instanceof Error ? e.message : 'Failed to remove email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
