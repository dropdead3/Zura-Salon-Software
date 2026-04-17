/**
 * SuspensionVelocityCard — Network Intelligence: rolling 12-week suspension count.
 *
 * Doctrine:
 *   - Alert-fatigue gate: render only when ≥1 week in window has ≥3 suspensions.
 *   - Silence is valid output. No data, no signal → returns null.
 *   - Reuses useColorBarSuspensionEvents('all'); no new query.
 */

import { useMemo } from 'react';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { useColorBarSuspensionEvents } from '@/hooks/color-bar/useColorBarSuspensionEvents';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TRIGGER_THRESHOLD = 3;
const WINDOW_WEEKS = 12;

/** Returns Monday 00:00 (local) for the ISO week containing `d`. */
function startOfIsoWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = out.getDay(); // 0=Sun..6=Sat
  const diff = (dow + 6) % 7; // days since Monday
  out.setDate(out.getDate() - diff);
  return out;
}

function formatWeekLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface WeekBucket {
  weekStart: Date;
  label: string;
  count: number;
  isTrigger: boolean;
}

export function SuspensionVelocityCard() {
  const { data: events, isLoading } = useColorBarSuspensionEvents('all');

  const buckets = useMemo<WeekBucket[]>(() => {
    const now = new Date();
    const currentWeekStart = startOfIsoWeek(now);
    const out: WeekBucket[] = [];
    for (let i = WINDOW_WEEKS - 1; i >= 0; i--) {
      const weekStart = new Date(currentWeekStart.getTime() - i * WEEK_MS);
      out.push({ weekStart, label: formatWeekLabel(weekStart), count: 0, isTrigger: false });
    }
    if (!events) return out;

    const windowStart = out[0].weekStart.getTime();
    for (const ev of events) {
      if (ev.event_type !== 'suspended') continue;
      const t = new Date(ev.created_at).getTime();
      if (t < windowStart) continue;
      const idx = Math.floor((t - windowStart) / WEEK_MS);
      if (idx < 0 || idx >= out.length) continue;
      out[idx].count += 1;
    }
    for (const b of out) b.isTrigger = b.count >= TRIGGER_THRESHOLD;
    return out;
  }, [events]);

  const totalSuspensions = useMemo(() => buckets.reduce((s, b) => s + b.count, 0), [buckets]);
  const hasTriggerWeek = useMemo(() => buckets.some((b) => b.isTrigger), [buckets]);

  // Alert-fatigue gate: silence unless pattern is real.
  if (isLoading || !events || totalSuspensions === 0 || !hasTriggerWeek) return null;

  return (
    <TooltipProvider>
      <PlatformCard variant="glass" size="container">
        <PlatformCardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
                <Activity className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <PlatformCardTitle>Suspension Velocity</PlatformCardTitle>
                  <MetricInfoTooltip description="Rolling 12-week count of Color Bar suspensions across the network. Surfaces only when activity exceeds normal baseline (≥3 suspensions in any week)." />
                </div>
                <PlatformCardDescription>Early-warning signal for churn pressure</PlatformCardDescription>
              </div>
            </div>
            <PlatformBadge variant="warning" size="sm">
              {totalSuspensions} / {WINDOW_WEEKS}w
            </PlatformBadge>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'hsl(var(--platform-foreground-subtle))' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <RechartsTooltip
                  cursor={{ fill: 'hsl(var(--platform-bg-hover) / 0.4)' }}
                  contentStyle={{
                    background: 'hsl(var(--platform-bg-card))',
                    border: '1px solid hsl(var(--platform-border) / 0.5)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(label) => `Week of ${label}`}
                  formatter={(value: number) => [`${value} suspension${value === 1 ? '' : 's'}`, '']}
                  separator=""
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {buckets.map((b, i) => (
                    <Cell
                      key={i}
                      fill={
                        b.isTrigger
                          ? 'hsl(38 92% 50% / 0.85)' // amber-500
                          : 'hsl(var(--platform-foreground-subtle) / 0.35)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PlatformCardContent>
      </PlatformCard>
    </TooltipProvider>
  );
}
