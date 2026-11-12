import { NextResponse } from 'next/server';
import { fetchInstagramFeed } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const feed = await fetchInstagramFeed();
    return NextResponse.json({
      success: true,
      ...feed,
    });
  } catch (error: any) {
    console.error('Error serving Instagram feed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch Instagram feed',
      },
      { status: 500 }
    );
  }
}
