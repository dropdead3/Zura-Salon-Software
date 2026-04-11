import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/format';
import { useStylistFinancingEligibility } from '@/hooks/useStylistFinancingEligibility';
import { Rocket, Zap } from 'lucide-react';

interface Props {
  spiScore: number | null;
  orsScore: number | null;
}

export function MicroFinancingOpportunities({ spiScore, orsScore }: Props) {
  const { eligibleUseCases, hasEligibleFinancing } = useStylistFinancingEligibility(spiScore, orsScore);

  if (!hasEligibleFinancing) return null;

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Growth Opportunities</CardTitle>
            <CardDescription className="font-sans text-sm">
              Performance-unlocked financing options
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {eligibleUseCases.map((uc) => (
          <div
            key={uc.key}
            className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-center gap-4"
          >
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-sans text-sm">{uc.label}</p>
              <p className="text-xs text-muted-foreground font-sans">{uc.description}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-sans text-muted-foreground">
                Up to {formatCurrency(uc.maxAmount, { noCents: true })}
              </span>
              <span className="text-xs text-muted-foreground/60 font-sans block">
                {uc.typicalRange}
              </span>
            </div>
            <Badge variant="outline" className="text-xs text-primary shrink-0">
              Eligible
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
