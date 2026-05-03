/**
 * RoiCalculatorTab — Sales-pitch widget. Translates the operator's monthly
 * visit volume into recovered reviews + estimated SEO/CRO upside, all sourced
 * from REPUTATION_PRICING_SHEET so pricing stays single-source.
 */
import { useState, useMemo } from 'react';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardDescription,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { REPUTATION_PRICING_SHEET } from '@/config/reputationPricing';
import { Calculator, Star, TrendingUp, DollarSign } from 'lucide-react';

// Conservative industry assumptions. Tunable; not a guarantee.
const ASSUMPTIONS = {
  reviewRequestRate: 0.7,        // % of visits eligible for a request
  responseRate: 0.18,            // % of requests that yield a review
  fiveStarShare: 0.78,           // % of reviews that are 5★ in salon vertical
  consultBookConversionLift: 0.04, // +4 points on consult conversion
  avgConsultRevenue: 220,        // USD per converted consult
  consultsPerMonthPerLocation: 60,
};

export function RoiCalculatorTab() {
  const [visits, setVisits] = useState(800);
  const [locations, setLocations] = useState(1);

  const calc = useMemo(() => {
    const requests = Math.round(visits * ASSUMPTIONS.reviewRequestRate);
    const reviews = Math.round(requests * ASSUMPTIONS.responseRate);
    const fiveStars = Math.round(reviews * ASSUMPTIONS.fiveStarShare);
    const consultsLifted = Math.round(
      ASSUMPTIONS.consultsPerMonthPerLocation *
        locations *
        ASSUMPTIONS.consultBookConversionLift,
    );
    const monthlyUpside = consultsLifted * ASSUMPTIONS.avgConsultRevenue;
    const cost =
      REPUTATION_PRICING_SHEET.baseSku.monthlyPrice +
      Math.max(0, locations - 1) * REPUTATION_PRICING_SHEET.perLocationAddOn.monthlyPrice;
    const roi = cost > 0 ? monthlyUpside / cost : 0;
    return { requests, reviews, fiveStars, consultsLifted, monthlyUpside, cost, roi };
  }, [visits, locations]);

  return (
    <div className="space-y-6">
      <PlatformCard>
        <PlatformCardHeader>
          <PlatformCardTitle>ROI Calculator</PlatformCardTitle>
          <PlatformCardDescription>
            Conservative model — share screen with a prospect to anchor the conversation.
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Monthly completed visits">
              <PlatformInput
                type="number"
                min={0}
                value={visits}
                onChange={(e) => setVisits(Math.max(0, Number(e.target.value) || 0))}
              />
            </Field>
            <Field label="Locations">
              <PlatformInput
                type="number"
                min={1}
                value={locations}
                onChange={(e) => setLocations(Math.max(1, Number(e.target.value) || 1))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile icon={Calculator} label="Review requests" value={calc.requests.toLocaleString()} />
            <Tile icon={Star} label="Reviews / mo" value={calc.reviews.toLocaleString()} />
            <Tile icon={Star} label="5★ / mo" value={calc.fiveStars.toLocaleString()} />
            <Tile
              icon={TrendingUp}
              label="Lifted consults / mo"
              value={calc.consultsLifted.toLocaleString()}
            />
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex items-start gap-4">
            <DollarSign className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="font-display text-sm tracking-[0.08em] uppercase text-[hsl(var(--platform-foreground))]">
                Estimated upside
              </p>
              <p className="font-sans text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                <strong>${calc.monthlyUpside.toLocaleString()}</strong>/mo additional consultation revenue vs.{' '}
                <strong>${calc.cost}</strong>/mo subscription cost.
              </p>
              <PlatformBadge variant={calc.roi >= 5 ? 'success' : 'default'}>
                {calc.roi.toFixed(1)}× monthly ROI
              </PlatformBadge>
            </div>
          </div>

          <div className="text-xs text-[hsl(var(--platform-foreground-subtle))] space-y-1">
            <p>Assumptions:</p>
            <ul className="list-disc pl-5">
              <li>{Math.round(ASSUMPTIONS.reviewRequestRate * 100)}% of visits eligible for a request (opt-out + dedup applied).</li>
              <li>{Math.round(ASSUMPTIONS.responseRate * 100)}% response rate (industry baseline).</li>
              <li>+{Math.round(ASSUMPTIONS.consultBookConversionLift * 100)}pp consultation conversion from SEO-grade testimonials.</li>
              <li>${ASSUMPTIONS.avgConsultRevenue} avg revenue per converted consultation.</li>
            </ul>
            <p className="pt-1">Pricing sourced from REPUTATION_PRICING_SHEET — no hardcoded numbers.</p>
          </div>
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 block">
      <span className="font-display text-[10px] tracking-[0.08em] uppercase text-[hsl(var(--platform-foreground-subtle))]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Tile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg-card)/0.4)]">
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-[10px] tracking-[0.08em] uppercase text-[hsl(var(--platform-foreground-subtle))]">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-subtle))]" />
      </div>
      <p className="font-display text-xl text-[hsl(var(--platform-foreground))]">{value}</p>
    </div>
  );
}
