import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { getSPITier } from '@/config/capital-engine/capital-config';
import { MapPin } from 'lucide-react';

interface SPIData {
  locationId: string;
  spiScore: number;
  revenueEfficiency: number;
  growthVelocity: number;
  conversionStrength: number;
  pricingPower: number;
  operationalStability: number;
  executionQuality: number;
  riskLevel: string;
  factors: any;
  tier: ReturnType<typeof getSPITier>;
}

interface Props {
  spiData: SPIData;
}

const COMPONENTS = [
  { key: 'revenueEfficiency', label: 'Revenue Efficiency', weight: '25%' },
  { key: 'growthVelocity', label: 'Growth Velocity', weight: '20%' },
  { key: 'conversionStrength', label: 'Conversion Strength', weight: '15%' },
  { key: 'pricingPower', label: 'Pricing Power', weight: '15%' },
  { key: 'operationalStability', label: 'Operational Stability', weight: '15%' },
  { key: 'executionQuality', label: 'Execution Quality', weight: '10%' },
] as const;

function getTierColor(key: string) {
  switch (key) {
    case 'elite': return 'text-green-500';
    case 'high': return 'text-blue-500';
    case 'growth': return 'text-amber-500';
    default: return 'text-red-500';
  }
}

export function SPICard({ spiData }: Props) {
  const locationName = spiData.factors?.locationName ?? spiData.locationId;

  return (
    <Card className={tokens.card.base}>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>{locationName}</CardTitle>
            <CardDescription className="font-sans text-sm">
              <span className={getTierColor(spiData.tier.key)}>
                {spiData.tier.label}
              </span>
              {' · '}
              <span className="text-muted-foreground capitalize">{spiData.riskLevel} risk</span>
            </CardDescription>
          </div>
        </div>
        <div className="text-right">
          <span className="font-display text-2xl tracking-wide">{spiData.spiScore}</span>
          <span className="text-muted-foreground text-xs font-sans block">SPI</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {COMPONENTS.map(({ key, label, weight }) => {
          const value = spiData[key as keyof SPIData] as number;
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
