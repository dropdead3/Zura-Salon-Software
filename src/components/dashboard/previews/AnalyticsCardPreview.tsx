import { 
  DollarSign, Trophy, PieChart, TrendingUp, Target, CalendarPlus, 
  Users, Gauge, BarChart3, Briefcase, LineChart, UserPlus 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

/* ─── shared mini header ─── */
function MiniHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 bg-muted flex items-center justify-center rounded-md">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="font-display text-[11px] tracking-wide text-foreground">{title}</span>
    </div>
  );
}

/* ─── shared stat row ─── */
function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-foreground">{value}</span>
        {sub && <span className="text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

/* ─── shared mini bar ─── */
function MiniBar({ label, pct, color = 'bg-primary' }: { label: string; pct: number; color?: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[9px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 1. SALES OVERVIEW                      */
/* ═══════════════════════════════════════ */
function SalesOverviewPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={DollarSign} title="SALES OVERVIEW" />
      <div className="text-center">
        <p className="font-display text-lg font-medium">$24,850</p>
        <p className="text-[10px] text-muted-foreground">This week's total revenue</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Services</p>
          <p className="font-display text-sm font-medium">$19,200</p>
        </div>
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Retail</p>
          <p className="font-display text-sm font-medium">$5,650</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1">
        <TrendingUp className="w-3 h-3 text-emerald-500" />
        <span className="text-[10px] text-emerald-500 font-medium">+12.4% vs last week</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 2. REVENUE BREAKDOWN                   */
/* ═══════════════════════════════════════ */
function RevenueBreakdownPreview() {
  const segments = [
    { label: 'Color', pct: 42, color: 'hsl(var(--primary))' },
    { label: 'Cut & Style', pct: 28, color: 'hsl(var(--primary) / 0.7)' },
    { label: 'Treatments', pct: 18, color: 'hsl(var(--primary) / 0.4)' },
    { label: 'Other', pct: 12, color: 'hsl(var(--muted-foreground) / 0.3)' },
  ];
  const total = 360;
  let offset = 0;

  return (
    <div className="space-y-3">
      <MiniHeader icon={PieChart} title="REVENUE BREAKDOWN" />
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 36 36" className="w-16 h-16">
          {segments.map((seg, i) => {
            const dash = (seg.pct / 100) * total * 0.28;
            const gap = total * 0.28 - dash;
            const el = (
              <circle key={i} cx="18" cy="18" r="16" fill="none" strokeWidth="3.5"
                stroke={seg.color}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 18 18)"
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="space-y-1 flex-1">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-muted-foreground flex-1">{s.label}</span>
              <span className="font-medium">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 3. TOP PERFORMERS                      */
/* ═══════════════════════════════════════ */
function TopPerformersPreview() {
  const performers = [
    { name: 'Sarah M.', rev: '$8,420', pct: 100 },
    { name: 'Jessica R.', rev: '$7,180', pct: 85 },
    { name: 'Amanda K.', rev: '$5,940', pct: 71 },
  ];
  return (
    <div className="space-y-3">
      <MiniHeader icon={Trophy} title="TOP PERFORMERS" />
      <div className="space-y-2">
        {performers.map((p, i) => (
          <div key={p.name} className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-foreground font-medium">#{i + 1} {p.name}</span>
              <span className="text-muted-foreground">{p.rev}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary/80" style={{ width: `${p.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 4. WEEK AHEAD FORECAST                 */
/* ═══════════════════════════════════════ */
function WeekAheadForecastPreview() {
  const days = [
    { day: 'Mon', rev: '$4.2k', fill: 85 },
    { day: 'Tue', rev: '$3.8k', fill: 76 },
    { day: 'Wed', rev: '$4.5k', fill: 90 },
    { day: 'Thu', rev: '$3.1k', fill: 62 },
    { day: 'Fri', rev: '$5.0k', fill: 100 },
  ];
  return (
    <div className="space-y-3">
      <MiniHeader icon={TrendingUp} title="WEEK AHEAD FORECAST" />
      <div className="flex items-end gap-1.5 h-12">
        {days.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full bg-muted rounded-sm overflow-hidden" style={{ height: 40 }}>
              <div className="w-full bg-primary/60 rounded-sm" style={{ height: `${d.fill}%`, marginTop: `${100 - d.fill}%` }} />
            </div>
            <span className="text-[8px] text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="font-display text-sm font-medium">$20,600</p>
        <p className="text-[9px] text-muted-foreground">Projected weekly total</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 5. GOAL TRACKER                        */
/* ═══════════════════════════════════════ */
function GoalTrackerPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={Target} title="GOAL TRACKER" />
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 36 36" className="w-14 h-14">
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" stroke="hsl(var(--muted))" />
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" stroke="hsl(var(--primary))"
            strokeDasharray={`${0.72 * 94.2} ${94.2 - 0.72 * 94.2}`}
            strokeLinecap="round" transform="rotate(-90 18 18)"
          />
          <text x="18" y="19.5" textAnchor="middle" className="fill-foreground text-[8px] font-medium">72%</text>
        </svg>
        <div className="space-y-1">
          <p className="text-[10px] font-medium">$18,000 / $25,000</p>
          <Badge variant="outline" className="text-[8px] px-1.5 py-0">On pace</Badge>
          <p className="text-[9px] text-muted-foreground">$1,750/day needed</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 6. NEW BOOKINGS                        */
/* ═══════════════════════════════════════ */
function NewBookingsPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={CalendarPlus} title="NEW BOOKINGS" />
      <div className="flex items-baseline gap-2">
        <span className="font-display text-lg font-medium">47</span>
        <span className="text-[10px] text-muted-foreground">bookings this week</span>
        <TrendingUp className="w-3 h-3 text-emerald-500 ml-auto" />
        <span className="text-[10px] text-emerald-500 font-medium">+8%</span>
      </div>
      <div className="space-y-1.5">
        <StatRow label="New clients" value="12" sub="(26%)" />
        <StatRow label="Returning" value="35" sub="(74%)" />
        <StatRow label="Avg ticket" value="$142" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 7. CLIENT FUNNEL                       */
/* ═══════════════════════════════════════ */
function ClientFunnelPreview() {
  const stages = [
    { label: 'New Inquiries', value: 28, width: 100 },
    { label: 'Booked', value: 22, width: 78 },
    { label: 'Completed', value: 19, width: 68 },
    { label: 'Rebooked', value: 14, width: 50 },
  ];
  return (
    <div className="space-y-3">
      <MiniHeader icon={Users} title="CLIENT FUNNEL" />
      <div className="space-y-1.5">
        {stages.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="h-4 rounded bg-primary/20 relative overflow-hidden" style={{ width: `${s.width}%` }}>
              <div className="absolute inset-0 bg-primary/50 rounded" style={{ width: `${s.width}%` }} />
              <span className="absolute left-1.5 top-0.5 text-[8px] font-medium text-foreground">{s.value}</span>
            </div>
            <span className="text-[8px] text-muted-foreground whitespace-nowrap">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 8. OPERATIONS STATS                    */
/* ═══════════════════════════════════════ */
function OperationsStatsPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={Gauge} title="OPERATIONS STATS" />
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="font-display text-sm font-medium">87%</p>
          <p className="text-[9px] text-muted-foreground">Utilization</p>
        </div>
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="font-display text-sm font-medium">12 min</p>
          <p className="text-[9px] text-muted-foreground">Avg wait</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <StatRow label="Clients served" value="142" />
        <StatRow label="No-shows" value="3" sub="(2.1%)" />
        <StatRow label="Rebooking rate" value="68%" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 9. CAPACITY UTILIZATION                */
/* ═══════════════════════════════════════ */
function CapacityUtilizationPreview() {
  const providers = [
    { name: 'Sarah', pct: 92 },
    { name: 'Jessica', pct: 85 },
    { name: 'Amanda', pct: 78 },
    { name: 'Mike', pct: 64 },
  ];
  return (
    <div className="space-y-3">
      <MiniHeader icon={BarChart3} title="CAPACITY UTILIZATION" />
      <div className="space-y-1.5">
        {providers.map((p) => (
          <MiniBar key={p.name} label={p.name} pct={p.pct} color={p.pct > 80 ? 'bg-primary' : 'bg-primary/60'} />
        ))}
      </div>
      <div className="text-center">
        <p className="text-[9px] text-muted-foreground">Team avg: <span className="font-medium text-foreground">80%</span></p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 10. STYLIST WORKLOAD                   */
/* ═══════════════════════════════════════ */
function StylistWorkloadPreview() {
  const stylists = [
    { name: 'Sarah M.', hours: '38h', load: 95 },
    { name: 'Jessica R.', hours: '34h', load: 85 },
    { name: 'Amanda K.', hours: '28h', load: 70 },
  ];
  return (
    <div className="space-y-3">
      <MiniHeader icon={Briefcase} title="STYLIST WORKLOAD" />
      <div className="space-y-2">
        {stylists.map((s) => (
          <div key={s.name} className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-foreground">{s.name}</span>
              <span className="text-muted-foreground">{s.hours}</span>
            </div>
            <Progress value={s.load} className="h-1.5" indicatorClassName={s.load > 90 ? 'bg-amber-500' : 'bg-primary'} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 11. STAFFING TRENDS                    */
/* ═══════════════════════════════════════ */
function StaffingTrendsPreview() {
  const points = [18, 19, 19, 20, 20, 21, 22];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  return (
    <div className="space-y-3">
      <MiniHeader icon={LineChart} title="STAFFING TRENDS" />
      <svg viewBox="0 0 120 30" className="w-full h-8">
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          points={points.map((p, i) => `${(i / (points.length - 1)) * 120},${30 - ((p - min) / range) * 26}`).join(' ')}
        />
      </svg>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="font-display text-sm font-medium">22</p>
          <p className="text-[9px] text-muted-foreground">Current</p>
        </div>
        <div>
          <p className="font-display text-sm font-medium">2</p>
          <p className="text-[9px] text-muted-foreground">New hires</p>
        </div>
        <div>
          <p className="font-display text-sm font-medium">4.2%</p>
          <p className="text-[9px] text-muted-foreground">Turnover</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* 12. HIRING & CAPACITY                  */
/* ═══════════════════════════════════════ */
function HiringCapacityPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={UserPlus} title="HIRING & CAPACITY" />
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="font-display text-sm font-medium">3</p>
          <p className="text-[9px] text-muted-foreground">Open positions</p>
        </div>
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="font-display text-sm font-medium">2</p>
          <p className="text-[9px] text-muted-foreground">In pipeline</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[9px]">
          <span className="text-muted-foreground">Chair capacity</span>
          <span className="font-medium">18/24 filled</span>
        </div>
        <Progress value={75} className="h-1.5" />
      </div>
      <p className="text-[9px] text-muted-foreground text-center">6 chairs available for expansion</p>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* ROUTER                                 */
/* ═══════════════════════════════════════ */
const PREVIEWS: Record<string, () => JSX.Element> = {
  sales_overview: SalesOverviewPreview,
  revenue_breakdown: RevenueBreakdownPreview,
  top_performers: TopPerformersPreview,
  week_ahead_forecast: WeekAheadForecastPreview,
  goal_tracker: GoalTrackerPreview,
  new_bookings: NewBookingsPreview,
  client_funnel: ClientFunnelPreview,
  operations_stats: OperationsStatsPreview,
  capacity_utilization: CapacityUtilizationPreview,
  stylist_workload: StylistWorkloadPreview,
  staffing_trends: StaffingTrendsPreview,
  hiring_capacity: HiringCapacityPreview,
};

export function AnalyticsCardPreview({ cardId }: { cardId: string }) {
  const Preview = PREVIEWS[cardId];
  if (!Preview) return null;
  return (
    <Card className="p-4 border-0 shadow-none bg-transparent">
      <Preview />
    </Card>
  );
}
