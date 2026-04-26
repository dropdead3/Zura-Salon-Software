import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';

interface ClearLockoutArgs {
  organizationId: string;
  surface?: 'login' | 'dock';
}

/**
 * Primary-owner-only manual unlock for the current device's PIN lockout.
 *
 * Backed by the security-definer RPC `clear_device_pin_lockout` which
 * hard-gates on `is_primary_owner` (or platform super admin) and writes
 * an audit row to `pin_lockout_overrides`.
 *
 * Pairs with `useSessionLockout` on the calling surface to wipe the local
 * countdown immediately so the next PIN attempt is accepted.
 */
export function useClearDeviceLockout() {
  return useMutation({
    mutationFn: async ({
      organizationId,
      surface = 'login',
    }: ClearLockoutArgs): Promise<{ clearedCount: number; deviceFingerprint: string }> => {
      const fp = getDeviceFingerprint();
      if (!fp) throw new Error('Device fingerprint unavailable');

      const { data, error } = await supabase.rpc('clear_device_pin_lockout', {
        _organization_id: organizationId,
        _device_fingerprint: fp,
        _surface: surface,
      });

      if (error) throw error;
      const row = (data && data[0]) as { cleared_count: number } | undefined;
      return {
        clearedCount: row?.cleared_count ?? 0,
        deviceFingerprint: fp,
      };
    },
  });
}
