/**
 * LevelProgressionLadder — Stylist-facing vertical level ladder.
 * Shows the full progression path with current position highlighted,
 * including expandable service pricing per level.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { CheckCircle2, MapPin, Lock, ChevronDown, DollarSign } from 'lucide-react';
import { useStylistLevels, type StylistLevel } from '@/hooks/useStylistLevels';
import { useLevelPromotionCriteria, type LevelPromotionCriteria } from '@/hooks/useLevelPromotionCriteria';
import { useAllServiceLevelPrices, type ServiceLevelPrice } from '@/hooks/useAllServiceLevelPrices';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface LevelProgressionLadderProps {
  currentLevelId?: string | null;
}

function formatThreshold(label: string, value: number, unit: string): string {
  if (unit === '$') return `${label}: $${value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}`;
  if (unit === '%') return `${label}: ${value}%`;
  if (unit === 'd') return `${label}: ${value} days`;
  if (unit === '/mo') return `${label}: ${value}/mo`;
  if (unit === '$/hr') return `${label}: $${value}/hr`;
  return `${label}: ${value}`;
}

function getCriteriaHighlights(criteria?: LevelPromotionCriteria): string[] {
  if (!criteria) return [];
  const highlights: string[] = [];
  if (criteria.revenue_enabled && criteria.revenue_threshold > 0) highlights.push(formatThreshold('Revenue', criteria.revenue_threshold, '$'));
  if (criteria.retail_enabled && criteria.retail_pct_threshold > 0) highlights.push(formatThreshold('Retail', criteria.retail_pct_threshold, '%'));
  if (criteria.rebooking_enabled && criteria.rebooking_pct_threshold > 0) highlights.push(formatThreshold('Rebooking', criteria.rebooking_pct_threshold, '%'));
  if (criteria.avg_ticket_enabled && criteria.avg_ticket_threshold > 0) highlights.push(formatThreshold('Avg Ticket', criteria.avg_ticket_threshold, '$'));
  if (criteria.retention_rate_enabled && Number(criteria.retention_rate_threshold) > 0) highlights.push(formatThreshold('Retention', Number(criteria.retention_rate_threshold), '%'));
  if (criteria.utilization_enabled && Number(criteria.utilization_threshold) > 0) highlights.push(formatThreshold('Utilization', Number(criteria.utilization_threshold), '%'));
  if (criteria.tenure_enabled && criteria.tenure_days > 0) highlights.push(formatThreshold('Level Tenure', criteria.tenure_days, 'd'));
  return highlights;
}

/** Filter to only services whose prices vary across levels */
function getVariablePricedServices(pricesByLevel: Map<string, ServiceLevelPrice[]>): Set<string> {
  const priceMap = new Map<string, Set<number>>();
  for (const services of pricesByLevel.values()) {
    for (const s of services) {
      const prices = priceMap.get(s.serviceName) ?? new Set();
      prices.add(s.price);
      priceMap.set(s.serviceName, prices);
    }
  }
  const variable = new Set<string>();
  for (const [name, prices] of priceMap) {
    if (prices.size > 1) variable.add(name);
  }
  return variable;
}

