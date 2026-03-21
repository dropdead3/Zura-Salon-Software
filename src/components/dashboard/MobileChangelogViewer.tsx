import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseISO, isThisYear } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { X, Star, ChevronUp, ChevronLeft, ChevronRight, Clock, Rocket, Bug, Sparkles, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import type { ChangelogEntry } from '@/hooks/useChangelog';

const ENTRY_TYPE_CONFIG: Record<string, { icon: typeof Sparkles; label: string; color: string }> = {
  update: { icon: Sparkles, label: 'Update', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  feature: { icon: Rocket, label: 'Feature', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  bugfix: { icon: Bug, label: 'Bug Fix', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  improvement: { icon: Lightbulb, label: 'Improvement', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  coming_soon: { icon: Clock, label: 'Coming Soon', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
};

interface MobileChangelogViewerProps {
  entries: ChangelogEntry[];
  open: boolean;
  initialIndex?: number;
  onClose: () => void;
  onVote?: (entry: ChangelogEntry) => void;
}

export function MobileChangelogViewer({
  entries,
  open,
  initialIndex = 0,
  onClose,
  onVote,
}: MobileChangelogViewerProps) {
  const { formatDate } = useFormatDate();
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (!api) return;
    
    api.scrollTo(initialIndex, true);
    
    api.on('select', () => {
      setCurrentIndex(api.selectedScrollSnap());
    });
  }, [api, initialIndex]);

  const formatEntryDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return isThisYear(date) ? formatDate(date, 'MMMM d') : formatDate(date, 'MMMM d, yyyy');
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <Button variant="ghost" size={tokens.button.inline} onClick={onClose}>
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <span className="text-sm font-medium">
            {currentIndex + 1} of {entries.length}
          </span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Carousel */}
        <div className="flex-1 overflow-hidden">
          <Carousel
            setApi={setApi}
            className="h-full"
            opts={{
              startIndex: initialIndex,
              loop: false,
            }}
          >
            <CarouselContent className="h-full">
              {entries.map((entry) => {
                const typeConfig = ENTRY_TYPE_CONFIG[entry.entry_type] || ENTRY_TYPE_CONFIG.update;
                const TypeIcon = typeConfig.icon;
                
                return (
                  <CarouselItem key={entry.id} className="h-full">
                    <ScrollArea className="h-full">
                      <div className="p-6 pb-24">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {entry.is_major && (
                            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                          )}
                          {!entry.is_read && (
                            <Badge variant="default" className="text-xs">NEW</Badge>
                          )}
                          <Badge className={cn('text-xs', typeConfig.color)}>
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {typeConfig.label}
                          </Badge>
                          {entry.version && (
                            <Badge variant="outline" className="text-xs">{entry.version}</Badge>
                          )}
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-medium mb-4">{entry.title}</h2>

                        {/* Date */}
                        <p className="text-sm text-muted-foreground mb-6">
                          {entry.published_at && formatEntryDate(entry.published_at)}
                          {entry.release_date && entry.entry_type === 'coming_soon' && (
                            <> • Expected: {formatEntryDate(entry.release_date)}</>
                          )}
                        </p>

                        {/* Content */}
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                            {entry.content}
                          </p>
                        </div>

                        {/* Vote Button for Coming Soon */}
                        {entry.entry_type === 'coming_soon' && onVote && (
                          <div className="mt-8 flex justify-center">
                            <Button
                              variant={entry.user_voted ? 'default' : 'outline'}
                              size={tokens.button.hero}
                              className="gap-3"
                              onClick={() => onVote(entry)}
                            >
                              <ChevronUp className="h-5 w-5" />
                              <span className="font-medium">{entry.vote_count || 0}</span>
                              <span>{entry.user_voted ? 'Voted!' : 'Vote for this'}</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Dot Indicators */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t py-4">
          <div className="flex justify-center items-center gap-2">
            {entries.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  'h-2 rounded-full transition-all duration-200',
                  index === currentIndex
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
          
          {/* Swipe Hint */}
          {currentIndex === 0 && entries.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 mt-2 text-muted-foreground"
            >
              <motion.div
                animate={{ x: [0, 8, 0] }}
                transition={{ repeat: 3, duration: 0.8 }}
                className="flex items-center gap-1 text-xs"
              >
                <span>Swipe to navigate</span>
                <ChevronRight className="h-3 w-3" />
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
