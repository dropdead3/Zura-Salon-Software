import {
  BookOpen,
  Zap,
  Shield,
  Eye,
  Target,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  BarChart3,
  TrendingUp,
  DollarSign,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/* ── Lifecycle Step ── */
function LifecycleStep({ step, title, description, isLast = false }: { step: number; title: string; description: string; isLast?: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 text-sm font-medium">
          {step}
        </div>
        {!isLast && <div className="w-px flex-1 bg-[hsl(var(--platform-border))]" />}
      </div>
      <div className="pb-6">
        <p className="font-medium text-[hsl(var(--platform-foreground))]">{title}</p>
        <p className="text-sm text-[hsl(var(--platform-foreground-muted))] mt-1">{description}</p>
      </div>
    </div>
  );
}

/* ── Criteria Row ── */
function CriteriaRow({ label, threshold, explanation }: { label: string; threshold: string; explanation: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-[hsl(var(--platform-border)/0.5)] last:border-0">
      <div className="sm:w-48 shrink-0">
        <span className="text-sm font-medium text-[hsl(var(--platform-foreground))]">{label}</span>
      </div>
      <div className="sm:w-32 shrink-0">
        <span className="text-sm text-amber-400 font-mono">{threshold}</span>
      </div>
      <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">{explanation}</p>
    </div>
  );
}

/* ── Opportunity Type ── */
function OpportunityType({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--platform-bg-hover)/0.5)]">
      <div className="p-1.5 rounded-md bg-amber-500/10 shrink-0">
        <Icon className="h-4 w-4 text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-[hsl(var(--platform-foreground))]">{title}</p>
        <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mt-0.5">{description}</p>
      </div>
    </div>
  );
}

