import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';

interface ZOSCardProps {
  orgName: string;
  zosScore: number;
  eligibility: string;
  spiComponent: number;
  consistencyComponent: number;
  executionReliability: number;
  growthResponsiveness: number;
  teamStability: number;
  marketPosition: number;
}

const ELIGIBILITY_STYLES: Record<string, string> = {
  prime: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  watchlist: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ineligible: 'bg-muted text-muted-foreground border-border',
};

export function ZOSCard({
  orgName, zosScore, eligibility,
  spiComponent, consistencyComponent, executionReliability,
  growthResponsiveness, teamStability, marketPosition,
}: ZOSCardProps) {
  const components = [
    { label: 'SPI', value: spiComponent, weight: '30%' },
    { label: 'Consistency', value: consistencyComponent, weight: '20%' },
    { label: 'Execution', value: executionReliability, weight: '15%' },
    { label: 'Growth', value: growthResponsiveness, weight: '15%' },
    { label: 'Team', value: teamStability, weight: '10%' },
    { label: 'Market', value: marketPosition, weight: '10%' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>{orgName}</CardTitle>
              <CardDescription>ZOS: {zosScore}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={ELIGIBILITY_STYLES[eligibility] ?? ELIGIBILITY_STYLES.ineligible}>
            {eligibility === 'prime' ? 'Prime' : eligibility === 'watchlist' ? 'Watchlist' : 'Ineligible'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {components.map((c) => (
            <div key={c.label} className="text-center">
              <p className="font-display text-lg tracking-wide">{c.value}</p>
              <p className="text-xs text-muted-foreground font-sans">{c.label} ({c.weight})</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
