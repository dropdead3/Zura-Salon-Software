import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { useEnforcementGate } from '@/hooks/useEnforcementGate';
import { ZuraCapitalCard } from './ZuraCapitalCard';
import { OwnerCapitalQueue } from './OwnerCapitalQueue';
import { FinancedProjectsTracker } from './FinancedProjectsTracker';
import { ShieldCheck } from 'lucide-react';

interface Props {
  organizationId: string | undefined;
}

export function CapitalDashboard({ organizationId }: Props) {
  const { isCompleted: marginGateCompleted, isLoading: gateLoading } = useEnforcementGate('gate_margin_baselines');

  if (gateLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className={tokens.loading.skeleton} />
        ))}
      </div>
    );
  }

  if (!marginGateCompleted) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardContent className="py-12">
          <div className={tokens.empty.container}>
            <ShieldCheck className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>Margin Baselines Required</h3>
            <p className={tokens.empty.description}>
              Before expansion analytics activate, define your margin baselines — the financial guardrails that protect growth.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Opportunity Highlight */}
      <ZuraCapitalCard />

      {/* Owner-Level Capital Queue */}
      <OwnerCapitalQueue />

      {/* Financed Projects */}
      <FinancedProjectsTracker />
    </div>
  );
}
