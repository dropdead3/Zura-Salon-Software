import { useState, useEffect, useCallback } from 'react';
import { SilverShineButton } from '@/components/dashboard/SilverShineButton';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { usePersonalInsights } from '@/hooks/usePersonalInsights';
import { GuidancePanel } from './GuidancePanel';
import { InsightDescriptionWithLinks } from './InsightDescriptionWithLinks';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PLATFORM_NAME } from '@/lib/brand';
import {
  Brain,
  RefreshCw,
  TrendingUp,
  Users,
  AlertTriangle,
  Activity,
  HeartPulse,
  Calendar,
  Lightbulb,
  CheckCircle2,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CheckCheck,
  ThumbsUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import type { InsightItem, ActionItem } from '@/hooks/useAIInsights';

// Personal insight categories
type PersonalCategory = 'my_performance' | 'my_clients' | 'my_schedule' | 'growth_tip' | 'anomaly';

const personalCategoryConfig: Record<PersonalCategory, { icon: typeof TrendingUp; label: string }> = {
  my_performance: { icon: TrendingUp, label: 'My Performance' },
  my_clients: { icon: HeartPulse, label: 'My Clients' },
  my_schedule: { icon: Calendar, label: 'My Work Days' },
  growth_tip: { icon: Lightbulb, label: 'Growth Tip' },
  anomaly: { icon: AlertTriangle, label: 'Anomaly' },
};

const severityStyles: Record<string, string> = {
  info: 'border-l-blue-500/60 bg-blue-500/5',
  warning: 'border-l-amber-500/60 bg-amber-500/5',
  critical: 'border-l-red-500/60 bg-red-500/5',
};

const priorityBadge: Record<string, string> = {
  high: 'bg-red-500/10 text-red-600 dark:text-red-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

const sentimentConfig = {
  positive: { icon: ThumbsUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  neutral: { icon: Activity, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  concerning: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
};

interface GuidanceRequest {
  type: 'insight' | 'action';
  title: string;
  description: string;
  category?: string;
  priority?: string;
}

const slideVariants = {
  enterFromRight: { x: '100%', opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitToRight: { x: '100%', opacity: 0 },
};

function GuidanceTrigger({ label, onClick, icon: IconOverride }: { label: string; onClick: () => void; icon?: React.ComponentType<{ className?: string }> }) {
  const Icon = IconOverride || CheckCheck;
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-1 h-6 px-2 mt-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors duration-200"
    >
      <Icon className="w-3 h-3" />
      {label}
      <ChevronRight className="w-3 h-3 relative top-px opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
    </button>
  );
}

function PersonalInsightCard({ insight, onRequestGuidance }: { insight: InsightItem; onRequestGuidance: (req: GuidanceRequest) => void }) {
  const cat = insight.category as PersonalCategory;
  const config = personalCategoryConfig[cat] || personalCategoryConfig.my_performance;
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-border/50 p-3 transition-colors">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex-shrink-0 text-muted-foreground">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
              {config.label}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug">{insight.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            <InsightDescriptionWithLinks description={insight.description} />
          </p>
          <GuidanceTrigger
            label="How to improve"
            icon={Lightbulb}
            onClick={() => onRequestGuidance({ type: 'insight', title: insight.title, description: insight.description, category: insight.category })}
          />
        </div>
      </div>
    </div>
  );
}

function PersonalActionCard({ item, index, onRequestGuidance }: { item: ActionItem; index: number; onRequestGuidance: (req: GuidanceRequest) => void }) {
  return (
    <div className="py-1.5">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-foreground/5 flex items-center justify-center mt-0.5">
          <span className="text-[10px] font-display">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">
            <InsightDescriptionWithLinks description={item.action} />
          </p>
          <GuidanceTrigger
            label="What you should do"
            onClick={() => onRequestGuidance({ type: 'action', title: item.action, description: item.action, priority: item.priority })}
          />
        </div>
        <span className={cn(
          'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-display flex-shrink-0',
          priorityBadge[item.priority],
        )}>
          {item.priority}
        </span>
      </div>
    </div>
  );
}

interface PersonalInsightsDrawerProps {
  /** Override the collapsed trigger label. */
  label?: string;
  /** Controlled expanded state */
  expanded?: boolean;
  /** Toggle callback for controlled mode */
  onToggle?: () => void;
}

export function PersonalInsightsDrawer({ label, expanded: controlledExpanded, onToggle }: PersonalInsightsDrawerProps) {
  const isControlled = onToggle !== undefined;
  const { data } = usePersonalInsights();

  const sentiment = data?.overallSentiment ? sentimentConfig[data.overallSentiment] : null;
  const SentimentIcon = sentiment?.icon || Activity;
  const expanded = isControlled ? (controlledExpanded ?? false) : false;

  // In controlled mode, only render the trigger button
  if (isControlled) {
    return (
      <SilverShineButton
        onClick={onToggle}
        className={expanded ? 'ring-1 ring-accent/50' : undefined}
      >
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0">
          <Brain className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="truncate">{label ?? 'My Insights'}</span>
        {sentiment && SentimentIcon && (
          <div className={cn('w-4 h-4 rounded-full flex items-center justify-center', sentiment.bg)}>
            <SentimentIcon className={cn('w-2.5 h-2.5', sentiment.color)} />
          </div>
        )}
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
        )}
      </SilverShineButton>
    );
  }

  // Uncontrolled fallback — just the trigger
  return (
    <SilverShineButton onClick={() => {}}>
      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0">
        <Brain className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
      </div>
      <span className="truncate">{label ?? 'My Insights'}</span>
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
    </SilverShineButton>
  );
}

/** Full-width panel for Personal Insights — rendered outside the control row */
export function PersonalInsightsPanel({ onClose }: { onClose: () => void }) {
  const { data, generatedAt, isLoading, isRefreshing, isStale, refresh, cooldownRemaining } = usePersonalInsights();
  const [cooldown, setCooldown] = useState(0);
  const [activeGuidance, setActiveGuidance] = useState<GuidanceRequest | null>(null);
  const [guidanceText, setGuidanceText] = useState<string | null>(null);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);

  // Escape key closes panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (cooldownRemaining <= 0) { setCooldown(0); return; }
    setCooldown(Math.ceil(cooldownRemaining / 1000));
    const interval = setInterval(() => {
      setCooldown(prev => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const handleRequestGuidance = useCallback(async (req: GuidanceRequest) => {
    setActiveGuidance(req);
    setGuidanceText(null);
    setIsLoadingGuidance(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-insight-guidance', {
        body: { type: req.type, title: req.title, description: req.description, category: req.category, priority: req.priority },
      });
      if (error) throw error;
      setGuidanceText(data.guidance);
    } catch (err) {
      console.error('Failed to fetch guidance:', err);
      toast.error('Failed to get guidance. Please try again.');
      setActiveGuidance(null);
    } finally {
      setIsLoadingGuidance(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    setActiveGuidance(null);
    setGuidanceText(null);
  }, []);

  const sentiment = data?.overallSentiment ? sentimentConfig[data.overallSentiment] : null;
  const SentimentIcon = sentiment?.icon || Activity;

  return (
    <div className="w-full rounded-xl shadow-lg border border-border/40 bg-card overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

      {!activeGuidance && (
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="font-display text-sm tracking-[0.15em]">{PLATFORM_NAME.toUpperCase()} PERSONAL INSIGHTS</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refresh(true)} disabled={isRefreshing || cooldown > 0}>
                <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin'} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <AnimatePresence initial={false} mode="wait">
          {!activeGuidance ? (
            <motion.div
              key="insights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="max-h-[65vh] overflow-y-auto"
                onWheel={(e) => e.stopPropagation()}
              >
                {data && (
                  <div className="flex items-start gap-2 px-4 pb-3">
                    <div className={cn('flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center', sentiment?.bg)}>
                      <SentimentIcon className={cn('w-3 h-3', sentiment?.color)} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground leading-snug">{data.summaryLine}</p>
                      {generatedAt && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Updated {formatDistanceToNow(new Date(generatedAt), { addSuffix: true })}
                          {isStale && ' · Stale'}
                          {cooldown > 0 && ` · ${cooldown}s cooldown`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="px-4 pb-3">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-1.5">
                          <Skeleton className="w-20 h-3 rounded" />
                          <Skeleton className="w-full h-4 rounded" />
                          <Skeleton className="w-3/4 h-3 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : !data ? (
                    <div className="text-center py-14">
                      <ZuraAvatar size="md" className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-display text-muted-foreground">No personal insights yet</p>
                      <Button variant="outline" size={tokens.button.card} onClick={() => refresh(true)} disabled={isRefreshing} className="gap-1.5 mt-3">
                        <Brain className="w-3.5 h-3.5" />
                        Generate My Insights
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {(data.insights.length > 0 || data.actionItems.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {data.insights.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Brain className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-display font-medium">Personal Insights</span>
                                <div className="flex-1 h-px bg-border/40" />
                              </div>
                              <div className="space-y-2">
                                {data.insights.map((insight, i) => (
                                  <PersonalInsightCard key={i} insight={insight} onRequestGuidance={handleRequestGuidance} />
                                ))}
                              </div>
                            </div>
                          )}
                          {data.actionItems.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-display font-medium">Your Next Steps</span>
                                <div className="flex-1 h-px bg-border/40" />
                              </div>
                              <div className="space-y-1 rounded-lg border border-border/30 bg-muted/10 px-5 py-3">
                                {data.actionItems.map((item, i) => (
                                  <PersonalActionCard key={i} item={item} index={i} onRequestGuidance={handleRequestGuidance} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 pb-4 pt-1">
                <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border/50">
                  <ZuraAvatar size="sm" className="w-3 h-3 opacity-40" />
                  <span className="text-[10px] text-muted-foreground/50">{`Powered by ${PLATFORM_NAME} AI · Your personal data only`}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="guidance"
              initial={slideVariants.enterFromRight}
              animate={slideVariants.center}
              exit={slideVariants.exitToRight}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="h-[500px] flex flex-col"
            >
              <GuidancePanel
                title={activeGuidance.title}
                type={activeGuidance.type}
                guidance={guidanceText}
                isLoading={isLoadingGuidance}
                onBack={handleBack}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
