import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const isSupabaseConfigured = supabaseUrl && 
                                  supabaseUrl !== '' &&
                                  supabaseUrl !== 'https://placeholder.supabase.co' &&
                                  supabaseAnonKey &&
                                  supabaseAnonKey !== '' &&
                                  supabaseAnonKey !== 'placeholder-key';

    if (!isSupabaseConfigured) {
      return NextResponse.json({ 
        error: 'Supabase not configured',
        configured: false
      }, { status: 400 });
    }

    // Use service role key if available (bypasses RLS), otherwise use anon key
    const supabaseKey = supabaseServiceKey || supabaseAnonKey;
    const usingServiceRole = !!supabaseServiceKey;
    
    console.log('[Debug] Supabase URL:', supabaseUrl ? 'configured' : 'missing');
    console.log('[Debug] Using Service Role Key:', usingServiceRole);
    console.log('[Debug] Service Role Key present:', !!supabaseServiceKey);
    console.log('[Debug] Anon Key present:', !!supabaseAnonKey);
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // First, try to check if the table exists and get a count
    console.log('[Debug] Attempting to query properties table...');
    const { data: properties, error: fetchError, count } = await supabase
      .from('properties')
      .select('*', { count: 'exact' });
    
    console.log('[Debug] Query result - count:', count);
    console.log('[Debug] Query result - properties length:', properties?.length);
    console.log('[Debug] Query result - error:', fetchError);
    
    // Also try a simple count query
    const { count: simpleCount, error: countError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });
    
    console.log('[Debug] Simple count query - count:', simpleCount);
    console.log('[Debug] Simple count query - error:', countError);

    if (fetchError) {
      console.error('[Debug] Fetch error details:', {
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint,
      });
      return NextResponse.json({ 
        error: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint,
        configured: true,
        usingServiceRole,
        debug: {
          supabaseUrl: supabaseUrl ? 'configured' : 'missing',
          hasServiceRoleKey: !!supabaseServiceKey,
          hasAnonKey: !!supabaseAnonKey,
        }
      }, { status: 500 });
    }
    
    // If no error but also no properties, check if table exists
    if ((!properties || properties.length === 0) && count === 0) {
      console.log('[Debug] No properties found. Checking if table exists...');
      // Try to query table schema
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_info', { table_name: 'properties' })
        .catch(() => ({ data: null, error: { message: 'RPC function not available' } }));
      
      console.log('[Debug] Table info check:', { tableInfo, tableError });
    }

    // Analyze properties
    const analysis = {
      total: properties?.length || 0,
      withName: properties?.filter(p => p.name).length || 0,
      withTitle: properties?.filter(p => p.title).length || 0,
      withImages: properties?.filter(p => p.images && Array.isArray(p.images) && p.images.length > 0).length || 0,
      withoutImages: properties?.filter(p => !p.images || !Array.isArray(p.images) || p.images.length === 0).length || 0,
      withPropertyListingPrefix: properties?.filter(p => {
        const name = p.name || p.title || '';
        return /^Property\s+Listing[_\s-]*/i.test(name) || /^property-listing[_\s-]*/i.test(name);
      }).length || 0,
      sampleProperties: properties?.slice(0, 5).map(p => ({
        id: p.id,
        name: p.name,
        title: p.title,
        imagesCount: Array.isArray(p.images) ? p.images.length : 0,
        hasPropertyListingPrefix: /^Property\s+Listing[_\s-]*/i.test(p.name || p.title || '') || /^property-listing[_\s-]*/i.test(p.name || p.title || ''),
      })) || [],
    };

    return NextResponse.json({
      success: true,
      configured: true,
      usingServiceRole,
      count: count || properties?.length || 0,
      simpleCount: simpleCount || 0,
      analysis,
      properties: properties?.slice(0, 10) || [], // Return first 10 for inspection
      debug: {
        supabaseUrl: supabaseUrl ? 'configured' : 'missing',
        hasServiceRoleKey: !!supabaseServiceKey,
        hasAnonKey: !!supabaseAnonKey,
        queryCount: count,
        queryError: fetchError ? {
          message: fetchError.message,
          code: fetchError.code,
        } : null,
        simpleCountError: countError ? {
          message: countError.message,
          code: countError.code,
        } : null,
      }
    });

  } catch (error: any) {
    console.error('Error debugging properties:', error);
    return NextResponse.json(
      { error: 'Failed to debug properties', details: error.message },
      { status: 500 }
    );
  }
}

