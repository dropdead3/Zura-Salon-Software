import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  promotion?: {
    id: string;
    name: string;
    promotion_type: string;
    discount_value: number | null;
    discount_max_amount: number | null;
    minimum_purchase: number | null;
    applies_to: string;
    applicable_service_ids: string[] | null;
    applicable_category: string[] | null;
    excluded_service_ids: string[] | null;
  };
  calculated_discount?: number;
  final_amount?: number;
}

export interface ValidatePromoCodeParams {
  organizationId: string;
  promoCode: string;
  clientId?: string;
  subtotal: number;
  serviceIds?: string[];
  categories?: string[];
}

export function useValidatePromoCode() {
  return useMutation({
    mutationFn: async ({
      organizationId,
      promoCode,
      clientId,
      subtotal,
      serviceIds = [],
      categories = [],
    }: ValidatePromoCodeParams): Promise<PromoValidationResult> => {
      // Find the promotion by code
      const { data: promotion, error } = await supabase
        .from('promotions' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .eq('promo_code', promoCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        return { valid: false, error: 'Error validating promo code' };
      }

      if (!promotion) {
        return { valid: false, error: 'Invalid promo code' };
      }

      const promo = promotion as any;

      // Check expiration
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return { valid: false, error: 'This promo code has expired' };
      }

      // Check start date
      if (promo.starts_at && new Date(promo.starts_at) > new Date()) {
        return { valid: false, error: 'This promo code is not yet active' };
      }

      // Check usage limit
      if (promo.usage_limit && promo.current_usage_count >= promo.usage_limit) {
        return { valid: false, error: 'This promo code has reached its usage limit' };
      }

      // Check minimum purchase
      if (promo.minimum_purchase && subtotal < promo.minimum_purchase) {
        return {
          valid: false,
          error: `Minimum purchase of $${promo.minimum_purchase.toFixed(2)} required`,
        };
      }

      // Check per-client usage limit if client is provided
      if (clientId && promo.usage_per_client) {
        const { data: redemptions } = await supabase
          .from('promotion_redemptions' as any)
          .select('id')
          .eq('promotion_id', promo.id)
          .eq('client_id', clientId);

        if (redemptions && redemptions.length >= promo.usage_per_client) {
          return { valid: false, error: 'You have already used this promo code' };
        }
      }

      // Check target audience
      if (promo.target_audience === 'new_clients' && clientId) {
        const { data: prevAppointments } = await supabase
          .from('v_all_appointments' as any)
          .select('id')
          .eq('phorest_client_id', clientId)
          .limit(1);

        if (prevAppointments && prevAppointments.length > 0) {
          return { valid: false, error: 'This promo is for new clients only' };
        }
      }

      if (promo.target_audience === 'specific_clients' && clientId) {
        if (!promo.target_client_ids?.includes(clientId)) {
          return { valid: false, error: 'This promo is not available for your account' };
        }
      }

      // Check service/category applicability
      if (promo.applies_to === 'specific') {
        const applicableServices = promo.applicable_service_ids || [];
        const excludedServices = promo.excluded_service_ids || [];
        const applicableCategories = promo.applicable_category || [];

        const hasApplicableService = serviceIds.some(
          id => applicableServices.includes(id) && !excludedServices.includes(id)
        );
        const hasApplicableCategory = categories.some(cat => applicableCategories.includes(cat));

        if (!hasApplicableService && !hasApplicableCategory) {
          return { valid: false, error: 'This promo does not apply to selected services' };
        }
      }

      // Calculate discount
      let discount = 0;
      if (promo.promotion_type === 'percentage_discount') {
        discount = subtotal * (promo.discount_value / 100);
        if (promo.discount_max_amount && discount > promo.discount_max_amount) {
          discount = promo.discount_max_amount;
        }
      } else if (promo.promotion_type === 'fixed_discount') {
        discount = promo.discount_value || 0;
        if (discount > subtotal) {
          discount = subtotal;
        }
      }

      const finalAmount = subtotal - discount;

      return {
        valid: true,
        promotion: {
          id: promo.id,
          name: promo.name,
          promotion_type: promo.promotion_type,
          discount_value: promo.discount_value,
          discount_max_amount: promo.discount_max_amount,
          minimum_purchase: promo.minimum_purchase,
          applies_to: promo.applies_to,
          applicable_service_ids: promo.applicable_service_ids,
          applicable_category: promo.applicable_category,
          excluded_service_ids: promo.excluded_service_ids,
        },
        calculated_discount: discount,
        final_amount: finalAmount,
      };
    },
  });
}

export function useRedeemPromoCode() {
  return useMutation({
    mutationFn: async ({
      promotionId,
      variantId,
      clientId,
      transactionId,
      originalAmount,
      discountApplied,
      finalAmount,
      locationId,
      staffUserId,
      itemsDiscounted,
    }: {
      promotionId: string;
      variantId?: string;
      clientId?: string;
      transactionId?: string;
      originalAmount: number;
      discountApplied: number;
      finalAmount: number;
      locationId?: string;
      staffUserId?: string;
      itemsDiscounted?: any[];
    }) => {
      // Get organization ID from promotion
      const { data: promo } = await supabase
        .from('promotions' as any)
        .select('organization_id, promo_code, current_usage_count')
        .eq('id', promotionId)
        .single();

      if (!promo) throw new Error('Promotion not found');

      // Create redemption record
      const { data: redemption, error } = await supabase
        .from('promotion_redemptions' as any)
        .insert({
          organization_id: (promo as any).organization_id,
          promotion_id: promotionId,
          variant_id: variantId,
          promo_code_used: (promo as any).promo_code,
          client_id: clientId,
          transaction_id: transactionId,
          original_amount: originalAmount,
          discount_applied: discountApplied,
          final_amount: finalAmount,
          revenue_attributed: finalAmount,
          location_id: locationId,
          staff_user_id: staffUserId,
          items_discounted: itemsDiscounted,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Increment usage count
      await supabase
        .from('promotions' as any)
        .update({
          current_usage_count: ((promo as any).current_usage_count || 0) + 1,
        } as any)
        .eq('id', promotionId);

      // If variant, increment variant redemptions
      if (variantId) {
        const { data: variant } = await supabase
          .from('promotion_variants' as any)
          .select('redemptions, revenue_generated')
          .eq('id', variantId)
          .single();

        if (variant) {
          await supabase
            .from('promotion_variants' as any)
            .update({
              redemptions: (variant as any).redemptions + 1,
              revenue_generated: (variant as any).revenue_generated + finalAmount,
            } as any)
            .eq('id', variantId);
        }
      }

      return redemption;
    },
  });
}

export function useCheckVoucherCode() {
  return useMutation({
    mutationFn: async ({
      organizationId,
      voucherCode,
    }: {
      organizationId: string;
      voucherCode: string;
    }) => {
      const { data: voucher, error } = await supabase
        .from('vouchers' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .eq('code', voucherCode.toUpperCase())
        .maybeSingle();

      if (error || !voucher) {
        return { valid: false, error: 'Invalid voucher code' };
      }

      const v = voucher as any;

      if (v.status !== 'active') {
        return { valid: false, error: 'This voucher has been used or expired' };
      }

      if (v.expires_at && new Date(v.expires_at) < new Date()) {
        return { valid: false, error: 'This voucher has expired' };
      }

      return {
        valid: true,
        voucher: {
          id: v.id,
          code: v.code,
          value: v.remaining_value || v.original_value,
          type: v.voucher_type,
        },
      };
    },
  });
}
