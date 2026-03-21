import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseISO } from 'date-fns';
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
import { X, ChevronUp, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { type FeatureRequest, FEATURE_CATEGORIES, FEATURE_STATUSES } from '@/hooks/useFeatureRequests';

interface MobileFeatureRequestViewerProps {
  requests: FeatureRequest[];
  open: boolean;
  initialIndex?: number;
  onClose: () => void;
  onVote: (request: FeatureRequest) => void;
}

export function MobileFeatureRequestViewer({
  requests,
  open,
  initialIndex = 0,
  onClose,
  onVote,
}: MobileFeatureRequestViewerProps) {
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
            {currentIndex + 1} of {requests.length}
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
              {requests.map((request) => {
                const categoryConfig = FEATURE_CATEGORIES.find(c => c.value === request.category);
                const statusConfig = FEATURE_STATUSES.find(s => s.value === request.status);
                
                return (
                  <CarouselItem key={request.id} className="h-full">
                    <ScrollArea className="h-full">
                      <div className="p-6 pb-32 flex flex-col items-center">
                        {/* Vote Count - Large Display */}
                        <motion.div
                          className="mb-6 flex flex-col items-center"
                          whileTap={{ scale: 0.95 }}
                        >
                          <button
                            onClick={() => onVote(request)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-6 rounded-xl transition-all',
                              request.user_voted
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted hover:bg-muted/80'
                            )}
                          >
                            <ChevronUp className="h-8 w-8" />
                            <span className="text-4xl font-medium">{request.vote_count || 0}</span>
                            <span className="text-sm">
                              {request.user_voted ? 'You voted!' : 'votes'}
                            </span>
                          </button>
                        </motion.div>

                        {/* Title */}
                        <h2 className="text-2xl font-medium text-center mb-4">{request.title}</h2>

                        {/* Badges */}
                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                          <Badge variant="outline" className="text-xs">
                            {categoryConfig?.label || request.category}
                          </Badge>
                          {statusConfig && (
                            <Badge 
                              className="text-xs"
                              style={{ 
                                backgroundColor: `${statusConfig.color}20`,
                                color: statusConfig.color,
                              }}
                            >
                              {statusConfig.label}
                            </Badge>
                          )}
                        </div>

                        {/* Description */}
                        <div className="prose prose-sm dark:prose-invert max-w-none text-center">
                          <p className="text-muted-foreground leading-relaxed">
                            {request.description}
                          </p>
                        </div>

                        {/* Submitter */}
                        <p className="text-xs text-muted-foreground mt-6">
                          Submitted by {request.submitter_name}
                          {request.created_at && (
                            <> • {formatDate(parseISO(request.created_at), 'MMM d, yyyy')}</>
                          )}
                        </p>

                        {/* Admin Response */}
                        {request.admin_response && (
                          <div className="mt-6 p-4 bg-muted/50 rounded-xl border-l-4 border-primary w-full">
                            <p className="text-xs text-muted-foreground mb-1 font-medium">Team Response</p>
                            <p className="text-sm">{request.admin_response}</p>
                          </div>
                        )}

                        {/* Vote CTA Button */}
                        <Button
                          variant={request.user_voted ? 'default' : 'outline'}
                          size={tokens.button.hero}
                          className="mt-8 gap-2"
                          onClick={() => onVote(request)}
                        >
                          <Heart className={cn('h-5 w-5', request.user_voted && 'fill-current')} />
                          {request.user_voted ? 'Remove Vote' : 'Vote for This'}
                        </Button>
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
            {requests.map((_, index) => (
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
          {currentIndex === 0 && requests.length > 1 && (
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
                <span>Swipe to explore</span>
                <ChevronRight className="h-3 w-3" />
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
