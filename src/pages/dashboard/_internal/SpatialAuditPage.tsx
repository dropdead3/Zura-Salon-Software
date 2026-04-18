import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { WeeklyLeverBrief } from '@/components/executive-brief/WeeklyLeverBrief';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Beaker } from 'lucide-react';

const AUDIT_WIDTHS = [1200, 960, 720, 560, 420, 320] as const;

const SAMPLE_METRIC = {
  id: 'avg-ticket',
  name: 'Average Ticket',
  category: 'sales_revenue' as const,
  description: 'Average revenue per completed appointment, including services + retail + tips collected at checkout.',
  formula: 'SUM(total_price) / COUNT(appointments WHERE status = completed)',
  dataSource: 'appointments + checkout_carts',
  updateFrequency: 'Real-time on checkout',
  example: '$148.20',
  relatedMetrics: ['service-mix', 'retail-attach-rate', 'tips-per-ticket', 'rebook-rate'],
};

const SAMPLE_LEVER = {
  id: 'lever-1',
  organization_id: 'org-demo',
  title: 'Push Friday rebook rate from 38% to 52% via post-checkout prompt',
  what_to_do: 'Enable post-checkout rebook prompt for all stylists working Friday slots. Target a 14-point lift over 4 weeks by tying it into existing tip-prompt screen.',
  why_now: [
    'Friday utilization dropped to 71% (vs 84% Sat) over last 3 weeks',
    'Top 3 stylists already average 58% rebook — pattern is repeatable',
    'Capacity is intact; demand-side conversion is the only gap',
    'Test-rolling the prompt costs nothing operationally',
  ],
  confidence: 'high' as const,
  estimated_monthly_impact: 8400,
  status: 'pending' as const,
  decided_at: null,
} as any;

/**
 * SpatialAuditPage — internal harness for the container-aware doctrine.
 * Renders pilots inside resizable frames at canonical audit widths.
 *
 * Route: /dashboard/_internal/spatial-audit
 * Doctrine: mem://style/container-aware-responsiveness.md
 */
export default function SpatialAuditPage() {
  const [selected, setSelected] = useState<number | 'free'>(960);

  return (
    <div className="px-8 py-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className={cn(tokens.heading.page, 'flex items-center gap-3')}>
            <Beaker className="w-7 h-7 text-primary" />
            Spatial Audit
          </h1>
          <p className={cn(tokens.body.muted, 'mt-2 max-w-2xl')}>
            Pilots rendered inside fixed-width containers to verify each authored state
            (default → compressed → compact → stacked) looks intentional.
          </p>
        </div>
        <Badge variant="outline">Internal · dev-only</Badge>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {AUDIT_WIDTHS.map((w) => (
          <Button
            key={w}
            size="sm"
            variant={selected === w ? 'default' : 'outline'}
            onClick={() => setSelected(w)}
          >
            {w}px
          </Button>
        ))}
        <Button
          size="sm"
          variant={selected === 'free' ? 'default' : 'outline'}
          onClick={() => setSelected('free')}
        >
          Full width
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className={tokens.heading.section}>MetricCard</h2>
        <FrameRow widths={selected === 'free' ? null : [selected]}>
          <MetricCard metric={SAMPLE_METRIC} />
        </FrameRow>
      </section>

      <section className="space-y-4">
        <h2 className={tokens.heading.section}>WeeklyLeverBrief</h2>
        <FrameRow widths={selected === 'free' ? null : [selected]}>
          <WeeklyLeverBrief recommendation={SAMPLE_LEVER} />
        </FrameRow>
      </section>

      <section className="space-y-4">
        <h2 className={tokens.heading.section}>All widths simultaneously</h2>
        <p className={tokens.body.muted}>
          Renders MetricCard at every audit width side-by-side for state comparison.
        </p>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {AUDIT_WIDTHS.map((w) => (
            <div key={w} className="shrink-0 space-y-2">
              <div className="text-xs font-mono text-muted-foreground">{w}px</div>
              <div style={{ width: w }} className="border border-dashed border-border/40 p-4 rounded-lg">
                <MetricCard metric={SAMPLE_METRIC} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FrameRow({ widths, children }: { widths: number[] | null; children: React.ReactNode }) {
  if (widths == null) {
    return <div className="border border-dashed border-border/40 p-4 rounded-lg">{children}</div>;
  }
  return (
    <div className="flex flex-wrap gap-4">
      {widths.map((w) => (
        <div key={w} className="space-y-2">
          <div className="text-xs font-mono text-muted-foreground">{w}px container</div>
          <div style={{ width: w }} className="border border-dashed border-border/40 p-4 rounded-lg">
            {children}
          </div>
        </div>
      ))}
    </div>
  );
}
