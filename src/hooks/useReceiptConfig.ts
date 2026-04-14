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
  show_footer_icon: boolean;
  show_socials: boolean;
  show_website: boolean;
  show_redo_policy: boolean;
  redo_policy_text: string;
  show_refund_policy: boolean;
  refund_policy_text: string;
  show_satisfaction_note: boolean;
  satisfaction_text: string;
  show_review_prompt: boolean;
  review_prompt_text: string;
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
  show_footer_icon: false,
  show_socials: true,
  show_website: true,
  show_redo_policy: false,
  redo_policy_text: '',
  show_refund_policy: false,
  refund_policy_text: 'All sales are final. Contact us within 48 hours with any concerns.',
  show_satisfaction_note: true,
  satisfaction_text: 'Not satisfied? Contact us and we\'ll make it right.',
  show_review_prompt: true,
  review_prompt_text: 'Loved your visit? Leave us a review!',
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
