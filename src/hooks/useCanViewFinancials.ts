import { useMemo } from 'react';
import { useEffectiveRoles } from './useEffectiveUser';
import { useIsPrimaryOwner } from './useIsPrimaryOwner';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfile } from './useEmployeeProfile';

/**
 * Manager dashboard variant — financial governance.
 *
 * Plain "manager" role is operational by default: they orchestrate the team
 * and the floor, but salary/commission/profit visibility belongs to the
 * Account Owner (and trusted admins/bookkeepers) unless explicitly granted.
 *
 * Returns true when the effective viewer should see margin, commission,
 * payroll, and true-profit surfaces.
 */
export function useCanViewFinancials(): boolean {
  const roles = useEffectiveRoles();
  const isPrimaryOwner = useIsPrimaryOwner();
  const { hasPermission } = useAuth();
  const { data: profile } = useEmployeeProfile();

  return useMemo(() => {
    if (isPrimaryOwner) return true;
    if (profile?.is_super_admin) return true;
    if (roles.includes('super_admin') || roles.includes('admin')) return true;
    if (roles.includes('bookkeeper')) return true;
    // Explicit permission grant overrides role baseline.
    if (hasPermission?.('view_financial_data')) return true;
    return false;
  }, [roles, isPrimaryOwner, profile?.is_super_admin, hasPermission]);
}

/**
 * Pinned analytics card IDs that expose org-level financial signal.
 * Hidden from manager-only viewers.
 */
export const FINANCIAL_PINNED_CARD_IDS = new Set<string>([
  'revenue_breakdown',
  'commission_summary',
  'staff_commission_breakdown',
  'true_profit',
  'service_profitability',
  'sales_overview',
]);
