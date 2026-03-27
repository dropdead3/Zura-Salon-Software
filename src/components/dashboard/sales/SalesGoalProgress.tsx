import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { PLATFORM_NAME } from '@/lib/brand';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, TrendingDown, Loader2, ListChecks, Settings, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { getDaysInMonth, getDaysInYear, getDayOfYear, startOfWeek, endOfWeek, endOfMonth, endOfYear, differenceInDays, addDays, format, getDay } from 'date-fns';
import type { HoursJson, HolidayClosure } from '@/hooks/useLocations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { RecoveryPlanActions } from './RecoveryPlanActions';
import { Checkbox } from '@/components/ui/checkbox';
import { SalesGoalsDialog } from './SalesGoalsDialog';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface SalesGoalProgressProps {
  current: number;
  target: number;
  label?: string;
  className?: string;
  goalPeriod?: 'weekly' | 'monthly' | 'yearly';
  hoursJson?: HoursJson | null;
  holidayClosures?: HolidayClosure[] | null;
  onClick?: () => void;
  isExpanded?: boolean;
}

function getElapsedFraction(period: 'weekly' | 'monthly' | 'yearly'): number {
  const now = new Date();
  switch (period) {
    case 'weekly': {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const elapsed = differenceInDays(now, weekStart) + 1;
      return elapsed / 7;
    }
    case 'monthly': {
      const day = now.getDate();
      const daysInMonth = getDaysInMonth(now);
      return day / daysInMonth;
    }
    case 'yearly': {
      const dayOfYear = getDayOfYear(now);
      const daysInYear = getDaysInYear(now);
      return dayOfYear / daysInYear;
    }
  }
}

const dayIndexMap: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const dayNameByIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function getRemainingCalendarDays(period: 'weekly' | 'monthly' | 'yearly'): number {
  const now = new Date();
  switch (period) {
    case 'weekly': {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const elapsed = differenceInDays(now, weekStart) + 1;
      return Math.max(7 - elapsed, 1);
    }
    case 'monthly': {
      const daysInMonth = getDaysInMonth(now);
      return Math.max(daysInMonth - now.getDate(), 1);
    }
    case 'yearly': {
      const daysInYear = getDaysInYear(now);
      return Math.max(daysInYear - getDayOfYear(now), 1);
    }
  }
}

function getOpenDaysRemaining(
  period: 'weekly' | 'monthly' | 'yearly',
  hoursJson?: HoursJson | null,
  holidayClosures?: HolidayClosure[] | null
): { openDays: number; isLocationAware: boolean } {
  if (!hoursJson) {
    return { openDays: getRemainingCalendarDays(period), isLocationAware: false };
  }

  const now = new Date();
  let periodEnd: Date;
  switch (period) {
    case 'weekly':
      periodEnd = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'monthly':
      periodEnd = endOfMonth(now);
      break;
    case 'yearly':
      periodEnd = endOfYear(now);
      break;
  }

  const holidaySet = new Set(
    (holidayClosures || []).map(h => h.date)
  );

  let openCount = 0;
  let current = now;
  while (current <= periodEnd) {
    const dayOfWeek = getDay(current);
    const dayName = dayNameByIndex[dayOfWeek];
    const dayConfig = hoursJson[dayName];
    const dateStr = format(current, 'yyyy-MM-dd');

    const isClosed = dayConfig?.closed === true;
    const isHoliday = holidaySet.has(dateStr);

    if (!isClosed && !isHoliday) {
      openCount++;
    }
    current = addDays(current, 1);
  }

  return { openDays: Math.max(openCount, 1), isLocationAware: true };
}

