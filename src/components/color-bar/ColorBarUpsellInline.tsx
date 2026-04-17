import { Beaker, FlaskConical, Package, ArrowRightLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColorBarUpsellInlineProps {
  isPendingActivation?: boolean;
  onActivate: () => void;
}

const features = [
  {
    icon: FlaskConical,
    label: 'Formula history per client',
  },
  {
    icon: Package,
    label: 'Per-location stock and cost tracking',
  },
  {
    icon: ArrowRightLeft,
    label: 'Dock-to-checkout chemical cost propagation',
  },
];

/**
 * Inline upsell surface rendered inside the appointment popover when the
 * organization or location is not entitled to Zura Color Bar.
 *
 * Calm, advisory, brand-voice compliant. No hype, no emojis.
 */
export function ColorBarUpsellInline({
  isPendingActivation = false,
  onActivate,
}: ColorBarUpsellInlineProps) {
  const ctaLabel = isPendingActivation
    ? 'Activate for this location'
    : 'Activate Zura Color Bar';

  const helperText = isPendingActivation
    ? 'Color Bar is enabled for your organization. Activate it for this location to begin.'
    : 'Available as an add-on to your current plan.';

  return (
    <div className="space-y-5">
      {/* Header block */}
      <div className="space-y-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Beaker className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-display text-base tracking-wide uppercase text-foreground">
            Zura Color Bar
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Engineered chemical service infrastructure. Track formulas, manage
            stock at the location level, and propagate chemical costs into
            checkout — all from inside every appointment.
          </p>
        </div>
      </div>

      {/* Feature lines */}
      <div className="space-y-2 pt-1">
        {features.map((feature) => (
          <div
            key={feature.label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 bg-card/50"
          >
            <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
              <feature.icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm text-foreground/90">{feature.label}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="space-y-2 pt-2">
        <Button
          onClick={onActivate}
          className="w-full font-sans font-medium gap-2"
          size="default"
        >
          {ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {helperText}
        </p>
      </div>
    </div>
  );
}
