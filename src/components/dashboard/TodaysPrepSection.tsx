import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, ChevronRight, Sparkles, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VisibilityGate } from '@/components/visibility';
import { useTodayPrep } from '@/hooks/useTodayPrep';
import { CLV_TIERS, type CLVTier } from '@/lib/clv-calculator';

function formatTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

const TIER_KEY_MAP: Record<string, CLVTier> = {
  Platinum: 'platinum',
  Gold: 'gold',
  Silver: 'silver',
  Bronze: 'bronze',
};

export function TodaysPrepSection() {
  const { data: appointments, isLoading } = useTodayPrep();

  return (
    <VisibilityGate
      elementKey="todays_prep"
      elementName="Today's Prep"
      elementCategory="Dashboard Home"
    >
      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className={tokens.card.iconBox}>
            <ClipboardCheck className={tokens.card.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className={tokens.card.title}>TODAY'S PREP</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : !appointments || appointments.length === 0 ? (
            <div className={tokens.empty.container}>
              <ClipboardCheck className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No appointments today</h3>
              <p className={tokens.empty.description}>Enjoy your day off</p>
            </div>
          ) : (
            <div className="space-y-1">
              {appointments.slice(0, 5).map(appt => {
                const tierKey = appt.clvTier ? TIER_KEY_MAP[appt.clvTier] : null;
                const tierConfig = tierKey ? CLV_TIERS[tierKey] : null;

                return (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Time */}
                    <span className="font-display text-xs tracking-wide text-muted-foreground w-[72px] shrink-0">
                      {formatTime(appt.startTime)}
                    </span>

                    {/* Client name */}
                    <span className="font-sans text-sm truncate flex-1 min-w-0">
                      {appt.clientName || 'Walk-in'}
                      {appt.isNewClient && (
                        <UserPlus className="inline w-3.5 h-3.5 ml-1.5 text-primary" />
                      )}
                    </span>

                    {/* CLV tier badge */}
                    {tierConfig && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0 h-5 font-sans',
                          tierConfig.bgColor,
                          tierConfig.color,
                          'border-transparent'
                        )}
                      >
                        {tierConfig.label}
                      </Badge>
                    )}

                    {/* Visit count */}
                    {appt.visitCount > 0 && (
                      <span className="text-xs text-muted-foreground font-sans whitespace-nowrap">
                        {appt.visitCount} visits
                      </span>
                    )}
                  </div>
                );
              })}

              {appointments.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{appointments.length - 5} more
                </p>
              )}
            </div>
          )}

          {/* Footer link */}
          <div className="pt-3 border-t border-border/50 mt-3">
            <Button
              variant="ghost"
              size={tokens.button.card}
              className={tokens.button.cardFooter}
              asChild
            >
              <Link to="/dashboard/today-prep">
                View Full Prep <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </VisibilityGate>
  );
}