function ServicePricingSection({
  levelId,
  pricesByLevel,
  currentLevelPrices,
  variableServices,
  isCurrent,
  isPast,
  formatCurrency,
}: {
  levelId: string;
  pricesByLevel: Map<string, ServiceLevelPrice[]>;
  currentLevelPrices: Map<string, number>;
  variableServices: Set<string>;
  isCurrent: boolean;
  isPast: boolean;
  formatCurrency: (amount: number) => string;
}) {
  const services = (pricesByLevel.get(levelId) ?? []).filter(s => variableServices.has(s.serviceName));
  if (services.length === 0) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors group">
        <DollarSign className="w-3 h-3" />
        <span>Service pricing</span>
        <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 rounded-md bg-muted/30 p-2 space-y-0.5">
          {services.map(s => {
            const currentPrice = currentLevelPrices.get(s.serviceName);
            const delta = currentPrice != null && !isCurrent ? s.price - currentPrice : null;

            return (
              <div key={s.serviceName} className={cn(
                'flex items-center justify-between text-[11px]',
                isPast ? 'text-muted-foreground/60' : 'text-muted-foreground'
              )}>
                <span className="truncate mr-2">{s.serviceName}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <BlurredAmount>
                    <span>{formatCurrency(s.price)}</span>
                  </BlurredAmount>
                  {delta != null && delta !== 0 && (
                    <BlurredAmount>
                      <span className={cn(
                        'text-[10px]',
                        delta > 0 ? 'text-emerald-500' : 'text-destructive'
                      )}>
                        {delta > 0 ? '+' : ''}{formatCurrency(delta)}
                      </span>
                    </BlurredAmount>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function LevelProgressionLadder({ currentLevelId }: LevelProgressionLadderProps) {
  const { data: levels = [] } = useStylistLevels();
  const { data: allCriteria = [] } = useLevelPromotionCriteria();
  const { pricesByLevel } = useAllServiceLevelPrices();
  const { formatCurrency } = useFormatCurrency();

  const criteriaMap = useMemo(() => {
    const map = new Map<string, LevelPromotionCriteria>();
    allCriteria.filter(c => c.is_active).forEach(c => map.set(c.stylist_level_id, c));
    return map;
  }, [allCriteria]);

  const variableServices = useMemo(() => getVariablePricedServices(pricesByLevel), [pricesByLevel]);

  const currentLevelPrices = useMemo(() => {
    const map = new Map<string, number>();
    if (!currentLevelId) return map;
    const services = pricesByLevel.get(currentLevelId) ?? [];
    for (const s of services) {
      map.set(s.serviceName, s.price);
    }
    return map;
  }, [pricesByLevel, currentLevelId]);

  const currentIndex = levels.findIndex(l => l.id === currentLevelId);

  if (levels.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>MY PROGRESSION PATH</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

          <div className="space-y-1">
            {levels.map((level, idx) => {
              const isCurrent = level.id === currentLevelId;
              const isPast = currentIndex >= 0 && idx < currentIndex;
              const isFuture = currentIndex >= 0 && idx > currentIndex;
              const isNext = currentIndex >= 0 && idx === currentIndex + 1;
              const criteria = criteriaMap.get(level.id);
              const highlights = getCriteriaHighlights(criteria);
              const dotColor = idx === levels.length - 1 ? '#f59e0b' : idx >= levels.length * 0.6 ? '#fcd34d' : idx >= levels.length * 0.3 ? '#fde68a' : '#a1a1aa';

              return (
                <div key={level.id} className="relative flex items-start gap-4 py-3">
                  {/* Node */}
                  <div className={cn(
                    'relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 border-2 transition-all',
                    isCurrent
                      ? 'border-primary bg-primary text-primary-foreground shadow-md'
                      : isPast
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border bg-card'
                  )}>
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : isCurrent ? (
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    ) : (
                      <Lock className="w-3 h-3 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn(
                    'flex-1 rounded-lg border p-3 transition-all',
                    isCurrent
                      ? 'border-primary/40 bg-primary/5 shadow-sm'
                      : isPast
                      ? 'border-emerald-500/20 bg-emerald-500/5 opacity-70'
                      : 'border-border/60 bg-muted/20'
                  )}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                      <span className={cn('text-sm', isCurrent ? 'text-foreground' : 'text-muted-foreground')}>{level.label}</span>
                      {isCurrent && (
                        <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary bg-primary/10">
                          You are here
                        </Badge>
                      )}
                      {isNext && (
                        <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 text-amber-600 bg-amber-500/10">
                          Next level
                        </Badge>
                      )}
                    </div>

                    {/* Commission rates */}
                    {(level.service_commission_rate != null || level.retail_commission_rate != null) && (
                      <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        {level.service_commission_rate != null && (
                          <BlurredAmount>
                            <span>Service: {(level.service_commission_rate * 100).toFixed(0)}%</span>
                          </BlurredAmount>
                        )}
                        {level.retail_commission_rate != null && (
                          <BlurredAmount>
                            <span>Retail: {(level.retail_commission_rate * 100).toFixed(0)}%</span>
                          </BlurredAmount>
                        )}
                      </div>
                    )}

                    {/* Criteria highlights — shown for next and future levels */}
                    {(isNext || isFuture) && highlights.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {highlights.slice(0, 4).map((h, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {h}
                          </span>
                        ))}
                        {highlights.length > 4 && (
                          <span className="text-[10px] text-muted-foreground/60">+{highlights.length - 4} more</span>
                        )}
                      </div>
                    )}

                    {/* Service pricing — collapsible */}
                    <ServicePricingSection
                      levelId={level.id}
                      pricesByLevel={pricesByLevel}
                      currentLevelPrices={currentLevelPrices}
                      variableServices={variableServices}
                      isCurrent={isCurrent}
                      isPast={isPast}
                      formatCurrency={formatCurrency}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
