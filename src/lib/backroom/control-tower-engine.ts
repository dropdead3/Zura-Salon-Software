/**
 * Control Tower Engine — Pure alert mapping + priority scoring.
 * No DB calls. All inputs are pre-fetched projection data.
 */

import type { InventoryRiskProjection } from '@/hooks/inventory/useInventoryRiskProjection';
import type { BackroomException } from '@/hooks/backroom/useBackroomExceptions';
import type { StaffBackroomPerformance } from '@/hooks/backroom/useStaffBackroomPerformance';
import type { ProductDemandForecast, ForecastSummary } from '@/lib/backroom/services/predictive-backroom-service';
import type { MarginOutlier } from '@/lib/backroom/appointment-profit-engine';

// ── Types ──────────────────────────────────────────────────────────

export type AlertCategory =
  | 'inventory'
  | 'exception'
  | 'profitability'
  | 'waste'
  | 'staff'
  | 'reorder'
  | 'po_approval'
  | 'audit_overdue';

export type AlertPriority = 'critical' | 'high' | 'medium' | 'informational';

export interface ControlTowerAlert {
  id: string;
  category: AlertCategory;
  priority: AlertPriority;
  title: string;
  description: string;
  metrics: Record<string, string | number>;
  entityType: string;
  entityId: string | null;
  suggestedAction: string;
  actionRoute: string;
  createdAt: string;
}

export interface DraftPOAlert {
  id: string;
  po_number: string;
  product_name: string;
  supplier_name: string;
  quantity: number;
  created_at: string;
  import_source?: string | null;
  notes?: string | null;
}

export interface ControlTowerSources {
  inventoryRisk: InventoryRiskProjection[];
  exceptions: BackroomException[];
  marginOutliers: MarginOutlier[];
  staffPerformance: StaffBackroomPerformance[];
  forecastSummary: ForecastSummary | null;
  stockoutAlerts: ProductDemandForecast[];
  draftPOs?: DraftPOAlert[];
}

export interface PrioritySummary {
  critical: number;
  high: number;
  medium: number;
  informational: number;
  total: number;
}

// ── Priority Scoring ───────────────────────────────────────────────

const PRIORITY_ORDER: Record<AlertPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  informational: 3,
};

// ── Alert Builders ─────────────────────────────────────────────────

function buildInventoryAlerts(items: InventoryRiskProjection[]): ControlTowerAlert[] {
  return items.map((item) => {
    const depletionDate = item.projected_depletion_date
      ? new Date(item.projected_depletion_date)
      : null;
    const now = new Date();
    const daysUntilDepletion = depletionDate
      ? Math.max(0, Math.round((depletionDate.getTime() - now.getTime()) / 86_400_000))
      : null;

    let priority: AlertPriority = 'medium';
    if (item.stockout_risk_level === 'critical' || (daysUntilDepletion !== null && daysUntilDepletion < 1)) {
      priority = 'critical';
    } else if (item.stockout_risk_level === 'high' || (daysUntilDepletion !== null && daysUntilDepletion < 3)) {
      priority = 'high';
    }

    const depletionLabel = daysUntilDepletion !== null
      ? daysUntilDepletion === 0
        ? 'today'
        : `in ${daysUntilDepletion} day${daysUntilDepletion !== 1 ? 's' : ''}`
      : 'unknown';

    return {
      id: `inv-${item.id}`,
      category: 'inventory' as AlertCategory,
      priority,
      title: 'Inventory Risk',
      description: `Stockout predicted ${depletionLabel}. Current on-hand: ${item.current_on_hand}.`,
      metrics: {
        'On Hand': item.current_on_hand,
        'Daily Usage': Math.round(item.avg_daily_usage * 10) / 10,
        'Risk Level': item.stockout_risk_level,
      },
      entityType: 'product',
      entityId: item.product_id,
      suggestedAction: item.recommended_order_qty > 0
        ? `Order ${item.recommended_order_qty} units`
        : 'Review stock levels',
      actionRoute: '/dashboard/admin/backroom-settings?category=inventory&tab=stock',
      createdAt: item.last_forecast_at,
    };
  });
}

