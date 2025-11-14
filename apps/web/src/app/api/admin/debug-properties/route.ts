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
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch all properties with all columns
    const { data: properties, error: fetchError, count } = await supabase
      .from('properties')
      .select('*', { count: 'exact' });

    if (fetchError) {
      return NextResponse.json({ 
        error: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint,
        configured: true,
        usingServiceRole,
      }, { status: 500 });
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
      analysis,
      properties: properties?.slice(0, 10) || [], // Return first 10 for inspection
    });

  } catch (error: any) {
    console.error('Error debugging properties:', error);
    return NextResponse.json(
      { error: 'Failed to debug properties', details: error.message },
      { status: 500 }
    );
  }
}

