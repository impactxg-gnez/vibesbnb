import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .eq('type', 'new_message');

    if (error) {
      throw error;
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (error: any) {
    console.error('Failed to load unread message count:', error);
    return NextResponse.json({ count: 0 });
  }
}


