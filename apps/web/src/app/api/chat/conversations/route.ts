import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

interface ConversationResponse {
  id: string;
  property_id: string;
  host_id: string;
  traveller_id: string;
  booking_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  host_name?: string | null;
  host_avatar?: string | null;
  traveller_name?: string | null;
  traveller_avatar?: string | null;
  host_unread_count?: number | null;
  traveller_unread_count?: number | null;
  properties?: {
    name?: string;
    location?: string;
    images?: string[];
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const serviceSupabase = createServiceClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filterConversationId = searchParams.get('conversationId');
    const scope = searchParams.get('scope');
    const isAdmin = user.user_metadata?.role === 'admin';
    if (scope === 'admin' && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const useService = scope === 'admin' && isAdmin;

    const query = (useService ? serviceSupabase : supabase)
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
          host_avatar,
          traveller_name,
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

    if (filterConversationId) {
      query.eq('id', filterConversationId);
    } else if (!useService) {
      query.or(`host_id.eq.${user.id},traveller_id.eq.${user.id}`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const conversations = (data as ConversationResponse[] | null) ?? [];

    return NextResponse.json({
      conversations,
      viewer_id: user.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const propertyId = body?.propertyId;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'propertyId is required' },
        { status: 400 }
      );
    }

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, host_id, name')
      .eq('id', propertyId)
      .eq('status', 'active')
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found or inactive' },
        { status: 404 }
      );
    }

    if (property.host_id === user.id) {
      return NextResponse.json(
        { error: 'Hosts cannot start a conversation with themselves' },
        { status: 400 }
      );
    }

    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('property_id', propertyId)
      .eq('traveller_id', user.id)
      .single();

    if (existingConversation?.id) {
      return NextResponse.json({ conversation: existingConversation });
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        property_id: propertyId,
        host_id: property.host_id,
        traveller_id: user.id,
        last_message: 'Conversation started',
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ conversation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to start conversation' },
      { status: 500 }
    );
  }
}

