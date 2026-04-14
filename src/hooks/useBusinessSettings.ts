import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SidebarLayoutConfig {
  sectionOrder: string[];
  linkOrder: Record<string, string[]>;
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  legal_name: string | null;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  icon_light_url: string | null;
  icon_dark_url: string | null;
  mailing_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  ein: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  sidebar_layout: SidebarLayoutConfig | null;
  default_tax_rate: number | null;
  created_at: string;
  updated_at: string;
}

export function useBusinessSettings() {
  return useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .single();

      if (error) throw error;
      return {
        ...data,
        sidebar_layout: data.sidebar_layout as unknown as SidebarLayoutConfig | null,
      } as BusinessSettings;
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

export function useBusinessName() {
  const { data } = useBusinessSettings();
  return data?.business_name || 'Salon';
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<BusinessSettings, 'id' | 'created_at' | 'updated_at'>>) => {
      // Get existing settings first
      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .single();

      if (!existing) {
        throw new Error('Business settings not found');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sidebar_layout, ...restUpdates } = updates;
      
      // Build update object - sidebar_layout handled separately via useSidebarLayout
      const dbUpdates = { ...restUpdates };

      const { data, error } = await supabase
        .from('business_settings')
        .update(dbUpdates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        sidebar_layout: data.sidebar_layout as unknown as SidebarLayoutConfig | null,
      } as BusinessSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      toast.success('Business settings updated');
    },
    onError: (error) => {
      console.error('Failed to update business settings:', error);
      toast.error('Failed to update business settings');
    },
  });
}
