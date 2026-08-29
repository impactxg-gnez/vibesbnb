import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPlatformFees } from './api';

const LS_SERVICE = 'serviceFee';
const LS_HOST = 'hostFee';

let cached: { service: number; host: number } | null = null;

export async function syncPlatformFeesFromServer(): Promise<{
  serviceFeePercent: number;
  hostFeePercent: number;
}> {
  try {
    const data = await fetchPlatformFees();
    cached = { service: data.serviceFeePercent, host: data.hostFeePercent };
    await AsyncStorage.setItem(LS_SERVICE, String(data.serviceFeePercent));
    await AsyncStorage.setItem(LS_HOST, String(data.hostFeePercent));
    return data;
  } catch {
    const service = Number(await AsyncStorage.getItem(LS_SERVICE)) || 10;
    const host = Number(await AsyncStorage.getItem(LS_HOST)) || 5;
    return { serviceFeePercent: service, hostFeePercent: host };
  }
}

export function getCachedPlatformFees() {
  return cached;
}
