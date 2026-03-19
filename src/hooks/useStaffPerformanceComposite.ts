/**
 * useStaffPerformanceComposite — Merges experience scores, sales revenue,
 * and backroom performance into a unified per-stylist report.
 */

import { useMemo } from 'react';
import { useStylistExperienceScore } from '@/hooks/useStylistExperienceScore';
import { useSalesByStylist } from '@/hooks/useSalesData';
import { useStaffBackroomPerformance } from '@/hooks/backroom/useStaffBackroomPerformance';

export interface StaffPerformanceRow {
  staffId: string;
  staffName: string;
  photoUrl: string | null;
  /** Total revenue from POS */
  revenue: number;
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
  /** Average chemical cost per service (from backroom) */
  avgChemicalCostPerService: number;
  /** Waste rate from backroom */
  wasteRate: number;
  /** Total mix sessions tracked in backroom */
  mixSessionCount: number;
  /** Appointment count in period */
  appointmentCount: number;
  /** Reweigh compliance rate 0-100 from backroom performance */
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
  );
  const { data: salesData, isLoading: salesLoading } = useSalesByStylist(
    dateFrom,
    dateTo,
    locationId,
  );
  const { data: backroomData, isLoading: backroomLoading } = useStaffBackroomPerformance(
    dateFrom,
    dateTo,
    locationId,
  );

  const isLoading = expLoading || salesLoading || backroomLoading;

  const rows = useMemo((): StaffPerformanceRow[] => {
    if (!experienceScores?.length) return [];

    // Build sales lookup by user_id
    const salesMap = new Map<string, { revenue: number; name: string; photoUrl: string | null }>();
    for (const s of salesData ?? []) {
      salesMap.set(s.user_id, {
        revenue: s.totalRevenue ?? 0,
        name: s.name,
        photoUrl: s.photo_url ?? null,
      });
    }

    // Build backroom lookup by staff_id
    const backroomMap = new Map<string, {
      avgCost: number;
      wasteRate: number;
      mixSessions: number;
      totalCost: number;
      reweighComplianceRate: number;
    }>();
    for (const b of backroomData ?? []) {
      const existing = backroomMap.get(b.staff_id);
      if (existing) {
        existing.mixSessions += b.mix_session_count;
        existing.totalCost += b.total_product_cost;
        // weighted average waste rate
        existing.wasteRate = (existing.wasteRate * (existing.mixSessions - b.mix_session_count) + b.waste_rate * b.mix_session_count) / existing.mixSessions;
        // weighted average reweigh compliance
        existing.reweighComplianceRate = (existing.reweighComplianceRate * (existing.mixSessions - b.mix_session_count) + b.reweigh_compliance_rate * b.mix_session_count) / existing.mixSessions;
      } else {
        backroomMap.set(b.staff_id, {
          avgCost: b.mix_session_count > 0 ? b.total_product_cost / b.mix_session_count : 0,
          wasteRate: b.waste_rate,
          mixSessions: b.mix_session_count,
          totalCost: b.total_product_cost,
          reweighComplianceRate: b.reweigh_compliance_rate,
        });
      }
    }

    // Compute salon-wide averages for coaching signals
    const allChemCosts = Array.from(backroomMap.values()).filter(v => v.mixSessions > 0).map(v => v.totalCost / v.mixSessions);
    const salonAvgChemCost = allChemCosts.length > 0
      ? allChemCosts.reduce((a, b) => a + b, 0) / allChemCosts.length
      : 0;

    const allRebookRates = experienceScores.map(s => s.metrics.rebookRate);
    const salonAvgRebook = allRebookRates.length > 0
      ? allRebookRates.reduce((a, b) => a + b, 0) / allRebookRates.length
      : 0;

    return experienceScores.map((score): StaffPerformanceRow => {
      const sales = salesMap.get(score.staffId);
      const backroom = backroomMap.get(score.staffId);
      const avgChem = backroom && backroom.mixSessions > 0
        ? backroom.totalCost / backroom.mixSessions
        : 0;
      const reweighRate = backroom?.reweighComplianceRate ?? 0;

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
      if (backroom && backroom.wasteRate > 15) {
        signals.push(`Waste rate ${Math.round(backroom.wasteRate)}% — review dispensing habits`);
      }
      if (backroom && backroom.mixSessions > 0 && reweighRate < 80) {
        signals.push(`Reweigh rate ${Math.round(reweighRate)}% — below 80% target`);
      }

      return {
        staffId: score.staffId,
        staffName: score.staffName,
        photoUrl: score.photoUrl,
        revenue: sales?.revenue ?? 0,
        rebookRate: score.metrics.rebookRate,
        retailConversion: score.metrics.retailAttachment,
        tipRate: score.metrics.tipRate,
        retentionRate: score.metrics.retentionRate,
        experienceScore: score.compositeScore,
        experienceStatus: score.status,
        avgChemicalCostPerService: Math.round(avgChem * 100) / 100,
        wasteRate: backroom?.wasteRate ?? 0,
        mixSessionCount: backroom?.mixSessions ?? 0,
        appointmentCount: score.appointmentCount,
        reweighComplianceRate: Math.round(reweighRate),
        overageAttachmentRate: 0, // requires checkout_usage_charges join — deferred to per-staff drill-down
        coachingSignals: signals,
      };
    });
  }, [experienceScores, salesData, backroomData]);

  return { data: rows, isLoading };
}
