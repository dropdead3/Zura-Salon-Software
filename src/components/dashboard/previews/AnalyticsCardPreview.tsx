import { 
  DollarSign, Trophy, PieChart, TrendingUp, Target, CalendarPlus, 
  Users, Gauge, BarChart3, Briefcase, LineChart, UserPlus,
  FileText, Sun, HeartPulse, Activity, RefreshCw, MapPin,
  Layers, ShoppingBag, Wallet, Receipt, Scale, Award,
  FlaskConical, PackageSearch,
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
/* EXECUTIVE SUMMARY                      */
/* ═══════════════════════════════════════ */
function ExecutiveSummaryPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={FileText} title="EXECUTIVE SUMMARY" />
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Revenue', value: '$48.2k', delta: '+8%' },
          { label: 'Margin', value: '62%', delta: '+2pp' },
          { label: 'Retention', value: '84%', delta: '+1%' },
        ].map(k => (
          <div key={k.label} className="rounded-md bg-muted/40 p-2 text-center">
            <p className="font-display text-sm font-medium">{k.value}</p>
            <p className="text-[8px] text-muted-foreground">{k.label}</p>
            <p className="text-[8px] text-emerald-500 font-medium">{k.delta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* DAILY BRIEF                            */
/* ═══════════════════════════════════════ */
function DailyBriefPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={Sun} title="APPOINTMENTS SUMMARY" />
      <div className="space-y-1.5">
        <StatRow label="Today's appointments" value="24" />
        <StatRow label="Projected revenue" value="$4,800" />
        <StatRow label="Open gaps" value="3 slots" />
        <StatRow label="New clients today" value="5" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* SALES OVERVIEW                         */
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
/* REVENUE BREAKDOWN                      */
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
/* TOP PERFORMERS                         */
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
/* SERVICE MIX                            */
/* ═══════════════════════════════════════ */
function ServiceMixPreview() {
  const categories = [
    { label: 'Color', pct: 38 },
    { label: 'Cut & Style', pct: 30 },
    { label: 'Treatments', pct: 18 },
    { label: 'Extensions', pct: 14 },
  ];
  return (
    <div className="space-y-3">
      <MiniHeader icon={Layers} title="SERVICE MIX" />
      <div className="space-y-1.5">
        {categories.map(c => (
          <MiniBar key={c.label} label={c.label} pct={c.pct} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* RETAIL EFFECTIVENESS                   */
/* ═══════════════════════════════════════ */
function RetailEffectivenessPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={ShoppingBag} title="RETAIL EFFECTIVENESS" />
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="font-display text-sm font-medium">34%</p>
          <p className="text-[9px] text-muted-foreground">Attach rate</p>
        </div>
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="font-display text-sm font-medium">$42</p>
          <p className="text-[9px] text-muted-foreground">Avg ticket</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <StatRow label="Olaplex" value="$1,240" />
        <StatRow label="K18" value="$980" />
        <StatRow label="Redken" value="$760" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* WEEK AHEAD FORECAST                    */
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
/* GOAL TRACKER                           */
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
/* NEW BOOKINGS                           */
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
/* CLIENT FUNNEL                          */
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
/* CLIENT HEALTH                          */
/* ═══════════════════════════════════════ */
function ClientHealthPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={HeartPulse} title="CLIENT HEALTH" />
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 36 36" className="w-14 h-14">
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" stroke="hsl(var(--muted))" />
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" stroke="hsl(var(--primary))"
            strokeDasharray={`${0.84 * 94.2} ${94.2 - 0.84 * 94.2}`}
            strokeLinecap="round" transform="rotate(-90 18 18)"
          />
          <text x="18" y="19.5" textAnchor="middle" className="fill-foreground text-[8px] font-medium">84%</text>
        </svg>
        <div className="space-y-1">
          <p className="text-[10px] font-medium">Retention rate</p>
          <p className="text-[9px] text-muted-foreground">12 at-risk clients</p>
          <p className="text-[9px] text-muted-foreground">8 win-backs this month</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* REBOOKING RATE                         */
/* ═══════════════════════════════════════ */
function RebookingPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={RefreshCw} title="REBOOKING RATE" />
      <div className="text-center">
        <p className="font-display text-lg font-medium">68%</p>
        <p className="text-[10px] text-muted-foreground">Overall rebooking rate</p>
      </div>
      <div className="space-y-1.5">
        <StatRow label="At checkout" value="52%" />
        <StatRow label="Within 7 days" value="16%" />
        <StatRow label="Target" value="75%" />
      </div>
      <div className="flex items-center justify-center gap-1">
        <TrendingUp className="w-3 h-3 text-emerald-500" />
        <span className="text-[10px] text-emerald-500 font-medium">+3% vs last month</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* OPERATIONAL HEALTH                     */
/* ═══════════════════════════════════════ */
function OperationalHealthPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={Activity} title="OPERATIONAL HEALTH" />
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="font-display text-sm font-medium">87%</p>
          <p className="text-[9px] text-muted-foreground">Utilization</p>
        </div>
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="font-display text-sm font-medium">4.2%</p>
          <p className="text-[9px] text-muted-foreground">Cancellation</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <StatRow label="No-shows" value="3" sub="(2.1%)" />
        <StatRow label="Avg wait time" value="8 min" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* CAPACITY UTILIZATION                   */
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
/* STYLIST WORKLOAD                       */
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
/* LOCATIONS STATUS                       */
/* ═══════════════════════════════════════ */
function LocationsStatusPreview() {
  const locations = [
    { name: 'Downtown', status: 'Open · closes 7pm', tone: 'open' as const },
    { name: 'Midtown', status: 'Opens 10am', tone: 'pending' as const },
    { name: 'Suburbs', status: 'Holiday · Memorial Day', tone: 'closed' as const },
  ];
  const dotClass = (t: 'open' | 'pending' | 'closed') =>
    t === 'open' ? 'bg-emerald-500' : t === 'pending' ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="space-y-3">
      <MiniHeader icon={MapPin} title="LOCATIONS STATUS" />
      <div className="text-center">
        <p className="font-display text-base">1<span className="text-muted-foreground">/3</span></p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Open right now</p>
      </div>
      <div className="space-y-1.5">
        {locations.map(l => (
          <div key={l.name} className="flex items-center justify-between gap-2 text-[10px]">
            <span className="text-foreground font-medium truncate">{l.name}</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full ${dotClass(l.tone)}`} />
              {l.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* COMMISSION SUMMARY                     */
/* ═══════════════════════════════════════ */
function CommissionSummaryPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={Wallet} title="COMMISSION SUMMARY" />
      <div className="text-center">
        <p className="font-display text-lg font-medium">$12,840</p>
        <p className="text-[10px] text-muted-foreground">Total commission liability</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Service</p>
          <p className="font-display text-sm font-medium">$9,600</p>
        </div>
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Retail</p>
          <p className="font-display text-sm font-medium">$3,240</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* STAFF COMMISSION BREAKDOWN             */
/* ═══════════════════════════════════════ */
function StaffCommissionBreakdownPreview() {
  const staff = [
    { name: 'Sarah M.', tier: 'Gold', amount: '$3,420' },
    { name: 'Jessica R.', tier: 'Silver', amount: '$2,860' },
    { name: 'Amanda K.', tier: 'Silver', amount: '$2,190' },
  ];
  return (
    <div className="space-y-3">
      <MiniHeader icon={Receipt} title="STAFF COMMISSION" />
      <div className="space-y-1.5">
        {staff.map(s => (
          <div key={s.name} className="flex items-center justify-between text-[10px]">
            <span className="text-foreground">{s.name}</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[7px] px-1 py-0">{s.tier}</Badge>
              <span className="font-medium">{s.amount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* TRUE PROFIT                            */
/* ═══════════════════════════════════════ */
function TrueProfitPreview() {
  const rows = [
    { label: 'Gross Revenue', value: '$48,200', bar: 100 },
    { label: '− Commission', value: '−$12,840', bar: 73 },
    { label: '− Product Cost', value: '−$4,200', bar: 64 },
    { label: '− Overhead', value: '−$8,600', bar: 46 },
  ];
  return (
    <div className="space-y-3">
      <MiniHeader icon={Scale} title="TRUE PROFIT" />
      <div className="space-y-1.5">
        {rows.map(r => (
          <div key={r.label} className="space-y-0.5">
            <div className="flex justify-between text-[9px]">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium text-foreground">{r.value}</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary/60" style={{ width: `${r.bar}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="text-center pt-1 border-t border-border">
        <p className="text-[10px] text-muted-foreground">Net profit</p>
        <p className="font-display text-sm font-medium">$22,560</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* SERVICE PROFITABILITY                  */
/* ═══════════════════════════════════════ */
function ServiceProfitabilityPreview() {
  const services = [
    { name: 'Balayage', margin: '72%', rev: '$8,400' },
    { name: 'Full Color', margin: '65%', rev: '$6,200' },
    { name: 'Cut & Style', margin: '82%', rev: '$4,800' },
    { name: 'Extensions', margin: '48%', rev: '$3,100' },
  ];
  return (
    <div className="space-y-3">
      <MiniHeader icon={BarChart3} title="SERVICE PROFITABILITY" />
      <div className="space-y-1.5">
        {services.map(s => (
          <div key={s.name} className="flex items-center justify-between text-[10px]">
            <span className="text-foreground">{s.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{s.rev}</span>
              <Badge variant="outline" className="text-[7px] px-1 py-0">{s.margin}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* STAFF PERFORMANCE                      */
/* ═══════════════════════════════════════ */
function StaffPerformancePreview() {
  const staff = [
    { name: 'Sarah M.', score: 94 },
    { name: 'Jessica R.', score: 87 },
    { name: 'Amanda K.', score: 82 },
    { name: 'Mike T.', score: 76 },
  ];
  return (
    <div className="space-y-3">
      <MiniHeader icon={Award} title="STAFF PERFORMANCE" />
      <div className="space-y-1.5">
        {staff.map(s => (
          <MiniBar key={s.name} label={s.name} pct={s.score} color={s.score >= 85 ? 'bg-primary' : 'bg-primary/60'} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* STAFFING TRENDS                        */
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
/* HIRING & CAPACITY                      */
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
/* CONTROL TOWER                          */
/* ═══════════════════════════════════════ */
function ControlTowerPreview() {
  const alerts = [
    { label: 'Cost spike — Lightener +18%', severity: 'destructive' as const },
    { label: 'Low stock — Developer 20vol', severity: 'outline' as const },
    { label: 'Waste above threshold', severity: 'outline' as const },
  ];
  return (
    <div className="space-y-3">
      <MiniHeader icon={FlaskConical} title="CONTROL TOWER" />
      <div className="space-y-1.5">
        {alerts.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <Badge variant={a.severity} className="text-[7px] px-1.5 py-0">
              {a.severity === 'destructive' ? 'Alert' : 'Watch'}
            </Badge>
            <span className="text-[9px] text-muted-foreground truncate">{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* PREDICTIVE INVENTORY                   */
/* ═══════════════════════════════════════ */
function PredictiveInventoryPreview() {
  return (
    <div className="space-y-3">
      <MiniHeader icon={PackageSearch} title="PREDICTIVE INVENTORY" />
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="font-display text-sm font-medium">4</p>
          <p className="text-[9px] text-muted-foreground">Reorder alerts</p>
        </div>
        <div className="rounded-md bg-muted/40 p-2 text-center">
          <p className="font-display text-sm font-medium">12 days</p>
          <p className="text-[9px] text-muted-foreground">Avg runway</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <StatRow label="Developer 20vol" value="3 days left" />
        <StatRow label="Lightener" value="5 days left" />
        <StatRow label="Toner 9V" value="8 days left" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* ROUTER                                 */
/* ═══════════════════════════════════════ */
const PREVIEWS: Record<string, () => JSX.Element> = {
  // Executive
  executive_summary: ExecutiveSummaryPreview,
  daily_brief: DailyBriefPreview,
  // Sales
  sales_overview: SalesOverviewPreview,
  revenue_breakdown: RevenueBreakdownPreview,
  top_performers: TopPerformersPreview,
  service_mix: ServiceMixPreview,
  retail_effectiveness: RetailEffectivenessPreview,
  // Forecasting
  week_ahead_forecast: WeekAheadForecastPreview,
  goal_tracker: GoalTrackerPreview,
  new_bookings: NewBookingsPreview,
  // Clients
  client_funnel: ClientFunnelPreview,
  client_health: ClientHealthPreview,
  rebooking: RebookingPreview,
  // Operations
  operations_stats: OperationalHealthPreview, // legacy alias
  operational_health: OperationalHealthPreview,
  capacity_utilization: CapacityUtilizationPreview,
  stylist_workload: StylistWorkloadPreview,
  locations_rollup: LocationsStatusPreview,
  // Financial
  commission_summary: CommissionSummaryPreview,
  staff_commission_breakdown: StaffCommissionBreakdownPreview,
  true_profit: TrueProfitPreview,
  service_profitability: ServiceProfitabilityPreview,
  // Staffing
  staff_performance: StaffPerformancePreview,
  staffing_trends: StaffingTrendsPreview,
  hiring_capacity: HiringCapacityPreview,
  // Backroom
  control_tower: ControlTowerPreview,
  predictive_inventory: PredictiveInventoryPreview,
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
