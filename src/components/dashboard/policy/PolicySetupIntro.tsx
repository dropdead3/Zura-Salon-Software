/**
 * PolicySetupIntro
 *
 * Pre-wizard intro surface for the Policies page. Renders ONLY when
 * `policy_org_profile.setup_completed_at IS NULL`. Hard-gates every
 * downstream policy surface (library, health strip, category grid,
 * conflict banner) — mirrors the `gate_commission_model` pattern from
 * the Structural Enforcement Gates doctrine.
 *
 * See `mem://features/policy-os-applicability-doctrine` for the
 * wizard-as-gate rule.
 *
 * Voice: calm, declarative, advisory. No hype. No emojis. No gradients.
 */
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  Scissors,
  FileCheck,
  BookOpen,
  Globe,
  CreditCard,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface Props {
  onStart: () => void;
  /** Live count from `usePolicyLibrary` so the line stays accurate as content evolves. */
  libraryCount: number;
}

const SETUP_DECISIONS = [
  {
    icon: Briefcase,
    heading: 'Business shape',
    body: 'Type, location, team size. Determines which legal frameworks apply — chair rental disclosures in TX differ from CA.',
  },
  {
    icon: Scissors,
    heading: 'Services offered',
    body: "Services determine which policies are required vs. noise. A barbershop won't see extension aftercare. A solo stylist won't see manager escalation.",
  },
  {
    icon: FileCheck,
    heading: 'Existing documents',
    body: "Existing handbooks, waivers, intake forms — we won't ask you to redo what's already in place.",
  },
] as const;

const DOWNSTREAM_SURFACES = [
  {
    icon: BookOpen,
    label: 'Handbook',
    body: 'Renders policies as employee-facing prose, versioned and signed.',
  },
  {
    icon: Globe,
    label: 'Client policy center',
    body: 'Public-facing acknowledgments before booking.',
  },
  {
    icon: CreditCard,
    label: 'Checkout & booking',
    body: 'Manager-decision rules — no-shows, cancellations, deposits — fire automatically.',
  },
  {
    icon: AlertCircle,
    label: 'Manager prompts',
    body: 'Drift alerts when staff actions diverge from policy.',
  },
] as const;

export function PolicySetupIntro({ onStart, libraryCount }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-12">
      {/* Section 1 — Hero */}
      <header className="space-y-4">
        <span className={tokens.heading.subsection}>Policy infrastructure</span>
        <h1 className={tokens.heading.page}>
          Define how your business operates. Once.
        </h1>
        <p className={cn(tokens.body.muted, 'max-w-2xl leading-relaxed')}>
          Policies are the source of truth. Configure them here and they render automatically into
          your handbook, the client policy center, booking flows, checkout decisions, and manager
          prompts. No duplication. No drift.
        </p>
      </header>

      {/* Section 2 — What setup decides */}
      <section className="pt-12 border-t border-border/40 space-y-6">
        <h2 className={tokens.heading.section}>What setup decides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SETUP_DECISIONS.map(({ icon: Icon, heading, body }) => (
            <div key={heading} className="space-y-3">
              <div className={tokens.card.iconBox}>
                <Icon className={tokens.card.icon} />
              </div>
              <h3 className={cn(tokens.heading.card, 'min-h-[2lh]')}>{heading}</h3>
              <p className={cn(tokens.body.muted, 'leading-relaxed')}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — How the system uses your policies */}
      <section className="pt-12 border-t border-border/40 space-y-6">
        <h2 className={tokens.heading.section}>How the system uses your policies</h2>
        <ul className="space-y-4">
          {DOWNSTREAM_SURFACES.map(({ icon: Icon, label, body }) => (
            <li key={label} className="flex items-start gap-4">
              <div className={tokens.card.iconBox}>
                <Icon className={tokens.card.icon} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className={tokens.heading.card}>{label}</h3>
                <p className={cn(tokens.body.muted, 'leading-relaxed')}>{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Section 4 — CTA */}
      <section className="pt-12 border-t border-border/40 space-y-4">
        <Button onClick={onStart} size={tokens.button.hero} className="font-sans">
          Start setup — 4 steps, ~5 minutes
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <p className={cn(tokens.body.muted, 'text-xs')}>
          {libraryCount} {libraryCount === 1 ? 'policy' : 'policies'} in the library. The wizard
          narrows them to what your business actually needs.
        </p>
      </section>
    </div>
  );
}