/* ── Status Flow Node ── */
function StatusNode({ label, variant = 'default' }: { label: string; variant?: 'default' | 'success' | 'warning' | 'error' }) {
  const colors = {
    default: 'bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted))]',
    success: 'bg-emerald-500/10 text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-400',
    error: 'bg-red-500/10 text-red-400',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium ${colors[variant]}`}>
      {label}
    </span>
  );
}

export default function CapitalKnowledgeBase() {
  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Zura Capital — Feature Guide"
        description="Comprehensive reference for platform administrators"
        backTo="/platform/capital"
        backLabel="Back to Control Tower"
      />

      {/* ── Overview ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <BookOpen className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <PlatformCardTitle className="text-lg">What is Zura Capital</PlatformCardTitle>
              <PlatformCardDescription>Growth execution layer, not a financial product</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))] leading-relaxed">
            Zura Capital is a conditional growth execution layer that turns validated business opportunities into funded actions. It is not a loan product, credit line, or financial service. Capital activates only when the platform's deterministic scoring engine identifies high-confidence, high-return opportunities within an organization's operations. When an opportunity qualifies, Zura surfaces funding options powered by third-party providers such as Stripe. Zura handles the intelligence — opportunity detection, scoring, and tracking — while funding execution flows through trusted financial infrastructure partners.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-[hsl(var(--platform-bg-hover)/0.5)] text-center">
              <Target className="h-5 w-5 text-amber-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-[hsl(var(--platform-foreground))]">Decision</p>
              <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mt-1">Platform identifies and scores opportunities</p>
            </div>
            <div className="p-4 rounded-lg bg-[hsl(var(--platform-bg-hover)/0.5)] text-center">
              <Zap className="h-5 w-5 text-amber-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-[hsl(var(--platform-foreground))]">Action</p>
              <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mt-1">Organization reviews, approves, and activates funding</p>
            </div>
            <div className="p-4 rounded-lg bg-[hsl(var(--platform-bg-hover)/0.5)] text-center">
              <BarChart3 className="h-5 w-5 text-amber-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-[hsl(var(--platform-foreground))]">Outcome</p>
              <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mt-1">Automated tracking of realized lift vs. prediction</p>
            </div>
          </div>
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
            Core philosophy: Capital is positioned as "Activate Growth" or "Fund This" — never as a loan or financing. Every funded project follows the Decision → Action → Outcome loop with variance alerts when actual performance diverges from forecasts. Zura is the brain; third-party providers like Stripe are the funding rails.
          </p>
        </PlatformCardContent>
      </PlatformCard>

      {/* ── How It Works ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Layers className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <PlatformCardTitle className="text-lg">How It Works</PlatformCardTitle>
              <PlatformCardDescription>End-to-end lifecycle from detection to completion</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          <LifecycleStep step={1} title="Opportunity Detection" description="The platform continuously analyzes organizational data — revenue trends, utilization rates, market conditions, service mix — to identify growth opportunities." />
          <LifecycleStep step={2} title="Eligibility Scoring" description="Each opportunity is scored using deterministic formulas: Return on Expansion (ROE), Confidence Score, Risk Level, and Operational Stability. AI is never used for eligibility decisions." />
          <LifecycleStep step={3} title="Surfacing" description="Opportunities that pass all eligibility thresholds are surfaced in the organization's Growth Hub under the Zura Capital section. Low-confidence or high-risk opportunities are suppressed." />
          <LifecycleStep step={4} title="Admin Review" description="Organization Super Admins and Account Owners see ranked opportunities with ROE scores, risk levels, capital requirements, and recommended actions." />
          <LifecycleStep step={5} title="Funding Initiation" description="The admin initiates funding via 'Activate Growth.' This triggers downstream workflows such as task creation, campaign launches, or inventory orders." />
          <LifecycleStep step={6} title="Project Tracking" description="Active projects are tracked against forecasted revenue lift. The system monitors variance and triggers alerts when performance diverges significantly." />
          <LifecycleStep step={7} title="Completion" description="Projects complete when the funding cycle ends. Final performance is recorded and feeds back into future opportunity scoring." isLast />
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
              <PlatformCardDescription>The organization-facing experience when Capital is enabled</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                <span className="text-[hsl(var(--platform-foreground))] font-medium">Navigation link appears</span> — A "Zura Capital" link surfaces in the Growth Hub sidebar section. This link is only visible if the feature is enabled AND the organization has at least one actionable opportunity (status: pending_review, approved, or ready).
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                <span className="text-[hsl(var(--platform-foreground))] font-medium">Opportunity queue</span> — Admins see a ranked list of qualified growth opportunities, each showing ROE, risk level, confidence, estimated capital requirement, and a recommended action.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                <span className="text-[hsl(var(--platform-foreground))] font-medium">Funding activation</span> — Each opportunity has a detail view with full scoring breakdown and an "Activate Growth" action button that initiates the funding workflow.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                <span className="text-[hsl(var(--platform-foreground))] font-medium">Active project tracking</span> — Funded projects display real-time performance vs. forecast, with variance indicators and status labels (on_track, below_forecast, at_risk).
              </p>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                <span className="text-[hsl(var(--platform-foreground))] font-medium">No false signals</span> — If an organization has no qualifying opportunities, the Capital section remains empty with a clear explanation. No opportunities are surfaced unless they pass all eligibility gates.
              </p>
            </div>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* ── Eligibility Criteria ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <PlatformCardTitle className="text-lg">Eligibility Criteria</PlatformCardTitle>
              <PlatformCardDescription>All four thresholds must pass for an opportunity to surface</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          <CriteriaRow
            label="Return on Expansion (ROE)"
            threshold="≥ 1.8"
            explanation="The projected return multiplier on capital deployed. A 1.8 ROE means $1 invested is expected to generate $1.80 in incremental revenue. Below this threshold, the opportunity is not worth pursuing."
          />
          <CriteriaRow
            label="Confidence Score"
            threshold="≥ 70"
            explanation="A 0-100 score representing data quality and prediction reliability. Based on trailing data completeness, sample size, and variance. Below 70, the platform withholds the recommendation — silence is meaningful."
          />
          <CriteriaRow
            label="Risk Level"
            threshold="≤ Medium"
            explanation="Composite risk score derived from revenue volatility (30%), stylist dependency (25%), competition intensity (25%), and market saturation (20%). High or Very High risk opportunities are automatically filtered."
          />
          <CriteriaRow
            label="Operational Stability"
            threshold="≥ 60"
            explanation="Measures operational consistency — staff turnover, appointment cancellation rates, utilization stability. Organizations in operational chaos are not candidates for growth capital."
          />
        </PlatformCardContent>
      </PlatformCard>

      {/* ── Opportunity Types ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="text-lg">Opportunity Types</PlatformCardTitle>
          <PlatformCardDescription>Categories of growth the engine evaluates</PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <OpportunityType icon={TrendingUp} title="Capacity Expansion" description="Add chairs, extend hours, or expand capacity at an existing location" />
            <OpportunityType icon={DollarSign} title="Inventory Expansion" description="Scale retail or back-bar inventory to meet demand signals" />
            <OpportunityType icon={Layers} title="Service Growth" description="Introduce a new service category (extensions, blonding, etc.)" />
            <OpportunityType icon={Target} title="Location Expansion" description="Expand footprint at an existing location" />
            <OpportunityType icon={Zap} title="New Location Launch" description="Open a new salon in an underserved or high-demand market" />
            <OpportunityType icon={Users} title="Stylist Growth" description="Fund recruitment, training, or development of stylists" />
            <OpportunityType icon={BarChart3} title="Campaign Acceleration" description="Scale high-performing marketing campaigns with proven ROI" />
            <OpportunityType icon={Clock} title="Equipment Expansion" description="Upgrade or add equipment to increase throughput" />
            <OpportunityType icon={TrendingUp} title="Marketing Acceleration" description="Amplify marketing reach in validated high-return channels" />
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* ── Funding Lifecycle ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="text-lg">Funding Lifecycle</PlatformCardTitle>
          <PlatformCardDescription>Status flow from detection to completion</PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusNode label="Draft" />
            <ArrowRight className="h-3 w-3 text-[hsl(var(--platform-foreground-muted))]" />
            <StatusNode label="Detected" />
            <ArrowRight className="h-3 w-3 text-[hsl(var(--platform-foreground-muted))]" />
            <StatusNode label="Eligible" variant="warning" />
            <ArrowRight className="h-3 w-3 text-[hsl(var(--platform-foreground-muted))]" />
            <StatusNode label="Surfaced" variant="warning" />
            <ArrowRight className="h-3 w-3 text-[hsl(var(--platform-foreground-muted))]" />
            <StatusNode label="Initiated" variant="warning" />
            <ArrowRight className="h-3 w-3 text-[hsl(var(--platform-foreground-muted))]" />
            <StatusNode label="Funded" variant="success" />
            <ArrowRight className="h-3 w-3 text-[hsl(var(--platform-foreground-muted))]" />
            <StatusNode label="Completed" variant="success" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--platform-foreground-muted))]">
            <span>Alternate outcomes:</span>
            <StatusNode label="Declined" variant="error" />
            <StatusNode label="Expired" variant="error" />
            <StatusNode label="Underperforming" variant="warning" />
          </div>
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
            Each status transition is logged for auditability. "Underperforming" is triggered when a funded project tracks below forecast thresholds (−10% variance for 2+ weeks). This triggers alerts but does not automatically cancel the project.
          </p>
        </PlatformCardContent>
      </PlatformCard>

      {/* ── Access & Permissions ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-500/10">
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <PlatformCardTitle className="text-lg">Access & Permissions</PlatformCardTitle>
              <PlatformCardDescription>Who can see and interact with Capital</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
              <span className="text-[hsl(var(--platform-foreground))] font-medium">Platform admins</span> control which organizations have Capital access via this Control Tower. Organizations cannot enable Capital themselves.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
              <span className="text-[hsl(var(--platform-foreground))] font-medium">Organization Super Admins & Account Owners</span> are the only roles within an organization that can view Capital opportunities, initiate funding, and track active projects.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
              <span className="text-[hsl(var(--platform-foreground))] font-medium">Managers and team members</span> do not have access to Capital. Manager-level funding initiation is configurable per organization in Capital Settings but is off by default.
            </p>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* ── FAQ ── */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="text-lg">Frequently Asked Questions</PlatformCardTitle>
        </PlatformCardHeader>
        <PlatformCardContent>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="loan" className="border-[hsl(var(--platform-border)/0.5)]">
              <AccordionTrigger className="text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                Is this a loan?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                No. Zura Capital is growth capital tied to validated opportunities with automated performance tracking. It follows a "Decision → Action → Outcome" loop — not a lending cycle. There are no interest rates, credit checks, or repayment schedules in the traditional sense. Capital is deployed against specific growth actions with measurable expected returns.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="toggle" className="border-[hsl(var(--platform-border)/0.5)]">
              <AccordionTrigger className="text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                What happens when I toggle Capital on for an organization?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                The system begins evaluating the organization's operational data for growth opportunities. If any opportunities pass all eligibility thresholds (ROE ≥ 1.8, Confidence ≥ 70, Risk ≤ Medium, Stability ≥ 60), they surface in the organization's Growth Hub. If none qualify, the section remains empty — no false signals are generated.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="self-toggle" className="border-[hsl(var(--platform-border)/0.5)]">
              <AccordionTrigger className="text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                Can organizations toggle Capital themselves?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                No. Capital is a platform-governed special feature. Only platform administrators can enable or disable it via the Control Tower. This ensures controlled rollout and prevents premature activation for organizations that may not be operationally ready.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="no-opps" className="border-[hsl(var(--platform-border)/0.5)]">
              <AccordionTrigger className="text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                What if an organization has no qualifying opportunities?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                The Capital section remains empty with a clear explanation. No opportunities are surfaced unless they pass all four eligibility gates. This is by design — silence is meaningful. The platform will continue monitoring and will surface opportunities as they qualify.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="risk" className="border-[hsl(var(--platform-border)/0.5)]">
              <AccordionTrigger className="text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                How is risk assessed?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                Risk is scored deterministically using four weighted factors: Revenue Volatility (30%) — variance coefficient over trailing 90 days; Stylist Dependency (25%) — revenue concentration in top performers; Competition Intensity (25%) — local competitive density; Market Saturation (20%) — category saturation signals. AI is never used for risk scoring or eligibility decisions.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="underperforming" className="border-[hsl(var(--platform-border)/0.5)]">
              <AccordionTrigger className="text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                What does "underperforming" mean?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                A funded project is flagged as "underperforming" when its actual revenue lift tracks more than 10% below forecast for 2 or more consecutive weeks. This triggers variance alerts to both the organization admin and platform monitoring. It does not automatically cancel the project — it surfaces for human review and intervention.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="managers" className="border-[hsl(var(--platform-border)/0.5)]">
              <AccordionTrigger className="text-sm text-[hsl(var(--platform-foreground))] hover:no-underline">
                Can managers initiate funding?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                By default, no. Only Super Admins and Account Owners can initiate funding. However, this is configurable per organization in Capital Settings. If an organization chooses to extend funding initiation to managers, this can be enabled — but the default is restrictive to protect against unauthorized capital deployment.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </PlatformCardContent>
      </PlatformCard>
    </PlatformPageContainer>
  );
}
