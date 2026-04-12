import {
  BookOpen,
  MessageSquare,
  Zap,
  Eye,
  Shield,
  CheckCircle2,
  CreditCard,
  Layers,
} from 'lucide-react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { STRIPE_CAPITAL_REQUIREMENTS, ZURA_OPERATIONAL_GUARDRAILS } from '@/config/capital-engine/capital-formulas-config';

/* ── Messaging Tier ── */
function MessagingTier({ label, variant, quote }: { label: string; variant: 'primary' | 'secondary' | 'info'; quote: string }) {
  return (
    <div className="py-4 border-b border-[hsl(var(--platform-border)/0.3)] last:border-0">
      <PlatformBadge variant={variant} size="sm" className="mb-2">{label}</PlatformBadge>
      <p className="text-[hsl(var(--platform-foreground))] text-base leading-relaxed italic">
        "{quote}"
      </p>
    </div>
  );
}

/* ── Step Row ── */
function StepRow({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-400 text-sm font-medium">
        {number}
      </div>
      <div>
        <p className="font-medium text-[hsl(var(--platform-foreground))]">{title}</p>
        <p className="text-sm text-[hsl(var(--platform-foreground-muted))] mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function CapitalKnowledgeBase() {
  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Zura Capital — Feature Guide"
        description="Reference for platform administrators"
        backTo="/platform/capital"
        backLabel="Back to Control Tower"
      />

      {/* ── How to Talk About It ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <MessageSquare className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <PlatformCardTitle className="text-lg">How to Talk About It</PlatformCardTitle>
              <PlatformCardDescription>Three layers of explanation for different contexts</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          <MessagingTier
            label="Layer 1 — Marketing"
            variant="primary"
            quote="Zura doesn't just tell you how to grow — it helps you fund it."
          />
          <MessagingTier
            label="Layer 2 — Product Explanation"
            variant="secondary"
            quote="When Zura identifies a strong growth opportunity, it may surface funding options so you can act on it."
          />
          <MessagingTier
            label="Layer 3 — Full Transparency"
            variant="info"
            quote="Funding is provided by third-party partners such as Stripe and is subject to their underwriting criteria."
          />
        </PlatformCardContent>
      </PlatformCard>

      {/* ── What Zura Capital Is ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <BookOpen className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <PlatformCardTitle className="text-lg">What Zura Capital Is</PlatformCardTitle>
              <PlatformCardDescription>Intelligence layer, not a financial product</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-3">
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))] leading-relaxed">
            Zura identifies high-return growth opportunities from operational data. When appropriate, it surfaces funding options powered by third-party providers like Stripe.
          </p>
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))] leading-relaxed">
            Zura is not a lender. It does not offer loans, credit lines, or financing. Zura is the intelligence layer — it detects, scores, and surfaces. The funding provider handles underwriting, terms, and execution.
          </p>
        </PlatformCardContent>
      </PlatformCard>

      {/* ── Two-Layer Eligibility Model ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Layers className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <PlatformCardTitle className="text-lg">Two-Layer Eligibility Model</PlatformCardTitle>
              <PlatformCardDescription>How Stripe underwriting and Zura guardrails work together</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-6">
          {/* Layer 1 — Stripe */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-violet-400" />
              <h4 className="font-sans text-sm text-[hsl(var(--platform-foreground))]">
                Layer 1 — Stripe Capital Underwriting (Stripe-owned)
              </h4>
            </div>
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))] leading-relaxed">
              Stripe reviews connected accounts daily and automatically determines who is eligible for financing offers. Zura cannot influence this decision — it can only surface offers that Stripe has already approved.
            </p>
            <div className="rounded-lg border border-[hsl(var(--platform-border)/0.15)] bg-[hsl(var(--platform-bg-card)/0.05)] p-3">
              <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mb-2 uppercase tracking-wide">What Stripe evaluates:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                {STRIPE_CAPITAL_REQUIREMENTS.map((req) => (
                  <div key={req.label} className="flex items-start gap-2 text-xs py-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-violet-400/60" />
                    <span className="text-[hsl(var(--platform-foreground)/0.85)]">{req.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Layer 2 — Zura */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              <h4 className="font-sans text-sm text-[hsl(var(--platform-foreground))]">
                Layer 2 — Zura Operational Guardrails (Zura-owned)
              </h4>
            </div>
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))] leading-relaxed">
              Before surfacing a Stripe-approved offer to an organization, Zura applies operational readiness checks. These are not underwriting criteria — they are guardrails to ensure the organization is in a healthy state to deploy capital responsibly.
            </p>
            <div className="rounded-lg border border-[hsl(var(--platform-border)/0.15)] bg-[hsl(var(--platform-bg-card)/0.05)] p-3">
              <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mb-2 uppercase tracking-wide">What Zura checks:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                {ZURA_OPERATIONAL_GUARDRAILS.map((guard) => (
                  <div key={guard.code} className="flex items-start gap-2 text-xs py-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400/60" />
                    <span className="text-[hsl(var(--platform-foreground)/0.85)]">{guard.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-[hsl(var(--platform-foreground-muted))] border-t border-[hsl(var(--platform-border)/0.2)] pt-3">
            Additional scoring factors (ROE ratio, confidence, momentum, risk level) are used for <em>ranking</em> opportunities — determining which to show first — but they do not gate eligibility.
          </p>
        </PlatformCardContent>
      </PlatformCard>

      {/* ── How It Works ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Zap className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <PlatformCardTitle className="text-lg">How It Works</PlatformCardTitle>
              <PlatformCardDescription>Five steps from Stripe review to activation</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          <StepRow number={1} title="Stripe Review" description="Stripe automatically reviews connected accounts daily based on processing history, volume, and growth trajectory." />
          <StepRow number={2} title="Offer Detection" description="When Stripe approves a financing offer, Zura's detection pipeline picks it up and creates a capital opportunity record." />
          <StepRow number={3} title="Operational Readiness" description="Zura checks operational guardrails — no critical alerts, no repayment distress, under project limits — to confirm the org is ready." />
          <StepRow number={4} title="Surfacing" description="Qualifying opportunities appear in the organization's Growth Hub under Zura Capital." />
          <StepRow number={5} title="Activation" description="The organization admin reviews the opportunity and decides whether to activate funding through Stripe." />
        </PlatformCardContent>
      </PlatformCard>

      {/* ── What Organizations See ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Eye className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <PlatformCardTitle className="text-lg">What Organizations See</PlatformCardTitle>
              <PlatformCardDescription>The experience when Capital is enabled</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
              A "Zura Capital" link appears in the Growth Hub when the feature is enabled and at least one Stripe-approved opportunity passes operational readiness.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
              Admins see ranked opportunities with detail views and activation options. Ranking is based on ROE, confidence, and momentum scores.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
              If Stripe has not extended any offers, or if guardrails block surfacing, the section stays empty. No false signals are surfaced.
            </p>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* ── Who Controls Access ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <PlatformCardTitle className="text-lg">Who Controls Access</PlatformCardTitle>
              <PlatformCardDescription>Permission model for Capital</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-3">
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))] leading-relaxed">
            Platform admins enable or disable Capital for each organization via the Control Tower. Organizations cannot enable this themselves.
          </p>
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))] leading-relaxed">
            Within an organization, only Super Admins and Account Owners can view and act on Capital opportunities.
          </p>
        </PlatformCardContent>
      </PlatformCard>

      {/* ── FAQ ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="text-lg">Frequently Asked Questions</PlatformCardTitle>
        </PlatformCardHeader>
        <PlatformCardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1" className="border-[hsl(var(--platform-border)/0.3)]">
              <AccordionTrigger className="font-sans tracking-normal text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                Is Zura providing the funding?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                No. Funding is provided by Stripe Capital and is subject to their underwriting criteria and terms. Zura surfaces the opportunity — Stripe handles everything else.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2" className="border-[hsl(var(--platform-border)/0.3)]">
              <AccordionTrigger className="font-sans tracking-normal text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                How does Stripe decide who gets offers?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                Stripe reviews connected accounts daily based on processing history, volume, growth trajectory, and dispute rate. This is fully automated — Zura cannot influence the underwriting decision.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3" className="border-[hsl(var(--platform-border)/0.3)]">
              <AccordionTrigger className="font-sans tracking-normal text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                What happens when I enable Capital for an organization?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                Zura begins checking Stripe for available financing offers for that organization's connected accounts. When Stripe has approved an offer and Zura's operational guardrails are met, the opportunity surfaces in the org's Growth Hub.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4" className="border-[hsl(var(--platform-border)/0.3)]">
              <AccordionTrigger className="font-sans tracking-normal text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                Why doesn't an organization see any Capital opportunities?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                Most commonly, Stripe has not yet extended a financing offer for that account. This requires 3+ months of processing history, sufficient volume, and a clean dispute record. If Stripe has extended an offer, check Zura's operational guardrails (no critical alerts, no repayment distress, etc.).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5" className="border-[hsl(var(--platform-border)/0.3)]">
              <AccordionTrigger className="font-sans tracking-normal text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                Can organizations enable this themselves?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                No. Capital is a platform-controlled feature. Only platform admins can enable or disable it via the Control Tower.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q6" className="border-[hsl(var(--platform-border)/0.3)]">
              <AccordionTrigger className="font-sans tracking-normal text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                What are Zura's operational guardrails?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                Before surfacing a Stripe-approved offer, Zura checks: no critical operational alerts, no active repayment distress, under the concurrent project limit, and no recent decline or underperformance cooldowns. These protect organizations from deploying capital when operations aren't ready.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </PlatformCardContent>
      </PlatformCard>
    </PlatformPageContainer>
  );
}