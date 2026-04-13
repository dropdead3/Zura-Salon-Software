import { useSiteSettings, useUpdateSiteSetting } from './useSiteSettings';

export interface ReceiptConfig extends Record<string, unknown> {
  show_logo: boolean;
  logo_position: 'center' | 'left';
  show_address: boolean;
  show_phone: boolean;
  custom_message: string;
  show_stylist: boolean;
  show_payment_method: boolean;
  accent_color: string;
  footer_text: string;
}

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  show_logo: true,
  logo_position: 'center',
  show_address: true,
  show_phone: true,
  custom_message: 'Thank you for your visit!',
  show_stylist: true,
  show_payment_method: true,
  accent_color: '',
  footer_text: '',
};

export function useReceiptConfig(explicitOrgId?: string) {
  const query = useSiteSettings<ReceiptConfig>('receipt_config', explicitOrgId);

  return {
    ...query,
    data: query.data ? { ...DEFAULT_RECEIPT_CONFIG, ...query.data } : DEFAULT_RECEIPT_CONFIG,
  };
}

export function useUpdateReceiptConfig(explicitOrgId?: string) {
  return useUpdateSiteSetting<ReceiptConfig>(explicitOrgId);
}
