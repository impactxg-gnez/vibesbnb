import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import { isAdminUser } from '@/lib/auth/isAdmin';

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

async function getRequestUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (token) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data } = await supabase.auth.getUser(token);
    return { user: data.user, supabase };
  }

  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  return { user: data.user, supabase };
}

/** Hide a conversation from this participant's inbox (the other party still sees it). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { user } = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.conversationId?.trim();
    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
    }

    const impersonateHost = request.headers.get('x-impersonate-host-id') || '';
    const impersonatingHostId =
      isAdminUser(user) && isUuid(impersonateHost) ? impersonateHost : null;
    const viewerHostId = impersonatingHostId || user.id;

    const service = createServiceClient();
    const { data: conversation, error: convError } = await service
      .from('conversations')
      .select('id, host_id, traveller_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isHost = conversation.host_id === viewerHostId;
    const isTraveller = conversation.traveller_id === user.id && !impersonatingHostId;
    if (!isHost && !isTraveller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const patch = isHost
      ? { host_hidden_at: new Date().toISOString(), host_unread_count: 0 }
      : { traveller_hidden_at: new Date().toISOString(), traveller_unread_count: 0 };

    const { error: updateError } = await service
      .from('conversations')
      .update(patch)
      .eq('id', conversationId);

    if (updateError) {
      if (updateError.code === '42703' || /hidden_at/i.test(updateError.message || '')) {
        return NextResponse.json(
          {
            error:
              'Inbox delete requires a database update. Run SUPABASE_CHAT_HIDE_CONVERSATIONS.sql in the Supabase SQL editor.',
          },
          { status: 503 }
        );
      }
      throw updateError;
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete conversation';
    console.error('[chat DELETE conversation]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
