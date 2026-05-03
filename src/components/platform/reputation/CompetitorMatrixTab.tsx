/**
 * CompetitorMatrixTab — P1 sales enablement. Static comparison vs.
 * Birdeye / Podium / Weave. Reps get asked this on every call.
 *
 * Pricing/positioning sourced from public marketing pages as of pricingVersion.
 * Bump REPUTATION_PRICING_SHEET.pricingVersion + the row below in lockstep.
 */
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardDescription,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import {
  PlatformTable,
  PlatformTableHeader,
  PlatformTableBody,
  PlatformTableRow,
  PlatformTableHead,
  PlatformTableCell,
} from '@/components/platform/ui/PlatformTable';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { REPUTATION_PRICING_SHEET } from '@/config/reputationPricing';
import { Check, Minus, X } from 'lucide-react';

type Cell = 'yes' | 'partial' | 'no' | string;

interface Row {
  capability: string;
  zura: Cell;
  birdeye: Cell;
  podium: Cell;
  weave: Cell;
}

const sku = REPUTATION_PRICING_SHEET.baseSku;

const ROWS: Row[] = [
  {
    capability: 'Entry price (1st location, monthly)',
    zura: `$${sku.monthlyPrice}`,
    birdeye: '$299+',
    podium: '$399+',
    weave: '$249+',
  },
  { capability: 'Free trial', zura: `${sku.trialDays} days`, birdeye: 'Demo only', podium: 'Demo only', weave: '14 days' },
  { capability: 'Auto-publish testimonials to operator website (SEO schema)', zura: 'yes', birdeye: 'partial', podium: 'no', weave: 'no' },
  { capability: 'Permanent opt-out registry (STOP keyword)', zura: 'yes', birdeye: 'yes', podium: 'yes', weave: 'yes' },
  { capability: 'Frequency cap enforced server-side (manual + auto)', zura: 'yes', birdeye: 'partial', podium: 'partial', weave: 'partial' },
  { capability: 'Native salon POS integration (no Zapier)', zura: 'yes', birdeye: 'no', podium: 'no', weave: 'no' },
  { capability: '30-day past-due grace + auto-recovery', zura: 'yes', birdeye: 'no', podium: 'no', weave: 'no' },
  { capability: 'Bundled with full operator OS (no separate vendor)', zura: 'yes', birdeye: 'no', podium: 'no', weave: 'no' },
  { capability: 'Annual contract required', zura: 'no', birdeye: 'yes', podium: 'yes', weave: 'yes' },
];

function CellIcon({ value }: { value: Cell }) {
  if (value === 'yes')
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400">
        <Check className="w-4 h-4" /> Yes
      </span>
    );
  if (value === 'no')
    return (
      <span className="inline-flex items-center gap-1 text-rose-400">
        <X className="w-4 h-4" /> No
      </span>
    );
  if (value === 'partial')
    return (
      <span className="inline-flex items-center gap-1 text-amber-400">
        <Minus className="w-4 h-4" /> Partial
      </span>
    );
  return <span className="text-[hsl(var(--platform-foreground))]">{value}</span>;
}

export function CompetitorMatrixTab() {
  return (
    <div className="space-y-6">
      <PlatformCard>
        <PlatformCardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <PlatformCardTitle>Competitor Matrix</PlatformCardTitle>
              <PlatformCardDescription>
                Quick reference for AE / CSM calls. Public-marketing snapshot — verify edge cases live.
              </PlatformCardDescription>
            </div>
            <PlatformBadge variant="default" size="sm">
              v{REPUTATION_PRICING_SHEET.pricingVersion}
            </PlatformBadge>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          <PlatformTable>
            <PlatformTableHeader>
              <PlatformTableRow>
                <PlatformTableHead>Capability</PlatformTableHead>
                <PlatformTableHead>Zura Reputation</PlatformTableHead>
                <PlatformTableHead>Birdeye</PlatformTableHead>
                <PlatformTableHead>Podium</PlatformTableHead>
                <PlatformTableHead>Weave</PlatformTableHead>
              </PlatformTableRow>
            </PlatformTableHeader>
            <PlatformTableBody>
              {ROWS.map((r) => (
                <PlatformTableRow key={r.capability}>
                  <PlatformTableCell className="font-sans text-sm">{r.capability}</PlatformTableCell>
                  <PlatformTableCell>
                    <CellIcon value={r.zura} />
                  </PlatformTableCell>
                  <PlatformTableCell>
                    <CellIcon value={r.birdeye} />
                  </PlatformTableCell>
                  <PlatformTableCell>
                    <CellIcon value={r.podium} />
                  </PlatformTableCell>
                  <PlatformTableCell>
                    <CellIcon value={r.weave} />
                  </PlatformTableCell>
                </PlatformTableRow>
              ))}
            </PlatformTableBody>
          </PlatformTable>
          <p className="text-xs text-[hsl(var(--platform-foreground-subtle))] pt-4">
            Pricing/positioning verified against public marketing as of {REPUTATION_PRICING_SHEET.pricingVersion}. Bump
            <code className="mx-1 px-1 rounded bg-[hsl(var(--platform-bg-hover))]">pricingVersion</code>
            and refresh this matrix together.
          </p>
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}
