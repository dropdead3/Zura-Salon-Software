import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HardwareSku {
  id: string;
  product: string;
  amount: number;
  currency: string;
  status?: string;
  description?: string;
  image_url?: string;
}

export interface HardwareAccessory {
  id: string;
  product: string;
  amount: number;
  currency: string;
  image_url?: string;
}

interface SkuResponse {
  source: 'stripe_api' | 'fallback';
  skus: HardwareSku[];
  s710_skus?: HardwareSku[];
  accessories?: HardwareAccessory[];
  shipping_methods?: unknown[];
  pricing_note?: string;
}

export function useTerminalHardwareSkus(country = 'US', enabled = true) {
  return useQuery({
    queryKey: ['terminal-hardware-skus', country],
    queryFn: async (): Promise<SkuResponse> => {
      const { data, error } = await supabase.functions.invoke('terminal-hardware-order', {
        body: { action: 'get_skus', country },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as SkuResponse;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 min — prices rarely change
  });
}

interface CheckoutItem {
  name: string;
  amount: number;
  quantity: number;
  currency?: string;
  description?: string;
  sku_id?: string;
}

interface CheckoutParams {
  organizationId: string;
  locationId?: string;
  items: CheckoutItem[];
  successUrl?: string;
  cancelUrl?: string;
}

export function useCreateTerminalCheckout() {
  return useMutation({
    mutationFn: async ({
      organizationId,
      locationId,
      items,
      successUrl,
      cancelUrl,
    }: CheckoutParams) => {
      const { data, error } = await supabase.functions.invoke('terminal-hardware-order', {
        body: {
          action: 'create_checkout',
          organization_id: organizationId,
          location_id: locationId,
          items,
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string; session_id: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error('Failed to start checkout', { description: (error as Error).message });
    },
  });
}

export function useVerifyTerminalPayment() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      organizationId,
    }: {
      sessionId: string;
      organizationId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('terminal-hardware-order', {
        body: {
          action: 'verify_payment',
          session_id: sessionId,
          organization_id: organizationId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.already_recorded) {
        toast.info('This order was already recorded.');
      } else {
        toast.success('Terminal order confirmed! We\'ll ship your reader soon.');
      }
    },
    onError: (error) => {
      toast.error('Payment verification failed', { description: (error as Error).message });
    },
  });
}
