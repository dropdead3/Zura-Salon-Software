import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { useActiveRecommendation } from '@/hooks/useLeverRecommendations';
import { WeeklyLeverBrief } from '@/components/executive-brief/WeeklyLeverBrief';
import { SilenceState } from '@/components/executive-brief/SilenceState';
import { EnforcementGateBanner } from '@/components/enforcement/EnforcementGateBanner';
import { Loader2 as Loader2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useZuraNavigationSafe } from '@/contexts/ZuraNavigationContext';
import { PLATFORM_NAME } from '@/lib/brand';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { VisibilityGate } from '@/components/visibility';
import { PinnableCard } from './PinnableCard';
import { useAIInsights, type InsightItem, type ActionItem, type FeatureSuggestion } from '@/hooks/useAIInsights';
import { useDismissedSuggestions } from '@/hooks/useDismissedSuggestions';
import { useTasks } from '@/hooks/useTasks';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { GuidancePanel } from './GuidancePanel';
import { InsightDescriptionWithLinks } from './InsightDescriptionWithLinks';

import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Brain,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  Activity,
  HeartPulse,
  CheckCircle2,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  CheckCheck,
  Lightbulb,
  Zap,
  ThumbsUp,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';

const categoryConfig: Record<InsightItem['category'], { icon: typeof TrendingUp; label: string }> = {
  revenue_pulse: { icon: DollarSign, label: 'Revenue Pulse' },
  cash_flow: { icon: TrendingDown, label: 'Cash Flow' },
  capacity: { icon: Activity, label: 'Capacity' },
  staffing: { icon: Users, label: 'Staffing' },
  client_health: { icon: HeartPulse, label: 'Client Health' },
  anomaly: { icon: AlertTriangle, label: 'Anomaly' },
};

const severityStyles: Record<InsightItem['severity'], string> = {
  info: 'border-l-blue-500/60 bg-blue-500/5',
  warning: 'border-l-amber-500/60 bg-amber-500/5',
  critical: 'border-l-red-500/60 bg-red-500/5',
};

const severityIconColor: Record<InsightItem['severity'], string> = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  critical: 'text-red-500',
};

const priorityBadge: Record<ActionItem['priority'], string> = {
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
  enterFromLeft: { x: '-100%', opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitToLeft: { x: '-100%', opacity: 0 },
  exitToRight: { x: '100%', opacity: 0 },
};

function blurDollarAmounts(text: string) {
  const parts = text.split(/(\$[\d,]+\.?\d*)/g);
  return parts.map((part, i) => {
    if (/^\$[\d,]+\.?\d*$/.test(part)) {
      return <BlurredAmount key={i}>{part}</BlurredAmount>;
    }
    return part;
  });
}

function blurFinancialValues(text: string) {
  const parts = text.split(/(\$[\d,]+\.?\d*k?)/g);
  return parts.map((part, i) => {
    if (/^\$[\d,]+\.?\d*k?$/.test(part)) {
      return <BlurredAmount key={i}>{part}</BlurredAmount>;
    }
    return part;
  });
}

function GuidanceTrigger({ label, onClick, icon: IconOverride, hideIcon }: { label: string; onClick: () => void; icon?: React.ComponentType<{ className?: string }>; hideIcon?: boolean }) {
  const Icon = IconOverride || CheckCheck;
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-1 h-6 px-2 mt-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors duration-200"
    >
      {!hideIcon && <Icon className="w-3 h-3" />}
      {label}
      <ChevronRight className="w-3 h-3 relative top-px opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
    </button>
  );
}

