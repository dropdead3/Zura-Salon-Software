/**
 * DockSummaryTab — Session summary with bowl counts, cost aggregation, and event timeline.
 */

import { Receipt, FlaskConical, CheckCircle2, Loader2, DollarSign, Scale, Beaker } from 'lucide-react';
import type { DockStaffSession } from '@/pages/Dock';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { useDockMixSessions } from '@/hooks/dock/useDockMixSessions';
import { useDockSessionStats } from '@/hooks/dock/useDockSessionStats';
import { normalizeSessionStatus } from '@/lib/color-bar/session-state-machine';
import { DockSessionTimeline } from '../mixing/DockSessionTimeline';
import { roundWeight, roundCost } from '@/lib/color-bar/mix-calculations';
import { cn } from '@/lib/utils';
import { DOCK_CONTENT } from '@/components/dock/dock-ui-tokens';
import { getDisplayClientName } from '@/lib/appointment-display';

interface DockSummaryTabProps {
  appointment: DockAppointment;
  staff: DockStaffSession;
}

export function DockSummaryTab({ appointment, staff }: DockSummaryTabProps) {
  const { data: sessions, isLoading } = useDockMixSessions(appointment.id);
  const allSessionIds = (sessions ?? []).map(s => s.id);
  const { data: stats } = useDockSessionStats(allSessionIds.length > 0 ? allSessionIds : null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
      </div>
    );
  }

  const bowls = sessions || [];
  const completed = bowls.filter((s) => normalizeSessionStatus(s.status as any) === 'completed').length;
  const active = bowls.filter((s) => {
    const n = normalizeSessionStatus(s.status as any);
    return n === 'active' || n === 'draft' || n === 'awaiting_reweigh' || n === 'awaiting_stylist_approval';
  }).length;

  const bowlStats = [
    { label: 'Total Bowls', value: bowls.length, icon: FlaskConical },
    { label: 'Completed', value: completed, icon: CheckCircle2 },
    { label: 'In Progress', value: active, icon: FlaskConical },
  ];

  return (
    <div className="px-7 py-4 space-y-4">
      {/* Appointment info */}
      <div className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] p-5 space-y-2.5">
        <InfoRow label="Client" value={getDisplayClientName(appointment).label} />
        <InfoRow label="Service" value={appointment.service_name || '—'} />
        <InfoRow label="Status" value={appointment.status || 'Pending'} />
        <InfoRow label="Stylist" value={staff.displayName} />
      </div>

      {/* Bowl stats */}
      {bowls.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {bowlStats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] p-4 text-center"
            >
              <Icon className={cn(DOCK_CONTENT.sectionIcon, 'text-violet-400 mx-auto mb-1')} />
              <p className="font-display text-xl tracking-wide text-[hsl(var(--platform-foreground))]">
                {value}
              </p>
              <p className={cn(DOCK_CONTENT.caption, 'mt-0.5')}>
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Cost & usage aggregation from projections */}
      {stats && stats.totalDispensed > 0 && (
        <div className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] p-5 space-y-3">
          <h3 className={DOCK_CONTENT.sectionHeader}>
            Session Totals
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <StatTile icon={Beaker} label="Dispensed" value={`${roundWeight(stats.totalDispensed)}g`} />
            <StatTile icon={Scale} label="Net Usage" value={`${roundWeight(stats.totalNetUsage)}g`} highlight />
            <StatTile icon={Scale} label="Leftover" value={`${roundWeight(stats.totalLeftover)}g`} />
            <StatTile icon={DollarSign} label="Total Cost" value={`$${roundCost(stats.totalCost).toFixed(2)}`} />
          </div>
          {stats.totalDispensed > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--platform-border)/0.1)]">
              <span className={DOCK_CONTENT.captionDim}>Waste %</span>
              <span className={cn('text-sm font-medium',
                (stats.totalLeftover / stats.totalDispensed) * 100 > 25 ? 'text-amber-400' : 'text-emerald-400'
              )}>
                {roundWeight((stats.totalLeftover / stats.totalDispensed) * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Event timeline — show for all sessions */}
      {allSessionIds.map((sid) => (
        <DockSessionTimeline key={sid} sessionId={sid} />
      ))}

      {bowls.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-8 text-center">
          <Receipt className="w-10 h-10 text-violet-400/30 mb-3" />
          <p className={DOCK_CONTENT.bodyMuted}>
            No mixing activity yet
          </p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={DOCK_CONTENT.caption}>{label}</span>
      <span className={cn(DOCK_CONTENT.body, 'font-medium')}>{value}</span>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, highlight }: {
  icon: typeof Scale;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[hsl(var(--platform-bg-elevated))] border border-[hsl(var(--platform-border)/0.1)] p-3.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-4 h-4 text-[hsl(var(--platform-foreground-muted)/0.5)]" />
        <span className={cn(DOCK_CONTENT.caption, 'uppercase tracking-wide')}>{label}</span>
      </div>
      <p className={cn('font-display text-base tracking-tight', highlight ? 'text-violet-400' : 'text-[hsl(var(--platform-foreground))]')}>
        {value}
      </p>
    </div>
  );
}
