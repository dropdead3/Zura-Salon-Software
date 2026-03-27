import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Layers, Sparkles, Check, AlertTriangle, Lightbulb, Receipt } from 'lucide-react';

interface MethodCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  bestFor: string;
  pros: string[];
  cons: string[];
  proTip: string;
  recommended?: boolean;
  receiptLines: { label: string; amount: string }[];
}

const METHODS: MethodCard[] = [
  {
    icon: <DollarSign className="w-5 h-5 text-primary" />,
    title: 'Allowance',
    description:
      'Product cost is built into the service price. A set quantity is included — overage is charged only when a stylist uses more than budgeted.',
    bestFor: 'Salons with consistent product usage per service',
    pros: [
      'Clean, predictable client pricing',
      'No line-item surprises on the receipt',
      'Encourages efficient product use',
    ],
    cons: [
      'Requires calibrated pricing to avoid margin loss',
      'Under-pricing risk if allowances are too generous',
    ],
    proTip:
      'Use Price Intelligence to set service prices that account for your allowance budget and target margins.',
    receiptLines: [
      { label: 'Balayage', amount: '$185.00' },
    ],
  },
  {
    icon: <Layers className="w-5 h-5 text-primary" />,
    title: 'Parts & Labor',
    description:
      'Product cost is itemized separately on the receipt. Clients pay for labor plus supplies as individual line items. Charge at wholesale cost or apply a markup for retail pricing — configured per service.',
    bestFor: 'Salons with highly variable product usage or specialty treatments',
    pros: [
      'Owner never absorbs product cost',
      'Transparent — clients see exactly what they pay for',
      'No allowance calibration needed',
    ],
    cons: [
      'Can feel transactional to clients',
      'Prices vary per visit, harder to quote upfront',
    ],
    proTip:
      'Set a default markup percentage in billing settings to ensure margin on every product used.',
    receiptLines: [
      { label: 'Balayage — Labor', amount: '$145.00' },
      { label: 'Color supplies', amount: '$38.50' },
    ],
  },
  {
    icon: <Sparkles className="w-5 h-5 text-primary" />,
    title: 'Hybrid',
    description:
      'Core services use Allowance for predictable pricing. Add-ons, treatments, and specialty services use Parts & Labor for transparency.',
    bestFor: 'Most salons — the practical default',
    pros: [
      'Predictability for standard services',
      'Transparency for extras and add-ons',
      'Flexibility to optimize per service',
    ],
    cons: [
      'Slightly more setup — each service needs its billing mode configured',
      'Requires clear internal documentation',
    ],
    proTip:
      'Start with Allowance for your top 5 services, then use Parts & Labor for everything else. Refine over time.',
    recommended: true,
    receiptLines: [
      { label: 'Balayage', amount: '$185.00' },
      { label: 'Gloss treatment — supplies', amount: '$12.00' },
    ],
  },
];

interface BillingMethodEducationProps {
  /** Show a contextual hint for the wizard flow */
  showWizardHint?: boolean;
}

export function BillingMethodEducation({ showWizardHint }: BillingMethodEducationProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h3 className={tokens.heading.section}>How Salons Recover Product Cost</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Every salon needs a strategy for recouping the cost of color, lightener, and other
          color bar products. There are two core methods — and most salons benefit from combining
          them.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {METHODS.map((method) => (
          <Card
            key={method.title}
            className={cn(
              'relative overflow-hidden',
              method.recommended && 'ring-1 ring-primary/30'
            )}
          >
            {method.recommended && (
              <div className="absolute top-3 right-3">
                <Badge variant="default" className="text-xs">
                  Recommended
                </Badge>
              </div>
            )}
            <CardContent className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className={tokens.card.iconBox}>{method.icon}</div>
                <h4 className="font-display text-sm tracking-wide text-foreground uppercase">
                  {method.title}
                </h4>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {method.description}
              </p>

              {/* Receipt mockup */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Receipt className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground tracking-wide uppercase font-display">
                    Client receipt
                  </p>
                </div>
                {method.receiptLines.map((line) => (
                  <div key={line.label} className="flex items-center justify-between">
                    <span className="text-xs text-foreground">{line.label}</span>
                    <span className="text-xs text-foreground font-medium">{line.amount}</span>
                  </div>
                ))}
                <div className="border-t border-border/40 pt-1.5 mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-xs text-foreground font-medium">
                    ${method.receiptLines.reduce((sum, l) => sum + parseFloat(l.amount.replace('$', '')), 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Best for */}
              <div className="rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Best for: </span>
                  {method.bestFor}
                </p>
              </div>

              {/* Pros */}
              <div className="space-y-1.5">
                {method.pros.map((pro) => (
                  <div key={pro} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-success flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{pro}</p>
                  </div>
                ))}
              </div>

              {/* Cons */}
              <div className="space-y-1.5">
                {method.cons.map((con) => (
                  <div key={con} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{con}</p>
                  </div>
                ))}
              </div>

              {/* Pro Tip */}
              <div className="rounded-lg border border-primary/10 bg-primary/5 px-3 py-2.5 flex gap-2">
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">{method.proTip}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Consultative callout */}
      <div className="rounded-xl border bg-primary/5 p-4 flex items-start gap-3">
        <div className={cn(tokens.card.iconBox, 'bg-primary/10')}>
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Most salons operate with a Hybrid approach
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You configure the billing mode per service when setting up allowance policies. No
            global setting is required — each service can use whichever method fits best.
          </p>
        </div>
      </div>

      {/* Wizard contextual hint */}
      {showWizardHint && (
        <div className="rounded-lg bg-muted/30 border border-border/40 px-4 py-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            In the next step, you will set allowances for each service. You can switch any service
            to Parts & Labor later in Allowances & Billing.
          </p>
        </div>
      )}
    </div>
  );
}
