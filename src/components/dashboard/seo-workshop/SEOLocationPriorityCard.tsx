import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import {
  LOCATION_PRIORITY_CONFIG,
  type LocationState,
} from '@/lib/seo-engine/seo-growth-orchestrator';
import { Zap, Shield, AlertTriangle, Pause, MapPin } from 'lucide-react';

const ICON_MAP = {
  zap: Zap,
  shield: Shield,
  'alert-triangle': AlertTriangle,
  pause: Pause,
} as const;

interface Props {
  locationStates: LocationState[];
}

export function SEOLocationPriorityCard({ locationStates }: Props) {
  const { formatCurrency } = useFormatCurrency();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Location Priority States</CardTitle>
            <CardDescription>Resource allocation strategy per location</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {locationStates.map((loc) => {
            const config = LOCATION_PRIORITY_CONFIG[loc.priorityState];
            const IconComp = ICON_MAP[config.icon];

            return (
              <div
                key={loc.locationId}
                className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconComp className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-sans font-medium truncate">{loc.locationLabel}</p>
                    <p className="text-xs text-muted-foreground font-sans">{loc.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {loc.topOpportunity && (
                    <span className="text-xs text-muted-foreground font-sans hidden sm:block">
                      Top: {loc.topOpportunity.objectLabel} (+<BlurredAmount>{formatCurrency(loc.topOpportunity.predictedLift.expected)}</BlurredAmount>)
                    </span>
                  )}
                  <Badge variant="outline" className={`font-display text-xs tracking-wide ${config.color}`}>
                    {config.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
