/**
 * Plan-aware commission resolver — pure function, no React, no DB.
 *
 * Doctrine: Level-based is one of nine compensation models. This resolver
 * returns commission for any plan_type given a context (sales, hours,
 * categories, period-to-date). UI hooks pass plans + context, never assume
 * the structure of `config`.
 *
 * Returns the same `ResolvedCommission` shape used by the legacy
 * `useResolveCommission` so downstream consumers remain stable.
 */
import type {
  CompensationPlan,
  CompensationPlanType,
} from '@/hooks/useCompensationPlans';

export type CommissionSource =
  | 'override'
  | 'location_override'
  | 'level'
  | 'plan'
  | 'unassigned';

export interface ResolvedCommission {
  serviceRate: number;
  retailRate: number;
  serviceCommission: number;
  retailCommission: number;
  totalCommission: number;
  basePay: number;
  source: CommissionSource;
  sourceName: string;
  planType?: CompensationPlanType;
  /** Optional human-readable line items for transparency */
  breakdown?: Array<{ label: string; amount: number }>;
}

export interface ResolveContext {
  serviceRevenue: number;
  productRevenue: number;
  /** Sales already earned in the current pay period (for sliding_period). */
  periodToDateServiceSales?: number;
  /** Trailing window service sales (for sliding_trailing). */
  trailingServiceSales?: number;
  /** Hours worked in this pay period (for hourly_* plans). */
  hoursWorked?: number;
  /** Service revenue broken out by category (for category_based). */
  revenueByCategory?: Record<string, number>;
  /** Discount total to subtract under net_of_discount basis. */
  discountTotal?: number;
  /** Product/back-bar cost for net_of_product_cost basis. */
  productCost?: number;
}

interface SlidingBracket {
  min: number;
  max?: number | null;
  rate: number;
}

/**
 * Apply commission_basis modifier to service revenue before rate is applied.
 */
function adjustForBasis(plan: CompensationPlan, ctx: ResolveContext): number {
  const base = ctx.serviceRevenue;
  switch (plan.commission_basis) {
    case 'net_of_discount':
      return Math.max(0, base - (ctx.discountTotal ?? 0));
    case 'net_of_product_cost':
      return Math.max(0, base - (ctx.productCost ?? 0));
    case 'gross':
    default:
      return base;
  }
}

function rateFromBrackets(brackets: SlidingBracket[], sales: number): number {
  const sorted = [...brackets].sort((a, b) => a.min - b.min);
  let rate = sorted[0]?.rate ?? 0;
  for (const b of sorted) {
    if (sales >= b.min && (b.max == null || sales < b.max)) {
      rate = b.rate;
    } else if (sales >= b.min) {
      rate = b.rate;
    }
  }
  return rate;
}

/**
 * Resolve commission for any plan type. Returns zeros for unknown configs
 * (silence over wrong number — matches platform doctrine).
 */
