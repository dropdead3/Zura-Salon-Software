import { useMemo } from 'react';
import { useSiteSettings, useUpdateSiteSetting } from './useSiteSettings';

export interface TipConfig extends Record<string, unknown> {
  enabled: boolean;
  percentages: [number, number, number];
  fixed_threshold_enabled: boolean;
  fixed_threshold_amount: number;
  include_retail: boolean;
  prompt_on_saved_cards: boolean;
}

export const DEFAULT_TIP_CONFIG: TipConfig = {
  enabled: true,
  percentages: [20, 25, 30],
  fixed_threshold_enabled: false,
  fixed_threshold_amount: 2500, // $25.00 in cents
  include_retail: false,
  prompt_on_saved_cards: true,
};

export function useTipConfig(explicitOrgId?: string) {
  const query = useSiteSettings<TipConfig>('tip_config', explicitOrgId);

  const data = useMemo(
    () => (query.data ? { ...DEFAULT_TIP_CONFIG, ...query.data } : DEFAULT_TIP_CONFIG),
    [query.data]
  );

  return {
    ...query,
    data,
  };
}

export function useUpdateTipConfig(explicitOrgId?: string) {
  return useUpdateSiteSetting<TipConfig>(explicitOrgId);
}
