import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ControlTowerSummaryBar } from './ControlTowerSummaryBar';
import { ControlTowerAlertCard } from './ControlTowerAlertCard';
import { useControlTowerAlerts, type ControlTowerResult } from '@/hooks/backroom/useControlTowerAlerts';
import type { AlertCategory } from '@/lib/backroom/control-tower-engine';

const CATEGORY_FILTERS: { key: AlertCategory | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'exception', label: 'Exceptions' },
  { key: 'profitability', label: 'Profitability' },
  { key: 'waste', label: 'Waste' },
  { key: 'reorder', label: 'Reorders' },
];

interface BackroomControlTowerProps {
  locationId?: string | null;
  className?: string;
}

export function BackroomControlTower({ locationId, className }: BackroomControlTowerProps) {
  const [category, setCategory] = useState<AlertCategory | null>(null);
  const { alerts, overflow, summary, isLoading, isError } = useControlTowerAlerts(locationId, category);
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={cn(tokens.card.wrapper, className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Shield className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Control Tower</CardTitle>
              <CardDescription className={tokens.body.muted}>
                Real-time backroom signals
              </CardDescription>
            </div>
          </div>
          {!isLoading && (
            <ControlTowerSummaryBar summary={summary} />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTERS.map((f) => (
            <Badge
              key={f.key ?? 'all'}
              variant={category === f.key ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setCategory(f.key)}
            >
              {f.label}
            </Badge>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className={tokens.loading.skeleton} />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <EmptyState
            title="Unable to load alerts"
            description="Projection data is temporarily unavailable. Please try again."
          />
        )}

        {/* Empty */}
        {!isLoading && !isError && alerts.length === 0 && (
          <EmptyState
            icon={Shield}
            title="All systems clear"
            description="No active backroom alerts. Operations are running within expected parameters."
          />
        )}

        {/* Alert list */}
        {!isLoading && !isError && alerts.length > 0 && (
          <ScrollArea className="max-h-[480px]">
            <div className="space-y-2 pr-2">
              {alerts.map((alert) => (
                <ControlTowerAlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Overflow */}
        {overflow > 0 && !expanded && (
          <Button
            variant="ghost"
            className={tokens.button.cardFooter}
            onClick={() => setExpanded(true)}
          >
            +{overflow} more alerts
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
