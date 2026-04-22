/**
 * useBookingPolicyConfig — read the org-level booking_policy rule blocks so
 * downstream surfaces (e.g. ServiceEditorDialog) can default new entities
 * to the configured org behavior.
 *
 * Doctrine: structure precedes intelligence. The org-level toggle is the
 * source of truth for *defaults*; per-service flags remain the source of
 * truth at booking time.
 */
import { useMemo } from 'react';
import { usePolicyConfiguratorData } from './usePolicyConfigurator';

export interface BookingPolicyConfig {
  /** Org-level default for "Require card on file" on new services. */
  requireCardOnFile: boolean;
  /** True until the policy + draft version + blocks have resolved. */
  isLoading: boolean;
}

export function useBookingPolicyConfig(): BookingPolicyConfig {
  const { data, isLoading } = usePolicyConfiguratorData('booking_policy');

  return useMemo(() => {
    const block = data?.blocks.find((b) => b.block_key === 'require_card_on_file');
    const value = block?.value;
    const requireCardOnFile =
      value === true || value === 'true' || value === 1 || value === '1';
    return { requireCardOnFile, isLoading };
  }, [data, isLoading]);
}
