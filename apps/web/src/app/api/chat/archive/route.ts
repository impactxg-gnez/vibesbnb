import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * API to archive messages older than 1 year.
 * This should ideally be called by a cron job or an admin task.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAction = createServiceClient();
    
    // 1. Double check the table exists (implicitly handled by the query)
    // We move messages older than 365 days
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateStr = oneYearAgo.toISOString();

    console.log('[Archive] Archiving messages older than:', dateStr);

    // Try to use the stored procedure if it exists
    const { data: rpcData, error: rpcError } = await supabaseAction.rpc('archive_old_messages');

    if (!rpcError) {
      return NextResponse.json({ 
        success: true, 
        message: 'Archived messages using stored procedure', 
        count: rpcData 
      });
    }

    console.log('[Archive] RPC failed or missing, falling back to manual move:', rpcError.message);

    // Manual fallback logic if RPC fails
    // Select old messages
    const { data: oldMessages, error: selectError } = await supabaseAction
      .from('messages')
      .select('*')
      .lt('created_at', dateStr);

    if (selectError) throw selectError;

    if (!oldMessages || oldMessages.length === 0) {
      return NextResponse.json({ success: true, message: 'No messages to archive', count: 0 });
    }

    // Insert into archive
    const { error: insertError } = await supabaseAction
      .from('archived_messages')
      .insert(oldMessages.map(m => ({
        ...m,
        archived_at: new Date().toISOString()
      })));

    if (insertError) {
      // If table doesn't exist, this will fail
      if (insertError.code === '42P01') {
        return NextResponse.json({ 
          error: 'Archived table missing. Please run the SQL migration (SUPABASE_FIX_MESSAGING_ARCHIVE.sql) in your Supabase dashboard.',
          code: 'MIGRATION_REQUIRED' 
        }, { status: 400 });
      }
      throw insertError;
    }

    // Delete archived messages
    const { error: deleteError } = await supabaseAction
      .from('messages')
      .delete()
      .lt('created_at', dateStr);

    if (deleteError) throw deleteError;

    return NextResponse.json({ 
      success: true, 
      message: `Successfully archived ${oldMessages.length} messages.`, 
      count: oldMessages.length 
    });

  } catch (error: any) {
    console.error('[Archive] Error:', error);
    return NextResponse.json({ error: error.message || 'Archiving failed' }, { status: 500 });
  }
}
