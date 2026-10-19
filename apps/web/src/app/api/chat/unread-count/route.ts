import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

type ConversationUnreadRow = {
  host_id: string;
  traveller_id: string;
  host_unread_count?: number | null;
  traveller_unread_count?: number | null;
  host_hidden_at?: string | null;
  traveller_hidden_at?: string | null;
};

function sumUnread(rows: ConversationUnreadRow[], userId: string): number {
  let total = 0;
  for (const row of rows) {
    if (row.host_id === userId && !row.host_hidden_at) {
      total += Math.max(0, Number(row.host_unread_count) || 0);
    }
    if (row.traveller_id === userId && !row.traveller_hidden_at) {
      total += Math.max(0, Number(row.traveller_unread_count) || 0);
    }
  }
  return total;
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ count: 0 });
    }

    const service = createServiceClient();
    const columnsWithHide =
      'host_id, traveller_id, host_unread_count, traveller_unread_count, host_hidden_at, traveller_hidden_at';
    const columnsPlain =
      'host_id, traveller_id, host_unread_count, traveller_unread_count';

    let data: ConversationUnreadRow[] | null = null;
    let { data: withHide, error } = await service
      .from('conversations')
      .select(columnsWithHide)
      .or(`host_id.eq.${user.id},traveller_id.eq.${user.id}`);

    if (error?.code === '42703') {
      const retry = await service
        .from('conversations')
        .select(columnsPlain)
        .or(`host_id.eq.${user.id},traveller_id.eq.${user.id}`);
      data = (retry.data || null) as ConversationUnreadRow[] | null;
      error = retry.error;
    } else {
      data = (withHide || null) as ConversationUnreadRow[] | null;
    }

    if (error) {
      throw error;
    }

    const count = sumUnread(data || [], user.id);

    return NextResponse.json(
      { count },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Failed to load unread message count:', error);
    return NextResponse.json({ count: 0 });
  }
}
