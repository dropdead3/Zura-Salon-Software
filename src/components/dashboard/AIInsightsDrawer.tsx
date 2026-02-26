import { useState, useEffect, useCallback } from 'react';
import { SilverShineButton } from '@/components/dashboard/SilverShineButton';
import { Button } from '@/components/ui/button';
import { PLATFORM_NAME } from '@/lib/brand';
import { useZuraNavigationSafe } from '@/contexts/ZuraNavigationContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { VisibilityGate } from '@/components/visibility';
import { useAIInsights, type InsightItem, type ActionItem, type FeatureSuggestion } from '@/hooks/useAIInsights';
import { useDismissedSuggestions } from '@/hooks/useDismissedSuggestions';
import { useTasks } from '@/hooks/useTasks';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { GuidancePanel } from './GuidancePanel';
import { InsightDescriptionWithLinks } from './InsightDescriptionWithLinks';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { useActiveRecommendation } from '@/hooks/useLeverRecommendations';
import { WeeklyLeverBrief } from '@/components/executive-brief/WeeklyLeverBrief';
import { SilenceState } from '@/components/executive-brief/SilenceState';
import { EnforcementGateBanner } from '@/components/enforcement/EnforcementGateBanner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { analyticsHubUrl } from '@/config/dashboardNav';
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
  Clock,
  X,
  ChevronDown,
  ChevronRight,
  CheckCheck,
  Lightbulb,
  Zap,
  ThumbsUp,
  BarChart3,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';

type InsightTab = 'insights' | 'action_items' | 'suggestions';

const severityOrder: Record<InsightItem['severity'], number> = { critical: 0, warning: 1, info: 2 };
const priorityOrder: Record<ActionItem['priority'], number> = { high: 0, medium: 1, low: 2 };

const categoryToAnalyticsTab: Partial<Record<InsightItem['category'], string>> = {
  revenue_pulse: 'sales',
  cash_flow: 'sales',
  capacity: 'operations',
  staffing: 'operations',
  client_health: 'operations',
  anomaly: 'sales',
};

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
      type="button"
      onClick={onClick}
      className="group inline-flex items-center justify-center gap-1.5 h-8 pl-3 pr-3 rounded-md border border-border/60 bg-muted/30 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-700 dark:hover:text-violet-300 transition-[color,background-color,border-color] duration-200"
    >
      {!hideIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span className="text-center">{label}</span>
      <span className="flex items-center justify-center w-0 overflow-hidden transition-[width] duration-200 group-hover:w-4">
        <ChevronRight className="w-3 h-3 shrink-0 opacity-0 -translate-x-0.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
      </span>
    </button>
  );
}

