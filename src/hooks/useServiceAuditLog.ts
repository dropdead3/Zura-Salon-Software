import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Wave 5: Service Catalog Audit Log
 *
 * Returns the chronological history of material changes to a single service:
 * price, duration, cost, category, archive/active state, online bookability,
 * patch-test flag, and form linkage events.
 *
 * Backed by `service_audit_log`, populated by DB triggers on `services` and
 * `service_form_requirements` updates so the trail can't be bypassed by
 * client-side mutations.
 */
export interface ServiceAuditEntry {
  id: string;
  organization_id: string;
  service_id: string;
  event_type: string;
  field_name: string | null;
  previous_value: unknown;
  new_value: unknown;
  metadata: Record<string, unknown> | null;
  actor_user_id: string | null;
  actor_name: string | null;
  source: string;
  created_at: string;
}

export function useServiceAuditLog(serviceId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['service-audit-log', serviceId, limit],
    queryFn: async (): Promise<ServiceAuditEntry[]> => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from('service_audit_log' as any)
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as ServiceAuditEntry[];
    },
    enabled: !!serviceId,
    staleTime: 30 * 1000,
  });
}

/**
 * Human-readable label + icon hint for each audit event type.
 */
export const SERVICE_AUDIT_EVENT_CONFIG: Record<
  string,
  { label: string; tone: 'neutral' | 'positive' | 'warning' | 'destructive' }
> = {
  created: { label: 'Created', tone: 'positive' },
  price_changed: { label: 'Price changed', tone: 'warning' },
  duration_changed: { label: 'Duration changed', tone: 'warning' },
  cost_changed: { label: 'Cost changed', tone: 'neutral' },
  category_changed: { label: 'Category changed', tone: 'neutral' },
  activated: { label: 'Activated', tone: 'positive' },
  deactivated: { label: 'Deactivated', tone: 'warning' },
  archived: { label: 'Archived', tone: 'destructive' },
  restored: { label: 'Restored', tone: 'positive' },
  bookable_online_changed: { label: 'Online booking changed', tone: 'neutral' },
  patch_test_changed: { label: 'Patch-test rule changed', tone: 'warning' },
  form_attached: { label: 'Form attached', tone: 'positive' },
  form_detached: { label: 'Form detached', tone: 'warning' },
  form_requirement_changed: { label: 'Form requirement updated', tone: 'neutral' },
  // Wave 7: staff override of unsigned-form gate at booking creation
  booking_unsigned_forms_override: { label: 'Booked w/ unsigned forms', tone: 'warning' },
};

export function getServiceAuditEventConfig(eventType: string) {
  return (
    SERVICE_AUDIT_EVENT_CONFIG[eventType] ?? {
      label: eventType.replace(/_/g, ' '),
      tone: 'neutral' as const,
    }
  );
}
