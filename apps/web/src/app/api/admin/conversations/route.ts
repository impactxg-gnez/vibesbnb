import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    // Get the auth token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    // Create a Supabase client with the token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for admin role
    const isAdmin = user.user_metadata?.role === 'admin' || 
                    user.app_metadata?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const serviceSupabase = createServiceClient();
    const { data: conversations, error } = await serviceSupabase
      .from('conversations')
      .select(
        `
          id,
          property_id,
          host_id,
          traveller_id,
          booking_id,
          last_message,
          last_message_at,
          host_name,
          traveller_name,
          host_avatar,
          traveller_avatar,
          host_unread_count,
          traveller_unread_count,
          properties (
            name,
            location,
            images
          )
        `
      )
      .order('last_message_at', { ascending: false });

    if (error) {
      throw error;
    }

    const conversationIds = (conversations || []).map((c) => c.id);
    let messages: Record<string, any[]> = {};

    if (conversationIds.length > 0) {
      const { data: allMessages } = await serviceSupabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true });

      allMessages?.forEach((msg) => {
        if (!messages[msg.conversation_id]) {
          messages[msg.conversation_id] = [];
        }
        messages[msg.conversation_id].push(msg);
      });
    }

    return NextResponse.json({
      conversations: (conversations || []).map((conv) => ({
        ...conv,
        messages: messages[conv.id] || [],
      })),
    });
  } catch (error: any) {
    console.error('Failed to load admin conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load conversations' },
      { status: 500 }
    );
  }
}


