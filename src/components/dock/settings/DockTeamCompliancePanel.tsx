/**
 * DockTeamCompliancePanel — Org-wide staff compliance metrics.
 * Locked behind admin/manager PIN re-auth gate.
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ShieldCheck, Scale, Droplets, Wrench, Activity } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { DockStaffSession } from '@/pages/Dock';

interface DockTeamCompliancePanelProps {
  staff: DockStaffSession;
  onBack: () => void;
}

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

export function DockTeamCompliancePanel({ staff, onBack }: DockTeamCompliancePanelProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const handleKey = useCallback(async (key: string) => {
    if (pinLoading) return;
    if (key === 'delete') { setPin(''); setPinError(false); return; }
    if (key === '') return;

    const next = pin + key;
    if (next.length > PIN_LENGTH) return;
    setPin(next);
    setPinError(false);

    if (next.length === PIN_LENGTH) {
      setPinLoading(true);
      try {
        // Validate PIN against org
        const { data, error } = await supabase
          .rpc('validate_user_pin', {
            _organization_id: staff.organizationId,
            _pin: next,
          });

        const user = data && data.length > 0 ? data[0] : null;
        if (error || !user) {
          setPinError(true); setPin(''); toast.error('Invalid PIN');
          setPinLoading(false);
          return;
        }

        // Check admin/manager role
        if (user.is_super_admin || user.is_primary_owner) {
          setUnlocked(true);
          setPinLoading(false);
          return;
        }

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.user_id);

        const hasAccess = (roles ?? []).some((r: any) =>
          ['admin', 'manager', 'super_admin'].includes(r.role)
        );

        if (hasAccess) {
          setUnlocked(true);
        } else {
          setPinError(true); setPin('');
          toast.error('Admin or Manager PIN required');
        }
      } catch {
        setPinError(true); setPin('');
        toast.error('Connection error');
      } finally {
        setPinLoading(false);
      }
    }
  }, [pin, pinLoading, staff.organizationId]);

  if (!unlocked) {
    return (
      <div className="flex flex-col h-full px-6 py-6">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] hover:bg-[hsl(var(--platform-bg-hover))] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
          </button>
          <div>
            <h2 className="font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
              Team Compliance
            </h2>
            <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">Admin PIN required</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <ShieldCheck className="w-10 h-10 text-violet-400/50 mb-4" />
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))] mb-6">
            Enter an admin or manager PIN
          </p>

          {/* PIN dots */}
          <div className="flex gap-3 mb-6">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-4 h-4 rounded-full border-2 transition-all duration-150',
                  i < pin.length
                    ? pinError
                      ? 'bg-red-500 border-red-500'
                      : 'bg-violet-500 border-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]'
                    : 'border-[hsl(var(--platform-border))] bg-transparent'
                )}
              />
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 w-80">
            {KEYS.map((key, i) => {
              if (key === '') return <div key={i} />;
              if (key === 'delete') {
                return (
                  <button key={i} onClick={() => handleKey('delete')}
                    className="flex items-center justify-center h-[72px] rounded-2xl text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-bg-hover))] active:bg-[hsl(var(--platform-bg-card))] transition-colors">
                    <span className="text-sm font-medium tracking-wide">Clear</span>
                  </button>
                );
              }
              return (
                <button key={i} onClick={() => handleKey(key)} disabled={pinLoading}
                  className="flex items-center justify-center h-[72px] rounded-2xl text-2xl font-medium bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] hover:bg-[hsl(var(--platform-bg-hover))] active:bg-violet-600/20 transition-colors disabled:opacity-50">
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return <ComplianceDashboard staff={staff} onBack={onBack} />;
}

// ── Unlocked dashboard ──

function ComplianceDashboard({ staff, onBack }: { staff: DockStaffSession; onBack: () => void }) {
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['dock-team-compliance', staff.organizationId, staff.locationId, startDate, endDate],
    queryFn: async () => {
      let sessionsQuery = supabase
        .from('mix_sessions')
        .select('id, status, mixed_by_staff_id, started_at, completed_at')
        .eq('organization_id', staff.organizationId)
        .gte('started_at', startDate)
        .lte('started_at', endDate + 'T23:59:59');

      if (staff.locationId) sessionsQuery = sessionsQuery.eq('location_id', staff.locationId);

      const { data: sessions, error: sErr } = await sessionsQuery;
      if (sErr) throw sErr;

      const sessionIds = (sessions ?? []).map((s: any) => s.id);
      if (!sessionIds.length) return null;

      const { data: bowls } = await supabase
        .from('mix_bowls')
        .select('id, mix_session_id, status')
        .in('mix_session_id', sessionIds);

      const bowlIds = (bowls ?? []).map((b: any) => b.id);

      const [linesRes, reweighRes, wasteRes] = await Promise.all([
        supabase.from('mix_bowl_lines').select('bowl_id, dispensed_quantity, product_id')
          .in('bowl_id', bowlIds.length ? bowlIds : ['__none__']),
        supabase.from('reweigh_events').select('bowl_id')
          .in('bowl_id', bowlIds.length ? bowlIds : ['__none__']),
        supabase.from('waste_events').select('mix_session_id, quantity')
          .in('mix_session_id', sessionIds),
      ]);

      const lines = linesRes.data ?? [];
      const reweighEvents = reweighRes.data ?? [];
      const wasteEvents = wasteRes.data ?? [];

      // Product costs
      const productIds = [...new Set((lines as any[]).map(l => l.product_id).filter(Boolean))];
      const costMap = new Map<string, number>();
      if (productIds.length) {
        const { data: products } = await supabase.from('products').select('id, cost_price').in('id', productIds);
        for (const p of (products ?? []) as any[]) costMap.set(p.id, p.cost_price ?? 0);
      }

      // Staff names
      const staffIds = [...new Set((sessions ?? []).map((s: any) => s.mixed_by_staff_id).filter(Boolean))];
      const nameMap = new Map<string, string>();
      if (staffIds.length) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name')
          .in('user_id', staffIds);
        for (const p of (profiles ?? []) as any[]) {
          nameMap.set(p.user_id, p.display_name || p.full_name || 'Unknown');
        }
      }

      // Bowl→session map
      const bowlSessionMap = new Map<string, string>();
      for (const b of (bowls ?? []) as any[]) bowlSessionMap.set(b.id, b.mix_session_id);

      // Session→staff map
      const sessionStaffMap = new Map<string, string>();
      for (const s of (sessions ?? []) as any[]) if (s.mixed_by_staff_id) sessionStaffMap.set(s.id, s.mixed_by_staff_id);

      const reweighedSet = new Set((reweighEvents as any[]).map(r => r.bowl_id));
      const nonDiscarded = (bowls ?? []).filter((b: any) => b.status !== 'discarded');

      // Org-level KPIs
      const totalSessions = (sessions ?? []).length;
      const totalDispensed = (lines as any[]).reduce((s, l) => s + (l.dispensed_quantity ?? 0), 0);
      const totalWaste = (wasteEvents as any[]).reduce((s, w) => s + (w.quantity ?? 0), 0);
      const reweighedCount = nonDiscarded.filter((b: any) => reweighedSet.has(b.id)).length;
      const reweighPct = nonDiscarded.length > 0 ? Math.round((reweighedCount / nonDiscarded.length) * 100) : 100;
      const wastePct = totalDispensed > 0 ? Math.round((totalWaste / totalDispensed) * 1000) / 10 : 0;

      // Per-staff aggregation
      const staffAgg = new Map<string, { sessions: number; bowlsTotal: number; bowlsReweighed: number; dispensed: number; waste: number; cost: number }>();
      for (const s of (sessions ?? []) as any[]) {
        const sid = s.mixed_by_staff_id;
        if (!sid) continue;
        const existing = staffAgg.get(sid) ?? { sessions: 0, bowlsTotal: 0, bowlsReweighed: 0, dispensed: 0, waste: 0, cost: 0 };
        existing.sessions++;
        staffAgg.set(sid, existing);
      }

      // Accumulate bowl data per staff
      for (const b of nonDiscarded as any[]) {
        const sid = sessionStaffMap.get(b.mix_session_id);
        if (!sid) continue;
        const agg = staffAgg.get(sid);
        if (!agg) continue;
        agg.bowlsTotal++;
        if (reweighedSet.has(b.id)) agg.bowlsReweighed++;
      }

      for (const l of (lines as any[])) {
        const sessionId = bowlSessionMap.get(l.bowl_id);
        const sid = sessionId ? sessionStaffMap.get(sessionId) : undefined;
        if (!sid) continue;
        const agg = staffAgg.get(sid);
        if (!agg) continue;
        agg.dispensed += l.dispensed_quantity ?? 0;
        agg.cost += (l.dispensed_quantity ?? 0) * (costMap.get(l.product_id) ?? 0);
      }

      for (const w of (wasteEvents as any[])) {
        const sid = sessionStaffMap.get(w.mix_session_id);
        if (!sid) continue;
        const agg = staffAgg.get(sid);
        if (agg) agg.waste += w.quantity ?? 0;
      }

      const staffRows = Array.from(staffAgg.entries()).map(([sid, agg]) => ({
        staffId: sid,
        name: nameMap.get(sid) ?? sid.slice(0, 8),
        sessions: agg.sessions,
        reweighPct: agg.bowlsTotal > 0 ? Math.round((agg.bowlsReweighed / agg.bowlsTotal) * 100) : 100,
        wastePct: agg.dispensed > 0 ? Math.round((agg.waste / agg.dispensed) * 1000) / 10 : 0,
        cost: Math.round(agg.cost * 100) / 100,
      })).sort((a, b) => b.sessions - a.sessions);

      return { totalSessions, reweighPct, wastePct, staffRows };
    },
    enabled: !!staff.organizationId,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="flex flex-col h-full px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] hover:bg-[hsl(var(--platform-bg-hover))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
        </button>
        <div>
          <h2 className="font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
            Team Compliance
          </h2>
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">Last 30 Days</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <Activity className="w-10 h-10 text-[hsl(var(--platform-foreground-muted)/0.4)] mb-3" />
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
            No mixing activity in the last 30 days
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-3">
            <KpiTile icon={Scale} label="Reweigh" value={`${data.reweighPct}%`}
              color={data.reweighPct >= 80 ? 'text-emerald-400' : data.reweighPct >= 50 ? 'text-amber-400' : 'text-red-400'} />
            <KpiTile icon={Droplets} label="Waste" value={`${data.wastePct}%`}
              color={data.wastePct <= 3 ? 'text-emerald-400' : data.wastePct <= 7 ? 'text-amber-400' : 'text-red-400'} />
            <KpiTile icon={Activity} label="Sessions" value={String(data.totalSessions)}
              color="text-[hsl(var(--platform-foreground))]" />
          </div>

          {/* Staff leaderboard */}
          <div className="rounded-2xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[hsl(var(--platform-border)/0.2)]">
              <h3 className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">
                Staff Leaderboard
              </h3>
            </div>
            <div className="divide-y divide-[hsl(var(--platform-border)/0.15)]">
              {data.staffRows.map((row) => (
                <div key={row.staffId} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--platform-foreground))] truncate">
                      {row.name}
                    </p>
                    <p className="text-[11px] text-[hsl(var(--platform-foreground-muted))]">
                      {row.sessions} sessions · ${row.cost.toFixed(0)} cost
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={cn('text-xs font-medium tabular-nums',
                        row.reweighPct >= 80 ? 'text-emerald-400' : row.reweighPct >= 50 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {row.reweighPct}%
                      </p>
                      <p className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">Reweigh</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-xs font-medium tabular-nums',
                        row.wastePct <= 3 ? 'text-emerald-400' : row.wastePct <= 7 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {row.wastePct}%
                      </p>
                      <p className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">Waste</p>
                    </div>
                  </div>
                </div>
              ))}
              {data.staffRows.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-[hsl(var(--platform-foreground-muted))]">
                  No staff data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-center">
      <Icon className={cn('w-4 h-4 mx-auto mb-1', color)} />
      <p className={cn('text-lg font-medium tabular-nums', color)}>{value}</p>
      <p className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">{label}</p>
    </div>
  );
}
