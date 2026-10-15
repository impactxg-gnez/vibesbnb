import { NextRequest, NextResponse } from 'next/server';
import { resolveHostPropertyAccess } from '@/lib/auth/resolveHostPropertyAccess';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';
import { validatePropertySlug } from '@/lib/propertySlug';

function isMissingSlugColumn(error: { code?: string; message?: string } | null): boolean {
  const message = error?.message ?? '';
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    /custom_slug/i.test(message)
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveHostPropertyAccess(params.id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = (await request.json().catch(() => null)) as { slug?: unknown } | null;
    const raw = typeof body?.slug === 'string' ? body.slug : '';

    let customSlug: string | null = null;
    if (raw.trim()) {
      const parsed = validatePropertySlug(raw);
      if ('error' in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      customSlug = parsed.slug;
    }

    if (customSlug) {
      const { data: taken, error: takenError } = await access.db
        .from('properties')
        .select('id')
        .eq('custom_slug', customSlug)
        .neq('id', params.id)
        .maybeSingle();

      if (takenError && isMissingSlugColumn(takenError)) {
        return NextResponse.json(
          {
            error:
              'Custom slugs are not enabled yet. Run SUPABASE_PROPERTIES_CUSTOM_SLUG.sql in the Supabase SQL editor.',
          },
          { status: 503 }
        );
      }
      if (takenError) throw takenError;
      if (taken?.id) {
        return NextResponse.json(
          { error: 'That slug is already used by another listing.' },
          { status: 409 }
        );
      }
    }

    const { error } = await access.db
      .from('properties')
      .update({
        custom_slug: customSlug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (error) {
      if (isMissingSlugColumn(error)) {
        return NextResponse.json(
          {
            error:
              'Custom slugs are not enabled yet. Run SUPABASE_PROPERTIES_CUSTOM_SLUG.sql in the Supabase SQL editor.',
          },
          { status: 503 }
        );
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'That slug is already used by another listing.' },
          { status: 409 }
        );
      }
      throw error;
    }

    void invalidatePropertyListingCaches(params.id);
    return NextResponse.json({ success: true, slug: customSlug });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save custom slug';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
