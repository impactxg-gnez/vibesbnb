import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import {
  buildIcalSyncWorkbook,
  deriveIcalSyncStatus,
  type IcalSyncExportRow,
} from '@/lib/icalSyncExcel';

export const dynamic = 'force-dynamic';

type PropertyRow = {
  id: string;
  name: string | null;
  title: string | null;
  location: string | null;
  host_id: string;
  status: string | null;
  ical_export_token: string | null;
};

type SourceRow = {
  property_id: string;
  name: string | null;
  ical_url: string;
  is_active: boolean | null;
  sync_status: string | null;
  sync_error: string | null;
  last_synced_at: string | null;
};

function appBaseUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    request.nextUrl.origin.replace(/\/$/, '')
  );
}

function exportUrlFor(propertyId: string, token: string, base: string): string {
  return `${base}/calendar/${propertyId}.ics?token=${encodeURIComponent(token)}`;
}

async function ensureExportToken(
  service: ReturnType<typeof createServiceClient>,
  property: PropertyRow
): Promise<string> {
  if (property.ical_export_token) return property.ical_export_token;
  const token = randomBytes(16).toString('hex');
  const { error } = await service
    .from('properties')
    .update({ ical_export_token: token })
    .eq('id', property.id);
  if (error) {
    console.warn('[admin/ical-sync] failed to set export token', property.id, error.message);
    return token;
  }
  return token;
}

async function loadHostBundle(
  service: ReturnType<typeof createServiceClient>,
  hostId: string,
  request: NextRequest
) {
  const { data: profile } = await service
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', hostId)
    .maybeSingle();

  const { data: properties, error: propErr } = await service
    .from('properties')
    .select('id, name, title, location, host_id, status, ical_export_token')
    .eq('host_id', hostId)
    .order('name', { ascending: true });

  if (propErr) throw propErr;

  const props = (properties || []) as PropertyRow[];
  const propIds = props.map((p) => p.id);

  let sources: SourceRow[] = [];
  if (propIds.length > 0) {
    const { data: srcRows, error: srcErr } = await service
      .from('property_ical_sources')
      .select(
        'property_id, name, ical_url, is_active, sync_status, sync_error, last_synced_at'
      )
      .in('property_id', propIds);
    if (srcErr) throw srcErr;
    sources = (srcRows || []) as SourceRow[];
  }

  const byProperty = new Map<string, SourceRow[]>();
  for (const s of sources) {
    const list = byProperty.get(s.property_id) || [];
    list.push(s);
    byProperty.set(s.property_id, list);
  }

  const base = appBaseUrl(request);
  const rows: IcalSyncExportRow[] = [];

  for (const p of props) {
    const token = await ensureExportToken(service, p);
    const derived = deriveIcalSyncStatus(byProperty.get(p.id) || []);
    rows.push({
      unitName: p.name || p.title || 'Untitled property',
      exportUrl: exportUrlFor(p.id, token, base),
      importUrls: derived.importUrls,
      syncStatus: derived.status,
      lastSyncedAt: derived.lastSyncedAt,
      notes: derived.notes,
    });
  }

  const hostLabel =
    (profile?.full_name && String(profile.full_name).trim()) ||
    (profile?.email && String(profile.email).trim()) ||
    'Host';

  const locations = [
    ...new Set(
      props
        .map((p) => (p.location || '').split(',').map((x) => x.trim()).filter(Boolean).slice(-2).join(', '))
        .filter(Boolean)
    ),
  ];
  const locPart = locations.slice(0, 2).join(' · ') || 'All listings';
  const subtitle = `${locPart} — ${props.length} ${props.length === 1 ? 'unit' : 'units'}`;

  return {
    hostId,
    hostLabel,
    hostEmail: profile?.email || null,
    subtitle,
    propertyCount: props.length,
    syncedCount: rows.filter((r) => r.syncStatus === 'Synced').length,
    failedCount: rows.filter((r) => r.syncStatus === 'Failed').length,
    notSyncedCount: rows.filter((r) => r.syncStatus === 'Not Synced').length,
    pendingCount: rows.filter((r) => r.syncStatus === 'Pending').length,
    rows: rows.map((r, i) => ({
      ...r,
      propertyId: props[i]?.id,
      status: props[i]?.status,
      location: props[i]?.location,
    })),
  };
}

/** List hosts with property counts, or detail+xlsx for one host. */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const service = createServiceClient();
    const hostId = request.nextUrl.searchParams.get('hostId');
    const format = (request.nextUrl.searchParams.get('format') || 'json').toLowerCase();

    if (!hostId) {
      // Distinct hosts that have properties
      const { data: props, error } = await service
        .from('properties')
        .select('host_id')
        .not('host_id', 'is', null);

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const p of props || []) {
        const id = String((p as { host_id: string }).host_id);
        counts.set(id, (counts.get(id) || 0) + 1);
      }

      const hostIds = [...counts.keys()];
      let profiles: { id: string; full_name: string | null; email: string | null }[] = [];
      if (hostIds.length > 0) {
        const { data: profs } = await service
          .from('profiles')
          .select('id, full_name, email')
          .in('id', hostIds);
        profiles = (profs || []) as typeof profiles;
      }
      const byId = new Map(profiles.map((p) => [p.id, p]));

      const hosts = hostIds
        .map((id) => {
          const p = byId.get(id);
          return {
            id,
            name: p?.full_name || p?.email || 'Unknown host',
            email: p?.email || null,
            propertyCount: counts.get(id) || 0,
          };
        })
        .sort((a, b) => b.propertyCount - a.propertyCount || a.name.localeCompare(b.name));

      return NextResponse.json({ hosts });
    }

    const bundle = await loadHostBundle(service, hostId, request);

    if (format === 'xlsx' || format === 'excel') {
      const buffer = await buildIcalSyncWorkbook({
        hostLabel: bundle.hostLabel,
        subtitle: bundle.subtitle,
        rows: bundle.rows,
      });
      const safeName = bundle.hostLabel
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40);
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `VibesBNB_${safeName || 'Host'}_iCal_Sync_${stamp}.xlsx`;
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json(bundle);
  } catch (e: unknown) {
    console.error('[admin/ical-sync]', e);
    const message = e instanceof Error ? e.message : 'Failed to load iCal sync data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
