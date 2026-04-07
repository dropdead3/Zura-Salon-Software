/**
 * useStaffPerformanceComposite — Merges experience scores, sales revenue,
 * and color bar performance into a unified per-stylist report.
 */

import { useMemo } from 'react';
import { useStylistExperienceScore } from '@/hooks/useStylistExperienceScore';
import { useSalesByStylist } from '@/hooks/useSalesData';
import { useStaffColorBarPerformance } from '@/hooks/color-bar/useStaffColorBarPerformance';

export interface StaffPerformanceRow {
  staffId: string;
  staffName: string;
  photoUrl: string | null;
  /** Total revenue from POS */
  revenue: number;
  /** Service revenue from POS */
  serviceRevenue: number;
  /** Product/retail revenue from POS */
  productRevenue: number;
  /** Rebook rate 0-100 */
  rebookRate: number;
  /** Retail attachment rate 0-100 */
  retailConversion: number;
  /** Tip rate as a percentage */
  tipRate: number;
  /** Retention rate 0-100 */
  retentionRate: number;
  /** Composite experience score 0-100 */
  experienceScore: number;
  experienceStatus: 'needs-attention' | 'watch' | 'strong';
  /** Average chemical cost per service (from color bar) */
  avgChemicalCostPerService: number;
  /** Waste rate from color bar */
  wasteRate: number;
  /** Total mix sessions tracked in color bar */
  mixSessionCount: number;
  /** Appointment count in period */
  appointmentCount: number;
  /** Reweigh compliance rate 0-100 from color bar performance */
  reweighComplianceRate: number;
  /** % of color appointments with overage charges */
  overageAttachmentRate: number;
  /** Coaching signals derived from data */
  coachingSignals: string[];
}

export function useStaffPerformanceComposite(
  dateFrom: string,
  dateTo: string,
  locationId?: string,
) {
  const { data: experienceScores, isLoading: expLoading } = useStylistExperienceScore(
    locationId,
    '30days',
    dateFrom,
    dateTo,
  );
  const { data: salesData, isLoading: salesLoading } = useSalesByStylist(
    dateFrom,
    dateTo,
    locationId,
  );
  const { data: colorBarData, isLoading: colorBarLoading } = useStaffColorBarPerformance(
    dateFrom,
    dateTo,
    locationId,
  );

  const isLoading = expLoading || salesLoading || colorBarLoading;

  const rows = useMemo((): StaffPerformanceRow[] => {
    if (!experienceScores?.length) return [];

    // Build sales lookup by user_id
    const salesMap = new Map<string, { revenue: number; serviceRevenue: number; productRevenue: number; name: string; photoUrl: string | null }>();
    for (const s of salesData ?? []) {
      salesMap.set(s.user_id, {
        revenue: s.totalRevenue ?? 0,
        serviceRevenue: s.serviceRevenue ?? 0,
        productRevenue: s.productRevenue ?? 0,
        name: s.name,
        photoUrl: s.photo_url ?? null,
      });
    }

    // Build color bar lookup by staff_id
    const colorBarMap = new Map<string, {
      avgCost: number;
      wasteRate: number;
      mixSessions: number;
      totalCost: number;
      reweighComplianceRate: number;
    }>();
    for (const b of colorBarData ?? []) {
      const existing = colorBarMap.get(b.staff_id);
      if (existing) {
        existing.mixSessions += b.mix_session_count;
        existing.totalCost += b.total_product_cost;
        // weighted average waste rate
        existing.wasteRate = (existing.wasteRate * (existing.mixSessions - b.mix_session_count) + b.waste_rate * b.mix_session_count) / existing.mixSessions;
        // weighted average reweigh compliance
        existing.reweighComplianceRate = (existing.reweighComplianceRate * (existing.mixSessions - b.mix_session_count) + b.reweigh_compliance_rate * b.mix_session_count) / existing.mixSessions;
      } else {
        colorBarMap.set(b.staff_id, {
          avgCost: b.mix_session_count > 0 ? b.total_product_cost / b.mix_session_count : 0,
          wasteRate: b.waste_rate,
          mixSessions: b.mix_session_count,
          totalCost: b.total_product_cost,
          reweighComplianceRate: b.reweigh_compliance_rate,
        });
      }
    }

    // Compute salon-wide averages for coaching signals
    const allChemCosts = Array.from(colorBarMap.values()).filter(v => v.mixSessions > 0).map(v => v.totalCost / v.mixSessions);
    const salonAvgChemCost = allChemCosts.length > 0
      ? allChemCosts.reduce((a, b) => a + b, 0) / allChemCosts.length
      : 0;

    const allRebookRates = experienceScores.map(s => s.metrics.rebookRate);
    const salonAvgRebook = allRebookRates.length > 0
      ? allRebookRates.reduce((a, b) => a + b, 0) / allRebookRates.length
      : 0;

    return experienceScores.map((score): StaffPerformanceRow => {
      const sales = salesMap.get(score.staffId);
      const colorBar = colorBarMap.get(score.staffId);
      const avgChem = colorBar && colorBar.mixSessions > 0
        ? colorBar.totalCost / colorBar.mixSessions
        : 0;
      const reweighRate = colorBar?.reweighComplianceRate ?? 0;

      // Generate coaching signals
      const signals: string[] = [];
      if (salonAvgChemCost > 0 && avgChem > salonAvgChemCost * 1.25) {
        const pctAbove = Math.round(((avgChem - salonAvgChemCost) / salonAvgChemCost) * 100);
        signals.push(`Chemical cost ${pctAbove}% above salon average`);
      }
      if (score.metrics.rebookRate < salonAvgRebook * 0.8) {
        signals.push('Rebook rate below salon average');
      }
      if (score.metrics.retailAttachment < 10) {
        signals.push('Low retail attachment — coaching opportunity');
      }
      if (colorBar && colorBar.wasteRate > 15) {
        signals.push(`Waste rate ${Math.round(colorBar.wasteRate)}% — review dispensing habits`);
      }
      if (colorBar && colorBar.mixSessions > 0 && reweighRate < 80) {
        signals.push(`Reweigh rate ${Math.round(reweighRate)}% — below 80% target`);
      }

      return {
        staffId: score.staffId,
        staffName: score.staffName,
        photoUrl: score.photoUrl,
        revenue: sales?.revenue ?? 0,
        serviceRevenue: sales?.serviceRevenue ?? 0,
        productRevenue: sales?.productRevenue ?? 0,
        rebookRate: score.metrics.rebookRate,
        retailConversion: score.metrics.retailAttachment,
        tipRate: score.metrics.tipRate,
        retentionRate: score.metrics.retentionRate,
        experienceScore: score.compositeScore,
        experienceStatus: score.status,
        avgChemicalCostPerService: Math.round(avgChem * 100) / 100,
        wasteRate: colorBar?.wasteRate ?? 0,
        mixSessionCount: colorBar?.mixSessions ?? 0,
        appointmentCount: score.appointmentCount,
        reweighComplianceRate: Math.round(reweighRate),
        overageAttachmentRate: 0, // requires checkout_usage_charges join — deferred to per-staff drill-down
        coachingSignals: signals,
      };
    });
  }, [experienceScores, salesData, colorBarData]);

  return { data: rows, isLoading };
}
