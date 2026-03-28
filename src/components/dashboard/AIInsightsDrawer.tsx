import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { TogglePill } from '@/components/ui/toggle-pill';
import { Loader2, ArrowLeft } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  ChevronUp,
  ChevronRight,
  CheckCheck,
  Lightbulb,
  Zap,
  ThumbsUp,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';

type ViewMode = 'all' | 'insights' | 'actions' | 'suggestions';
type WizardIntent = 'failing' | 'quick_wins' | 'revenue' | 'team' | 'retention' | 'everything';

interface IntentConfig {
  key: WizardIntent;
  icon: typeof ShieldAlert;
  label: string;
  description: string;
  filter: (insights: InsightItem[]) => InsightItem[];
  accentClass?: string;
}

/** Returns true if an insight is claimed by the higher-priority "failing" or "quick_wins" intents */
const isClaimedByPriority = (i: InsightItem) =>
  i.severity === 'critical' || i.severity === 'warning' || i.effortLevel === 'quick_win';

const WIZARD_INTENTS: IntentConfig[] = [
  {
    key: 'failing',
    icon: ShieldAlert,
    label: 'Where am I failing?',
    description: 'Critical issues hurting you now',
    filter: (insights) => insights
      .filter(i => i.severity === 'critical' || i.severity === 'warning')
      .sort((a, b) => (b.impactEstimateNumeric ?? 0) - (a.impactEstimateNumeric ?? 0)),
    accentClass: 'border-red-500/30 hover:border-red-500/50',
  },
  {
    key: 'quick_wins',
    icon: Zap,
    label: 'Quickest wins',
    description: 'High-impact, low-effort items',
    filter: (insights) => insights
      .filter(i => i.effortLevel === 'quick_win' && i.severity !== 'critical' && i.severity !== 'warning')
      .sort((a, b) => (b.impactEstimateNumeric ?? 0) - (a.impactEstimateNumeric ?? 0)),
  },
  {
    key: 'revenue',
    icon: DollarSign,
    label: 'Revenue opportunities',
    description: 'Growth & margin insights',
    filter: (insights) => insights
      .filter(i => (i.category === 'revenue_pulse' || i.category === 'cash_flow') && !isClaimedByPriority(i)),
  },
  {
    key: 'team',
    icon: Users,
    label: 'Team performance',
    description: 'Staffing & capacity gaps',
    filter: (insights) => insights
      .filter(i => (i.category === 'staffing' || i.category === 'capacity') && !isClaimedByPriority(i)),
  },
  {
    key: 'retention',
    icon: HeartPulse,
    label: 'Client retention',
    description: 'Rebook & churn signals',
    filter: (insights) => insights
      .filter(i => i.category === 'client_health' && !isClaimedByPriority(i)),
  },
  {
    key: 'everything',
    icon: BarChart3,
    label: 'Show me everything',
    description: 'Full insights feed',
    filter: (insights) => insights,
  },
];

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

/** Category filter config for the pill chips */
const CATEGORY_FILTERS: { key: InsightItem['category']; label: string; icon: typeof DollarSign }[] = [
  { key: 'revenue_pulse', label: 'Revenue', icon: DollarSign },
  { key: 'client_health', label: 'Retention', icon: HeartPulse },
  { key: 'cash_flow', label: 'Retail', icon: TrendingUp },
  { key: 'capacity', label: 'Capacity', icon: Activity },
  { key: 'staffing', label: 'Staffing', icon: Users },
  { key: 'anomaly', label: 'Anomaly', icon: AlertTriangle },
];

