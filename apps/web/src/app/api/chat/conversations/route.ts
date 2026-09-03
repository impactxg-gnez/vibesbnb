import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import { dispatchAdminNewChatEmail } from '@/lib/notifications/dispatchAdminNewChatEmail';
import { resolveUserContact } from '@/lib/notifications/resolveUserContact';

interface ConversationResponse {
  id: string;
  property_id: string;
  host_id: string;
  traveller_id: string;
  booking_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  inquiry_check_in?: string | null;
  inquiry_check_out?: string | null;
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

function parseInquiryYmd(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export async function GET(request: NextRequest) {
  try {
    const serviceSupabase = createServiceClient();
    
    // Try to get user from Authorization header first, then fall back to cookies
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let user = null;
    let supabase;
    
    if (token) {
      // Use token-based auth
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    } else {
      // Fall back to server client with cookies
      supabase = createServerClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }

    if (!user) {
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
          inquiry_check_in,
          inquiry_check_out,
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
      if (error.code === '42703') {
        // Older DBs may lack inquiry date columns — retry without them.
        if (
          String(error.message || '').includes('inquiry_check_in') ||
          String(error.message || '').includes('inquiry_check_out')
        ) {
          const retry = (useService ? serviceSupabase : supabase)
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
          if (filterConversationId) retry.eq('id', filterConversationId);
          else if (!useService) retry.or(`host_id.eq.${user.id},traveller_id.eq.${user.id}`);
          const { data: retryData, error: retryError } = await retry;
          if (retryError) {
            if (retryError.code === '42703') {
              throw new Error(
                'Missing database columns: host_unread_count or traveller_unread_count. Please run the migration: SUPABASE_FIX_MESSAGING_ARCHIVE.sql in your Supabase SQL editor.'
              );
            }
            throw retryError;
          }
          return NextResponse.json({
            conversations: (retryData as ConversationResponse[] | null) ?? [],
            viewer_id: user.id,
          });
        }
        throw new Error(
          'Missing database columns: host_unread_count or traveller_unread_count. Please run the migration: SUPABASE_FIX_MESSAGING_ARCHIVE.sql in your Supabase SQL editor.'
        );
      }
      throw error;
    }

    const conversations = (data as ConversationResponse[] | null) ?? [];

    return NextResponse.json({
      conversations,
      viewer_id: user.id,
    });
  } catch (error: any) {
    console.error('[ConversationsAPI] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Try to get user from Authorization header first, then fall back to cookies
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

    const body = await request.json();
    const propertyId = body?.propertyId;
    const inquiryCheckIn = parseInquiryYmd(body?.checkIn);
    const inquiryCheckOut = parseInquiryYmd(body?.checkOut);
    const inquiryDates =
      inquiryCheckIn && inquiryCheckOut && inquiryCheckOut > inquiryCheckIn
        ? { inquiry_check_in: inquiryCheckIn, inquiry_check_out: inquiryCheckOut }
        : null;

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
      .select('id, inquiry_check_in, inquiry_check_out')
      .eq('property_id', propertyId)
      .eq('traveller_id', user.id)
      .maybeSingle();

    if (existingConversation?.id) {
      if (inquiryDates) {
        const { data: updated, error: updateError } = await supabase
          .from('conversations')
          .update(inquiryDates)
          .eq('id', existingConversation.id)
          .select('id, inquiry_check_in, inquiry_check_out')
          .single();
        if (!updateError && updated) {
          return NextResponse.json({ conversation: updated });
        }
        // Column may not exist yet — still return the thread.
        if (updateError && updateError.code !== '42703') {
          console.warn('[ConversationsAPI] inquiry date update failed', updateError);
        }
      }
      return NextResponse.json({ conversation: existingConversation });
    }

    const serviceSupabase = createServiceClient();
    const [travellerContact, hostContact] = await Promise.all([
      resolveUserContact(serviceSupabase, user.id),
      resolveUserContact(serviceSupabase, property.host_id),
    ]);

    const insertPayload: Record<string, unknown> = {
      property_id: propertyId,
      host_id: property.host_id,
      traveller_id: user.id,
      last_message: 'Conversation started',
      last_message_at: new Date().toISOString(),
      host_name: hostContact.name,
      traveller_name: travellerContact.name,
      ...(inquiryDates || {}),
    };

    let { data: conversation, error } = await supabase
      .from('conversations')
      .insert(insertPayload)
      .select()
      .single();

    if (error?.code === '42703' && inquiryDates) {
      const { inquiry_check_in: _in, inquiry_check_out: _out, ...withoutDates } = insertPayload;
      const retry = await supabase.from('conversations').insert(withoutDates).select().single();
      conversation = retry.data;
      error = retry.error;
    }

    if (error) {
      throw error;
    }
    if (!conversation) {
      throw new Error('Failed to create conversation');
    }

    // New thread only — subsequent messages must not trigger admin_new_chat
    try {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      void dispatchAdminNewChatEmail({
        service: serviceSupabase,
        appUrl,
        conversationId: conversation.id,
        guestName: travellerContact.name,
        hostName: hostContact.name,
        propertyName: property.name || 'Listing',
        messagePreview: 'Conversation started',
        createdAt:
          conversation.last_message_at ||
          conversation.created_at ||
          new Date().toISOString(),
      });
    } catch (adminEmailErr) {
      console.warn('[ConversationsAPI] admin_new_chat failed:', adminEmailErr);
    }

    return NextResponse.json({ conversation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to start conversation' },
      { status: 500 }
    );
  }
}

