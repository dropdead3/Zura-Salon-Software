import { memo, useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  useAnomalies, 
  useAcknowledgeAnomaly, 
  getAnomalyIcon, 
  getAnomalyLabel 
} from '@/hooks/useAnomalies';
import { cn } from '@/lib/utils';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';

interface AnomalyAlertBannerProps {
  className?: string;
}

const severityStyles = {
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-700',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
  critical: 'bg-rose-500/10 border-rose-500/30 text-rose-700',
};

const severityBadgeStyles = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-rose-100 text-rose-700',
};

function AnomalyAlertBannerComponent({ className }: AnomalyAlertBannerProps) {
  const { formatDate } = useFormatDate();
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: anomalies, isLoading } = useAnomalies(true);
  const acknowledgeAnomaly = useAcknowledgeAnomaly();

  if (isLoading || !anomalies || anomalies.length === 0) {
    return null;
  }

  // Sort by severity (critical first)
  const sortedAnomalies = [...anomalies].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const topAnomaly = sortedAnomalies[0];
  const hasMultiple = sortedAnomalies.length > 1;

  const handleAcknowledge = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await acknowledgeAnomaly.mutateAsync({ anomalyId: id });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={className}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className={cn(
          'border rounded-lg overflow-hidden',
          severityStyles[topAnomaly.severity]
        )}>
          {/* Main banner */}
          <CollapsibleTrigger asChild>
            <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-black/5 transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getAnomalyIcon(topAnomaly.anomaly_type)}</span>
                    <span className="font-medium">
                      {getAnomalyLabel(topAnomaly.anomaly_type)}
                    </span>
                    <Badge className={severityBadgeStyles[topAnomaly.severity]}>
                      {topAnomaly.severity}
                    </Badge>
                  </div>
                  <p className="text-sm opacity-80">
                    {topAnomaly.deviation_percent > 0 ? '+' : ''}
                    {Math.round(topAnomaly.deviation_percent)}% deviation from expected
                    {hasMultiple && ` · ${sortedAnomalies.length - 1} more alert${sortedAnomalies.length > 2 ? 's' : ''}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size={tokens.button.inline}
                  variant="ghost"
                  onClick={(e) => handleAcknowledge(topAnomaly.id, e)}
                  disabled={acknowledgeAnomaly.isPending}
                  className="gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Acknowledge
                </Button>
                {hasMultiple && (
                  isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )
                )}
              </div>
            </div>
          </CollapsibleTrigger>

          {/* Expanded list */}
          <CollapsibleContent>
            <div className="border-t border-current/10">
              <AnimatePresence>
                {sortedAnomalies.slice(1).map((anomaly, index) => (
                  <motion.div
                    key={anomaly.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'p-3 flex items-center justify-between border-b border-current/10 last:border-b-0',
                      severityStyles[anomaly.severity]
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getAnomalyIcon(anomaly.anomaly_type)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {getAnomalyLabel(anomaly.anomaly_type)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {anomaly.severity}
                          </Badge>
                        </div>
                        <p className="text-xs opacity-70">
                          {formatDate(parseISO(anomaly.detected_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">
                        {anomaly.deviation_percent > 0 ? '+' : ''}
                        {Math.round(anomaly.deviation_percent)}%
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => handleAcknowledge(anomaly.id, e)}
                        disabled={acknowledgeAnomaly.isPending}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.div>
  );
}

export const AnomalyAlertBanner = memo(AnomalyAlertBannerComponent);
