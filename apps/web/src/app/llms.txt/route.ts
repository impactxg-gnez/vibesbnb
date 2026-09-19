import { buildLlmsTxt } from '@/lib/seo/llmsTxt';
import { fetchActiveSeoProperties } from '@/lib/seo/publicProperties';

export const dynamic = 'force-dynamic';

export async function GET() {
  const properties = await fetchActiveSeoProperties();
  const body = buildLlmsTxt(properties);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
