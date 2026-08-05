import type { SupabaseClient } from '@supabase/supabase-js';
import { PLATFORM_FEE_PERCENT } from '@vibesbnb/shared';

export type PlatformSettings = {
  serviceFeePercent: number;
  updatedAt: string | null;
  migrationRequired: boolean;
};

function clampFee(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return PLATFORM_FEE_PERCENT;
  return Math.min(100, Math.max(0, Math.round(x * 100) / 100));
}

/** Server-side service fee % from platform_settings (falls back to shared constant). */
export async function getServiceFeePercent(
  service: SupabaseClient
): Promise<number> {
  const settings = await getPlatformSettings(service);
  return settings.serviceFeePercent;
}

export async function getPlatformSettings(
  service: SupabaseClient
): Promise<PlatformSettings> {
  const { data, error } = await service
    .from('platform_settings')
    .select('service_fee_percent, updated_at')
    .eq('id', 'default')
    .maybeSingle();

  if (error) {
    if (error.message?.includes('platform_settings') || error.code === '42P01') {
      return {
        serviceFeePercent: PLATFORM_FEE_PERCENT,
        updatedAt: null,
        migrationRequired: true,
      };
    }
    throw error;
  }

  if (!data) {
    return {
      serviceFeePercent: PLATFORM_FEE_PERCENT,
      updatedAt: null,
      migrationRequired: true,
    };
  }

  return {
    serviceFeePercent: clampFee(data.service_fee_percent),
    updatedAt: (data.updated_at as string) || null,
    migrationRequired: false,
  };
}

export async function upsertServiceFeePercent(
  service: SupabaseClient,
  percent: number
): Promise<PlatformSettings> {
  const fee = clampFee(percent);
  const { data, error } = await service
    .from('platform_settings')
    .upsert(
      {
        id: 'default',
        service_fee_percent: fee,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('service_fee_percent, updated_at')
    .single();

  if (error) {
    if (error.message?.includes('platform_settings') || error.code === '42P01') {
      return {
        serviceFeePercent: fee,
        updatedAt: null,
        migrationRequired: true,
      };
    }
    throw error;
  }

  return {
    serviceFeePercent: clampFee(data.service_fee_percent),
    updatedAt: (data.updated_at as string) || null,
    migrationRequired: false,
  };
}
