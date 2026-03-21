import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, Target, Loader2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Progress } from '@/components/ui/progress';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Button } from '@/components/ui/button';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import { PLATFORM_NAME } from '@/lib/brand';
import { useGoalPeriodRevenue } from '@/hooks/useGoalPeriodRevenue';
import { GoalPaceTrendPanel } from './GoalPaceTrendPanel';
import type { HoursJson, HolidayClosure } from '@/hooks/useLocations';
import { differenceInDays, addDays, getDay, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

const dayNameByIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function countOpenDaysRange(
  from: Date, to: Date,
  hoursJson?: HoursJson | null,
  holidayClosures?: HolidayClosure[] | null,
): number {
  if (!hoursJson) return Math.max(differenceInDays(to, from) + 1, 1);
  const holidaySet = new Set((holidayClosures || []).map(h => h.date));
  let count = 0;
  let current = new Date(from);
  while (current <= to) {
    const dayName = dayNameByIndex[getDay(current)];
    if (!hoursJson[dayName]?.closed && !holidaySet.has(format(current, 'yyyy-MM-dd'))) count++;
    current = addDays(current, 1);
  }
  return Math.max(count, 1);
}

interface GoalLocationRowProps {
  locationId: string;
  locationName: string;
  target: number;
  period: 'weekly' | 'monthly';
  periodStart: Date;
  periodEnd: Date;
  hoursJson?: HoursJson | null;
  holidayClosures?: HolidayClosure[] | null;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function GoalLocationRow({
  locationId, locationName, target, period,
  periodStart, periodEnd, hoursJson, holidayClosures,
  isExpanded: controlledExpanded, onToggle,
}: GoalLocationRowProps) {
  const { formatCurrencyWhole, currency } = useFormatCurrency();
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [guidance, setGuidance] = useState('');

  const { data: revenue = 0, isLoading } = useGoalPeriodRevenue(period, locationId);

  const now = new Date();
  const totalDays = countOpenDaysRange(periodStart, periodEnd, hoursJson, holidayClosures);
  const daysElapsed = Math.max(countOpenDaysRange(periodStart, now > periodEnd ? periodEnd : now, hoursJson, holidayClosures), 1);
  const daysRemaining = Math.max(totalDays - daysElapsed, 0);

  const percentage = target > 0 ? Math.min((revenue / target) * 100, 100) : 0;
  const expectedPct = (daysElapsed / totalDays) * 100;
  const actualPct = target > 0 ? (revenue / target) * 100 : 0;
  const diff = actualPct - expectedPct;
  const paceStatus = diff >= 5 ? 'ahead' : diff <= -5 ? 'behind' : 'on-track';

  const dailyRunRate = revenue / daysElapsed;
  const requiredDailyRate = daysRemaining > 0 ? Math.max(target - revenue, 0) / daysRemaining : 0;
  const projectedRevenue = dailyRunRate * totalDays;

  const handleRecovery = async () => {
    setRecoveryLoading(true);
    setRecoveryOpen(true);
    setGuidance('');
    try {
      const { data, error } = await supabase.functions.invoke('ai-insight-guidance', {
        body: {
          type: 'insight',
          category: 'goal-recovery',
          title: `${locationName} ${period} Recovery Plan`,
          description: `${locationName} is behind pace on the ${period} sales goal. Current: $${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Target: $${target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Shortfall: $${Math.max(target - revenue, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Need $${requiredDailyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day over ${daysRemaining} open days.`,
        },
      });
      if (error) throw error;
      setGuidance(data?.guidance || 'Unable to generate guidance.');
    } catch {
      setGuidance('Something went wrong. Please try again.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
      <button
        onClick={() => onToggle ? onToggle() : setInternalExpanded(v => !v)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{locationName}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="w-24">
                <Progress
                  value={percentage}
                  className="h-1.5 bg-muted/40"
                  indicatorClassName={cn(
                    paceStatus === 'ahead' && 'bg-chart-2',
                    paceStatus === 'on-track' && 'bg-primary',
                    paceStatus === 'behind' && 'bg-destructive',
                  )}
                />
              </div>
              <span className="text-xs font-medium w-10 text-right">{percentage.toFixed(0)}%</span>
              <span className={cn(
                'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-display',
                paceStatus === 'ahead' && 'bg-chart-2/10 text-chart-2',
                paceStatus === 'on-track' && 'bg-primary/10 text-primary',
                paceStatus === 'behind' && 'bg-destructive/10 text-destructive',
              )}>
                {paceStatus === 'on-track' ? 'On Track' : paceStatus === 'ahead' ? 'Ahead' : 'Behind'}
              </span>
            </>
          )}
          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Earned</p>
                  <p className="text-sm font-medium"><AnimatedBlurredAmount value={revenue} currency={currency} /></p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Target</p>
                  <p className="text-sm font-medium"><BlurredAmount>{formatCurrencyWhole(target)}</BlurredAmount></p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Daily Run Rate</p>
                  <p className="text-sm font-medium"><AnimatedBlurredAmount value={dailyRunRate} currency={currency} /></p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Required/Day</p>
                  <p className="text-sm font-medium"><BlurredAmount>{formatCurrencyWhole(Math.round(requiredDailyRate))}</BlurredAmount></p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Open Days Left</p>
                  <p className="text-sm font-medium">{daysRemaining}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Projected</p>
                  <p className={cn('text-sm font-medium', projectedRevenue >= target ? 'text-chart-2' : 'text-destructive'}>
                    <AnimatedBlurredAmount value={projectedRevenue} currency={currency} />
                  </p>
                </div>
              </div>

              {/* Pace trend: auto-visible on lg+, toggle on smaller screens */}
              <div className="hidden lg:block">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-display">Pace Trend</p>
                <GoalPaceTrendPanel period={period} target={target} locationId={locationId} />
              </div>
              <div className="lg:hidden">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowTrend(v => !v); }}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BarChart3 className="w-3 h-3" />
                  {showTrend ? 'Hide pace trend' : 'Show pace trend'}
                </button>
                <AnimatePresence>
                  {showTrend && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-1"
                    >
                      <GoalPaceTrendPanel period={period} target={target} locationId={locationId} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {paceStatus === 'behind' && (
                <Button
                  variant="ghost"
                  size={tokens.button.inline}
                  onClick={handleRecovery}
                  disabled={recoveryLoading}
                  className="h-auto py-1 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                >
                  {recoveryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ZuraAvatar size="sm" className="h-4 w-4 text-[7px]" />}
                  Get back on track
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recovery dialog */}
      <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
        <DialogContent className="max-w-lg" overlayClassName="backdrop-blur-sm bg-black/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ZuraAvatar size="sm" />
              {locationName} Recovery Plan
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="pr-4">
              {recoveryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{guidance}</ReactMarkdown>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border/40">
            Powered by {PLATFORM_NAME} AI
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
