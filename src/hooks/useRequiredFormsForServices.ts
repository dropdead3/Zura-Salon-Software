import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RequiredFormForService {
  service_id: string;
  service_name: string | null;
  form_template_id: string;
  form_template_name: string;
  form_type: string;
  signing_frequency: 'once' | 'per_visit' | 'annually';
}

/**
 * Wave 4: Returns required forms for a list of service IDs, joined with the
 * service name and template metadata so callers can render "X requires Y form"
 * callouts at booking confirmation, kiosk check-in, and appointment detail.
 *
 * Filters server-side to is_required=true so optional/recommended forms don't
 * surface as gates.
 *
 * NOTE: Service IDs sourced from `v_all_services` may originate from either
 * `services.id` (native) or `phorest_services.id` (legacy fallback). Form
 * requirements only attach to native `services` rows, so phorest-only services
 * silently return zero matches. After Phorest decoupling completes the legacy
 * leg of the view disappears and this caveat goes away.
 */
export function useRequiredFormsForServices(serviceIds: string[] | undefined) {
  const ids = (serviceIds ?? []).filter(Boolean);
  return useQuery({
    queryKey: ['required-forms-for-services', ids.sort().join(',')],
    queryFn: async (): Promise<RequiredFormForService[]> => {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('service_form_requirements')
        .select(`
          service_id,
          signing_frequency,
          form_template_id,
          services!inner(name),
          form_templates!inner(name, form_type)
        `)
        .eq('is_required', true)
        .in('service_id', ids);

      if (error) throw error;
      return ((data ?? []) as Array<{
        service_id: string;
        signing_frequency: 'once' | 'per_visit' | 'annually';
        form_template_id: string;
        services: { name: string | null };
        form_templates: { name: string; form_type: string };
      }>).map((row) => ({
        service_id: row.service_id,
        service_name: row.services?.name ?? null,
        form_template_id: row.form_template_id,
        form_template_name: row.form_templates?.name ?? 'Form',
        form_type: row.form_templates?.form_type ?? 'custom',
        signing_frequency: row.signing_frequency,
      }));
    },
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
  });
}
