import type { SupabaseClient } from '@supabase/supabase-js';
import { HOST_FEE_PERCENT, PLATFORM_FEE_PERCENT } from '@vibesbnb/shared';

export type PlatformSettings = {
  serviceFeePercent: number;
  hostFeePercent: number;
  updatedAt: string | null;
  migrationRequired: boolean;
};

function clampFee(n: unknown, fallback: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(100, Math.max(0, Math.round(x * 100) / 100));
}

/** Server-side guest service fee % from platform_settings. */
export async function getServiceFeePercent(
  service: SupabaseClient
): Promise<number> {
  const settings = await getPlatformSettings(service);
  return settings.serviceFeePercent;
}

/** Server-side host fee % from platform_settings. */
export async function getHostFeePercent(service: SupabaseClient): Promise<number> {
  const settings = await getPlatformSettings(service);
  return settings.hostFeePercent;
}

export async function getPlatformSettings(
  service: SupabaseClient
): Promise<PlatformSettings> {
  const { data, error } = await service
    .from('platform_settings')
    .select('service_fee_percent, host_fee_percent, updated_at')
    .eq('id', 'default')
    .maybeSingle();

  if (error) {
    if (error.message?.includes('platform_settings') || error.code === '42P01') {
      return {
        serviceFeePercent: PLATFORM_FEE_PERCENT,
        hostFeePercent: HOST_FEE_PERCENT,
        updatedAt: null,
        migrationRequired: true,
      };
    }
    throw error;
  }

  if (!data) {
    return {
      serviceFeePercent: PLATFORM_FEE_PERCENT,
      hostFeePercent: HOST_FEE_PERCENT,
      updatedAt: null,
      migrationRequired: true,
    };
  }

  return {
    serviceFeePercent: clampFee(data.service_fee_percent, PLATFORM_FEE_PERCENT),
    hostFeePercent: clampFee(
      (data as { host_fee_percent?: unknown }).host_fee_percent,
      HOST_FEE_PERCENT
    ),
    updatedAt: (data.updated_at as string) || null,
    migrationRequired: false,
  };
}

export async function upsertPlatformFees(
  service: SupabaseClient,
  fees: { serviceFeePercent?: number; hostFeePercent?: number }
): Promise<PlatformSettings> {
  const current = await getPlatformSettings(service);
  const serviceFeePercent = clampFee(
    fees.serviceFeePercent ?? current.serviceFeePercent,
    PLATFORM_FEE_PERCENT
  );
  const hostFeePercent = clampFee(
    fees.hostFeePercent ?? current.hostFeePercent,
    HOST_FEE_PERCENT
  );

  const { data, error } = await service
    .from('platform_settings')
    .upsert(
      {
        id: 'default',
        service_fee_percent: serviceFeePercent,
        host_fee_percent: hostFeePercent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('service_fee_percent, host_fee_percent, updated_at')
    .single();

  if (error) {
    if (error.message?.includes('platform_settings') || error.code === '42P01') {
      return {
        serviceFeePercent,
        hostFeePercent,
        updatedAt: null,
        migrationRequired: true,
      };
    }
    throw error;
  }

  return {
    serviceFeePercent: clampFee(data.service_fee_percent, PLATFORM_FEE_PERCENT),
    hostFeePercent: clampFee(
      (data as { host_fee_percent?: unknown }).host_fee_percent,
      HOST_FEE_PERCENT
    ),
    updatedAt: (data.updated_at as string) || null,
    migrationRequired: false,
  };
}

/** @deprecated Use upsertPlatformFees */
export async function upsertServiceFeePercent(
  service: SupabaseClient,
  percent: number
): Promise<PlatformSettings> {
  return upsertPlatformFees(service, { serviceFeePercent: percent });
}
