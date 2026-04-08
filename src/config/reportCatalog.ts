/**
 * Report catalog by organization tier (derived from location count).
 * Operator = 1 location, Growth = 2-5, Infrastructure = 6+.
 * Used to show only relevant reports in the Reports hub.
 */

export type ReportTier = 'operator' | 'growth' | 'infrastructure';

export function getReportTier(locationCount: number): ReportTier {
  if (locationCount >= 6) return 'infrastructure';
  if (locationCount >= 2) return 'growth';
  return 'operator';
}

/** Report IDs that require multiple locations (hidden for Operator) */
const MULTI_LOCATION_REPORT_IDS = new Set([
  'location-sales',
]);

/** Report IDs available only for Growth and above */
const GROWTH_AND_ABOVE_REPORT_IDS = new Set([
  ...MULTI_LOCATION_REPORT_IDS,
]);

/** Report IDs available only for Infrastructure (e.g. Custom Builder, Scheduled could be growth+) */
const INFRASTRUCTURE_REPORT_IDS = new Set<string>([
  // Custom Builder and Scheduled are available to all for now; add here if we gate them
]);

/**
 * Returns true if the report should be shown for the given tier.
 */
export function isReportVisibleForTier(reportId: string, tier: ReportTier): boolean {
  if (INFRASTRUCTURE_REPORT_IDS.has(reportId)) {
    return tier === 'infrastructure';
  }
  if (GROWTH_AND_ABOVE_REPORT_IDS.has(reportId)) {
    return tier === 'growth' || tier === 'infrastructure';
  }
  return true;
}

/**
 * Filter a list of report configs (with id) by tier.
 */
export function filterReportsByTier<T extends { id: string }>(
  reports: T[],
  tier: ReportTier
): T[] {
  return reports.filter((r) => isReportVisibleForTier(r.id, tier));
}

// ─── Shared Report Catalog ───────────────────────────────────────────────────
// Single source of truth for report options used by BatchReportDialog,
// ScheduleReportForm, and any other consumer.

export interface ReportCatalogEntry {
  id: string;
  name: string;
  category: string;
}

export const REPORT_CATEGORIES = [
  { id: 'sales', label: 'Sales' },
  { id: 'staff', label: 'Staff' },
  { id: 'clients', label: 'Clients' },
  { id: 'operations', label: 'Operations' },
  { id: 'financial', label: 'Financial' },
  { id: 'gift-cards', label: 'Gift Cards' },
] as const;

export const REPORT_CATALOG: ReportCatalogEntry[] = [
  // Sales
  { id: 'daily-sales', name: 'Daily Sales Summary', category: 'sales' },
  { id: 'stylist-sales', name: 'Sales by Stylist', category: 'sales' },
  { id: 'location-sales', name: 'Sales by Location', category: 'sales' },
  { id: 'product-sales', name: 'Product Sales Report', category: 'sales' },
  { id: 'retail-products', name: 'Retail Product Report', category: 'sales' },
  { id: 'retail-staff', name: 'Retail Sales by Staff', category: 'sales' },
  { id: 'category-mix', name: 'Service Category Mix', category: 'sales' },
  { id: 'tax-summary', name: 'Tax Summary', category: 'sales' },
  { id: 'discounts', name: 'Discounts & Promotions', category: 'sales' },
  // Staff
  { id: 'staff-kpi', name: 'Staff KPI Report', category: 'staff' },
  { id: 'tip-analysis', name: 'Tip Analysis', category: 'staff' },
  { id: 'staff-transaction-detail', name: 'Staff Transaction Detail', category: 'staff' },
  { id: 'compensation-ratio', name: 'Compensation Ratio', category: 'staff' },
  { id: 'staff-milestones', name: 'Staff Milestones', category: 'staff' },
  { id: 'permissions-audit', name: 'Permissions Audit', category: 'staff' },
  { id: 'time-attendance', name: 'Time & Attendance', category: 'staff' },
  // Clients
  { id: 'client-attrition', name: 'Client Attrition', category: 'clients' },
  { id: 'top-clients', name: 'Top Clients', category: 'clients' },
  { id: 'client-birthdays', name: 'Client Birthdays', category: 'clients' },
  { id: 'client-source', name: 'Client Source', category: 'clients' },
  { id: 'duplicate-clients', name: 'Duplicate Clients', category: 'clients' },
  // Operations
  { id: 'no-show-enhanced', name: 'No-Shows & Cancellations', category: 'operations' },
  { id: 'deleted-appointments', name: 'Deleted Appointments', category: 'operations' },
  { id: 'demand-heatmap', name: 'Demand Heatmap', category: 'operations' },
  { id: 'future-appointments', name: 'Future Appointments Value', category: 'operations' },
  // Financial
  { id: 'executive-summary', name: 'Executive Summary', category: 'financial' },
  { id: 'payroll-summary', name: 'Payroll Summary', category: 'financial' },
  { id: 'end-of-month', name: 'End-of-Month Summary', category: 'financial' },
  { id: 'service-profitability', name: 'Service Profitability', category: 'financial' },
  { id: 'chemical-cost', name: 'Chemical Cost Report', category: 'financial' },
  { id: 'location-benchmark', name: 'Location Benchmarking', category: 'financial' },
  // Gift Cards
  { id: 'gift-cards', name: 'Gift Cards', category: 'gift-cards' },
  { id: 'vouchers', name: 'Vouchers', category: 'gift-cards' },
];
