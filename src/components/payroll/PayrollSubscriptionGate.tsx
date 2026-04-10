import { DollarSign, Zap, FileCheck, CreditCard, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PayrollSubscriptionGateProps {
  onActivate?: () => void;
}

const features = [
  {
    icon: FileCheck,
    title: 'Automated Tax Filing',
    description: 'Federal, state, and local tax calculations filed automatically.',
  },
  {
    icon: CreditCard,
    title: 'Direct Deposit',
    description: 'Fast, reliable direct deposit for your entire team.',
  },
  {
    icon: Shield,
    title: 'W-2s & Compliance',
    description: 'Year-end tax documents and regulatory compliance built in.',
  },
  {
    icon: Zap,
    title: 'Commission Integration',
    description: 'Seamless commission payouts tied to your performance architecture.',
  },
];

export function PayrollSubscriptionGate({ onActivate }: PayrollSubscriptionGateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-display uppercase tracking-wider">
            <DollarSign className="h-3.5 w-3.5" />
            Add-on
          </div>
          <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
            Zura Payroll
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Compensation Intelligence. Full-service payroll powered by Gusto — automated tax compliance, direct deposit, and commission integration.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-4 rounded-xl border border-border/60 bg-card/50 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-display text-xs uppercase tracking-wide text-foreground">
                  {feature.title}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="font-sans font-medium px-8"
            onClick={onActivate}
          >
            Contact Sales to Activate
          </Button>
          <p className="text-xs text-muted-foreground">
            Available as an add-on subscription to your current plan.
          </p>
        </div>
      </div>
    </div>
  );
}
