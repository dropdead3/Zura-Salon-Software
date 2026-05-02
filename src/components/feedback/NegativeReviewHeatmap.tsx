import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { useNegativeReviewHeatmap } from '@/hooks/useNegativeReviewHeatmap';

/**
 * Negative-review heatmap by location × service.
 * Suppresses cells with < 3 responses; renders null when nothing to show.
 */
export function NegativeReviewHeatmap() {
  const { data, isLoading } = useNegativeReviewHeatmap();

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  const intensity = (rate: number) => {
    if (rate >= 0.5) return 'bg-destructive/30 border-destructive/50';
    if (rate >= 0.3) return 'bg-destructive/20 border-destructive/40';
    if (rate >= 0.15) return 'bg-amber-500/20 border-amber-500/40';
    return 'bg-amber-500/10 border-amber-500/30';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Flame className="h-4 w-4 text-destructive" />
          Negative-review concentrations
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Where rating ≤ 3 or NPS ≤ 6 cluster. Min 3 responses per cell.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {data.slice(0, 12).map((cell) => (
            <div
              key={`${cell.locationId}-${cell.serviceName}`}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${intensity(cell.negativeRate)}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{cell.serviceName}</p>
                <p className="text-xs text-muted-foreground truncate">{cell.locationName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium">
                  {Math.round(cell.negativeRate * 100)}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {cell.negativeResponses}/{cell.totalResponses}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
