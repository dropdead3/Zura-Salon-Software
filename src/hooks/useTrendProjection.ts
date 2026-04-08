/**
 * useTrendProjection — Computes trend-based projections for level progression.
 *
 * For each KPI with a gap, calculates:
 *  - Velocity (rate of change per day)
 *  - Projected days to reach target (if trending positively)
 *  - Daily/weekly action targets needed to close the gap
 *  - Actionable service-level recommendations
 *
 * Also produces an overall projection summary:
 *  - "On pace to qualify in ~X days"
 *  - "Trending below minimums — coaching recommended"
 */

import { useMemo } from 'react';
import type { CriterionProgress, LevelProgressResult, RetentionStatus } from './useLevelProgress';

export interface KpiProjection {
  key: string;
  label: string;
  unit: string;
  current: number;
  target: number;
  gap: number;
  /** Change per day based on current vs prior window */
  velocityPerDay: number;
  /** Estimated days to reach target at current velocity (null if flat/declining) */
  daysToTarget: number | null;
  /** Daily action target to close the gap within the remaining eval window */
  dailyTarget: string;
  /** Actionable recommendation specific to this KPI */
  recommendation: string;
  /** Whether this KPI is already met */
  isMet: boolean;
  /** 'improving' | 'declining' | 'flat' */
  trajectory: 'improving' | 'declining' | 'flat';
  /** Weight in composite score */
  weight: number;
}

export interface RetentionRisk {
  key: string;
  label: string;
  current: number;
  minimum: number;
  unit: string;
  trajectory: 'improving' | 'declining' | 'flat';
  recommendation: string;
}

export interface TrendProjectionResult {
  /** Per-KPI projections (only unmet criteria with weight > 0) */
  projections: KpiProjection[];
  /** Overall estimated days to full qualification (null if not calculable) */
  overallDaysToQualify: number | null;
  /** Summary label for the overall projection */
  summaryLabel: string;
  /** 'on_track' | 'needs_focus' | 'at_risk' */
  summaryStatus: 'on_track' | 'needs_focus' | 'at_risk';
  /** Retention risk items (KPIs below minimum and declining) */
  retentionRisks: RetentionRisk[];
  /** Whether there's any retention risk trending worse */
  hasRetentionConcern: boolean;
  /** Top 3 highest-impact actions sorted by weighted impact */
  topActions: KpiProjection[];
}

/** Generate actionable recommendation per KPI type */
function getRecommendation(key: string, gap: number, unit: string, dailyNeeded: number, evalDays: number): string {
  const weeklyNeeded = dailyNeeded * 7;
  const monthlyNeeded = dailyNeeded * 30;

  switch (key) {
    case 'revenue': {
      const perWeek = Math.ceil(weeklyNeeded);
      return `Add ~$${perWeek.toLocaleString()}/week in service revenue. Focus on higher-ticket services like color, balayage, or extensions to close this gap faster.`;
    }
    case 'retail': {
      const ptsNeeded = Math.round(gap * 10) / 10;
      return `Increase retail attachment by ${ptsNeeded} pts. Recommend a take-home product to every client — even one per day shifts this metric.`;
    }
    case 'rebooking': {
      const ptsNeeded = Math.round(gap * 10) / 10;
      return `Improve rebooking by ${ptsNeeded} pts. Use the 3-second rebook at checkout — ask "Same time in 6 weeks?" before the client leaves the chair.`;
    }
    case 'avg_ticket': {
      const dollarsNeeded = Math.round(gap);
      return `Raise average ticket by $${dollarsNeeded}. Add a treatment, gloss, or retail item to each visit. Bundling services (cut + color) naturally lifts this.`;
    }
    case 'retention_rate': {
      const ptsNeeded = Math.round(gap * 10) / 10;
      return `Improve retention by ${ptsNeeded} pts. Send personal follow-ups after visits and ensure pre-booking. Clients who rebook at checkout return at 3× the rate.`;
    }
    case 'utilization': {
      const ptsNeeded = Math.round(gap * 10) / 10;
      // ~8 hours/day = 480 min; each % = ~4.8 min/day
      const extraHoursPerWeek = Math.round(ptsNeeded * 0.48 * 5 / 60 * 10) / 10;
      return `Fill ${ptsNeeded}% more of your schedule (~${extraHoursPerWeek} hrs/week). Request to be added to online booking, pick up walk-ins, or extend your available hours.`;
    }
    case 'rev_per_hour': {
      const dollarsNeeded = Math.round(gap);
      return `Earn $${dollarsNeeded}/hr more per booked hour. Reduce gaps between appointments and prioritize higher-revenue services over quick blow-outs.`;
    }
    case 'new_clients': {
      const perMonth = Math.round(gap * 10) / 10;
      return `Book ${perMonth} more new clients/month. Ask your front desk to route new requests to you, and ensure your profile is visible on online booking.`;
    }
    default:
      return `Close the gap of ${Math.round(gap)} ${unit === '%' ? 'pts' : unit} to reach your target.`;
  }
}

