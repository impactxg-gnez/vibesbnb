import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    // Try to get user from Authorization header first
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let user = null;
    let supabase;
    
    if (token) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    } else {
      supabase = createServerClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, host_id, traveller_id')
      .eq('id', params.conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isHost = conversation.host_id === user.id;
    const isTraveller = conversation.traveller_id === user.id;

    if (!isHost && !isTraveller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatePayload = isHost
      ? { host_unread_count: 0 }
      : { traveller_unread_count: 0 };

    await supabase
      .from('conversations')
      .update(updatePayload)
      .eq('id', params.conversationId);

    // Also mark message notifications as read
    await fetch(`${request.nextUrl.origin}/api/notifications/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ types: ['new_message'] }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to mark conversation as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark conversation as read' },
      { status: 500 }
    );
  }
}


