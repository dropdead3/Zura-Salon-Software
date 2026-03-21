import { useOrganizationFeature } from '@/hooks/useOrganizationFeature';

/**
 * Enforcement Gate Hook
 * 
 * Uses the existing organization feature flag system, inverted:
 * - Flag ENABLED = gate completed (structure defined)
 * - Flag DISABLED or missing = gate incomplete (feature blocked)
 * 
 * Gate keys:
 * - gate_commission_model → blocks payroll, commission reports
 * - gate_baselines → blocks AI forecasting, lever engine
 * - gate_kpi_architecture → blocks KPI dashboards, drift alerts
 * - gate_margin_baselines → blocks expansion analytics
 */

export interface EnforcementGateConfig {
  key: string;
  label: string;
  description: string;
  ctaLabel: string;
  ctaPath: string;
}

export const ENFORCEMENT_GATES: Record<string, EnforcementGateConfig> = {
  gate_commission_model: {
    key: 'gate_commission_model',
    label: 'Commission Structure',
    description: 'Before you scale, we\'ll define your commission structure. This ensures accurate payroll and transparent earnings for your team.',
    ctaLabel: 'Define Commission Model',
    ctaPath: '/dashboard/admin/settings',
  },
  gate_baselines: {
    key: 'gate_baselines',
    label: 'Operational Baselines',
    description: 'Before forecasting begins, we\'ll establish your operational baselines — utilization targets, margin floors, and labor cost thresholds.',
    ctaLabel: 'Set Baselines',
    ctaPath: '/dashboard/admin/settings',
  },
  gate_kpi_architecture: {
    key: 'gate_kpi_architecture',
    label: 'KPI Architecture',
    description: 'Before monitoring begins, we\'ll architect your KPIs — the metrics that matter, the thresholds that trigger alerts, and the cadence of review.',
    ctaLabel: 'Build KPI Architecture',
    ctaPath: '/dashboard/admin/kpi-builder',
  },
  gate_margin_baselines: {
    key: 'gate_margin_baselines',
    label: 'Margin Baselines',
    description: 'Before expansion analytics activate, we\'ll encode your margin baselines — the financial guardrails that protect growth.',
    ctaLabel: 'Set Margin Baselines',
    ctaPath: '/dashboard/admin/settings',
  },
};

export function useEnforcementGate(gateKey: string) {
  const { isEnabled, isLoading, error } = useOrganizationFeature(gateKey);
  const config = ENFORCEMENT_GATES[gateKey];

  return {
    /** true when the structural prerequisite has been completed */
    isCompleted: isEnabled,
    isLoading,
    error,
    config: config || null,
  };
}

export function useMultipleEnforcementGates(gateKeys: string[]) {
  // Use individual hooks — since hooks can't be called in loops,
  // this is a utility for components that check a known fixed set
  const results = gateKeys.map(key => ({
    key,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ...useEnforcementGate(key),
  }));

  return {
    gates: results,
    allCompleted: results.every(r => r.isCompleted),
    anyLoading: results.some(r => r.isLoading),
    incompleteGates: results.filter(r => !r.isCompleted && !r.isLoading),
  };
}