const severityStyles: Record<InsightItem['severity'], string> = {
  info: 'border-l-blue-500/60 bg-blue-500/[0.12]',
  warning: 'border-l-amber-500/60 bg-amber-500/[0.12]',
  critical: 'border-l-red-500/60 bg-red-500/[0.12]',
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

  const hasMeta = insight.estimatedImpact || insight.trendDirection || insight.comparisonContext || insight.actByDate || insight.effortLevel || (insight.staffMentions && insight.staffMentions.length > 0);

  const impactTypeLabel: Record<string, string> = { at_risk: 'At Risk', opportunity: 'Opportunity', inefficiency: 'Inefficiency' };
  const impactTypeColor: Record<string, string> = {
    at_risk: 'text-red-600 dark:text-red-400',
    opportunity: 'text-emerald-600 dark:text-emerald-400',
    inefficiency: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className={cn(
      'rounded-xl border-l-[3px] border border-border/70 p-3.5 transition-colors shadow-sm',
      severityStyles[insight.severity],
    )}>
      <div className="flex items-start gap-2.5">
        <div className={cn('mt-0.5 flex-shrink-0', severityIconColor[insight.severity])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          {insight.impactEstimateNumeric != null && insight.impactEstimateNumeric > 0 ? (
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-lg font-display tracking-wide">
                <BlurredAmount>${insight.impactEstimateNumeric.toLocaleString()}</BlurredAmount>
              </span>
              {insight.impactType && (
                <span className={cn('text-[10px] uppercase tracking-wider font-display', impactTypeColor[insight.impactType])}>
                  {impactTypeLabel[insight.impactType]}
                </span>
              )}
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display ml-auto">
                {config?.label || insight.category}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
                {config?.label || insight.category}
              </span>
            </div>
          )}
          <p className="text-sm font-medium leading-snug">{insight.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            <InsightDescriptionWithLinks description={insight.description} />
          </p>

          {hasMeta && (
            <div className="mt-2 space-y-1">
              {(insight.trendDirection || insight.estimatedImpact || insight.comparisonContext) && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {insight.trendDirection && (
                    <span className={cn('inline-flex items-center gap-0.5 font-medium', {
                      'text-emerald-600 dark:text-emerald-400': insight.trendDirection === 'improving',
                      'text-red-600 dark:text-red-400': insight.trendDirection === 'declining',
                      'text-muted-foreground': insight.trendDirection === 'stable',
                    })}>
                      {insight.trendDirection === 'improving' ? <TrendingUp className="w-3 h-3" /> : insight.trendDirection === 'declining' ? <TrendingDown className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                      {insight.trendDirection === 'improving' ? 'Improving' : insight.trendDirection === 'declining' ? 'Declining' : 'Stable'}
                    </span>
                  )}
                  {insight.trendDirection && (insight.estimatedImpact || insight.comparisonContext) && (
                    <span className="text-muted-foreground/30">·</span>
                  )}
                  {insight.estimatedImpact && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/80">
                      <DollarSign className="w-2.5 h-2.5" />
                      <BlurredAmount>{insight.estimatedImpact.replace(/^\$/, '')}</BlurredAmount>
                    </span>
                  )}
                  {insight.comparisonContext && (
                    <>
                      {insight.estimatedImpact && <span className="text-muted-foreground/30">·</span>}
                      <span className="text-muted-foreground">{insight.comparisonContext}</span>
                    </>
                  )}
                </div>
              )}

              {(insight.effortLevel || insight.actByDate || (insight.staffMentions && insight.staffMentions.length > 0)) && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {insight.effortLevel && (
                    <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium', {
                      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400': insight.effortLevel === 'quick_win',
                      'bg-blue-500/10 text-blue-700 dark:text-blue-400': insight.effortLevel === 'strategic',
                    })}>
                      {insight.effortLevel === 'quick_win' ? <Zap className="w-2.5 h-2.5" /> : <BarChart3 className="w-2.5 h-2.5" />}
                      {insight.effortLevel === 'quick_win' ? 'Quick Win' : 'Strategic'}
                    </span>
                  )}
                  {insight.actByDate && (
                    <>
                      {insight.effortLevel && <span className="text-muted-foreground/30">·</span>}
                      <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                        <Clock className="w-2.5 h-2.5" />
                        {insight.actByDate}
                      </span>
                    </>
                  )}
                  {insight.staffMentions && insight.staffMentions.length > 0 && (
                    <>
                      {(insight.effortLevel || insight.actByDate) && <span className="text-muted-foreground/30">·</span>}
                      {insight.staffMentions.map((name, idx) => (
                        <span key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                          <Users className="w-2.5 h-2.5" />
                          {name}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

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

function ActionItemCard({ item, index, onRequestGuidance, isEven }: { item: ActionItem; index: number; onRequestGuidance: (req: GuidanceRequest) => void; isEven?: boolean }) {
  return (
    <div className={cn('py-2 px-3 rounded-lg', isEven && 'bg-muted/20')}>
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
          'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-display flex-shrink-0',
          priorityBadge[item.priority],
        )}>
          {item.priority}
        </span>
      </div>
    </div>
  );
}

/** Category filter chip with severity dot indicator */
function CategoryFilterChip({
  label,
  icon: Icon,
  isActive,
  severityLevel,
  onClick,
}: {
  label: string;
  icon: typeof DollarSign;
  isActive: boolean;
  severityLevel: 'critical' | 'warning' | 'info' | 'none';
  onClick: () => void;
}) {
  const dotColor: Record<string, string> = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    none: '',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0',
        isActive
          ? 'bg-foreground text-background'
          : 'bg-muted/40 text-muted-foreground hover:bg-muted/60',
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
      {severityLevel !== 'none' && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColor[severityLevel])} />
      )}
    </button>
  );
}

/** Wizard intent picker — 2-column grid of intent cards */
function WizardIntentPicker({
  intents,
  sortedInsights,
  onSelect,
}: {
  intents: IntentConfig[];
  sortedInsights: InsightItem[];
  onSelect: (intent: WizardIntent) => void;
}) {
  return (
    <div className="px-5 pb-5">
      <p className="text-sm font-medium text-foreground mb-4">What would you like to focus on?</p>
      <div className="grid grid-cols-2 gap-2.5">
        {intents.map((intent) => {
          const matchCount = intent.key === 'everything' ? sortedInsights.length : intent.filter(sortedInsights).length;
          const hasUrgent = intent.key !== 'everything' && intent.filter(sortedInsights).some(i => i.severity === 'critical');
          const Icon = intent.icon;
          const isEmpty = matchCount === 0 && intent.key !== 'everything';

          return (
            <button
              key={intent.key}
              type="button"
              onClick={() => !isEmpty && onSelect(intent.key)}
              disabled={isEmpty}
              className={cn(
                'group relative flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all duration-200',
                isEmpty
                  ? 'border-border/30 bg-muted/10 opacity-50 cursor-not-allowed'
                  : cn(
                      'border-border/70 bg-card hover:bg-accent/40 hover:border-foreground/30 hover:shadow-sm cursor-pointer',
                      intent.accentClass,
                      hasUrgent && 'border-red-500/20 bg-red-500/[0.02]'
                    ),
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  isEmpty ? 'bg-muted/30' : hasUrgent ? 'bg-red-500/10' : 'bg-primary/10',
                )}>
                  <Icon className={cn(
                    'w-4 h-4',
                    isEmpty ? 'text-muted-foreground/50' : hasUrgent ? 'text-red-500' : 'text-primary',
                  )} />
                </div>
                {!isEmpty && matchCount > 0 && (
                  <span className={cn(
                    'text-[10px] font-display tracking-wider px-2 py-0.5 rounded-full',
                    hasUrgent
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    {matchCount}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium leading-snug">{intent.label}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  {isEmpty ? 'No items' : intent.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface AIInsightsDrawerProps {
  label?: string;
  expanded?: boolean;
  onToggle?: () => void;
}

export function AIInsightsDrawer({ label, expanded: controlledExpanded, onToggle }: AIInsightsDrawerProps) {
  const isControlled = onToggle !== undefined;
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = isControlled ? (controlledExpanded ?? false) : internalExpanded;
  const setExpanded = isControlled ? () => onToggle?.() : setInternalExpanded;

  if (isControlled) {
    return (
      <VisibilityGate elementKey="ai_business_insights" elementName="AI Business Insights" elementCategory="Dashboard Home">
        <SilverShineButton onClick={onToggle} className={expanded ? 'ring-1 ring-accent/50' : undefined}>
          <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Brain className="w-3 h-3 text-primary" />
          </div>
          <span className="truncate">{label ?? `${PLATFORM_NAME} Insights`}</span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-0.5 shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5 shrink-0" />
          )}
        </SilverShineButton>
      </VisibilityGate>
    );
  }

  return (
    <VisibilityGate elementKey="ai_business_insights" elementName="AI Business Insights" elementCategory="Dashboard Home">
      <SilverShineButton onClick={() => setExpanded(!expanded)}>
        <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Brain className="w-3 h-3 text-primary" />
        </div>
        <span className="truncate">{label ?? `${PLATFORM_NAME} Insights`}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5 shrink-0" />
      </SilverShineButton>
    </VisibilityGate>
  );
}

/** Full-width panel for AI Business Insights — redesigned for instant clarity */
export function AIInsightsPanel({ onClose }: { onClose: () => void }) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [leverOpen, setLeverOpen] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<WizardIntent | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<InsightItem['category']>>(
    new Set(CATEGORY_FILTERS.map(f => f.key))
  );
  const { data, generatedAt, isLoading, isRefreshing, isStale, refresh, cooldownRemaining } = useAIInsights();
  const { dismissedKeys, dismiss } = useDismissedSuggestions();
  const { createTask } = useTasks();
  const roles = useEffectiveRoles();
  const isLeadership = roles.includes('super_admin');
  const { data: leverRecommendation, isLoading: isLeverLoading } = useActiveRecommendation();
  const [cooldown, setCooldown] = useState(0);
  const [activeGuidance, setActiveGuidance] = useState<GuidanceRequest | null>(null);
  const [guidanceText, setGuidanceText] = useState<string | null>(null);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const zuraNav = useZuraNavigationSafe();

  const visibleSuggestions = (data?.featureSuggestions || []).filter((s) => !dismissedKeys.has(s.suggestionKey));
  const hasInsights = (data?.insights?.length ?? 0) > 0;
  const hasActionItems = (data?.actionItems?.length ?? 0) > 0;
  const hasSuggestions = visibleSuggestions.length > 0;

  // Sort by priorityScore (descending), fallback to severity
  const sortedInsights = useMemo(() => {
    if (!data?.insights) return [];
    return [...data.insights].sort((a, b) => {
      const scoreA = a.priorityScore ?? 0;
      const scoreB = b.priorityScore ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [data?.insights]);

  const sortedActionItems = useMemo(() => {
    if (!data?.actionItems) return [];
    return [...data.actionItems].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [data?.actionItems]);

  // Split insights into urgent (critical/warning) and informational
  const urgentInsights = useMemo(() => sortedInsights.filter(i => i.severity === 'critical' || i.severity === 'warning'), [sortedInsights]);
  const infoInsights = useMemo(() => sortedInsights.filter(i => i.severity === 'info'), [sortedInsights]);

  // Apply intent filter first, then category filter on remainder
  const intentFilteredInsights = useMemo(() => {
    if (!selectedIntent || selectedIntent === 'everything') return sortedInsights;
    const intentConfig = WIZARD_INTENTS.find(i => i.key === selectedIntent);
    return intentConfig ? intentConfig.filter(sortedInsights) : sortedInsights;
  }, [selectedIntent, sortedInsights]);

  // Filter info insights by selected categories (within intent scope)
  const filteredInfoInsights = useMemo(
    () => {
      const infos = intentFilteredInsights.filter(i => i.severity === 'info');
      return infos.filter(i => selectedCategories.has(i.category));
    },
    [intentFilteredInsights, selectedCategories]
  );

  // Override urgent insights when intent is active
  const displayUrgentInsights = useMemo(() => {
    if (!selectedIntent || selectedIntent === 'everything') return urgentInsights;
    return intentFilteredInsights.filter(i => i.severity === 'critical' || i.severity === 'warning');
  }, [selectedIntent, intentFilteredInsights, urgentInsights]);

  // Category severity map for filter chips
  const categorySeverityMap = useMemo(() => {
    const map: Record<string, 'critical' | 'warning' | 'info' | 'none'> = {};
    for (const f of CATEGORY_FILTERS) {
      const catInsights = sortedInsights.filter(i => i.category === f.key);
      if (catInsights.length === 0) { map[f.key] = 'none'; continue; }
      if (catInsights.some(i => i.severity === 'critical')) map[f.key] = 'critical';
      else if (catInsights.some(i => i.severity === 'warning')) map[f.key] = 'warning';
      else map[f.key] = 'info';
    }
    return map;
  }, [sortedInsights]);

  // Only show categories that have at least one insight
  const activeCategoryFilters = useMemo(
    () => CATEGORY_FILTERS.filter(f => categorySeverityMap[f.key] !== 'none'),
    [categorySeverityMap]
  );

  const toggleCategory = useCallback((key: InsightItem['category']) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow deselecting all
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

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
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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

  // Severity counts for header inline display
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0 };
    (data?.insights || []).forEach(i => counts[i.severity]++);
    return counts;
  }, [data?.insights]);

  const viewOptions = useMemo(() => {
    const opts = [{ value: 'all' as ViewMode, label: 'All' }];
    if (hasInsights) opts.push({ value: 'insights' as ViewMode, label: 'Insights' });
    if (hasActionItems) opts.push({ value: 'actions' as ViewMode, label: 'Actions' });
    if (hasSuggestions) opts.push({ value: 'suggestions' as ViewMode, label: 'Suggestions' });
    return opts;
  }, [hasInsights, hasActionItems, hasSuggestions]);

  return (
    <div className="w-full rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

      {!activeGuidance && (
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedIntent && (
                <button
                  type="button"
                  onClick={() => { setSelectedIntent(null); setViewMode('all'); }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="font-medium">Change focus</span>
                </button>
              )}
              {!selectedIntent && (
                <span className="font-display text-sm tracking-[0.15em]">{PLATFORM_NAME.toUpperCase()} BUSINESS INSIGHTS</span>
              )}
              {selectedIntent && (
                <span className="font-display text-sm tracking-[0.15em]">
                  {WIZARD_INTENTS.find(i => i.key === selectedIntent)?.label?.toUpperCase()}
                </span>
              )}
              {/* Inline severity dots */}
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {severityCounts.critical > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    {severityCounts.critical}
                  </span>
                )}
                {severityCounts.warning > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {severityCounts.warning}
                  </span>
                )}
                {severityCounts.info > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {severityCounts.info}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {cooldown > 0 && <span className="text-[10px] text-muted-foreground/50 mr-1">{cooldown}s</span>}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refresh(true)} disabled={isRefreshing || cooldown > 0}>
                <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
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
              <div className="max-h-[60vh] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
                {/* Summary strip */}
                {data && (
                  <div className="px-5 pb-3">
                    <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3.5 py-2.5">
                      <div className={cn('flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center', sentiment?.bg)}>
                        <SentimentIcon className={cn('w-3.5 h-3.5', sentiment?.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{blurFinancialValues(data.summaryLine)}</p>
                      </div>
                      {generatedAt && (
                        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDistanceToNow(new Date(generatedAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {isStale && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                        Insights are over 2 hours old
                        <button type="button" onClick={() => refresh(true)} disabled={isRefreshing || cooldown > 0} className="underline hover:no-underline">
                          Refresh for latest
                        </button>
                      </p>
                    )}
                  </div>
                )}

                {/* Wizard intent picker OR feed content */}
                <AnimatePresence initial={false} mode="wait">
                  {!selectedIntent ? (
                    <motion.div
                      key="wizard"
                      initial={slideVariants.enterFromLeft}
                      animate={slideVariants.center}
                      exit={slideVariants.exitToLeft}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    >
                      {isLoading ? (
                        <div className="px-5 pb-5 space-y-3">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="space-y-1.5">
                              <Skeleton className="w-20 h-3 rounded" />
                              <Skeleton className="w-full h-4 rounded" />
                              <Skeleton className="w-3/4 h-3 rounded" />
                            </div>
                          ))}
                        </div>
                      ) : !data ? (
                        <div className="text-center py-14 px-5">
                          <ZuraAvatar size="md" className="mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-display text-muted-foreground">No insights generated yet</p>
                          <p className="text-xs text-muted-foreground/80 mt-1 max-w-[240px] mx-auto">We'll analyze your sales, capacity, and team data to surface what matters.</p>
                          <Button variant="outline" size={tokens.button.card} onClick={() => refresh(true)} disabled={isRefreshing} className="gap-1.5 mt-3">
                            <Brain className="w-3.5 h-3.5" />
                            Generate Insights
                          </Button>
                        </div>
                      ) : (
                        <WizardIntentPicker
                          intents={WIZARD_INTENTS}
                          sortedInsights={sortedInsights}
                          onSelect={setSelectedIntent}
                        />
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="feed"
                      initial={slideVariants.enterFromRight}
                      animate={slideVariants.center}
                      exit={slideVariants.exitToRight}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    >
                <div className="px-5 pb-5">
                  {(hasInsights || hasActionItems || hasSuggestions) ? (
                    <div className="space-y-4">
                      {/* ── NEEDS ATTENTION ── */}
                      {displayUrgentInsights.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[10px] font-display tracking-[0.15em] uppercase text-amber-600 dark:text-amber-400">
                              Needs Attention
                            </span>
                            <div className="flex-1 h-px bg-border/40" />
                          </div>
                          <div className="space-y-2.5">
                            {displayUrgentInsights.map((insight, i) => (
                              <InsightCard
                                key={`urgent-${i}`}
                                insight={insight}
                                onRequestGuidance={handleRequestGuidance}
                                drillDownHref={categoryToAnalyticsTab[insight.category] ? analyticsHubUrl(categoryToAnalyticsTab[insight.category]!) : undefined}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── CATEGORY FILTERS ── */}
                      {activeCategoryFilters.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                          {activeCategoryFilters.map(f => (
                            <CategoryFilterChip
                              key={f.key}
                              label={f.label}
                              icon={f.icon}
                              isActive={selectedCategories.has(f.key)}
                              severityLevel={categorySeverityMap[f.key]}
                              onClick={() => toggleCategory(f.key)}
                            />
                          ))}
                        </div>
                      )}

                      {/* ── VIEW TOGGLE ── */}
                      {viewOptions.length > 2 && (
                        <div className="flex justify-center">
                          <TogglePill
                            options={viewOptions.map(o => ({ value: o.value, label: o.label }))}
                            value={viewMode}
                            onChange={(v) => setViewMode(v as ViewMode)}
                            size="sm"
                            variant="solid"
                          />
                        </div>
                      )}

                      {/* ── FEED ── */}
                      <div className="space-y-2.5">
                        {/* Info insights (filtered by category) */}
                        {(viewMode === 'all' || viewMode === 'insights') && filteredInfoInsights.map((insight, i) => (
                          <InsightCard
                            key={`info-${i}`}
                            insight={insight}
                            onRequestGuidance={handleRequestGuidance}
                            drillDownHref={categoryToAnalyticsTab[insight.category] ? analyticsHubUrl(categoryToAnalyticsTab[insight.category]!) : undefined}
                          />
                        ))}

                        {/* Action items */}
                        {(viewMode === 'all' || viewMode === 'actions') && sortedActionItems.length > 0 && (
                          <div className="rounded-lg border border-border/40 overflow-hidden">
                            {sortedActionItems.map((item, i) => (
                              <ActionItemCard key={i} item={item} index={i} isEven={i % 2 === 0} onRequestGuidance={handleRequestGuidance} />
                            ))}
                          </div>
                        )}

                        {/* Suggestions */}
                        {(viewMode === 'all' || viewMode === 'suggestions') && visibleSuggestions.length > 0 && (
                          <div className="space-y-2">
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
                        )}

                        {/* Empty state for filtered view */}
                        {viewMode === 'insights' && filteredInfoInsights.length === 0 && displayUrgentInsights.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-6">No insights match selected categories</p>
                        )}
                      </div>

                      {/* ── WEEKLY LEVER — leadership only, collapsible, at bottom ── */}
                      {isLeadership && (
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
                      )}
                    </div>
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="px-5 py-2.5 border-t border-border/40 flex items-center justify-center gap-1.5">
                <ZuraAvatar size="sm" className="w-3 h-3 opacity-40" />
                <span className="text-[10px] text-muted-foreground/50">Powered by {PLATFORM_NAME} AI · Based on your data</span>
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
    </div>
  );
}
