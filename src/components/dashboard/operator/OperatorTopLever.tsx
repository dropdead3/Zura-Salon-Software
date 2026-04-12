import { ArrowRight, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useZuraCapital } from '@/hooks/useZuraCapital';
import { useDailyBriefingEngine } from '@/hooks/useDailyBriefingEngine';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { Link } from 'react-router-dom';
import type { Task } from '@/hooks/useTasks';
import type { BriefingRoleContext } from '@/hooks/useDailyBriefingEngine';

interface OperatorTopLeverProps {
  tasks: Task[];
  roleContext?: BriefingRoleContext;
}

export function OperatorTopLever({ tasks, roleContext = 'owner' }: OperatorTopLeverProps) {
  const { formatCurrency } = useFormatCurrency();
  const { topOpportunity, isLoading: capitalLoading } = useZuraCapital();
  const briefing = useDailyBriefingEngine(tasks, roleContext);
  const { dashPath } = useOrgDashboardPath();

  // Prefer capital top opportunity, fall back to briefing focus
  const hasCapital = !!topOpportunity;
  const title = hasCapital
    ? topOpportunity.title
    : briefing.focus?.title;
  const revenueCents = hasCapital
    ? topOpportunity.predictedLiftExpectedCents
    : briefing.focus?.revenueLiftCents ?? 0;
  const subtitle = hasCapital
    ? `Break-even: ${topOpportunity.breakEvenMonthsExpected.toFixed(1)} months`
    : briefing.focus?.contextLine;
  const ctaLabel = hasCapital ? 'Activate Growth' : 'View Details';
  const ctaLink = hasCapital
    ? dashPath(`/capital/${topOpportunity.id}`)
    : dashPath('/capital');

  if (capitalLoading) return null;

  if (!title) {
    return (
      <Card className="relative overflow-hidden rounded-xl border-primary/10 bg-card/60">
        <div className="p-6 flex items-center gap-3">
          <div className={cn(tokens.card.iconBox, 'bg-primary/10')}>
            <Crown className={cn(tokens.card.icon, 'text-primary/40')} />
          </div>
          <div>
            <p className={tokens.label.tiny}>TOP LEVER</p>
            <p className="text-xs text-muted-foreground font-sans mt-1">No growth opportunities detected yet — Zura is analyzing your business</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden rounded-xl border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(tokens.card.iconBox, 'bg-primary/10')}>
              <Crown className={cn(tokens.card.icon, 'text-primary')} />
            </div>
            <div className="min-w-0">
              <p className={tokens.label.tiny}>TOP LEVER</p>
              <h3 className="font-sans text-base font-medium mt-1 truncate">{title}</h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground font-sans mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="shrink-0 text-right flex flex-col items-end gap-2">
            <p className="text-lg font-display font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              <BlurredAmount>
                +{formatCurrency(revenueCents / 100)}
              </BlurredAmount>
              <span className="text-xs text-muted-foreground font-sans font-normal ml-1">/mo</span>
            </p>
            <Button size={tokens.button.card} asChild>
              <Link to={ctaLink}>
                {ctaLabel}
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
