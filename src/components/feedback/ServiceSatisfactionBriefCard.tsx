import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, AlertTriangle } from 'lucide-react';
import { useServiceSatisfaction } from '@/hooks/useServiceSatisfaction';
import { useReputationFilter } from '@/contexts/ReputationFilterContext';
// ... keep existing code

/**
 * ServiceSatisfactionBriefCard — Surfaces top + bottom services by satisfaction
 * for the Weekly Intelligence Brief. Silence is valid: returns null when no
 * service crosses the 5-response materiality threshold.
 */
export function ServiceSatisfactionBriefCard() {
  const { data, isLoading } = useServiceSatisfaction(30);

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  const top = data.slice(0, 3);
  const bottom = data.length > 3 ? data.slice(-2).reverse() : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display text-base tracking-wide">Service Satisfaction</CardTitle>
            <CardDescription>Last 30 days · 5+ responses required</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> Highest rated
          </p>
          <div className="space-y-1.5">
            {top.map((s) => (
              <div key={s.serviceName} className="flex items-center justify-between text-sm">
                <span className="truncate">{s.serviceName}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{s.responseCount}</span>
                  <Badge variant="secondary" className="text-xs">
                    {s.avgRating.toFixed(1)}★ · NPS {s.nps}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {bottom.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Watch list
            </p>
            <div className="space-y-1.5">
              {bottom.map((s) => (
                <div key={s.serviceName} className="flex items-center justify-between text-sm">
                  <span className="truncate">{s.serviceName}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{s.responseCount}</span>
                    <Badge variant={s.avgRating < 4 ? 'destructive' : 'secondary'} className="text-xs">
                      {s.avgRating.toFixed(1)}★ · NPS {s.nps}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