function InsightCard({ insight, onRequestGuidance, drillDownHref }: { insight: InsightItem; onRequestGuidance: (req: GuidanceRequest) => void; drillDownHref?: string }) {
  const config = categoryConfig[insight.category];
  const Icon = config?.icon || Activity;

  return (
    <div className="rounded-xl border border-border/50 p-3.5 transition-colors shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex-shrink-0 text-muted-foreground">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
              {config?.label || insight.category}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug">{insight.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            <InsightDescriptionWithLinks description={insight.description} />
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <GuidanceTrigger
              label="How to improve"
              icon={Lightbulb}
              onClick={() => onRequestGuidance({ type: 'insight', title: insight.title, description: insight.description, category: insight.category })}
            />
            {drillDownHref && (
              <a
                href={drillDownHref}
                className="group inline-flex items-center justify-center gap-1.5 h-8 pl-3 pr-3 rounded-md border border-border/60 bg-muted/30 text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-[color,background-color,border-color] duration-200"
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-center">See in Analytics</span>
                <span className="flex items-center justify-center w-0 overflow-hidden transition-[width] duration-200 group-hover:w-4">
                  <ChevronRight className="w-3 h-3 shrink-0 opacity-0 -translate-x-0.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionItemCard({ item, index, onRequestGuidance }: { item: ActionItem; index: number; onRequestGuidance: (req: GuidanceRequest) => void }) {
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

interface AIInsightsDrawerProps {
  /** Override the collapsed trigger label. Defaults to `${PLATFORM_NAME} Insights`. */
  label?: string;
}

/** Self-contained expandable card widget for AI Business Insights */
export function AIInsightsDrawer({ label }: AIInsightsDrawerProps = {}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<InsightTab>('insights');
  const [leverOpen, setLeverOpen] = useState(false);
  const { data, generatedAt, isLoading, isRefreshing, isStale, refresh, cooldownRemaining } = useAIInsights();
  const { dismissedKeys, dismiss } = useDismissedSuggestions();
  const roles = useEffectiveRoles();
  const isLeadership = roles.includes('super_admin');
  const { data: leverRecommendation, isLoading: isLeverLoading } = useActiveRecommendation();
  const { createTask } = useTasks();
  const [cooldown, setCooldown] = useState(0);
  const [activeGuidance, setActiveGuidance] = useState<GuidanceRequest | null>(null);
  const [guidanceText, setGuidanceText] = useState<string | null>(null);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const zuraNav = useZuraNavigationSafe();

  const visibleSuggestions = (data?.featureSuggestions || []).filter((s) => !dismissedKeys.has(s.suggestionKey));
  const hasInsights = (data?.insights?.length ?? 0) > 0;
  const hasActionItems = (data?.actionItems?.length ?? 0) > 0;
  const hasSuggestions = visibleSuggestions.length > 0;
  const sortedInsights = data?.insights ? [...data.insights].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]) : [];
  const sortedActionItems = data?.actionItems ? [...data.actionItems].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]) : [];

  const tabCount = [hasInsights, hasActionItems, hasSuggestions].filter(Boolean).length;
  useEffect(() => {
    if (!data || tabCount === 0) return;
    const currentValid = (activeTab === 'insights' && hasInsights) || (activeTab === 'action_items' && hasActionItems) || (activeTab === 'suggestions' && hasSuggestions);
    if (!currentValid) {
      setActiveTab(hasInsights ? 'insights' : hasActionItems ? 'action_items' : 'suggestions');
    }
  }, [data, hasInsights, hasActionItems, hasSuggestions, tabCount, activeTab]);

  // Restore saved Zura navigation state on mount
  useEffect(() => {
    if (zuraNav?.savedState && !activeGuidance) {
      const restored = zuraNav.restore();
      if (restored) {
        setExpanded(true);
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

  const sentiment = data?.overallSentiment ? sentimentConfig[data.overallSentiment] : null;
  const SentimentIcon = sentiment?.icon || Activity;

  return (
    <VisibilityGate
      elementKey="ai_business_insights"
      elementName="AI Business Insights"
      elementCategory="Dashboard Home"
    >
      <AnimatePresence mode="wait">
          {!expanded ? (
            <SilverShineButton onClick={() => setExpanded(true)}>
              <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="w-3 h-3 text-primary" />
              </div>
              <span className="truncate">{label ?? `${PLATFORM_NAME} Insights`}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5 shrink-0" />
            </SilverShineButton>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -4 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full rounded-xl shadow-lg border border-border/40 bg-card overflow-hidden"
            >
              <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              
              {!activeGuidance && (
                <div className="p-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display text-sm tracking-[0.15em]">{PLATFORM_NAME.toUpperCase()} BUSINESS INSIGHTS</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refresh(true)} disabled={isRefreshing || cooldown > 0}>
                        <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(false)}>
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
                        style={{ maxHeight: '500px', overflowY: 'auto' }}
                        onWheel={(e) => e.stopPropagation()}
                      >
                        {data && (
                          <div className="px-4 pb-2">
                            <div className="flex items-start gap-2">
                              <div className={cn('flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center', sentiment?.bg)}>
                                <SentimentIcon className={cn('w-3 h-3', sentiment?.color)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground leading-snug">{blurFinancialValues(data.summaryLine)}</p>
                                <p className="text-[10px] text-muted-foreground/70 mt-1">Based on your recent business data</p>
                                {generatedAt && (
                                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1 flex-wrap">
                                    <Clock className="w-2.5 h-2.5" />
                                    Updated {formatDistanceToNow(new Date(generatedAt), { addSuffix: true })}
                                    {cooldown > 0 && ` · ${cooldown}s cooldown`}
                                  </p>
                                )}
                                {isStale && (
                                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                    Insights are over 2 hours old
                                    <button type="button" onClick={() => refresh(true)} disabled={isRefreshing || cooldown > 0} className="underline hover:no-underline">
                                      Refresh for latest
                                    </button>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Weekly Lever — leadership only, collapsible */}
                        {isLeadership && (
                          <div className="px-4 pb-3">
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

                        <div className="px-4 pb-6">
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
                              <p className="text-sm font-display text-muted-foreground">No insights generated yet</p>
                              <p className="text-xs text-muted-foreground/80 mt-1 max-w-[240px] mx-auto">We’ll analyze your sales, capacity, and team data to surface what matters.</p>
                              <Button variant="outline" size={tokens.button.card} onClick={() => refresh(true)} disabled={isRefreshing} className="gap-1.5 mt-3">
                                <Brain className="w-3.5 h-3.5" />
                                Generate Insights
                              </Button>
                            </div>
                          ) : (hasInsights || hasActionItems || hasSuggestions) ? (
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InsightTab)} className="w-full">
                              <TabsList className="w-full grid rounded-lg p-1 h-auto" style={{ gridTemplateColumns: tabCount ? `repeat(${tabCount}, 1fr)` : undefined }}>
                                {hasInsights && <TabsTrigger value="insights" className="text-xs py-2">Key Insights</TabsTrigger>}
                                {hasActionItems && <TabsTrigger value="action_items" className="text-xs py-2">Action Items</TabsTrigger>}
                                {hasSuggestions && <TabsTrigger value="suggestions" className="text-xs py-2">More suggestions</TabsTrigger>}
                              </TabsList>
                              {hasInsights && (
                                <TabsContent value="insights" className="mt-3 space-y-2.5">
                                  {sortedInsights.map((insight, i) => (
                                    <InsightCard
                                      key={i}
                                      insight={insight}
                                      onRequestGuidance={handleRequestGuidance}
                                      drillDownHref={categoryToAnalyticsTab[insight.category] ? analyticsHubUrl(categoryToAnalyticsTab[insight.category]!) : undefined}
                                    />
                                  ))}
                                </TabsContent>
                              )}
                              {hasActionItems && (
                                <TabsContent value="action_items" className="mt-3">
                                  <div className="space-y-1 rounded-lg border border-border/30 bg-muted/10 px-4 py-3">
                                    {sortedActionItems.map((item, i) => (
                                      <ActionItemCard key={i} item={item} index={i} onRequestGuidance={handleRequestGuidance} />
                                    ))}
                                  </div>
                                </TabsContent>
                              )}
                              {hasSuggestions && (
                                <TabsContent value="suggestions" className="mt-3 space-y-2">
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
                                </TabsContent>
                              )}
                            </Tabs>
                          ) : (
                            <div className="text-center py-10">
                              <p className="text-sm text-muted-foreground">No insights or actions right now</p>
                              <Button variant="outline" size={tokens.button.card} onClick={() => refresh(true)} disabled={isRefreshing} className="gap-1.5 mt-3">
                                <RefreshCw className="w-3.5 h-3.5" />
                                Refresh
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-4 pb-4 pt-4 mt-2 border-t border-border/50 bg-muted/20 rounded-b-2xl">
                        <div className="flex items-center justify-center gap-1.5">
                          <ZuraAvatar size="sm" className="w-3 h-3 opacity-40" />
                          <span className="text-[10px] text-muted-foreground/50">Powered by {PLATFORM_NAME} AI · Based on your data</span>
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
                        suggestedTasks={data?.suggestedTasks}
                        onAddTask={(task) => createTask.mutate(task)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </VisibilityGate>
  );
}