/** Generate a compact daily target label */
function getDailyTarget(key: string, gap: number, unit: string, evalDays: number): string {
  if (gap <= 0) return 'On target';
  // Calculate what's needed per day/week to close the gap within the eval window
  const daysRemaining = Math.max(1, evalDays);

  switch (key) {
    case 'revenue': {
      // gap is monthly revenue gap; translate to daily revenue needed
      const dailyRevNeeded = Math.ceil(gap / 30);
      return `+$${dailyRevNeeded.toLocaleString()}/day`;
    }
    case 'retail': {
      return `+${(gap).toFixed(1)} pts`;
    }
    case 'rebooking': {
      return `+${(gap).toFixed(1)} pts`;
    }
    case 'avg_ticket': {
      return `+$${Math.round(gap)}/visit`;
    }
    case 'retention_rate': {
      return `+${(gap).toFixed(1)} pts`;
    }
    case 'utilization': {
      const extraMinPerDay = Math.round(gap * 4.8);
      return `+${extraMinPerDay} min/day`;
    }
    case 'rev_per_hour': {
      return `+$${Math.round(gap)}/hr`;
    }
    case 'new_clients': {
      const perWeek = Math.round((gap / 30) * 7 * 10) / 10;
      return `+${perWeek}/week`;
    }
    case 'tenure': {
      return `${Math.round(gap)}d remaining`;
    }
    default:
      return `+${Math.round(gap)} ${unit}`;
  }
}

export function useTrendProjection(
  progress: LevelProgressResult | null,
): TrendProjectionResult {
  return useMemo(() => {
    const empty: TrendProjectionResult = {
      projections: [],
      overallDaysToQualify: null,
      summaryLabel: '',
      summaryStatus: 'on_track',
      retentionRisks: [],
      hasRetentionConcern: false,
      topActions: [],
    };

    if (!progress) return empty;

    const evalDays = progress.evaluationWindowDays || 90;

    // Build projections for unmet criteria
    const projections: KpiProjection[] = [];

    for (const cp of progress.criteriaProgress) {
      if (cp.weight <= 0) continue; // Skip tenure etc.

      const isMet = cp.percent >= 100;
      // Velocity: change per day over the eval window
      const velocityPerDay = evalDays > 0 ? (cp.current - cp.priorCurrent) / evalDays : 0;

      let trajectory: KpiProjection['trajectory'] = 'flat';
      const changePct = cp.priorCurrent > 0
        ? ((cp.current - cp.priorCurrent) / cp.priorCurrent) * 100
        : (cp.current > 0 ? 100 : 0);
      if (changePct > 3) trajectory = 'improving';
      else if (changePct < -3) trajectory = 'declining';

      let daysToTarget: number | null = null;
      if (!isMet && velocityPerDay > 0 && cp.gap > 0) {
        daysToTarget = Math.ceil(cp.gap / velocityPerDay);
        // Cap at 365 to avoid absurd projections
        if (daysToTarget > 365) daysToTarget = null;
      }

      const dailyTarget = getDailyTarget(cp.key, cp.gap, cp.unit, evalDays);
      const recommendation = getRecommendation(cp.key, cp.gap, cp.unit, cp.gap / Math.max(1, evalDays), evalDays);

      projections.push({
        key: cp.key,
        label: cp.label,
        unit: cp.unit,
        current: cp.current,
        target: cp.target,
        gap: cp.gap,
        velocityPerDay,
        daysToTarget,
        dailyTarget,
        recommendation,
        isMet,
        trajectory,
        weight: cp.weight,
      });
    }

    // Overall projection: max days across all unmet KPIs
    const unmetProjections = projections.filter(p => !p.isMet);
    const projectionsWithDays = unmetProjections.filter(p => p.daysToTarget !== null);
    const allMet = unmetProjections.length === 0;

    let overallDaysToQualify: number | null = null;
    if (allMet) {
      overallDaysToQualify = 0;
    } else if (projectionsWithDays.length > 0) {
      overallDaysToQualify = Math.max(...projectionsWithDays.map(p => p.daysToTarget!));
    }

    // Summary
    let summaryLabel: string;
    let summaryStatus: TrendProjectionResult['summaryStatus'];

    if (allMet) {
      summaryLabel = 'All metrics on target — ready for review';
      summaryStatus = 'on_track';
    } else if (overallDaysToQualify !== null && overallDaysToQualify <= 90) {
      summaryLabel = `On pace to qualify in ~${overallDaysToQualify} days`;
      summaryStatus = 'on_track';
    } else if (overallDaysToQualify !== null) {
      summaryLabel = `Projected ~${overallDaysToQualify} days to qualify — focus on key gaps`;
      summaryStatus = 'needs_focus';
    } else {
      const decliningCount = unmetProjections.filter(p => p.trajectory === 'declining').length;
      if (decliningCount > 0) {
        summaryLabel = `${decliningCount} metric${decliningCount > 1 ? 's' : ''} trending down — action needed`;
        summaryStatus = 'at_risk';
      } else {
        summaryLabel = 'Metrics are flat — consistent effort needed to close gaps';
        summaryStatus = 'needs_focus';
      }
    }

    // Retention risks — match with trend data
    const retentionRisks: RetentionRisk[] = [];
    if (progress.retention?.isAtRisk && progress.retention.failures.length > 0) {
      for (const f of progress.retention.failures) {
        // Find matching projection for trajectory
        const matchingProj = projections.find(p => p.key === f.key);
        const trajectory = matchingProj?.trajectory || 'flat';

        retentionRisks.push({
          key: f.key,
          label: f.label,
          current: f.current,
          minimum: f.minimum,
          unit: f.unit,
          trajectory,
          recommendation: matchingProj?.recommendation || `Improve ${f.label} to meet minimum standards.`,
        });
      }
    }

    // Top actions: sort unmet by weighted impact (weight * gap%)
    const topActions = [...unmetProjections]
      .sort((a, b) => {
        const impactA = a.weight * (a.gap / Math.max(1, a.target));
        const impactB = b.weight * (b.gap / Math.max(1, b.target));
        return impactB - impactA;
      })
      .slice(0, 3);

    return {
      projections,
      overallDaysToQualify,
      summaryLabel,
      summaryStatus,
      retentionRisks,
      hasRetentionConcern: retentionRisks.some(r => r.trajectory === 'declining'),
      topActions,
    };
  }, [progress]);
}
