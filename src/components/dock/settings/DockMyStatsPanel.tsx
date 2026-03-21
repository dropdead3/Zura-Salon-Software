/**
 * DockMyStatsPanel — Personal mixing performance for the logged-in stylist.
 * No PIN gate needed — it's the user's own data.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Droplets, Scale, FlaskConical, Activity } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { DockStaffSession } from '@/pages/Dock';

interface DockMyStatsPanelProps {
  staff: DockStaffSession;
  onBack: () => void;
}

export function DockMyStatsPanel({ staff, onBack }: DockMyStatsPanelProps) {
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['dock-my-stats', staff.organizationId, staff.userId, startDate, endDate],
    queryFn: async () => {
      // Fetch sessions for this staff member
      const { data: sessions, error: sErr } = await supabase
        .from('mix_sessions')
        .select('id, status, started_at, completed_at')
        .eq('organization_id', staff.organizationId)
        .eq('mixed_by_staff_id', staff.userId)
        .gte('started_at', startDate)
        .lte('started_at', endDate + 'T23:59:59');
      if (sErr) throw sErr;

      const sessionIds = (sessions ?? []).map((s: any) => s.id);
      if (!sessionIds.length) return null;

      const { data: bowls } = await supabase
        .from('mix_bowls')
        .select('id, mix_session_id, status')
        .in('mix_session_id', sessionIds);

      const bowlIds = (bowls ?? []).map((b: any) => b.id);

      const [linesRes, reweighRes, wasteRes] = await Promise.all([
        supabase
          .from('mix_bowl_lines')
          .select('bowl_id, dispensed_quantity, product_id')
          .in('bowl_id', bowlIds.length ? bowlIds : ['__none__']),
        supabase
          .from('reweigh_events')
          .select('bowl_id')
          .in('bowl_id', bowlIds.length ? bowlIds : ['__none__']),
        supabase
          .from('waste_events')
          .select('quantity')
          .in('mix_session_id', sessionIds),
      ]);

      const lines = linesRes.data ?? [];
      const reweighEvents = reweighRes.data ?? [];
      const wasteEvents = wasteRes.data ?? [];

      // Product costs
      const productIds = [...new Set((lines as any[]).map(l => l.product_id).filter(Boolean))];
      const costMap = new Map<string, number>();
      if (productIds.length) {
        const { data: products } = await supabase
          .from('products')
          .select('id, cost_price')
          .in('id', productIds);
        for (const p of (products ?? []) as any[]) costMap.set(p.id, p.cost_price ?? 0);
      }

      const totalSessions = (sessions ?? []).length;
      const completedSessions = (sessions ?? []).filter((s: any) => s.status === 'completed').length;
      const totalDispensed = (lines as any[]).reduce((s, l) => s + (l.dispensed_quantity ?? 0), 0);
      const totalCost = (lines as any[]).reduce((s, l) => s + (l.dispensed_quantity ?? 0) * (costMap.get(l.product_id) ?? 0), 0);
      const totalWaste = (wasteEvents as any[]).reduce((s, w) => s + (w.quantity ?? 0), 0);

      const nonDiscarded = (bowls ?? []).filter((b: any) => b.status !== 'discarded');
      const reweighedSet = new Set((reweighEvents as any[]).map(r => r.bowl_id));
      const reweighedCount = nonDiscarded.filter((b: any) => reweighedSet.has(b.id)).length;
      const reweighPct = nonDiscarded.length > 0 ? Math.round((reweighedCount / nonDiscarded.length) * 100) : 100;
      const wastePct = totalDispensed > 0 ? Math.round((totalWaste / totalDispensed) * 1000) / 10 : 0;
      const avgCostPerService = completedSessions > 0 ? Math.round((totalCost / completedSessions) * 100) / 100 : 0;

      return { totalSessions, completedSessions, reweighPct, wastePct, avgCostPerService, totalCost };
    },
    enabled: !!staff.organizationId && !!staff.userId,
    staleTime: 5 * 60_000,
  });

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: 'Reweigh Compliance',
        value: `${data.reweighPct}%`,
        pct: data.reweighPct,
        icon: Scale,
        color: data.reweighPct >= 80 ? 'text-emerald-400' : data.reweighPct >= 50 ? 'text-amber-400' : 'text-red-400',
        barColor: data.reweighPct >= 80 ? 'bg-emerald-500' : data.reweighPct >= 50 ? 'bg-amber-500' : 'bg-red-500',
      },
      {
        label: 'Waste Rate',
        value: `${data.wastePct}%`,
        pct: Math.min(data.wastePct * 10, 100), // scale for visibility (10% waste = full bar)
        icon: Droplets,
        color: data.wastePct <= 3 ? 'text-emerald-400' : data.wastePct <= 7 ? 'text-amber-400' : 'text-red-400',
        barColor: data.wastePct <= 3 ? 'bg-emerald-500' : data.wastePct <= 7 ? 'bg-amber-500' : 'bg-red-500',
      },
      {
        label: 'Avg Cost / Service',
        value: `$${data.avgCostPerService.toFixed(2)}`,
        pct: null,
        icon: FlaskConical,
        color: 'text-violet-400',
        barColor: null,
      },
      {
        label: 'Total Sessions',
        value: String(data.totalSessions),
        pct: null,
        icon: Activity,
        color: 'text-[hsl(var(--platform-foreground))]',
        barColor: null,
      },
    ];
  }, [data]);

  return (
    <div className="flex flex-col h-full px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] hover:bg-[hsl(var(--platform-bg-hover))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
        </button>
        <div>
          <h2 className="font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
            My Performance
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
        <div className="space-y-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-2xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <stat.icon className={cn('w-4 h-4', stat.color)} />
                  <span className="text-xs text-[hsl(var(--platform-foreground-muted))]">
                    {stat.label}
                  </span>
                </div>
                <span className={cn('text-lg font-medium tabular-nums', stat.color)}>
                  {stat.value}
                </span>
              </div>
              {stat.pct !== null && (
                <Progress
                  value={stat.pct}
                  className="h-1.5 bg-[hsl(var(--platform-bg-hover))]"
                  indicatorClassName={stat.barColor ?? ''}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