export function resolveCommissionForPlan(
  plan: CompensationPlan,
  ctx: ResolveContext,
): ResolvedCommission {
  const adjustedService = adjustForBasis(plan, ctx);
  const product = ctx.productRevenue;
  const cfg = (plan.config ?? {}) as Record<string, any>;

  const sourceLabel = `Plan: ${plan.name}`;
  const breakdown: Array<{ label: string; amount: number }> = [];

  switch (plan.plan_type) {
    case 'flat_commission': {
      const serviceRate = Number(cfg.service_rate ?? 0);
      const retailRate = Number(cfg.retail_rate ?? 0);
      const sc = adjustedService * serviceRate;
      const rc = product * retailRate;
      breakdown.push({ label: `Services × ${(serviceRate * 100).toFixed(1)}%`, amount: sc });
      breakdown.push({ label: `Retail × ${(retailRate * 100).toFixed(1)}%`, amount: rc });
      return {
        serviceRate,
        retailRate,
        serviceCommission: sc,
        retailCommission: rc,
        totalCommission: sc + rc,
        basePay: 0,
        source: 'plan',
        sourceName: sourceLabel,
        planType: plan.plan_type,
        breakdown,
      };
    }

    case 'sliding_period': {
      const brackets: SlidingBracket[] = cfg.brackets ?? [];
      const ptd = ctx.periodToDateServiceSales ?? adjustedService;
      const serviceRate = rateFromBrackets(brackets, ptd);
      const retailRate = Number(cfg.retail_rate ?? 0);
      const sc = adjustedService * serviceRate;
      const rc = product * retailRate;
      breakdown.push({
        label: `Bracket @ $${ptd.toLocaleString()} → ${(serviceRate * 100).toFixed(1)}%`,
        amount: sc,
      });
      breakdown.push({ label: `Retail × ${(retailRate * 100).toFixed(1)}%`, amount: rc });
      return {
        serviceRate,
        retailRate,
        serviceCommission: sc,
        retailCommission: rc,
        totalCommission: sc + rc,
        basePay: 0,
        source: 'plan',
        sourceName: sourceLabel,
        planType: plan.plan_type,
        breakdown,
      };
    }

    case 'sliding_trailing': {
      const brackets: SlidingBracket[] = cfg.brackets ?? [];
      const trailing = ctx.trailingServiceSales ?? adjustedService;
      const serviceRate = rateFromBrackets(brackets, trailing);
      const retailRate = Number(cfg.retail_rate ?? 0);
      const sc = adjustedService * serviceRate;
      const rc = product * retailRate;
      breakdown.push({
        label: `Trailing avg $${trailing.toLocaleString()} → ${(serviceRate * 100).toFixed(1)}%`,
        amount: sc,
      });
      return {
        serviceRate,
        retailRate,
        serviceCommission: sc,
        retailCommission: rc,
        totalCommission: sc + rc,
        basePay: 0,
        source: 'plan',
        sourceName: sourceLabel,
        planType: plan.plan_type,
        breakdown,
      };
    }

    case 'hourly_vs_commission': {
      const hourly = Number(cfg.hourly_rate ?? 0);
      const serviceRate = Number(cfg.service_rate ?? 0);
      const retailRate = Number(cfg.retail_rate ?? 0);
      const hours = ctx.hoursWorked ?? 0;
      const hourlyPay = hourly * hours;
      const sc = adjustedService * serviceRate;
      const rc = product * retailRate;
      const commissionTotal = sc + rc;
      // Higher of the two
      if (commissionTotal >= hourlyPay) {
        breakdown.push({ label: `Commission (beats hourly $${hourlyPay.toFixed(0)})`, amount: commissionTotal });
        return {
          serviceRate,
          retailRate,
          serviceCommission: sc,
          retailCommission: rc,
          totalCommission: commissionTotal,
          basePay: 0,
          source: 'plan',
          sourceName: sourceLabel,
          planType: plan.plan_type,
          breakdown,
        };
      }
      breakdown.push({ label: `Hourly $${hourly}/hr × ${hours}h`, amount: hourlyPay });
      return {
        serviceRate,
        retailRate,
        serviceCommission: 0,
        retailCommission: 0,
        totalCommission: 0,
        basePay: hourlyPay,
        source: 'plan',
        sourceName: sourceLabel,
        planType: plan.plan_type,
        breakdown,
      };
    }

    case 'hourly_plus_commission': {
      const hourly = Number(cfg.hourly_rate ?? 0);
      const serviceRate = Number(cfg.service_rate ?? 0);
      const retailRate = Number(cfg.retail_rate ?? 0);
      const hours = ctx.hoursWorked ?? 0;
      const hourlyPay = hourly * hours;
      const sc = adjustedService * serviceRate;
      const rc = product * retailRate;
      breakdown.push({ label: `Hourly $${hourly}/hr × ${hours}h`, amount: hourlyPay });
      breakdown.push({ label: `Services × ${(serviceRate * 100).toFixed(1)}%`, amount: sc });
      breakdown.push({ label: `Retail × ${(retailRate * 100).toFixed(1)}%`, amount: rc });
      return {
        serviceRate,
        retailRate,
        serviceCommission: sc,
        retailCommission: rc,
        totalCommission: sc + rc,
        basePay: hourlyPay,
        source: 'plan',
        sourceName: sourceLabel,
        planType: plan.plan_type,
        breakdown,
      };
    }

    case 'category_based': {
      const rates: Record<string, number> = cfg.rates_by_category ?? {};
      const retailRate = Number(cfg.retail_rate ?? 0);
      let sc = 0;
      let totalServiceRev = 0;
      const byCat = ctx.revenueByCategory ?? {};
      for (const [cat, rev] of Object.entries(byCat)) {
        const r = Number(rates[cat] ?? rates._default ?? 0);
        sc += rev * r;
        totalServiceRev += rev;
        breakdown.push({ label: `${cat} × ${(r * 100).toFixed(1)}%`, amount: rev * r });
      }
      // Fallback: if no per-category data, apply default rate to full service revenue
      if (totalServiceRev === 0 && adjustedService > 0) {
        const fallback = Number(rates._default ?? 0);
        sc = adjustedService * fallback;
        breakdown.push({ label: `Services × ${(fallback * 100).toFixed(1)}%`, amount: sc });
      }
      const rc = product * retailRate;
      const blendedRate = adjustedService > 0 ? sc / adjustedService : 0;
      return {
        serviceRate: blendedRate,
        retailRate,
        serviceCommission: sc,
        retailCommission: rc,
        totalCommission: sc + rc,
        basePay: 0,
        source: 'plan',
        sourceName: sourceLabel,
        planType: plan.plan_type,
        breakdown,
      };
    }

    case 'team_pooled': {
      // Pool resolver projects per-member; here we treat input as the
      // member's allocated share of pool revenue.
      const serviceRate = Number(cfg.service_rate ?? 0);
      const retailRate = Number(cfg.retail_rate ?? 0);
      const sc = adjustedService * serviceRate;
      const rc = product * retailRate;
      breakdown.push({ label: `Pooled share × ${(serviceRate * 100).toFixed(1)}%`, amount: sc });
      return {
        serviceRate,
        retailRate,
        serviceCommission: sc,
        retailCommission: rc,
        totalCommission: sc + rc,
        basePay: 0,
        source: 'plan',
        sourceName: sourceLabel,
        planType: plan.plan_type,
        breakdown,
      };
    }

    case 'booth_rental': {
      const rent = Number(cfg.weekly_rent ?? 0);
      const aboveRate = Number(cfg.commission_above_rent ?? 0);
      // Booth renters typically keep gross above rent; salon owes only the
      // delta if a profit-share clause is configured.
      const owed = adjustedService > rent ? (adjustedService - rent) * aboveRate : 0;
      breakdown.push({ label: `Above $${rent} rent × ${(aboveRate * 100).toFixed(1)}%`, amount: owed });
      return {
        serviceRate: aboveRate,
        retailRate: 0,
        serviceCommission: owed,
        retailCommission: 0,
        totalCommission: owed,
        basePay: -rent, // rent owed to salon — negative on the payout side
        source: 'plan',
        sourceName: sourceLabel,
        planType: plan.plan_type,
        breakdown,
      };
    }

    case 'level_based':
    default:
      // Level-based plans defer to the level resolver upstream.
      return {
        serviceRate: 0,
        retailRate: 0,
        serviceCommission: 0,
        retailCommission: 0,
        totalCommission: 0,
        basePay: 0,
        source: 'plan',
        sourceName: sourceLabel,
        planType: plan.plan_type,
      };
  }
}