function buildExceptionAlerts(items: BackroomException[]): ControlTowerAlert[] {
  return items
    .filter((e) => e.status === 'open' || e.status === 'pending')
    .map((exc) => {
      let priority: AlertPriority = 'medium';
      if (exc.severity === 'critical') priority = 'critical';
      else if (exc.severity === 'high' || exc.severity === 'warning') priority = 'high';

      return {
        id: `exc-${exc.id}`,
        category: 'exception' as AlertCategory,
        priority,
        title: exc.title,
        description: exc.description ?? `${exc.exception_type} exception detected.`,
        metrics: {
          Type: exc.exception_type,
          Severity: exc.severity,
          ...(exc.metric_value != null ? { Value: exc.metric_value } : {}),
        },
        entityType: exc.reference_type ?? 'exception',
        entityId: exc.reference_id,
        suggestedAction: 'Review and resolve exception',
        actionRoute: '/dashboard/admin/backroom-settings?category=alerts',
        createdAt: exc.created_at,
      };
    });
}

function buildProfitabilityAlerts(outliers: MarginOutlier[]): ControlTowerAlert[] {
  return outliers.map((o) => ({
    id: `profit-${o.appointmentId}`,
    category: 'profitability' as AlertCategory,
    priority: o.marginPct < 20 ? 'high' : 'medium',
    title: 'Low Margin Alert',
    description: `${o.serviceName} at ${o.marginPct}% margin (avg ${o.avgMarginPctForService}% for this service).`,
    metrics: {
      Service: o.serviceName,
      Margin: `${o.marginPct}%`,
      'Service Avg': `${o.avgMarginPctForService}%`,
      Deviation: `${o.deviationPct}%`,
    },
    entityType: 'appointment',
    entityId: o.appointmentId,
    suggestedAction: 'Review service profitability',
    actionRoute: '/dashboard/admin/backroom-settings?category=insights',
    createdAt: new Date().toISOString(),
  }));
}

function buildStaffAlerts(staff: StaffBackroomPerformance[]): ControlTowerAlert[] {
  const alerts: ControlTowerAlert[] = [];

  for (const s of staff) {
    const wasteRate = s.waste_rate * 100;

    if (wasteRate > 10) {
      alerts.push({
        id: `staff-waste-${s.id}`,
        category: 'waste' as AlertCategory,
        priority: wasteRate > 15 ? 'high' : 'medium',
        title: 'Elevated Waste Rate',
        description: `Staff member waste rate at ${wasteRate.toFixed(1)}%.`,
        metrics: {
          'Waste Rate': `${wasteRate.toFixed(1)}%`,
          Sessions: s.mix_session_count,
          'Override Rate': `${(s.manual_override_rate * 100).toFixed(0)}%`,
        },
        entityType: 'staff',
        entityId: s.staff_id,
        suggestedAction: 'Review mix sessions and provide coaching',
        actionRoute: '/dashboard/admin/backroom-settings?category=insights',
        createdAt: s.last_calculated_at,
      });
    }
  }

  return alerts;
}

function buildReorderAlerts(forecasts: ProductDemandForecast[]): ControlTowerAlert[] {
  return forecasts.map((f) => ({
    id: `reorder-${f.product_id}`,
    category: 'reorder' as AlertCategory,
    priority: f.stockout_risk === 'critical' ? 'critical' : 'high',
    title: 'Urgent Reorder',
    description: `${f.product_name} — predicted usage exceeds stock within ${f.remaining_after_1d <= 0 ? '24 hours' : '7 days'}.`,
    metrics: {
      Product: f.product_name,
      'On Hand': f.current_on_hand,
      'Predicted 7d': Math.round(f.predicted_usage_7d * 10) / 10,
      'Order Qty': f.recommended_order_qty,
    },
    entityType: 'product',
    entityId: f.product_id,
    suggestedAction: `Order ${f.recommended_order_qty} ${f.unit}`,
    actionRoute: '/dashboard/admin/backroom-settings?category=inventory&tab=reorder',
    createdAt: new Date().toISOString(),
  }));
}

