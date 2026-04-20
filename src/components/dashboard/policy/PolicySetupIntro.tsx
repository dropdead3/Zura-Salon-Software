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
    heading: 'Your business shape',
    body: 'Type, location, team size. Determines which legal frameworks apply — chair rental disclosures in TX differ from CA.',
  },
  {
    icon: Scissors,
    heading: 'What you offer',
    body: "Services determine which policies are required vs. noise. A barbershop won't see extension aftercare. A solo stylist won't see manager escalation.",
  },
  {
    icon: FileCheck,
    heading: 'What you already have',
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
    <div className="max-w-3xl mx-auto py-8 space-y-12">
      {/* Section 1 — Hero */}
      <header className="space-y-5">
        <span className="block font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Policy infrastructure
        </span>
        <h1 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[1.05] text-foreground">
          Define how your business operates. Once.
        </h1>
        <p className="font-sans text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
          Policies are the source of truth. Configure them here and they render automatically into
          your handbook, the client policy center, booking flows, checkout decisions, and manager
          prompts. No duplication. No drift.
        </p>
      </header>

      {/* Section 2 — What setup decides */}
      <section className="pt-12 border-t border-border/40 space-y-6">
        <h2 className="font-display text-xs uppercase tracking-[0.18em] text-foreground">
          What setup decides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SETUP_DECISIONS.map(({ icon: Icon, heading, body }) => (
            <div key={heading} className="space-y-3">
              <Icon className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              <h3 className="font-sans text-sm font-medium text-foreground">{heading}</h3>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — How the system uses your policies */}
      <section className="pt-12 border-t border-border/40 space-y-6">
        <h2 className="font-display text-xs uppercase tracking-[0.18em] text-foreground">
          How the system uses your policies
        </h2>
        <ul className="space-y-5">
          {DOWNSTREAM_SURFACES.map(({ icon: Icon, label, body }) => (
            <li key={label} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-foreground" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm font-medium text-foreground">{label}</p>
                <p className="font-sans text-sm text-muted-foreground leading-relaxed mt-0.5">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Section 4 — CTA */}
      <section className="pt-12 border-t border-border/40 space-y-4">
        <Button
          onClick={onStart}
          size="lg"
          className={cn('font-sans w-full md:w-auto')}
        >
          Start setup
          <span className="text-primary-foreground/60 mx-2">·</span>
          4 steps
          <span className="text-primary-foreground/60 mx-2">·</span>
          ~5 minutes
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <p className="font-sans text-xs text-muted-foreground">
          {libraryCount} {libraryCount === 1 ? 'policy' : 'policies'} in the library. The wizard
          narrows them to what your business actually needs.
        </p>
      </section>
    </div>
  );
}
