/**
 * SalesBriefTab — One-pager for AEs to screen-share with prospects.
 * Pure render. No mutations. Pulls live proof points from the cohort hook.
 */
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardDescription,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { usePlatformReputationCohorts } from '@/hooks/reputation/usePlatformReputationEntitlements';
import { REPUTATION_PRICING_SHEET } from '@/config/reputationPricing';
import {
  Sparkles,
  ShieldCheck,
  Star,
  Target,
  Users,
  MessageSquareWarning,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[hsl(var(--platform-primary))]" />
        </div>
        <h3 className="font-display text-sm tracking-[0.08em] uppercase text-[hsl(var(--platform-foreground))]">
          {title}
        </h3>
      </div>
      <div className="font-sans text-sm text-[hsl(var(--platform-foreground)/0.85)] space-y-2 pl-10">
        {children}
      </div>
    </div>
  );
}

export function SalesBriefTab() {
  const { data: cohorts } = usePlatformReputationCohorts();
  const sku = REPUTATION_PRICING_SHEET.baseSku;

  return (
    <div className="space-y-6">
      <PlatformCard>
        <PlatformCardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <PlatformCardTitle>Zura Reputation — Sales Brief</PlatformCardTitle>
              <PlatformCardDescription>
                Talk track and proof points for AE / CSM conversations. Screen-share friendly.
              </PlatformCardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <PlatformBadge variant="success" size="sm">
                ${sku.monthlyPrice}/mo · 1st location
              </PlatformBadge>
              <PlatformBadge variant="default" size="sm">
                {sku.trialDays}-day free trial
              </PlatformBadge>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-8">
          <Section icon={Sparkles} title="What it is">
            <p>
              {sku.description} Curated 5-star reviews surface as testimonials on the operator's Zura
              website, lifting SEO and consultation conversion.
            </p>
          </Section>

          <Section icon={Target} title="Who it's for">
            <ul className="list-disc pl-5 space-y-1">
              <li>Operators with ≥ 50 monthly visits and a public review surface (Google / Yelp).</li>
              <li>Owners who already invest in their website and want compounding SEO returns.</li>
              <li>Multi-location groups that need throttled, brand-safe outreach at scale.</li>
            </ul>
          </Section>

          <Section icon={ShieldCheck} title="Why it converts">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="text-[hsl(var(--platform-foreground))]">Compliance built-in.</span>{' '}
                Permanent opt-out registry + Twilio STOP webhook eliminates spam-complaint risk.
              </li>
              <li>
                <span className="text-[hsl(var(--platform-foreground))]">SEO-grade testimonials.</span>{' '}
                Curated reviews auto-publish to the website with structured data — measurable CRO lift.
              </li>
              <li>
                <span className="text-[hsl(var(--platform-foreground))]">Churn protection.</span>{' '}
                30-day grace + one-click retention coupon recovers most involuntary churn.
              </li>
            </ul>
          </Section>

          <Section icon={Star} title="Proof points (live)">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ProofTile label="Active subscriptions" value={cohorts?.active ?? 0} icon={Users} />
              <ProofTile label="In trial" value={cohorts?.trialing ?? 0} icon={Sparkles} />
              <ProofTile
                label="Retention coupons used"
                value={cohorts?.retention_coupons_used ?? 0}
                icon={ShieldCheck}
              />
              <ProofTile
                label="Reputation enabled orgs"
                value={cohorts?.enabled ?? 0}
                icon={Target}
              />
            </div>
            <p className="text-xs text-[hsl(var(--platform-foreground-subtle))] pt-2">
              No PII / PHI surfaced. Counts only.
            </p>
          </Section>

          <Section icon={MessageSquareWarning} title="Objection handlers">
            <Objection
              q="What happens during a Twilio outage?"
              a="Platform kill switches pause dispatch globally without breaking the operator UI. Status visible on the org's Reputation hub."
            />
            <Objection
              q="What if a client opts out?"
              a="STOP keyword writes to a permanent opt-out registry. Future automation cannot override — even at the operator's request."
            />
            <Objection
              q="Will this make us look spammy?"
              a="Frequency cap is configurable per rule and enforced server-side. Manual sends respect the same cap."
            />
            <Objection
              q="What if we cancel?"
              a={`30-day grace window keeps service live, then auto-cancels. Curated testimonials hide on lapse and re-publish if they come back.`}
            />
          </Section>

          <Section icon={AlertTriangle} title="Do not promise">
            <ul className="list-disc pl-5 space-y-1">
              <li>Per-location pricing tiers (deferred — quote first location only).</li>
              <li>Custom discounts beyond the authorized retention coupon.</li>
              <li>Manual review removal from Google/Yelp (third-party policy).</li>
            </ul>
          </Section>
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}

function ProofTile({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="p-3 rounded-lg border border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg-card)/0.4)]">
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-[10px] tracking-[0.08em] uppercase text-[hsl(var(--platform-foreground-subtle))]">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-subtle))]" />
      </div>
      <p className="font-display text-xl text-[hsl(var(--platform-foreground))]">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Objection({ q, a }: { q: string; a: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[hsl(var(--platform-foreground))]">Q: {q}</p>
      <p className="text-[hsl(var(--platform-foreground-muted))]">A: {a}</p>
    </div>
  );
}
