/**
 * CohortsTab — Billing cohort intelligence for the Reputation engine.
 * Trialing / Active / Past Due / Canceled buckets + retention coupon usage.
 * Read-only: drives platform-side awareness of subscription health.
 */
import {
  PlatformCard, PlatformCardHeader, PlatformCardTitle, PlatformCardContent, PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { usePlatformReputationCohorts } from '@/hooks/reputation/usePlatformReputationEntitlements';
import { Loader2, Activity, Clock, AlertTriangle, X, Tag, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatTile {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: 'neutral' | 'success' | 'info' | 'warning' | 'danger';
}

const toneClass: Record<StatTile['tone'], string> = {
  neutral: 'text-[hsl(var(--platform-foreground-muted))]',
  success: 'text-emerald-400',
  info: 'text-blue-400',
  warning: 'text-amber-400',
  danger: 'text-rose-400',
};

export function CohortsTab() {
  const { data, isLoading } = usePlatformReputationCohorts();

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  const tiles: StatTile[] = [
    { label: 'Total Orgs', value: data.total, icon: Users, tone: 'neutral' },
    { label: 'Reputation Enabled', value: data.enabled, icon: Activity, tone: 'success' },
    { label: 'Trialing', value: data.trialing, icon: Clock, tone: 'info' },
    { label: 'Active', value: data.active, icon: Activity, tone: 'success' },
    { label: 'Past Due', value: data.past_due, icon: AlertTriangle, tone: 'warning' },
    { label: 'Canceled', value: data.canceled, icon: X, tone: 'danger' },
    { label: 'Retention Coupons Used', value: data.retention_coupons_used, icon: Tag, tone: 'info' },
  ];

  return (
    <PlatformCard>
      <PlatformCardHeader>
        <PlatformCardTitle>Subscription Cohorts</PlatformCardTitle>
        <PlatformCardDescription>
          Stripe subscription lifecycle distribution across all organizations. Past Due orgs are inside their 30-day grace window.
        </PlatformCardDescription>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.label}
                className="p-4 rounded-lg border border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg-card)/0.4)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-[10px] tracking-[0.08em] uppercase text-[hsl(var(--platform-foreground-subtle))]">
                    {t.label}
                  </span>
                  <Icon className={`w-4 h-4 ${toneClass[t.tone]}`} />
                </div>
                <p className="font-display text-2xl text-[hsl(var(--platform-foreground))]">
                  {t.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
