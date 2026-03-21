import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { PLATFORM_NAME } from '@/lib/brand';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCardInsight, type CardActionItem } from '@/hooks/useCardInsight';
import { useTasks } from '@/hooks/useTasks';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Plus, Check, ChevronDown, ChevronUp, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, format } from 'date-fns';
import { RecoveryPlanActions } from '@/components/dashboard/sales/RecoveryPlanActions';

const priorityBadge: Record<string, string> = {
  high: 'bg-red-500/10 text-red-600 dark:text-red-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

interface ZuraCardInsightProps {
  cardName: string;
  metricData?: Record<string, string | number>;
  dateRange?: string;
  locationName?: string;
}

export function ZuraCardInsight({ cardName, metricData, dateRange, locationName }: ZuraCardInsightProps) {
  const [open, setOpen] = useState(false);
  const { insight, actionItems, isLoading, fetchInsight, clearInsight } = useCardInsight({
    cardName,
    metricData,
    dateRange,
    locationName,
  });

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !insight) {
      fetchInsight();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button
          className="p-0.5 rounded-full hover:bg-primary/10 transition-colors cursor-pointer h-7 w-7 flex items-center justify-center"
          title={`${PLATFORM_NAME} AI Analysis`}
          aria-label={`Get ${PLATFORM_NAME} AI analysis for ${cardName}`}
        >
          <ZuraAvatar size="sm" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden gap-0"
        overlayClassName="backdrop-blur-sm bg-black/60"
      >
        {/* Premium Header */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <ZuraAvatar size="md" />
            <div>
              <p className="font-display text-base font-medium tracking-wide">{PLATFORM_NAME} AI</p>
              <p className="text-xs text-muted-foreground mt-0.5">{cardName}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
              <Skeleton className="h-4 w-4/6 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
            </div>
          ) : insight ? (
            <div className="space-y-6">
              {/* Markdown Analysis */}
              <div className="text-sm leading-relaxed">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="font-display font-medium text-lg tracking-wide mt-6 mb-3 first:mt-0 text-foreground" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="font-display font-medium text-base tracking-wide mt-6 mb-2 first:mt-0 text-foreground" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="font-display font-medium text-sm tracking-wide uppercase mt-6 mb-2 first:mt-0 text-foreground/90" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="mb-4 last:mb-0 leading-relaxed text-muted-foreground" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="mb-4 last:mb-0 space-y-1.5 list-disc list-inside text-muted-foreground" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="mb-4 last:mb-0 space-y-1.5 list-decimal list-inside text-muted-foreground" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="leading-relaxed" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-medium text-foreground" {...props} />
                    ),
                    hr: ({ node, ...props }) => (
                      <hr className="my-4 border-border/50" {...props} />
                    ),
                  }}
                >
                  {insight}
                </ReactMarkdown>
              </div>

              {/* Interactive Action Items */}
              {actionItems.length > 0 && (
                <ActionItemsSection actionItems={actionItems} />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Click to analyze this card.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/50 bg-muted/30 space-y-3">
          {insight && (
            <RecoveryPlanActions
              title={cardName}
              content={insight}
              planType="card_insight"
            />
          )}
          <p className="text-[10px] text-muted-foreground text-center tracking-wide">Powered by {PLATFORM_NAME} AI</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionItemsSection({ actionItems }: { actionItems: CardActionItem[] }) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  const { createTask } = useTasks();

  const toggleExpand = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAddTask = (item: CardActionItem, index: number) => {
    const priorityMap: Record<string, 'low' | 'normal' | 'high'> = {
      low: 'low',
      medium: 'normal',
      high: 'high',
    };

    const dueDate = item.dueInDays
      ? format(addDays(new Date(), item.dueInDays), 'yyyy-MM-dd')
      : undefined;

    createTask.mutate({
      title: item.title,
      priority: priorityMap[item.priority] || 'normal',
      due_date: dueDate,
      source: 'ai_insights',
    });

    setAddedItems(prev => new Set(prev).add(index));
  };

  return (
    <div className="border-t border-border/50 pt-5">
      <div className="flex items-center gap-1.5 mb-3">
        <ListChecks className="w-3.5 h-3.5 text-violet-500" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
          ACTIONABLE NEXT STEPS
        </span>
      </div>

      <div className="space-y-3">
        {actionItems.map((item, i) => {
          const isAdded = addedItems.has(i);
          const isExpanded = expandedItems.has(i);

          return (
            <div
              key={i}
              className={cn(
                'rounded-lg border border-border/50 transition-all',
                isAdded && 'opacity-60'
              )}
            >
              {/* Item Header */}
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {isAdded ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <div className="w-4 h-4 rounded border border-border" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className={cn(
                      'text-sm font-medium leading-snug flex-1',
                      isAdded && 'line-through text-muted-foreground'
                    )}>
                      {item.title}
                    </p>
                    <span className={cn(
                      'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-display flex-shrink-0',
                      priorityBadge[item.priority],
                    )}>
                      {item.priority}
                    </span>
                  </div>

                  {item.dueInDays && !isAdded && (
                    <p className="text-[10px] text-muted-foreground/70 mb-2">
                      Due in {item.dueInDays} day{item.dueInDays !== 1 ? 's' : '')}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {!isAdded && (
                      <Button
                        variant="outline"
                        size={tokens.button.inline}
                        className="h-7 px-3 text-[11px] font-medium gap-1"
                        onClick={() => handleAddTask(item, i)}
                      >
                        <Plus className="w-3 h-3" />
                        Add to Tasks
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size={tokens.button.inline}
                      className="h-7 px-3 text-[11px] font-medium gap-1 text-muted-foreground"
                      onClick={() => toggleExpand(i)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          Learn More
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expandable Details */}
              {isExpanded && item.details && (
                <div className="px-4 pb-3 pt-0 ml-7 border-t border-border/40 mt-1">
                  <div className="pt-3 text-xs leading-relaxed text-muted-foreground">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="space-y-1 list-decimal list-inside" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="space-y-1 list-disc list-inside" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="leading-relaxed" {...props} />
                        ),
                        a: ({ node, href, ...props }) => (
                          <a
                            href={href}
                            className="text-primary underline underline-offset-2 hover:text-primary/80"
                            {...props}
                          />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-medium text-foreground" {...props} />
                        ),
                      }}
                    >
                      {item.details}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
