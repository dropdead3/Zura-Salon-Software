import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { motion, AnimatePresence } from 'framer-motion';
import { parseISO, getYear, getQuarter } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Star, Clock, Rocket, Bug, Sparkles, Lightbulb, ChevronRight, ChevronUp } from 'lucide-react';
import type { ChangelogEntry } from '@/hooks/useChangelog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVoteChangelog } from '@/hooks/useChangelog';
import { formatDate, formatDateShort } from '@/lib/format';
import { EmptyState } from '@/components/ui/empty-state';

const ENTRY_TYPE_CONFIG: Record<string, { icon: typeof Sparkles; label: string; color: string; dotColor: string }> = {
  update: { icon: Sparkles, label: 'Update', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', dotColor: 'bg-blue-500' },
  feature: { icon: Rocket, label: 'Feature', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', dotColor: 'bg-green-500' },
  bugfix: { icon: Bug, label: 'Bug Fix', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', dotColor: 'bg-red-500' },
  improvement: { icon: Lightbulb, label: 'Improvement', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dotColor: 'bg-amber-500' },
  coming_soon: { icon: Clock, label: 'Coming Soon', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', dotColor: 'bg-purple-500' },
};

interface ChangelogTimelineProps {
  entries: ChangelogEntry[];
}

export function ChangelogTimeline({ entries }: ChangelogTimelineProps) {
  const isMobile = useIsMobile();
  const [selectedEntry, setSelectedEntry] = useState<ChangelogEntry | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const voteChangelog = useVoteChangelog();

  // Group entries by year and quarter
  const groupedEntries = useMemo(() => {
    const groups: Record<string, { label: string; entries: ChangelogEntry[] }> = {};
    
    entries.forEach(entry => {
      const date = entry.published_at ? parseISO(entry.published_at) : new Date();
      const year = getYear(date);
      const quarter = getQuarter(date);
      const key = `${year}-Q${quarter}`;
      
      if (!groups[key]) {
        groups[key] = {
          label: `Q${quarter} ${year}`,
          entries: [],
        };
      }
      groups[key].entries.push(entry);
    });

    // Sort groups by date (newest first)
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, value]) => ({ key, ...value }));
  }, [entries]);

  // Filter for major releases and coming soon for the horizontal timeline
  const timelineItems = useMemo(() => {
    return entries
      .filter(e => e.is_major || e.entry_type === 'coming_soon')
      .sort((a, b) => {
        const dateA = a.published_at || a.release_date || a.created_at;
        const dateB = b.published_at || b.release_date || b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 10);
  }, [entries]);

  const handleVote = (entry: ChangelogEntry) => {
    voteChangelog.mutate({
      changelogId: entry.id,
      vote: !entry.user_voted,
    });
  };

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No changelog entries"
        description="No updates have been published yet."
      />
    );
  }

  // Mobile vertical timeline
  if (isMobile) {
    return (
      <div className="space-y-6">
        {groupedEntries.map(group => (
          <div key={group.key}>
            <h3 className="text-sm font-medium text-muted-foreground mb-4 sticky top-0 bg-background py-2 z-10">
              {group.label}
            </h3>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {group.entries.map((entry, index) => {
                  const typeConfig = ENTRY_TYPE_CONFIG[entry.entry_type] || ENTRY_TYPE_CONFIG.update;
                  const TypeIcon = typeConfig.icon;
                  const date = entry.published_at || entry.created_at;
                  const isExpanded = expandedEntryId === entry.id;
                  const isComingSoon = entry.entry_type === 'coming_soon';
                  
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative pl-10"
                    >
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute left-[10px] w-3 h-3 rounded-full ring-4 ring-background z-10',
                        isComingSoon ? 'bg-background border-2 border-purple-500' : typeConfig.dotColor
                      )}>
                        {entry.is_major && (
                          <Star className="h-2 w-2 text-background absolute -top-0.5 -left-0.5" fill="currentColor" />
                        )}
                      </div>
                      
                      <button
                        onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                        className={cn(
                          'w-full text-left p-4 rounded-xl border bg-card transition-all active:scale-[0.98]',
                          isExpanded && 'ring-2 ring-primary/20'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              {entry.is_major && (
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              )}
                              <Badge className={cn('text-[10px] px-1.5 py-0', typeConfig.color)}>
                                <TypeIcon className="h-2.5 w-2.5 mr-0.5" />
                                {typeConfig.label}
                              </Badge>
                              {entry.version && (
                                <span className="text-[10px] text-muted-foreground">{entry.version}</span>
                              )}
                            </div>
                            <h4 className="font-medium text-sm">{entry.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(date)}
                            </p>
                          </div>
                          <ChevronRight className={cn(
                            'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
                            isExpanded && 'rotate-90'
                          )} />
                        </div>
                        
                        {/* Expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-3 mt-3 border-t">
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {entry.content}
                                </p>
                                
                                {/* Vote button for coming soon */}
                                {isComingSoon && (
                                  <Button
                                    variant={entry.user_voted ? 'default' : 'outline'}
                                    size={tokens.button.card}
                                    className="mt-3 gap-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVote(entry);
                                    }}
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                    <span className="font-medium">{entry.vote_count || 0}</span>
                                    <span>{entry.user_voted ? 'Voted' : 'Vote'}</span>
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop horizontal + vertical timeline
  return (
    <div className="space-y-8">
      {/* Horizontal Timeline - Major Releases */}
      {timelineItems.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">MAJOR MILESTONES</h3>
            <ScrollArea className="w-full">
              <div className="relative pb-4">
                {/* Timeline line */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
                
                {/* Timeline items */}
                <div className="flex gap-8 relative">
                  {timelineItems.map((entry) => {
                    const typeConfig = ENTRY_TYPE_CONFIG[entry.entry_type] || ENTRY_TYPE_CONFIG.update;
                    const isComingSoon = entry.entry_type === 'coming_soon';
                    const date = entry.published_at || entry.release_date || entry.created_at;
                    
                    return (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className={cn(
                          'flex flex-col items-center min-w-[100px] group',
                          selectedEntry?.id === entry.id && 'scale-105'
                        )}
                      >
                        {/* Dot */}
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2 border-background z-10 transition-transform group-hover:scale-125 relative',
                          isComingSoon ? 'bg-background border-purple-500 ring-2 ring-purple-500/20' : typeConfig.dotColor
                        )}>
                          {entry.is_major && (
                            <Star className="h-2.5 w-2.5 text-background absolute top-0.5 left-0.5" fill="currentColor" />
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="mt-3 text-center">
                          <p className="text-xs text-muted-foreground">
                            {formatDateShort(date)}
                          </p>
                          {entry.version && (
                            <p className="text-xs font-medium">{entry.version}</p>
                          )}
                          <p className="text-sm font-medium line-clamp-2 max-w-[100px] mt-1">
                            {entry.title}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Selected Entry Detail */}
      <AnimatePresence mode="wait">
        {selectedEntry && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedEntry.is_major && (
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                      )}
                      <Badge className={cn('text-xs', ENTRY_TYPE_CONFIG[selectedEntry.entry_type]?.color)}>
                        {ENTRY_TYPE_CONFIG[selectedEntry.entry_type]?.label}
                      </Badge>
                      {selectedEntry.version && (
                        <Badge variant="outline">{selectedEntry.version}</Badge>
                      )}
                    </div>
                    <h3 className="text-xl font-medium mb-2">{selectedEntry.title}</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedEntry.content}</p>
                    
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      {selectedEntry.published_at && (
                        <span>{formatDate(selectedEntry.published_at)}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size={tokens.button.inline}
                    onClick={() => setSelectedEntry(null)}
                  >
                    ✕
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vertical Timeline by Quarter */}
      <div className="space-y-6">
        {groupedEntries.map(group => (
          <div key={group.key}>
            <h3 className="text-sm font-medium text-muted-foreground mb-4 sticky top-0 bg-background py-2">
              {group.label}
            </h3>
            <div className="relative pl-6 border-l-2 border-border space-y-4">
              {group.entries.map(entry => {
                const typeConfig = ENTRY_TYPE_CONFIG[entry.entry_type] || ENTRY_TYPE_CONFIG.update;
                const TypeIcon = typeConfig.icon;
                const date = entry.published_at || entry.created_at;
                
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative"
                  >
                    {/* Dot on timeline */}
                    <div className={cn(
                      'absolute -left-[29px] w-3 h-3 rounded-full',
                      typeConfig.dotColor
                    )} />
                    
                    <Card
                      className={cn(
                        'cursor-pointer hover:shadow-md transition-shadow',
                        selectedEntry?.id === entry.id && 'ring-2 ring-primary'
                      )}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {entry.is_major && (
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                              )}
                              <Badge className={cn('text-xs', typeConfig.color)}>
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {typeConfig.label}
                              </Badge>
                              {entry.version && (
                                <span className="text-xs text-muted-foreground">{entry.version}</span>
                              )}
                            </div>
                            <h4 className="font-medium">{entry.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {entry.content}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">
                              {formatDateShort(date)}
                            </p>
                            <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 ml-auto" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