export function SalesGoalProgress({ 
  current, 
  target, 
  label = 'Monthly Goal',
  className,
  goalPeriod = 'monthly',
  hoursJson,
  holidayClosures,
  onClick,
  isExpanded,
}: SalesGoalProgressProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState('');
  const { formatCurrencyWhole } = useFormatCurrency();
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Set<number>>(new Set());

  // Strip markdown formatting from parsed text
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  };

  // Parse tasks from ---ACTIONS--- block
  const parsedTasks = useMemo(() => {
    if (!guidance) return [];
    const match = guidance.match(/---ACTIONS---\s*([\s\S]*?)(?:---END---|$)/);
    if (!match) return [];
    const rawBlock = match[1].replace(/---END---/g, '').trim();
    const lines = rawBlock.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map((line, i) => {
      const lineMatch = line.match(/^(?:\d+[.)]\s*)?(.+?):\s+(.+)$/);
      const title = stripMarkdown(lineMatch ? lineMatch[1].trim() : line.replace(/^[\d.)\-•]+\s*/, '').trim());
      const description = stripMarkdown(lineMatch ? lineMatch[2].trim() : '');
      const priority: 'high' | 'medium' = i === 0 ? 'high' : 'medium';
      const dueDays = i < 2 ? 2 : i < 4 ? 5 : 7;
      return { title, description, priority, dueDays };
    }).filter(t => t.title.length > 3).slice(0, 8);
  }, [guidance]);

  // Auto-select all when parsed tasks change
  const toggleTaskSelection = (idx: number) => {
    setSelectedTaskIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Reset selection when tasks parse
  useMemo(() => {
    if (parsedTasks.length > 0) {
      setSelectedTaskIndices(new Set(parsedTasks.map((_, i) => i)));
    }
  }, [parsedTasks]);

  const allTasksSelected = parsedTasks.length > 0 && selectedTaskIndices.size === parsedTasks.length;

  // Build selected tasks for RecoveryPlanActions
  const selectedTasksForImplement = parsedTasks
    .filter((_, i) => selectedTaskIndices.has(i))
    .map(t => ({ title: t.title, description: t.description, dueDays: t.dueDays }));

  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = percentage >= 100;
  const remaining = Math.max(target - current, 0);

  const elapsedFraction = getElapsedFraction(goalPeriod);
  const expectedPercentage = elapsedFraction * 100;
  const actualPercentage = target > 0 ? (current / target) * 100 : 0;
  const diff = actualPercentage - expectedPercentage;

  const paceStatus = diff >= 5 ? 'ahead' : diff <= -5 ? 'behind' : 'on-track';
  const { openDays: daysLeft, isLocationAware } = getOpenDaysRemaining(goalPeriod, hoursJson, holidayClosures);
  const neededPerDay = remaining / daysLeft;

  // Projected total: extrapolate current earnings across the full period
  const projectedTotal = elapsedFraction > 0 ? current / elapsedFraction : current;

  const handleGetBackOnTrack = async () => {
    setLoading(true);
    setDialogOpen(true);
    setGuidance('');
    try {
      const { data, error } = await supabase.functions.invoke('ai-insight-guidance', {
        body: {
          type: 'insight',
          category: 'goal-recovery',
          title: `${label} Recovery Plan`,
          description: `We are behind pace on our ${goalPeriod} sales goal. Current revenue: $${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Target: $${target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Shortfall: $${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. We need $${neededPerDay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per day over the next ${daysLeft} open business day${daysLeft !== 1 ? 's' : ''} to hit the goal. Goal period: ${goalPeriod}. Provide specific, immediate action items including promotions, ad campaigns, rebooking pushes, retail initiatives, and upselling strategies calibrated to close this gap.`,
        },
      });
      if (error) throw error;
      setGuidance(data?.guidance || 'Unable to generate guidance at this time.');
    } catch {
      setGuidance('Something went wrong generating your recovery plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div 
        className={cn(
          'flex items-center justify-between text-sm',
          onClick && 'cursor-pointer group'
        )}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      >
        <div className="flex items-center gap-2">
          <Target className={cn(
            'w-4 h-4',
            isComplete ? 'text-chart-2' : 'text-muted-foreground'
          )} />
          <span className="font-medium">{label}</span>
          <MetricInfoTooltip description="Progress toward your configured sales target. Percentage = (Current Revenue ÷ Target) × 100." />
          <SalesGoalsDialog trigger={
            <button 
              className="text-muted-foreground hover:text-foreground transition-colors" 
              aria-label="Edit sales goals"
              onClick={(e) => e.stopPropagation()}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          } />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-xs font-medium',
            isComplete ? 'text-chart-2' : 'text-muted-foreground'
          )}>
            {percentage.toFixed(0)}%
          </span>
          {onClick && (
            <ChevronDown className={cn(
              'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180'
            )} />
          )}
        </div>
      </div>
      
      <Progress 
        value={percentage} 
        className={cn(
          'h-2',
          isComplete && '[&>div]:bg-chart-2'
        )} 
      />
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <BlurredAmount>{formatCurrencyWhole(current)} earned</BlurredAmount>
        {isComplete ? (
          <span className="text-chart-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Goal reached!
          </span>
        ) : (
          <BlurredAmount>{formatCurrencyWhole(remaining)} to go</BlurredAmount>
        )}
      </div>

      {/* Pace indicator */}
      {!isComplete && target > 0 && (
        <div className={cn(
          'flex items-center gap-1.5 text-[11px]',
          paceStatus === 'ahead' && 'text-chart-2',
          paceStatus === 'on-track' && 'text-muted-foreground',
          paceStatus === 'behind' && 'text-destructive'
        )}>
          {paceStatus === 'ahead' && (
            <>
              <TrendingUp className="w-3 h-3" />
              <span>On pace to surpass goal</span>
            </>
          )}
          {paceStatus === 'on-track' && (
            <>
              <Target className="w-3 h-3" />
              <span>On track{daysLeft > 0 && remaining > 0 ? <> · <BlurredAmount>{formatCurrencyWhole(Math.ceil(neededPerDay))}/day</BlurredAmount> needed</> : null}</span>
            </>
          )}
          {paceStatus === 'behind' && (
            <>
              <TrendingDown className="w-3 h-3" />
              <span>Behind pace · <BlurredAmount>{formatCurrencyWhole(Math.round(neededPerDay))}/day</BlurredAmount> needed ({daysLeft} open day{daysLeft !== 1 ? 's' : ''} left)</span>
              <Button
                variant="ghost"
                size={tokens.button.inline}
                onClick={handleGetBackOnTrack}
                disabled={loading}
                className="h-auto py-0.5 px-2 text-[11px] text-muted-foreground hover:text-foreground ml-1 gap-1"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ZuraAvatar size="sm" className="h-4 w-4 text-[7px]" />}
                Get back on track
              </Button>
            </>
          )}
        </div>
      )}

      {/* AI recovery dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" overlayClassName="backdrop-blur-sm bg-black/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ZuraAvatar size="sm" />
              {label} Recovery Plan
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-4 [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:mt-4 [&_h3]:mb-2 [&_li]:leading-relaxed">
                    <ReactMarkdown>{guidance?.replace(/---ACTIONS---[\s\S]*?(---END---|$)/g, '').trim()}</ReactMarkdown>
                  </div>

                  {/* Selectable AI Tasks */}
                  {parsedTasks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <ListChecks className="w-3.5 h-3.5 text-violet-500" />
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
                            AI SUGGESTED TASKS
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTaskIndices(
                              allTasksSelected
                                ? new Set()
                                : new Set(parsedTasks.map((_, i) => i))
                            )
                          }
                          className="text-[11px] text-primary hover:underline"
                        >
                          {allTasksSelected ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {parsedTasks.map((task, i) => {
                          const selected = selectedTaskIndices.has(i);
                          return (
                            <label
                              key={i}
                              className={cn(
                                'flex items-start gap-2.5 py-2 px-2.5 rounded-lg cursor-pointer transition-colors',
                                selected ? 'bg-card/50' : 'opacity-50'
                              )}
                            >
                              <Checkbox
                                checked={selected}
                                onCheckedChange={() => toggleTaskSelection(i)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm leading-snug', !selected && 'line-through text-muted-foreground')}>
                                  {task.title}
                                </p>
                                {task.description && selected && (
                                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                                {selected && (
                                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                    Due in {task.dueDays} day{task.dueDays !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                              <span className={cn(
                                'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-display flex-shrink-0',
                                task.priority === 'high'
                                  ? 'bg-destructive/10 text-destructive'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              )}>
                                {task.priority}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
          {!loading && guidance && (
            <RecoveryPlanActions
              title={`${label} Recovery Plan`}
              content={guidance}
              goalPeriod={goalPeriod}
              targetRevenue={target}
              currentRevenue={current}
              shortfall={remaining}
              selectedTasks={selectedTasksForImplement}
            />
          )}
          <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border/30">
            Powered by {PLATFORM_NAME} AI
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}