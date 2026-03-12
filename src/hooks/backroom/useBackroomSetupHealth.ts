/**
 * useBackroomSetupHealth — Validates backroom configuration completeness.
 * Returns typed health warnings for the overview dashboard.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface SetupWarning {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  section: string;
}

export interface SetupHealthMetrics {
  trackedProducts: number;
  totalProducts: number;
  trackedServices: number;
  totalServices: number;
  recipesConfigured: number;
  allowancePolicies: number;
  stationsConfigured: number;
  alertRulesConfigured: number;
  warnings: SetupWarning[];
}

export function useBackroomSetupHealth() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['backroom-setup-health', orgId],
    queryFn: async (): Promise<SetupHealthMetrics> => {
      const warnings: SetupWarning[] = [];

      // Parallel queries
      const [productsRes, servicesRes, recipesRes, policiesRes, stationsRes, alertsRes, componentsRes] = await Promise.all([
        supabase.from('products').select('id, is_backroom_tracked, cost_price, cost_per_gram, is_active', { count: 'exact' }).eq('organization_id', orgId!).eq('is_active', true),
        supabase.from('services').select('id, is_backroom_tracked, name', { count: 'exact' }).eq('organization_id', orgId!),
        supabase.from('service_recipe_baselines').select('id', { count: 'exact' }).eq('organization_id', orgId!),
        supabase.from('service_allowance_policies').select('id', { count: 'exact' }).eq('organization_id', orgId!),
        supabase.from('backroom_stations').select('id', { count: 'exact' }).eq('organization_id', orgId!),
        supabase.from('backroom_alert_rules').select('id', { count: 'exact' }).eq('organization_id', orgId!),
        supabase.from('service_tracking_components').select('service_id', { count: 'exact' }).eq('organization_id', orgId!),
      ]);

      const products = productsRes.data || [];
      const services = servicesRes.data || [];
      const trackedProducts = products.filter((p: { is_backroom_tracked: boolean }) => p.is_backroom_tracked);
      const trackedServices = services.filter((s: { is_backroom_tracked: boolean }) => s.is_backroom_tracked);

      // Products missing cost
      const missingCost = trackedProducts.filter((p: { cost_price: number | null; cost_per_gram: number | null }) => !p.cost_price && !p.cost_per_gram);
      if (missingCost.length > 0) {
        warnings.push({
          id: 'products-missing-cost',
          severity: 'warning',
          title: `${missingCost.length} tracked product${missingCost.length > 1 ? 's' : ''} missing unit cost`,
          description: 'Products need cost data for accurate usage tracking and overage billing.',
          section: 'products',
        });
      }

      // No tracked products
      if (trackedProducts.length === 0 && products.length > 0) {
        warnings.push({
          id: 'no-tracked-products',
          severity: 'error',
          title: 'No backroom products configured',
          description: 'Assign products to backroom tracking before services can be tracked.',
          section: 'products',
        });
      }

      // Tracked services with no components
      if (trackedServices.length > 0) {
        const componentServiceIds = new Set((componentsRes.data || []).map((c: { service_id: string }) => c.service_id));
        const servicesWithoutComponents = trackedServices.filter((s: { id: string }) => !componentServiceIds.has(s.id));
        if (servicesWithoutComponents.length > 0) {
          warnings.push({
            id: 'services-no-components',
            severity: 'warning',
            title: `${servicesWithoutComponents.length} tracked service${servicesWithoutComponents.length > 1 ? 's' : ''} with no usage components`,
            description: 'Map products to tracked services so usage can be measured.',
            section: 'services',
          });
        }
      }

      // No allowance policies
      if (trackedServices.length > 0 && (policiesRes.count || 0) === 0) {
        warnings.push({
          id: 'no-allowance-policies',
          severity: 'info',
          title: 'No allowance policies configured',
          description: 'Define supply allowances and overage rules for client billing.',
          section: 'allowances',
        });
      }

      // No stations
      if ((stationsRes.count || 0) === 0) {
        warnings.push({
          id: 'no-stations',
          severity: 'info',
          title: 'No backroom stations configured',
          description: 'Set up mixing stations for device and scale pairing.',
          section: 'stations',
        });
      }

      return {
        trackedProducts: trackedProducts.length,
        totalProducts: products.length,
        trackedServices: trackedServices.length,
        totalServices: services.length,
        recipesConfigured: recipesRes.count || 0,
        allowancePolicies: policiesRes.count || 0,
        stationsConfigured: stationsRes.count || 0,
        alertRulesConfigured: alertsRes.count || 0,
        warnings,
      };
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
