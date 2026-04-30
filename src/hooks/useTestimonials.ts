/**
 * Tenant-scoped testimonials (website_testimonials).
 * Surface discriminator: 'general' (TestimonialSection) | 'extensions' (ExtensionReviewsSection).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';
import { toast } from 'sonner';

export type TestimonialSurface = 'general' | 'extensions';

export interface Testimonial {
  id: string;
  organization_id: string;
  surface: TestimonialSurface;
  title: string;
  author: string;
  body: string;
  /** Legacy alias for `body` — kept so older editor screens compile. */
  text: string;
  rating: number;
  source_url: string | null;
  enabled: boolean;
  /** Legacy alias for `enabled`. */
  is_visible: boolean;
  sort_order: number;
  /** Legacy alias for `sort_order`. */
  display_order: number;
  created_at: string;
  updated_at: string;
}

const STALE_TIME_MS = 30_000;

export function useTestimonials(surface?: TestimonialSurface, explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);
  return useQuery({
    queryKey: ['website_testimonials', orgId, surface ?? 'all'],
    enabled: !!orgId,
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      let q = supabase
        .from('website_testimonials')
        .select('*')
        .eq('organization_id', orgId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (surface) q = q.eq('surface', surface);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Testimonial[];
    },
  });
}

export function useVisibleTestimonials(surface: TestimonialSurface, explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);
  return useQuery({
    queryKey: ['website_testimonials', 'visible', orgId, surface],
    enabled: !!orgId,
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_testimonials')
        .select('id, title, author, body, rating, source_url, sort_order')
        .eq('organization_id', orgId!)
        .eq('surface', surface)
        .eq('enabled', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Pick<Testimonial, 'id' | 'title' | 'author' | 'body' | 'rating' | 'source_url' | 'sort_order'>[];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  const orgId = useSettingsOrgId();
  return () => {
    qc.invalidateQueries({ queryKey: ['website_testimonials', orgId, 'all'] });
    qc.invalidateQueries({ queryKey: ['website_testimonials', orgId, 'general'] });
    qc.invalidateQueries({ queryKey: ['website_testimonials', orgId, 'extensions'] });
    qc.invalidateQueries({ queryKey: ['website_testimonials', 'visible', orgId, 'general'] });
    qc.invalidateQueries({ queryKey: ['website_testimonials', 'visible', orgId, 'extensions'] });
  };
}

export function useCreateTestimonial() {
  const orgId = useSettingsOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: Pick<Testimonial, 'surface' | 'title' | 'author' | 'body'> & Partial<Pick<Testimonial, 'rating' | 'source_url' | 'sort_order' | 'enabled'>>) => {
      if (!orgId) throw new Error('No organization context');
      const { data, error } = await supabase
        .from('website_testimonials')
        .insert({
          organization_id: orgId,
          surface: input.surface,
          title: input.title,
          author: input.author,
          body: input.body,
          rating: input.rating ?? 5,
          source_url: input.source_url ?? null,
          sort_order: input.sort_order ?? 0,
          enabled: input.enabled ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Testimonial;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error('Failed to add testimonial: ' + e.message),
  });
}

export function useUpdateTestimonial() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Testimonial> & { id: string }) => {
      const { data, error } = await supabase
        .from('website_testimonials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Testimonial;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error('Failed to update testimonial: ' + e.message),
  });
}

export function useDeleteTestimonial() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('website_testimonials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error('Failed to delete testimonial: ' + e.message),
  });
}
