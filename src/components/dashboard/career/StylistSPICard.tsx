import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { SPI_TIERS, getSPITierKey } from '@/config/capital-engine/stylist-financing-config';
import { BarChart3 } from 'lucide-react';

interface Props {
  spiScore: number;
  revenueScore: number;
  retentionScore: number;
  rebookingScore: number;
  executionScore: number;
  growthScore: number;
  reviewScore: number;
}

const COMPONENTS = [
  { key: 'revenueScore', label: 'Revenue', weight: '25%' },
  { key: 'retentionScore', label: 'Retention', weight: '20%' },
  { key: 'rebookingScore', label: 'Rebooking', weight: '15%' },
  { key: 'executionScore', label: 'Execution', weight: '15%' },
  { key: 'growthScore', label: 'Growth Trend', weight: '15%' },
  { key: 'reviewScore', label: 'Review Quality', weight: '10%' },
] as const;

export function StylistSPICard(props: Props) {
  const tierKey = getSPITierKey(props.spiScore);
  const tier = SPI_TIERS[tierKey];

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Stylist Performance Index</CardTitle>
            <CardDescription className="font-sans text-sm">
              <span className={tier.color}>{tier.label}</span>
            </CardDescription>
          </div>
        </div>
        <div className="text-right">
          <span className="font-display text-2xl tracking-wide">{props.spiScore}</span>
          <span className="text-muted-foreground text-xs font-sans block">SPI</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {COMPONENTS.map(({ key, label, weight }) => {
          const value = props[key as keyof Props] as number;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans text-muted-foreground">
                  {label} <span className="opacity-50">({weight})</span>
                </span>
                <span className="text-xs font-display tracking-wide">{Math.round(value)}</span>
              </div>
              <Progress value={value} className="h-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