function buildPOApprovalAlerts(draftPOs: DraftPOAlert[]): ControlTowerAlert[] {
  if (!draftPOs.length) return [];

  // Group auto-generated POs (single alert if many)
  const autoPOs = draftPOs.filter(
    (po) => po.import_source === 'auto_reorder' || (po.notes ?? '').toLowerCase().includes('auto'),
  );
  const manualPOs = draftPOs.filter(
    (po) => !autoPOs.includes(po),
  );

  const alerts: ControlTowerAlert[] = [];

  if (autoPOs.length > 0) {
    alerts.push({
      id: `po-approval-auto-${autoPOs.length}`,
      category: 'po_approval',
      priority: autoPOs.length >= 5 ? 'high' : 'medium',
      title: `${autoPOs.length} Auto-Generated PO${autoPOs.length > 1 ? 's' : ''} Awaiting Approval`,
      description: `Auto-reorder created ${autoPOs.length} draft PO${autoPOs.length > 1 ? 's' : ''}. Review and approve to send to suppliers.`,
      metrics: {
        'Draft POs': autoPOs.length,
        'Total Units': autoPOs.reduce((s, po) => s + po.quantity, 0),
      },
      entityType: 'purchase_order',
      entityId: autoPOs[0].id,
      suggestedAction: 'Review and approve pending purchase orders',
      actionRoute: '/dashboard/admin/backroom-settings?category=inventory&tab=orders',
      createdAt: autoPOs[0].created_at,
    });
  }

  if (manualPOs.length > 0) {
    alerts.push({
      id: `po-approval-manual-${manualPOs.length}`,
      category: 'po_approval',
      priority: 'informational',
      title: `${manualPOs.length} Draft PO${manualPOs.length > 1 ? 's' : ''} Pending`,
      description: `${manualPOs.length} draft purchase order${manualPOs.length > 1 ? 's' : ''} awaiting review.`,
      metrics: { 'Draft POs': manualPOs.length },
      entityType: 'purchase_order',
      entityId: manualPOs[0].id,
      suggestedAction: 'Review draft purchase orders',
      actionRoute: '/dashboard/admin/backroom-settings?category=inventory&tab=orders',
      createdAt: manualPOs[0].created_at,
    });
  }

  return alerts;
}

// ── Main Builder ───────────────────────────────────────────────────

const MAX_ALERTS = 20;

export function buildControlTowerAlerts(sources: ControlTowerSources): ControlTowerAlert[] {
  const all: ControlTowerAlert[] = [
    ...buildInventoryAlerts(sources.inventoryRisk),
    ...buildExceptionAlerts(sources.exceptions),
    ...buildProfitabilityAlerts(sources.marginOutliers),
    ...buildStaffAlerts(sources.staffPerformance),
    ...buildReorderAlerts(sources.stockoutAlerts),
    ...buildPOApprovalAlerts(sources.draftPOs ?? []),
  ];

  return sortAlertsByPriority(all);
}

export function sortAlertsByPriority(alerts: ControlTowerAlert[]): ControlTowerAlert[] {
  return [...alerts].sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function summarizePriorities(alerts: ControlTowerAlert[]): PrioritySummary {
  const summary: PrioritySummary = { critical: 0, high: 0, medium: 0, informational: 0, total: alerts.length };
  for (const a of alerts) {
    summary[a.priority]++;
  }
  return summary;
}

export function capAlerts(alerts: ControlTowerAlert[], max = MAX_ALERTS) {
  return {
    visible: alerts.slice(0, max),
    overflow: Math.max(0, alerts.length - max),
  };
}
