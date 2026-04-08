import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Validate the URL
    const parsedUrl = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
    }

    // Fetch the CSV from the external URL
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/csv, text/plain, */*',
        'User-Agent': 'VibesBNB-PropertyImporter/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const text = await response.text();

    // Basic validation that it looks like CSV
    if (!text.includes(',') && !text.includes('\n')) {
      return NextResponse.json(
        { error: 'Response does not appear to be a valid CSV file' },
        { status: 400 }
      );
    }

    // Return the CSV content as plain text
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Error fetching CSV:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch CSV' },
      { status: 500 }
    );
  }
}
