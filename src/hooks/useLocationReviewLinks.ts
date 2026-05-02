import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface LocationReviewLink {
  id?: string;
  organization_id: string;
  location_id: string;
  google_review_url: string | null;
  apple_review_url: string | null;
  yelp_review_url: string | null;
  facebook_review_url: string | null;
  custom_review_url: string | null;
  custom_review_label: string | null;
  default_platform_priority: string[];
}

export function useLocationReviewLinks() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['location-review-links', orgId],
    queryFn: async (): Promise<LocationReviewLink[]> => {
      const { data, error } = await supabase
        .from('location_review_settings')
        .select('*')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return (data ?? []) as unknown as LocationReviewLink[];
    },
    enabled: !!orgId,
  });
}

export function useUpsertLocationReviewLink() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async (input: Omit<LocationReviewLink, 'id'>) => {
      if (!orgId) throw new Error('No organization');
      // Read-then-update/insert pattern (per Core memory)
      const { data: existing } = await supabase
        .from('location_review_settings')
        .select('id')
        .eq('organization_id', orgId)
        .eq('location_id', input.location_id)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('location_review_settings')
          .update(input)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('location_review_settings')
          .insert({ ...input, organization_id: orgId });
        if (error) throw error;
      }

      await supabase.from('review_compliance_log').insert({
        organization_id: orgId,
        event_type: 'link_changed',
        payload: { location_id: input.location_id },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location-review-links', orgId] });
      toast.success('Location review links saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
