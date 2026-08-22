import { NextRequest, NextResponse } from 'next/server';
import type { User as AuthUser } from '@supabase/supabase-js';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { phoneFromAuthMetadata } from '@/lib/supabase/profileContactFromUser';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = new Set([
  'traveller',
  'user',
  'host',
  'host_pending',
  'admin',
  'dispensary',
  'service_host',
]);

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  role: string | null;
  created_at: string | null;
  enabled: boolean | null;
  avatar_url: string | null;
};

type AdminUserPatchBody = {
  userId?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  enabled?: boolean;
};

function requireServiceRole() {
  if (hasServiceRoleKey()) return null;
  return NextResponse.json(
    {
      error:
        'Server missing SUPABASE_SERVICE_ROLE_KEY — admin user edit/delete requires the service role key.',
    },
    { status: 503 }
  );
}

async function getTargetAuthUser(
  service: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<{ user: AuthUser | null; error?: string }> {
  const { data, error } = await service.auth.admin.getUserById(userId);
  if (error) {
    return { user: null, error: error.message };
  }
  return { user: data.user };
}

function assertCanModifyTarget(
  adminUser: AuthUser,
  target: AuthUser | null,
  targetId: string,
  action: 'modify' | 'delete'
): NextResponse | null {
  if (targetId === adminUser.id) {
    return NextResponse.json(
      { error: `You cannot ${action} your own admin account.` },
      { status: 400 }
    );
  }
  if (target && isAdminUser(target)) {
    return NextResponse.json(
      { error: `Cannot ${action} another admin account.` },
      { status: 403 }
    );
  }
  return null;
}

async function listAllAuthUsers(): Promise<AuthUser[]> {
  const service = createServiceClient();
  const all: AuthUser[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return all;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const service = createServiceClient();

    const [{ data: profilesData, error: profilesError }, authUsers] = await Promise.all([
      service.from('profiles').select('*').order('created_at', { ascending: false }),
      listAllAuthUsers().catch((e) => {
        console.warn('[admin/users] listUsers:', e);
        return [] as AuthUser[];
      }),
    ]);

    if (profilesError) throw profilesError;

    const authById = new Map(
      authUsers.map((u) => [
        u.id,
        {
          email: u.email?.toLowerCase().trim() || null,
          phone: phoneFromAuthMetadata(u.user_metadata as Record<string, unknown>),
        },
      ])
    );

    const backfillRows: {
      id: string;
      email: string | null;
      phone: string | null;
      updated_at: string;
    }[] = [];

    const profiles = (profilesData || []) as ProfileRow[];
    const users = profiles.map((profile) => {
      const authInfo = authById.get(profile.id);
      const email =
        profile.email?.trim() ||
        authInfo?.email ||
        null;
      const phone =
        profile.phone?.trim() ||
        profile.whatsapp?.trim() ||
        authInfo?.phone ||
        null;

      const needsEmail = email && profile.email !== email;
      const needsPhone = phone && profile.phone !== phone;
      if (needsEmail || needsPhone) {
        backfillRows.push({
          id: profile.id,
          email: email || null,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        });
      }

      return {
        id: profile.id,
        email: email || `user-${profile.id.substring(0, 8)}`,
        phone,
        name: profile.full_name || 'Anonymous User',
        role: profile.role || 'traveller',
        created_at: profile.created_at || new Date().toISOString(),
        enabled: profile.enabled !== false,
        avatar_url: profile.avatar_url,
      };
    });

    if (backfillRows.length > 0) {
      const { error: backfillErr } = await service.from('profiles').upsert(backfillRows, {
        onConflict: 'id',
      });
      if (backfillErr) {
        console.warn('[admin/users] contact backfill:', backfillErr.message);
      }
    }

    const [{ data: bookingsData }, { data: propertiesData }] = await Promise.all([
      service.from('bookings').select('user_id, total_price, host_id'),
      service.from('properties').select('host_id, id'),
    ]);

    const seenIds = new Set(users.map((u) => u.id));
    const extraUsers: typeof users = [];

    for (const b of bookingsData || []) {
      const userId = b.user_id as string | null;
      if (!userId || seenIds.has(userId)) continue;
      // If a user was deleted from Supabase Auth and has no profile row,
      // do not resurrect them from legacy bookings rows.
      if (!authById.has(userId)) continue;
      seenIds.add(userId);
      const authInfo = authById.get(userId);
      extraUsers.push({
        id: userId,
        email: authInfo?.email || `user-${userId.substring(0, 8)}`,
        phone: authInfo?.phone || null,
        name: `User ${userId.substring(0, 8)}`,
        role: 'traveller',
        created_at: new Date().toISOString(),
        enabled: true,
        avatar_url: null,
      });
    }

    for (const p of propertiesData || []) {
      const hostId = p.host_id as string | null;
      if (!hostId || seenIds.has(hostId)) continue;
      // Avoid resurrecting deleted hosts via orphaned properties rows.
      if (!authById.has(hostId)) continue;
      seenIds.add(hostId);
      const authInfo = authById.get(hostId);
      extraUsers.push({
        id: hostId,
        email: authInfo?.email || `host-${hostId.substring(0, 8)}`,
        phone: authInfo?.phone || null,
        name: `Host ${hostId.substring(0, 8)}`,
        role: 'host',
        created_at: new Date().toISOString(),
        enabled: true,
        avatar_url: null,
      });
    }

    const merged = [...users, ...extraUsers];

    const withStats = merged.map((u) => {
      const userBookings =
        bookingsData?.filter((b) => b.user_id === u.id) || [];
      const totalSpent = userBookings.reduce(
        (sum, b) => sum + Number(b.total_price || 0),
        0
      );
      const propertiesCount =
        propertiesData?.filter((p) => p.host_id === u.id).length || 0;
      const totalEarnings =
        bookingsData
          ?.filter((b) => b.host_id === u.id)
          .reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;

      return {
        ...u,
        bookings_count: userBookings.length,
        total_spent: totalSpent,
        properties_count: propertiesCount,
        total_earnings: totalEarnings,
      };
    });

    return NextResponse.json({ users: withStats });
  } catch (e: unknown) {
    console.error('[admin/users GET]', e);
    const message = e instanceof Error ? e.message : 'Failed to load users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const serviceRoleError = requireServiceRole();
    if (serviceRoleError) return serviceRoleError;

    let body: AdminUserPatchBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const userId = body.userId?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const service = createServiceClient();
    const { user: targetUser, error: targetLookupError } = await getTargetAuthUser(
      service,
      userId
    );
    if (targetLookupError && !targetLookupError.toLowerCase().includes('not found')) {
      return NextResponse.json({ error: targetLookupError }, { status: 404 });
    }

    const guard = assertCanModifyTarget(auth.user, targetUser, userId, 'modify');
    if (guard) return guard;

    const profilePatch: Record<string, unknown> = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    if (typeof body.full_name === 'string') {
      profilePatch.full_name = body.full_name.trim() || null;
    }
    if (typeof body.phone === 'string') {
      profilePatch.phone = body.phone.trim() || null;
    } else if (body.phone === null) {
      profilePatch.phone = null;
    }
    if (typeof body.email === 'string') {
      profilePatch.email = body.email.trim().toLowerCase() || null;
    }
    if (typeof body.role === 'string') {
      const role = body.role.trim().toLowerCase();
      if (!ALLOWED_ROLES.has(role)) {
        return NextResponse.json({ error: `Invalid role: ${body.role}` }, { status: 400 });
      }
      profilePatch.role = role;
    }
    if (typeof body.enabled === 'boolean') {
      profilePatch.enabled = body.enabled;
    }

    const { error: profileError } = await service
      .from('profiles')
      .upsert(profilePatch, { onConflict: 'id' });
    if (profileError) {
      console.error('[admin/users PATCH] profile:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (targetUser) {
      const authPatch: {
        email?: string;
        ban_duration?: string;
        user_metadata?: Record<string, unknown>;
      } = {};

      if (typeof body.email === 'string' && body.email.trim()) {
        authPatch.email = body.email.trim().toLowerCase();
      }
      if (typeof body.full_name === 'string' || typeof body.role === 'string') {
        authPatch.user_metadata = {
          ...(targetUser.user_metadata || {}),
          ...(typeof body.full_name === 'string'
            ? { full_name: body.full_name.trim() }
            : {}),
          ...(typeof body.role === 'string' ? { role: body.role.trim().toLowerCase() } : {}),
        };
      }
      if (typeof body.enabled === 'boolean') {
        authPatch.ban_duration = body.enabled ? 'none' : '876000h';
      }

      if (Object.keys(authPatch).length > 0) {
        const { error: authUpdateError } = await service.auth.admin.updateUserById(
          userId,
          authPatch
        );
        if (authUpdateError) {
          console.error('[admin/users PATCH] auth:', authUpdateError);
          return NextResponse.json({ error: authUpdateError.message }, { status: 500 });
        }
      }
    }

    const { data: profile } = await service
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const row = profile as ProfileRow | null;
    return NextResponse.json({
      ok: true,
      user: {
        id: userId,
        email:
          (typeof body.email === 'string' ? body.email.trim().toLowerCase() : null) ||
          row?.email ||
          targetUser?.email ||
          '',
        phone: row?.phone ?? null,
        name: row?.full_name || 'Anonymous User',
        role: row?.role || 'traveller',
        enabled: row?.enabled !== false,
      },
    });
  } catch (e: unknown) {
    console.error('[admin/users PATCH]', e);
    const message = e instanceof Error ? e.message : 'Failed to update user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const serviceRoleError = requireServiceRole();
    if (serviceRoleError) return serviceRoleError;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId')?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const service = createServiceClient();
    const { user: targetUser, error: targetLookupError } = await getTargetAuthUser(
      service,
      userId
    );

    const guard = assertCanModifyTarget(auth.user, targetUser, userId, 'delete');
    if (guard) return guard;

    let authDeleted = false;
    if (targetUser) {
      const { error: authDeleteErr } = await service.auth.admin.deleteUser(userId);
      if (authDeleteErr) {
        console.error('[admin/users DELETE] auth delete:', authDeleteErr.message);
        return NextResponse.json({ error: authDeleteErr.message }, { status: 500 });
      }
      authDeleted = true;
    } else if (targetLookupError && !targetLookupError.toLowerCase().includes('not found')) {
      return NextResponse.json({ error: targetLookupError }, { status: 404 });
    }

    const { error: profileDeleteErr } = await service
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileDeleteErr) {
      console.error('[admin/users DELETE] profile delete:', profileDeleteErr.message);
      if (!authDeleted) {
        return NextResponse.json({ error: profileDeleteErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('[admin/users DELETE]', e);
    const message = e instanceof Error ? e.message : 'Failed to delete user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
