/**
 * useBackroomComplianceTracker — Reads backroom_compliance_log for a date range.
 * Returns individual items + aggregated summary stats + per-staff breakdown.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';

export interface ComplianceLogItem {
  id: string;
  appointmentId: string;
  appointmentDate: string;
  locationId: string | null;
  staffUserId: string | null;
  staffName: string | null;
  serviceName: string | null;
  hasMixSession: boolean;
  mixSessionId: string | null;
  hasReweigh: boolean;
  isManualOverride: boolean;
  complianceStatus: 'compliant' | 'partial' | 'missing';
  notes: string | null;
  evaluatedAt: string;
}

export interface ComplianceSummary {
  totalColorAppointments: number;
  compliant: number;
  partial: number;
  missing: number;
  complianceRate: number;
  reweighRate: number;
  manualOverrideCount: number;
}

export interface StaffComplianceBreakdown {
  staffUserId: string;
  staffName: string;
  total: number;
  compliant: number;
  partial: number;
  missing: number;
  complianceRate: number;
}

export interface ComplianceTrendPoint {
  date: string;
  complianceRate: number;
  total: number;
}

export interface ComplianceTrackerResult {
  items: ComplianceLogItem[];
  summary: ComplianceSummary;
  staffBreakdown: StaffComplianceBreakdown[];
  trend: ComplianceTrendPoint[];
}

export function useBackroomComplianceTracker(
  dateFrom: string,
  dateTo: string,
  locationId?: string,
  staffUserId?: string,
) {
  const orgId = useBackroomOrgId();

  return useQuery<ComplianceTrackerResult>({
    queryKey: ['backroom-compliance-tracker', orgId, dateFrom, dateTo, locationId, staffUserId],
    queryFn: async () => {
      let query = supabase
        .from('backroom_compliance_log')
        .select('*')
        .eq('organization_id', orgId!)
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .order('appointment_date', { ascending: true });

      if (locationId) query = query.eq('location_id', locationId);
      if (staffUserId) query = query.eq('staff_user_id', staffUserId);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as any[];

      const items: ComplianceLogItem[] = rows.map((r) => ({
        id: r.id,
        appointmentId: r.appointment_id,
        appointmentDate: r.appointment_date,
        locationId: r.location_id,
        staffUserId: r.staff_user_id,
        staffName: r.staff_name,
        serviceName: r.service_name,
        hasMixSession: r.has_mix_session,
        mixSessionId: r.mix_session_id,
        hasReweigh: r.has_reweigh,
        isManualOverride: r.is_manual_override,
        complianceStatus: r.compliance_status,
        notes: r.notes,
        evaluatedAt: r.evaluated_at,
      }));

      const total = items.length;
      const compliant = items.filter((i) => i.complianceStatus === 'compliant').length;
      const partial = items.filter((i) => i.complianceStatus === 'partial').length;
      const missing = items.filter((i) => i.complianceStatus === 'missing').length;
      const reweighEligible = items.filter((i) => i.hasMixSession).length;
      const reweighed = items.filter((i) => i.hasReweigh).length;

      const summary: ComplianceSummary = {
        totalColorAppointments: total,
        compliant,
        partial,
        missing,
        complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0,
        reweighRate: reweighEligible > 0 ? Math.round((reweighed / reweighEligible) * 100) : 0,
        manualOverrideCount: items.filter((i) => i.isManualOverride).length,
      };

      // Per-staff breakdown
      const staffMap = new Map<string, { name: string; total: number; compliant: number; partial: number; missing: number }>();
      items.forEach((i) => {
        const key = i.staffUserId ?? 'unknown';
        if (!staffMap.has(key)) staffMap.set(key, { name: i.staffName ?? 'Unknown', total: 0, compliant: 0, partial: 0, missing: 0 });
        const s = staffMap.get(key)!;
        s.total++;
        if (i.complianceStatus === 'compliant') s.compliant++;
        else if (i.complianceStatus === 'partial') s.partial++;
        else s.missing++;
      });

      const staffBreakdown: StaffComplianceBreakdown[] = Array.from(staffMap.entries())
        .map(([staffUid, s]) => ({
          staffUserId: staffUid,
          staffName: s.name,
          total: s.total,
          compliant: s.compliant,
          partial: s.partial,
          missing: s.missing,
          complianceRate: s.total > 0 ? Math.round((s.compliant / s.total) * 100) : 0,
        }))
        .sort((a, b) => a.complianceRate - b.complianceRate);

      // Daily trend
      const dateMap = new Map<string, { total: number; compliant: number }>();
      items.forEach((i) => {
        if (!dateMap.has(i.appointmentDate)) dateMap.set(i.appointmentDate, { total: 0, compliant: 0 });
        const d = dateMap.get(i.appointmentDate)!;
        d.total++;
        if (i.complianceStatus === 'compliant') d.compliant++;
      });

      const trend: ComplianceTrendPoint[] = Array.from(dateMap.entries())
        .map(([date, d]) => ({
          date,
          complianceRate: d.total > 0 ? Math.round((d.compliant / d.total) * 100) : 0,
          total: d.total,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { items, summary, staffBreakdown, trend };
    },
    enabled: !!orgId && !!dateFrom && !!dateTo,
    staleTime: 60_000,
  });
}