function SectionHeader({ icon: Icon, label, iconColor }: { icon: typeof TrendingUp; label: string; iconColor?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={cn("w-3.5 h-3.5", iconColor || "text-muted-foreground")} />
      <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-display font-medium">{label}</span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

function InsightCard({ insight, onRequestGuidance }: { insight: InsightItem; onRequestGuidance: (req: GuidanceRequest) => void }) {
  const config = categoryConfig[insight.category];
  const Icon = config?.icon || Activity;

  return (
    <div className={cn('border-l-2 rounded-lg p-3.5 transition-colors', severityStyles[insight.severity])}>
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-background/50 mt-0.5', severityIconColor[insight.severity])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-display block mb-1">
            {config?.label || insight.category}
          </span>
          <p className="text-sm font-medium leading-snug">{insight.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
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

function ActionItemCard({ item, index, onRequestGuidance }: { item: ActionItem; index: number; onRequestGuidance: (req: GuidanceRequest) => void }) {
  return (
    <div className="py-2 px-1 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center mt-0.5">
          <span className="text-[10px] font-display font-medium">{index + 1}</span>
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
          'text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-display flex-shrink-0 mt-0.5',
          priorityBadge[item.priority],
        )}>
          {item.priority}
        </span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="w-40 h-5 rounded" />
          </div>
          <Skeleton className="w-20 h-8 rounded" />
        </div>
        <Skeleton className="w-full h-4 mt-2 rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="w-20 h-3 rounded" />
            <Skeleton className="w-full h-4 rounded" />
            <Skeleton className="w-3/4 h-3 rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AIInsightsCard() {
  const { data, generatedAt, isLoading, isRefreshing, isStale, refresh, cooldownRemaining } = useAIInsights();
  const { dismissedKeys, dismiss } = useDismissedSuggestions();
  const { createTask } = useTasks();
  const [cooldown, setCooldown] = useState(0);
  const [leverOpen, setLeverOpen] = useState(false);
  const roles = useEffectiveRoles();
  const isLeadership = roles.includes('super_admin');
  const { data: leverRecommendation, isLoading: isLeverLoading } = useActiveRecommendation();
  const [activeGuidance, setActiveGuidance] = useState<GuidanceRequest | null>(null);
  const [guidanceText, setGuidanceText] = useState<string | null>(null);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const zuraNav = useZuraNavigationSafe();

  // Restore saved Zura navigation state on mount
  useEffect(() => {
    if (zuraNav?.savedState && !activeGuidance) {
      const restored = zuraNav.restore();
      if (restored) {
        setActiveGuidance(restored.guidance);
        setGuidanceText(restored.guidanceText);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (isLoading) return <LoadingSkeleton />;

  const sentiment = data?.overallSentiment ? sentimentConfig[data.overallSentiment] : null;
  const SentimentIcon = sentiment?.icon || Activity;

  return (
    <VisibilityGate
      elementKey="ai_business_insights"
      elementName="AI Business Insights"
      elementCategory="Dashboard Home"
    >
      <PinnableCard
        elementKey="ai_business_insights"
        elementName="AI Business Insights"
        category="Dashboard Home"
      >
        <Card className="rounded-xl max-h-[600px] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
          {!activeGuidance && (
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={tokens.card.iconBox}>
                    <Brain className={tokens.card.icon} />
                  </div>
                  <CardTitle className="text-base font-display tracking-wide">{PLATFORM_NAME.toUpperCase()} BUSINESS INSIGHTS</CardTitle>
                </div>
                <Button variant="ghost" size={tokens.button.card} onClick={() => refresh(true)} disabled={isRefreshing || cooldown > 0} className="gap-1.5 text-xs h-8">
                  <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
                  {cooldown > 0 ? `${cooldown}s` : isRefreshing ? 'Analyzing...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
          )}

          <CardContent 
            className={cn("pt-0", activeGuidance && "p-0")} 
          >
              <AnimatePresence mode="wait" initial={false}>
                {!activeGuidance ? (
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {data && (
                      <div className="flex items-start gap-2 mb-3">
                        <div className={cn('flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center', sentiment?.bg)}>
                          <SentimentIcon className={cn('w-3 h-3', sentiment?.color)} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground leading-snug">{blurFinancialValues(data.summaryLine)}</p>
                          {generatedAt && (
                            <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              Updated {formatDistanceToNow(new Date(generatedAt), { addSuffix: true })}
                              {isStale && ' · Stale'}
                            </p>
                          )}
                        </div>
                    </div>
                    )}

                    {/* Weekly Lever — leadership only, collapsible */}
                    {isLeadership && (
                      <div className="mb-4">
                        <Collapsible open={leverOpen} onOpenChange={setLeverOpen}>
                          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border/50 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors">
                            {isLeverLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : leverRecommendation ? (
                              <>
                                <Zap className="h-4 w-4 shrink-0 text-amber-500" />
                                <span className="text-sm font-medium truncate">{leverRecommendation.title}</span>
                              </>
                            ) : (
                              <SilenceState compact />
                            )}
                            <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform', leverOpen && 'rotate-180')} />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="pt-3">
                              <EnforcementGateBanner gateKey="gate_kpi_architecture">
                                {leverRecommendation ? (
                                  <WeeklyLeverBrief recommendation={leverRecommendation} />
                                ) : (
                                  <div className="text-sm text-muted-foreground space-y-1 px-1">
                                    <p>No high-confidence lever detected this period.</p>
                                    <p className="text-xs">Last reviewed: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                                  </div>
                                )}
                              </EnforcementGateBanner>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}

                    {!data ? (
                      <div className="text-center py-8">
                        <ZuraAvatar size="md" className="mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-muted-foreground mb-3">No insights generated yet</p>
                        <Button variant="outline" size={tokens.button.card} onClick={() => refresh(true)} disabled={isRefreshing} className="gap-1.5">
                          <Brain className="w-3.5 h-3.5" />
                          Generate Insights
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {data.insights.length > 0 && (
                          <div>
                            <SectionHeader icon={Brain} label="Key Insights" iconColor="text-violet-500" />
                            <div className="space-y-2.5">
                              {data.insights.map((insight, i) => (
                                <InsightCard key={i} insight={insight} onRequestGuidance={handleRequestGuidance} />
                              ))}
                            </div>
                          </div>
                        )}
                        {data.actionItems.length > 0 && (
                          <div>
                            <SectionHeader icon={CheckCircle2} label="Action Items" />
                            <div className="space-y-1 rounded-lg border border-border/40 bg-muted/10 px-6 py-4">
                              {data.actionItems.map((item, i) => (
                                <ActionItemCard key={i} item={item} index={i} onRequestGuidance={handleRequestGuidance} />
                              ))}
                            </div>
                          </div>
                        )}
                        {(() => {
                          const visibleSuggestions = (data.featureSuggestions || []).filter(
                            (s) => !dismissedKeys.has(s.suggestionKey)
                          );
                          if (visibleSuggestions.length === 0) return null;
                          return (
                            <div>
                              <SectionHeader icon={Zap} label="Suggested For You" iconColor="text-amber-500" />
                              <div className="space-y-2.5">
                                <AnimatePresence>
                                  {visibleSuggestions.map((suggestion) => (
                                    <motion.div
                                      key={suggestion.suggestionKey}
                                      initial={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="relative border border-dashed border-amber-500/30 rounded-lg p-3 bg-gradient-to-br from-amber-500/5 to-orange-500/5"
                                    >
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => dismiss(suggestion.suggestionKey)}
                                            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">Dismiss for 30 days</TooltipContent>
                                      </Tooltip>
                                      <div className="flex items-start gap-2.5 pr-5">
                                        <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-medium">{suggestion.featureName}</span>
                                            <span className={cn(
                                              'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-display',
                                              priorityBadge[suggestion.priority],
                                            )}>
                                              {suggestion.priority}
                                            </span>
                                          </div>
                                          <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.whyItHelps}</p>
                                          <p className="text-xs text-muted-foreground/70 mt-1 italic">{suggestion.howToStart}</p>
                                          <GuidanceTrigger
                                            label="Learn more"
                                            hideIcon
                                            onClick={() => handleRequestGuidance({
                                              type: 'action',
                                              title: `Enable ${suggestion.featureName}`,
                                              description: `${suggestion.whyItHelps} ${suggestion.howToStart}`,
                                            })}
                                          />
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                              </div>
                            </div>
                          );
                        })()}
                        <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border/50">
                          <ZuraAvatar size="sm" className="w-3 h-3 opacity-40" />
                          <span className="text-[10px] text-muted-foreground/50">Powered by {PLATFORM_NAME} AI · Based on your data</span>
                        </div>
                      </div>
                    )}
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
                      suggestedTasks={data?.suggestedTasks}
                      onAddTask={(task) => createTask.mutate(task)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
          </CardContent>
        </Card>
      </PinnableCard>
    </VisibilityGate>
  );
}
