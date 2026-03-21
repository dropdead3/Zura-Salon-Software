import { memo, useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, RefreshCw, Calendar, Clock, ChevronDown, ChevronUp, TrendingUp, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SlotSuggestionCard } from './SlotSuggestionCard';
import { useSchedulingSuggestions, useSuggestionHistory } from '@/hooks/useSchedulingSuggestions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SchedulingCopilotPanelProps {
  date: Date;
  locationId?: string;
  serviceDurationMinutes?: number;
  staffUserId?: string;
  onSelectSlot?: (time: string, staffUserId: string) => void;
  onClose?: () => void;
  className?: string;
}

function SchedulingCopilotPanelComponent({
  date,
  locationId,
  serviceDurationMinutes = 60,
  staffUserId,
  onSelectSlot,
  onClose,
  className,
}: SchedulingCopilotPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch, isFetching } = useSchedulingSuggestions({
    date,
    locationId,
    serviceDurationMinutes,
    staffUserId,
  });

  const { data: history } = useSuggestionHistory(30);

  const visibleSuggestions = (data?.suggestions || []).filter(
    (s, i) => !dismissedIds.has(`${s.time}-${s.staffUserId}-${i}`)
  );

  const handleAccept = (suggestion: typeof visibleSuggestions[0]) => {
    onSelectSlot?.(suggestion.time, suggestion.staffUserId);
  };

  const handleDismiss = (suggestion: typeof visibleSuggestions[0], index: number) => {
    setDismissedIds(prev => new Set([...prev, `${suggestion.time}-${suggestion.staffUserId}-${index}`]));
  };

  const handleRefresh = () => {
    setDismissedIds(new Set());
    refetch();
  };

  return (
    <Card className={cn('border-primary/20', className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base font-medium">AI Scheduling Copilot</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={isFetching}
              >
                <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              {onClose && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Context info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(date, 'EEE, MMM d')}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {serviceDurationMinutes} min service
            </div>
            {history && history.total > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {history.rate}% acceptance rate
              </div>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm mb-2">Unable to load suggestions</p>
                <Button variant="outline" size={tokens.button.card} onClick={handleRefresh}>
                  Try Again
                </Button>
              </div>
            ) : visibleSuggestions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground"
              >
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {data?.suggestions.length === 0
                    ? 'No optimal slots found for this configuration'
                    : 'All suggestions dismissed'}
                </p>
                {dismissedIds.size > 0 && (
                  <Button
                    variant="link"
                    size={tokens.button.inline}
                    onClick={() => setDismissedIds(new Set())}
                    className="mt-2"
                  >
                    Show dismissed suggestions
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {visibleSuggestions.map((suggestion, index) => (
                    <SlotSuggestionCard
                      key={`${suggestion.time}-${suggestion.staffUserId}-${index}`}
                      suggestion={suggestion}
                      onAccept={() => handleAccept(suggestion)}
                      onDismiss={() => handleDismiss(suggestion, index)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Summary footer */}
            {data && !isLoading && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {data.existingCount} existing appointments on {format(date, 'MMM d')}
                </span>
                <span>
                  {visibleSuggestions.length} of {data.suggestions.length} suggestions shown
                </span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export const SchedulingCopilotPanel = memo(SchedulingCopilotPanelComponent);
