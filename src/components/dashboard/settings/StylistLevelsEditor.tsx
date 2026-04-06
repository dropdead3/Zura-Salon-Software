import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus, 
   
  Trash2, 
  ChevronUp, 
  ChevronDown,
  ChevronRight,
  Save,
  X,
  AlertTriangle,
  Eye,
  Users,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  FileDown,
  GraduationCap,
  Globe,
  TrendingUp,
  Shield,
  Wand2,
  DollarSign,
  Clock,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useStylistLevels, 
  useSaveStylistLevels,
} from '@/hooks/useStylistLevels';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { GraduationWizard, getZuraDefaults, getZuraRetentionDefaults } from '@/components/dashboard/settings/GraduationWizard';
import { useLevelPromotionCriteria, type LevelPromotionCriteria } from '@/hooks/useLevelPromotionCriteria';
import { useLevelRetentionCriteria, type LevelRetentionCriteria } from '@/hooks/useLevelRetentionCriteria';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { generateLevelRequirementsPDF } from '@/components/dashboard/settings/LevelRequirementsPDF';

import { TeamCommissionRoster } from '@/components/dashboard/settings/TeamCommissionRoster';
import { LocationOverridesTab } from '@/components/dashboard/settings/LocationOverridesTab';
import { CommissionEconomicsTab } from '@/components/dashboard/settings/CommissionEconomicsTab';
import { useActiveLocations } from '@/hooks/useLocations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Track which level cards are expanded
type ExpandedSet = Set<string>;

interface LevelAnalysisItem {
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  affectedLevels?: string[];
}

interface LevelAnalysisResult {
  overallRating: 'well_structured' | 'needs_attention' | 'requires_review';
  overallSummary: string;
  strengths: LevelAnalysisItem[];
  suggestions: LevelAnalysisItem[];
  considerations: LevelAnalysisItem[];
}

function formatCriteriaSummary(c: LevelPromotionCriteria): string {
  const parts: string[] = [];
  if (c.revenue_enabled && c.revenue_threshold > 0) parts.push(c.revenue_threshold >= 1000 ? `$${(c.revenue_threshold / 1000).toFixed(0)}K rev` : `$${c.revenue_threshold} rev`);
  if (c.retail_enabled && c.retail_pct_threshold > 0) parts.push(`${c.retail_pct_threshold}% retail`);
  if (c.rebooking_enabled && c.rebooking_pct_threshold > 0) parts.push(`${c.rebooking_pct_threshold}% rebook`);
  if (c.avg_ticket_enabled && c.avg_ticket_threshold > 0) parts.push(`$${c.avg_ticket_threshold} avg`);
  if (c.retention_rate_enabled && Number(c.retention_rate_threshold) > 0) parts.push(`${c.retention_rate_threshold}% retention`);
  if (c.new_clients_enabled && Number(c.new_clients_threshold) > 0) parts.push(`${c.new_clients_threshold} new/mo`);
  if (c.utilization_enabled && Number(c.utilization_threshold) > 0) parts.push(`${c.utilization_threshold}% util`);
  if (c.rev_per_hour_enabled && Number(c.rev_per_hour_threshold) > 0) parts.push(`$${c.rev_per_hour_threshold}/hr`);
  if (c.tenure_enabled && c.tenure_days > 0) parts.push(`${c.tenure_days}d tenure`);
  if (parts.length === 0) return '';
  return parts.join(' · ') + ` — ${c.evaluation_window_days}d window`;
}

function formatRetentionSummary(r: LevelRetentionCriteria): string {
  const parts: string[] = [];
  if (r.revenue_enabled && r.revenue_minimum > 0) parts.push(r.revenue_minimum >= 1000 ? `$${(r.revenue_minimum / 1000).toFixed(0)}K rev` : `$${r.revenue_minimum} rev`);
  if (r.retail_enabled && r.retail_pct_minimum > 0) parts.push(`${r.retail_pct_minimum}% retail`);
  if (r.rebooking_enabled && r.rebooking_pct_minimum > 0) parts.push(`${r.rebooking_pct_minimum}% rebook`);
  if (r.avg_ticket_enabled && r.avg_ticket_minimum > 0) parts.push(`$${r.avg_ticket_minimum} avg`);
  if (r.retention_rate_enabled && Number(r.retention_rate_minimum) > 0) parts.push(`${r.retention_rate_minimum}% retention`);
  if (r.new_clients_enabled && Number(r.new_clients_minimum) > 0) parts.push(`${r.new_clients_minimum} new/mo`);
  if (r.utilization_enabled && Number(r.utilization_minimum) > 0) parts.push(`${r.utilization_minimum}% util`);
  if (r.rev_per_hour_enabled && Number(r.rev_per_hour_minimum) > 0) parts.push(`$${r.rev_per_hour_minimum}/hr`);
  if (parts.length === 0) return '';
  return `Required to Stay: ${parts.join(' · ')} — ${r.grace_period_days}d grace · ${r.action_type === 'demotion_eligible' ? 'Demotion' : 'Coaching'}`;
}

/** Scrollable table container with a right-edge fade + arrow indicator when content overflows */
function ScrollableTableWrapper({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className="relative rounded-xl border bg-card">
      <div ref={scrollRef} className="overflow-auto">
        {children}
      </div>
      {/* Right-edge scroll indicator */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-12 pointer-events-none transition-opacity duration-200',
          'bg-gradient-to-l from-card to-transparent',
          canScrollRight ? 'opacity-100' : 'opacity-0'
        )}
      />
      {canScrollRight && (
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-muted/80 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

const formatRate = (rate: number | null | undefined): string => {
  if (rate == null) return '';
  return String(Math.round(rate * 100));
};

type LocalStylistLevel = {
  id: string;
  dbId?: string;
  slug: string;
  label: string;
  clientLabel: string;
  description: string;
  serviceCommissionRate: string;
  retailCommissionRate: string;
  hourlyWageEnabled: boolean;
  hourlyWage: string;
};

interface CriteriaComparisonTableProps {
  levels: LocalStylistLevel[];
  promotionCriteria: LevelPromotionCriteria[];
  retentionCriteria: LevelRetentionCriteria[];
  onEditLevel: (level: LocalStylistLevel, index: number) => void;
}

function CriteriaComparisonTable({ levels, promotionCriteria, retentionCriteria, onEditLevel }: CriteriaComparisonTableProps) {
  const getCriteria = (levelDbId: string | undefined) => ({
    promo: promotionCriteria.find(c => c.stylist_level_id === levelDbId && c.is_active),
    retention: retentionCriteria.find(r => r.stylist_level_id === levelDbId && r.is_active),
  });

  const fmtCurrency = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;

  type MetricRow = {
    label: string;
    getValue: (promo: LevelPromotionCriteria | undefined, ret: LevelRetentionCriteria | undefined, levelIdx?: number) => string | null;
    getNumeric: (promo: LevelPromotionCriteria | undefined, ret: LevelRetentionCriteria | undefined) => number | null;
    section: 'promotion' | 'retention';
  };

  const metrics: MetricRow[] = [
    // Promotion
    { label: 'Revenue', section: 'promotion', getValue: (p) => p?.revenue_enabled ? fmtCurrency(p.revenue_threshold) : null, getNumeric: (p) => p?.revenue_enabled ? p.revenue_threshold : null },
    { label: 'Retail %', section: 'promotion', getValue: (p) => p?.retail_enabled ? `${p.retail_pct_threshold}%` : null, getNumeric: (p) => p?.retail_enabled ? p.retail_pct_threshold : null },
    { label: 'Rebooking %', section: 'promotion', getValue: (p) => p?.rebooking_enabled ? `${p.rebooking_pct_threshold}%` : null, getNumeric: (p) => p?.rebooking_enabled ? p.rebooking_pct_threshold : null },
    { label: 'Avg Ticket', section: 'promotion', getValue: (p) => p?.avg_ticket_enabled ? `$${p.avg_ticket_threshold}` : null, getNumeric: (p) => p?.avg_ticket_enabled ? p.avg_ticket_threshold : null },
    { label: 'Client Retention', section: 'promotion', getValue: (p) => p?.retention_rate_enabled ? `${p.retention_rate_threshold}%` : null, getNumeric: (p) => p?.retention_rate_enabled ? Number(p.retention_rate_threshold) : null },
    { label: 'New Clients', section: 'promotion', getValue: (p) => p?.new_clients_enabled ? `${p.new_clients_threshold}/mo` : null, getNumeric: (p) => p?.new_clients_enabled ? Number(p.new_clients_threshold) : null },
    { label: 'Utilization', section: 'promotion', getValue: (p) => p?.utilization_enabled ? `${p.utilization_threshold}%` : null, getNumeric: (p) => p?.utilization_enabled ? Number(p.utilization_threshold) : null },
    { label: 'Rev/Hr', section: 'promotion', getValue: (p) => p?.rev_per_hour_enabled ? `$${p.rev_per_hour_threshold}` : null, getNumeric: (p) => p?.rev_per_hour_enabled ? Number(p.rev_per_hour_threshold) : null },
    { label: 'Tenure', section: 'promotion', getValue: (p) => p?.tenure_enabled ? `${p.tenure_days}d` : null, getNumeric: (p) => p?.tenure_enabled ? p.tenure_days : null },
    { label: 'Eval Window', section: 'promotion', getValue: (p) => p ? `${p.evaluation_window_days}d` : null, getNumeric: () => null },
    { label: 'Approval', section: 'promotion', getValue: (p) => p ? (p.requires_manual_approval ? 'Manual' : 'Auto') : null, getNumeric: () => null },
    // Retention
    { label: 'Revenue', section: 'retention', getValue: (_, r) => r?.revenue_enabled ? fmtCurrency(r.revenue_minimum) : null, getNumeric: (_, r) => r?.revenue_enabled ? r.revenue_minimum : null },
    { label: 'Retail %', section: 'retention', getValue: (_, r) => r?.retail_enabled ? `${r.retail_pct_minimum}%` : null, getNumeric: (_, r) => r?.retail_enabled ? r.retail_pct_minimum : null },
    { label: 'Rebooking %', section: 'retention', getValue: (_, r) => r?.rebooking_enabled ? `${r.rebooking_pct_minimum}%` : null, getNumeric: (_, r) => r?.rebooking_enabled ? r.rebooking_pct_minimum : null },
    { label: 'Avg Ticket', section: 'retention', getValue: (_, r) => r?.avg_ticket_enabled ? `$${r.avg_ticket_minimum}` : null, getNumeric: (_, r) => r?.avg_ticket_enabled ? r.avg_ticket_minimum : null },
    { label: 'Client Retention', section: 'retention', getValue: (_, r) => r?.retention_rate_enabled ? `${r.retention_rate_minimum}%` : null, getNumeric: (_, r) => r?.retention_rate_enabled ? Number(r.retention_rate_minimum) : null },
    { label: 'New Clients', section: 'retention', getValue: (_, r) => r?.new_clients_enabled ? `${r.new_clients_minimum}/mo` : null, getNumeric: (_, r) => r?.new_clients_enabled ? Number(r.new_clients_minimum) : null },
    { label: 'Utilization', section: 'retention', getValue: (_, r) => r?.utilization_enabled ? `${r.utilization_minimum}%` : null, getNumeric: (_, r) => r?.utilization_enabled ? Number(r.utilization_minimum) : null },
    { label: 'Rev/Hr', section: 'retention', getValue: (_, r) => r?.rev_per_hour_enabled ? `$${r.rev_per_hour_minimum}` : null, getNumeric: (_, r) => r?.rev_per_hour_enabled ? Number(r.rev_per_hour_minimum) : null },
    { label: 'Grace Period', section: 'retention', getValue: (_, r) => r ? `${r.grace_period_days}d` : null, getNumeric: () => null },
    { label: 'Action', section: 'retention', getValue: (_, r) => r ? (r.action_type === 'demotion_eligible' ? 'Demotion' : 'Coaching') : null, getNumeric: () => null },
  ];

  const levelData = levels.map(l => getCriteria(l.dbId));

  const hasInconsistency = (metricIdx: number, levelIdx: number): boolean => {
    const metric = metrics[metricIdx];
    if (levelIdx === 0) return false;
    const currentVal = metric.getNumeric(levelData[levelIdx].promo, levelData[levelIdx].retention);
    // Find previous level that has a value
    for (let i = levelIdx - 1; i >= 0; i--) {
      const prevVal = metric.getNumeric(levelData[i].promo, levelData[i].retention);
      if (prevVal !== null && currentVal !== null) {
        return currentVal < prevVal;
      }
    }
    return false;
  };

  if (levels.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <GraduationCap className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No levels configured</h3>
        <p className={tokens.empty.description}>Add levels first to configure criteria</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Compare promotion and retention criteria across all levels. Click "Edit" to modify a level's criteria.
      </p>
      <ScrollableTableWrapper>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn("w-[140px] sticky left-0 bg-card z-20 rounded-tl-xl", tokens.table.columnHeader)}>Metric</TableHead>
              {levels.map((level, idx) => (
                <TableHead key={level.id} className={cn("text-center min-w-[120px]", tokens.table.columnHeader)}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs">{level.label}</span>
                    {level.dbId ? (
                      <button
                        onClick={() => onEditLevel(level, idx)}
                        className="text-[10px] text-primary hover:text-primary/80 transition-colors"
                      >
                        Edit
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50">Unsaved</span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Compensation section — rewards at this level */}
            <TableRow className="bg-primary/5 hover:bg-primary/5">
              <TableCell colSpan={levels.length + 1} className="py-2">
                <span className="flex items-center gap-1.5 text-xs font-display uppercase tracking-wide text-foreground">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  Compensation — At This Level
                </span>
              </TableCell>
            </TableRow>
            {['Service Commission', 'Retail Commission'].map((commLabel) => {
              const field = commLabel === 'Service Commission' ? 'serviceCommissionRate' : 'retailCommissionRate';
              return (
                <TableRow key={commLabel} className="border-l-2 border-l-primary/20">
                  <TableCell className="text-xs text-muted-foreground sticky left-0 bg-card z-10 border-l-2 border-l-primary/20">{commLabel}</TableCell>
                  {levels.map((level) => {
                    const rate = level[field];
                    return (
                      <TableCell key={level.id} className="text-center text-xs">
                        {rate ? (
                          <span className="text-foreground font-medium">{rate}%</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}

            {/* Promotion section header */}
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableCell colSpan={levels.length + 1} className="py-2">
                <span className="flex items-center gap-1.5 text-xs font-display uppercase tracking-wide text-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  Promotion — To Reach This Level
                </span>
              </TableCell>
            </TableRow>
            {metrics.filter(m => m.section === 'promotion').map((metric, mIdx) => (
              <TableRow key={`promo-${metric.label}`}>
                <TableCell className="text-xs text-muted-foreground sticky left-0 bg-card z-10">{metric.label}</TableCell>
                {levels.map((level, levelIdx) => {
                  const { promo, retention } = levelData[levelIdx];
                    const isLastLevel = levelIdx === levels.length - 1;
                    const val = isLastLevel ? null : metric.getValue(promo, retention, levelIdx);
                  const warn = levelIdx > 0 && !isLastLevel && hasInconsistency(mIdx, levelIdx);
                  return (
                    <TableCell key={level.id} className="text-center text-xs">
                      {isLastLevel ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : val ? (
                        <span className="flex items-center justify-center gap-1">
                          {warn && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                          <span className={warn ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}>{val}</span>
                        </span>
                      ) : !level.dbId ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : !promo ? (
                        <button
                          onClick={() => onEditLevel(level, levelIdx)}
                          className="text-[10px] text-primary/60 hover:text-primary transition-colors"
                        >
                          Configure
                        </button>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}

            {/* Retention section header */}
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableCell colSpan={levels.length + 1} className="py-2">
                <span className="flex items-center gap-1.5 text-xs font-display uppercase tracking-wide text-foreground">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Retention — Required to Stay
                </span>
              </TableCell>
            </TableRow>
            {metrics.filter(m => m.section === 'retention').map((metric, mIdx) => {
              const globalIdx = metrics.findIndex(m => m.section === 'retention' && m.label === metric.label);
              return (
                <TableRow key={`ret-${metric.label}`}>
                  <TableCell className="text-xs text-muted-foreground sticky left-0 bg-card z-10">{metric.label}</TableCell>
                  {levels.map((level, levelIdx) => {
                    const { promo, retention } = levelData[levelIdx];
                    const val = metric.getValue(promo, retention, levelIdx);
                    const warn = levelIdx > 0 && hasInconsistency(globalIdx, levelIdx);
                    return (
                      <TableCell key={level.id} className="text-center text-xs">
                        {val ? (
                          <span className="flex items-center justify-center gap-1">
                            {warn && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                            <span className={warn ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}>{val}</span>
                          </span>
                        ) : !level.dbId ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : !retention ? (
                          <button
                            onClick={() => onEditLevel(level, levelIdx)}
                            className="text-[10px] text-primary/60 hover:text-primary transition-colors"
                          >
                            Configure
                          </button>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollableTableWrapper>
    </div>
  );
}

// ── Level Name Templates ──
const LEVEL_NAME_TEMPLATES: Record<number, string[]> = {
  3: ['New Talent', 'Stylist', 'Senior Stylist'],
  4: ['New Talent', 'Emerging', 'Stylist', 'Senior Stylist'],
  5: ['New Talent', 'Emerging', 'Stylist', 'Senior Stylist', 'Master Stylist'],
  6: ['New Talent', 'Emerging', 'Stylist', 'Senior Stylist', 'Master Stylist', 'Director'],
  7: ['New Talent', 'Emerging', 'Stylist', 'Senior Stylist', 'Master Stylist', 'Director', 'Elite'],
};

interface QuickSetupProps {
  onGenerate: (levels: LocalStylistLevel[], applyKPIs: boolean) => void;
  onDismiss: () => void;
  isGenerating: boolean;
}

function LevelsQuickSetupWizard({ onGenerate, onDismiss, isGenerating }: QuickSetupProps) {
  const [levelCount, setLevelCount] = useState(4);
  const [baseRate, setBaseRate] = useState('30');
  const [topRate, setTopRate] = useState('50');
  const [retailRate, setRetailRate] = useState('10');
  const [applyKPIs, setApplyKPIs] = useState(true);

  const handleGenerate = () => {
    const names = LEVEL_NAME_TEMPLATES[levelCount];
    const base = parseFloat(baseRate) || 30;
    const top = parseFloat(topRate) || 50;
    const retail = retailRate;

    const generatedLevels: LocalStylistLevel[] = names.map((name, i) => {
      const rate = levelCount === 1 ? base : Math.round(base + (top - base) * (i / (levelCount - 1)));
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      return {
        id: slug,
        slug,
        label: name,
        clientLabel: `Level ${i + 1}`,
        description: '',
        serviceCommissionRate: String(rate),
        retailCommissionRate: retail,
        hourlyWageEnabled: false,
        hourlyWage: '',
      };
    });

    onGenerate(generatedLevels, applyKPIs);
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-base tracking-wide">QUICK SETUP</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Generate your level structure in one click</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step 1: Level count */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">How many levels?</label>
        <div className="flex gap-2">
          {[3, 4, 5, 6, 7].map(n => (
            <button
              key={n}
              onClick={() => setLevelCount(n)}
              className={cn(
                "w-10 h-10 rounded-full text-sm transition-colors",
                levelCount === n
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {LEVEL_NAME_TEMPLATES[levelCount].join(' → ')}
        </p>
      </div>

      {/* Step 2: Commission range */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Commission range</label>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Base (lowest)</label>
            <div className="relative">
              <Input
                type="number"
                value={baseRate}
                onChange={e => setBaseRate(e.target.value)}
                className="h-9 text-sm pr-7"
                min={0}
                max={100}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Top (highest)</label>
            <div className="relative">
              <Input
                type="number"
                value={topRate}
                onChange={e => setTopRate(e.target.value)}
                className="h-9 text-sm pr-7"
                min={0}
                max={100}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Retail (all)</label>
            <div className="relative">
              <Input
                type="number"
                value={retailRate}
                onChange={e => setRetailRate(e.target.value)}
                className="h-9 text-sm pr-7"
                min={0}
                max={100}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Intermediate levels will be interpolated: {LEVEL_NAME_TEMPLATES[levelCount].map((name, i) => {
            const base = parseFloat(baseRate) || 30;
            const top = parseFloat(topRate) || 50;
            const rate = levelCount === 1 ? base : Math.round(base + (top - base) * (i / (levelCount - 1)));
            return `${rate}%`;
          }).join(' → ')}
        </p>
      </div>

      {/* KPI checkbox */}
      <div className="flex items-center gap-3">
        <Checkbox
          id="apply-kpis"
          checked={applyKPIs}
          onCheckedChange={(checked) => setApplyKPIs(!!checked)}
        />
        <label htmlFor="apply-kpis" className="text-sm text-foreground cursor-pointer flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Also apply Zura Recommended KPI criteria
        </label>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="gap-2"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wand2 className="w-4 h-4" />
        )}
        Generate {levelCount} Levels
      </Button>
    </div>
  );
}

interface StylistLevelsEditorProps {
  /** When true, omits page header, sticky behavior, and info notice (used inside Settings) */
  embedded?: boolean;
}

export function StylistLevelsEditor({ embedded = false }: StylistLevelsEditorProps) {
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: dbLevels, isLoading, error, refetch } = useStylistLevels();
  const saveLevels = useSaveStylistLevels();
  
  const [levels, setLevels] = useState<LocalStylistLevel[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newLevelName, setNewLevelName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string, forceOpen?: boolean) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (forceOpen || !next.has(id)) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewLevel, setPreviewLevel] = useState(0);
  const [wizardLevelId, setWizardLevelId] = useState<string | null>(null);
  const [wizardLevelLabel, setWizardLevelLabel] = useState('');
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);
  const [reassignToSlug, setReassignToSlug] = useState<string>('');
  const [wizardLevelIndex, setWizardLevelIndex] = useState(0);
  const [quickSetupDismissed, setQuickSetupDismissed] = useState(false);
  const [isQuickSetupGenerating, setIsQuickSetupGenerating] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LevelAnalysisResult | null>(null);
  const queryClient = useQueryClient();

  const { data: promotionCriteria } = useLevelPromotionCriteria();
  const { data: retentionCriteria } = useLevelRetentionCriteria();
  const { data: activeLocations = [] } = useActiveLocations();

  useEffect(() => {
    if (dbLevels && !hasChanges) {
      const localLevels: LocalStylistLevel[] = dbLevels.map((l) => ({
        id: l.slug,
        dbId: l.id,
        slug: l.slug,
        label: l.label,
        clientLabel: l.client_label,
        description: l.description || '',
        serviceCommissionRate: formatRate(l.service_commission_rate),
        retailCommissionRate: formatRate(l.retail_commission_rate),
        hourlyWageEnabled: l.hourly_wage_enabled ?? false,
        hourlyWage: l.hourly_wage != null ? String(l.hourly_wage) : '',
      }));
      setLevels(localLevels);
    }
  }, [dbLevels, hasChanges]);

  // Save/Discard buttons provide sufficient unsaved-changes UX signal

  const { data: stylistsByLevel } = useQuery({
    queryKey: ['stylists-by-level', effectiveOrganization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('stylist_level')
        .eq('organization_id', effectiveOrganization!.id)
        .not('stylist_level', 'is', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(profile => {
        if (profile.stylist_level) {
          counts[profile.stylist_level] = (counts[profile.stylist_level] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!effectiveOrganization?.id,
  });

  const getStylistCount = (levelId: string): number => {
    return stylistsByLevel?.[levelId] || 0;
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLevels = [...levels];
    [newLevels[index - 1], newLevels[index]] = [newLevels[index], newLevels[index - 1]];
    const updatedLevels = newLevels.map((level, idx) => ({
      ...level,
      clientLabel: `Level ${idx + 1}`,
    }));
    setLevels(updatedLevels);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === levels.length - 1) return;
    const newLevels = [...levels];
    [newLevels[index], newLevels[index + 1]] = [newLevels[index + 1], newLevels[index]];
    const updatedLevels = newLevels.map((level, idx) => ({
      ...level,
      clientLabel: `Level ${idx + 1}`,
    }));
    setLevels(updatedLevels);
    setHasChanges(true);
  };

  const handleRename = (index: number, newLabel: string) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], label: newLabel };
    setLevels(newLevels);
    setHasChanges(true);
  };

  const handleDescriptionChange = (index: number, newDescription: string) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], description: newDescription };
    setLevels(newLevels);
    setHasChanges(true);
  };

  const handleDelete = (index: number) => {
    const newLevels = levels.filter((_, idx) => idx !== index);
    const updatedLevels = newLevels.map((level, idx) => ({
      ...level,
      clientLabel: `Level ${idx + 1}`,
    }));
    setLevels(updatedLevels);
    setHasChanges(true);
  };

  const handleCommissionChange = (index: number, field: 'serviceCommissionRate' | 'retailCommissionRate', value: string) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setLevels(newLevels);
    setHasChanges(true);
  };

  const handleAddNew = () => {
    if (!newLevelName.trim()) return;
    let newSlug = newLevelName.toLowerCase().replace(/\s+/g, '-');
    const existingSlugs = new Set(levels.map(l => l.slug));
    if (existingSlugs.has(newSlug)) {
      let counter = 2;
      while (existingSlugs.has(`${newSlug}-${counter}`)) counter++;
      newSlug = `${newSlug}-${counter}`;
    }
    const newLevel: LocalStylistLevel = {
      id: newSlug,
      slug: newSlug,
      label: newLevelName.trim(),
      clientLabel: `Level ${levels.length + 1}`,
      description: '',
      serviceCommissionRate: '',
      retailCommissionRate: '',
      hourlyWageEnabled: false,
      hourlyWage: '',
    };
    setLevels([...levels, newLevel]);
    setNewLevelName('');
    setIsAddingNew(false);
    setHasChanges(true);
  };

  const handleDeleteWithReassign = async (index: number) => {
    const level = levels[index];
    const count = getStylistCount(level.id);
    if (count > 0 && reassignToSlug) {
      const { error } = await supabase
        .from('employee_profiles')
        .update({ stylist_level: reassignToSlug })
        .eq('stylist_level', level.id);
      if (error) {
        toast.error('Failed to reassign stylists: ' + error.message);
        return;
      }
    }
    handleDelete(index);
    setDeleteTargetIndex(null);
    setReassignToSlug('');
  };

  const handleSave = async () => {
    const levelsToSave = levels.map((level, idx) => ({
      id: level.dbId,
      slug: level.slug,
      label: level.label,
      client_label: `Level ${idx + 1}`,
      description: level.description || undefined,
      display_order: idx,
      service_commission_rate: level.serviceCommissionRate ? parseFloat(level.serviceCommissionRate) / 100 : null,
      retail_commission_rate: level.retailCommissionRate ? parseFloat(level.retailCommissionRate) / 100 : null,
      hourly_wage_enabled: level.hourlyWageEnabled,
      hourly_wage: level.hourlyWage ? parseFloat(level.hourlyWage) : null,
    }));
    saveLevels.mutate(levelsToSave, {
      onSuccess: () => {
        setHasChanges(false);
        toast.success('Stylist levels saved successfully');
      },
    });
  };

  const handleQuickSetup = async (generatedLevels: LocalStylistLevel[], applyKPIs: boolean) => {
    setIsQuickSetupGenerating(true);
    try {
      // 1. Save levels to DB
      const levelsToSave = generatedLevels.map((level, idx) => ({
        slug: level.slug,
        label: level.label,
        client_label: `Level ${idx + 1}`,
        description: level.description || undefined,
        display_order: idx,
        service_commission_rate: level.serviceCommissionRate ? parseFloat(level.serviceCommissionRate) / 100 : null,
        retail_commission_rate: level.retailCommissionRate ? parseFloat(level.retailCommissionRate) / 100 : null,
      }));

      await new Promise<void>((resolve, reject) => {
        saveLevels.mutate(levelsToSave, {
          onSuccess: () => resolve(),
          onError: (err) => reject(err),
        });
      });

      // 2. If KPIs requested, fetch the newly-created level IDs and save criteria
      if (applyKPIs) {
        const orgId = effectiveOrganization?.id;
        if (orgId) {
          const { data: savedLevels, error: fetchErr } = await supabase
            .from('stylist_levels')
            .select('id, slug, display_order')
            .order('display_order', { ascending: true });

          if (fetchErr) throw fetchErr;
          if (savedLevels) {
            for (const dbLevel of savedLevels) {
              const levelIndex = dbLevel.display_order;
              // Skip last level (no promotion target beyond top)
              if (levelIndex < savedLevels.length - 1) {
                const promoDefaults = getZuraDefaults(levelIndex);
                await supabase.from('level_promotion_criteria').upsert({
                  organization_id: orgId,
                  stylist_level_id: dbLevel.id,
                  ...promoDefaults,
                  is_active: true,
                }, { onConflict: 'organization_id,stylist_level_id' });
              }

              const retDefaults = getZuraRetentionDefaults(levelIndex);
              await supabase.from('level_retention_criteria').upsert({
                organization_id: orgId,
                stylist_level_id: dbLevel.id,
                ...retDefaults,
                is_active: true,
              }, { onConflict: 'organization_id,stylist_level_id' });
            }
            queryClient.invalidateQueries({ queryKey: ['level-promotion-criteria'] });
            queryClient.invalidateQueries({ queryKey: ['level-retention-criteria'] });
          }
        }
      }

      setLevels(generatedLevels);
      setHasChanges(false);
      setQuickSetupDismissed(true);
      toast.success(`${generatedLevels.length} levels generated${applyKPIs ? ' with KPI criteria' : ''}`);
    } catch (err: any) {
      toast.error('Failed to generate levels: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsQuickSetupGenerating(false);
    }
  };

  const handleDiscard = () => {
    setHasChanges(false);
  };

  const handleAnalyze = useCallback(async () => {
    setAnalysisLoading(true);
    setAnalysisOpen(true);
    setAnalysisResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-level-analysis', {
        body: { levels, promotionCriteria, retentionCriteria },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysisResult(data as LevelAnalysisResult);
    } catch (err: any) {
      console.error('Level analysis error:', err);
      toast.error(err?.message || 'Failed to analyze configuration');
      setAnalysisOpen(false);
    } finally {
      setAnalysisLoading(false);
    }
  }, [levels, promotionCriteria, retentionCriteria]);

  if (isLoading) {
    return <DashboardLoader className="min-h-[400px]" />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load stylist levels</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const actionButtons = (
    <div className="flex items-center gap-2">
      {levels.length > 0 && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              const levelInfos = levels.map((l, i) => ({
                label: l.label,
                slug: l.slug,
                dbId: l.dbId,
                index: i,
              }));
              const commissions = levels.map(l => ({
                dbId: l.dbId,
                serviceCommissionRate: parseFloat(String(l.serviceCommissionRate)) || 0,
                retailCommissionRate: parseFloat(String(l.retailCommissionRate)) || 0,
              }));

              // Pre-fetch org logo as base64 data URL
              let logoDataUrl: string | undefined;
              const logoUrl = effectiveOrganization?.logo_url;
              if (logoUrl) {
                try {
                  logoDataUrl = await new Promise<string>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      canvas.width = img.width;
                      canvas.height = img.height;
                      const ctx = canvas.getContext('2d');
                      ctx?.drawImage(img, 0, 0);
                      resolve(canvas.toDataURL('image/png'));
                    };
                    img.onerror = reject;
                    img.src = logoUrl;
                  });
                } catch {
                  // Proceed without logo
                }
              }

              const doc = generateLevelRequirementsPDF({
                orgName: effectiveOrganization?.name || 'Organization',
                levels: levelInfos,
                criteria: promotionCriteria,
                retentionCriteria: retentionCriteria || [],
                logoDataUrl,
                commissions,
              });
              doc.save('level-progression-roadmap.pdf');
              toast.success('Progression roadmap exported');
            }}
          >
            <FileDown className="w-4 h-4" />
            Export Roadmap
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAnalyze}
            disabled={analysisLoading}
          >
            {analysisLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Analyze Configuration
          </Button>
        </>
      )}
      {hasChanges && (
        <>
          <Button variant="ghost" onClick={handleDiscard}>
            Discard
          </Button>
          <Button className="gap-2" onClick={handleSave} disabled={saveLevels.isPending}>
            {saveLevels.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </>
      )}
    </div>
  );

  const totalAssigned = Object.values(stylistsByLevel || {}).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className={cn("space-y-6", !embedded && "p-6 max-w-5xl mx-auto")}>
        {/* Header */}
        {!embedded ? (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-6 px-6 py-4 -mt-6 mb-2 border-b border-transparent transition-all duration-200">
            <DashboardPageHeader
              title="Stylist Levels"
              description="Manage experience levels and pricing tiers"
              actions={actionButtons}
            />
            <div className="mt-6">
              <PageExplainer pageId="stylist-levels" />
            </div>
          </div>
        ) : (
          <div className="flex justify-end">{actionButtons}</div>
        )}

        {/* Info Notice - standalone only */}
        {!embedded && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Level-based service pricing is displayed on the client-facing website{' '}
              <a href="/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                your website
              </a>
              . To adjust or edit level pricing, you can do so in the{' '}
              <a href={dashPath('/admin/services')} className="text-primary hover:underline">
                Services editor
              </a>
              .
            </p>
          </div>
        )}

        {/* Tabbed Layout */}
        <Tabs defaultValue="levels" className="w-full">
          <TabsList>
            <TabsTrigger value="levels">Levels</TabsTrigger>
            <TabsTrigger value="criteria">Criteria</TabsTrigger>
            {activeLocations.length >= 2 && (
              <TabsTrigger value="overrides">Location Overrides</TabsTrigger>
            )}
            <TabsTrigger value="economics">Economics</TabsTrigger>
            <TabsTrigger value="team">Team Roster</TabsTrigger>
            <TabsTrigger value="previews">Previews</TabsTrigger>
          </TabsList>

          {/* === TAB 1: Levels === */}
          <TabsContent value="levels">
            <div className="space-y-3">
              {/* Quick Setup Wizard — shown when no levels exist */}
              {levels.length === 0 && !quickSetupDismissed && (
                <LevelsQuickSetupWizard
                  onGenerate={handleQuickSetup}
                  onDismiss={() => setQuickSetupDismissed(true)}
                  isGenerating={isQuickSetupGenerating}
                />
              )}

              {/* Quick stats row + Add Level button */}
              {levels.length > 0 && (
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{levels.length} level{levels.length !== 1 ? 's' : ''}</span>
                    <span className="text-border">·</span>
                    <span>{totalAssigned} stylist{totalAssigned !== 1 ? 's' : ''} assigned</span>
                  </div>
                  {!isAddingNew && (
                    <Button
                      variant="outline"
                      size={tokens.button.inline}
                      className="h-7 border-dashed text-xs"
                      onClick={() => setIsAddingNew(true)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Level
                    </Button>
                  )}
                </div>
              )}

              {/* Inline add-new form */}
              {isAddingNew && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
                  <div className="w-[1.75rem]" />
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {levels.length + 1}
                  </span>
                  <Input
                    value={newLevelName}
                    onChange={(e) => setNewLevelName(e.target.value)}
                    placeholder="Enter level name..."
                    className="h-8 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddNew();
                      if (e.key === 'Escape') {
                        setIsAddingNew(false);
                        setNewLevelName('');
                      }
                    }}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size={tokens.button.inline}
                      className="h-8"
                      onClick={handleAddNew}
                      disabled={!newLevelName.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      variant="ghost"
                      size={tokens.button.inline}
                      className="h-8 px-2"
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewLevelName('');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {levels.map((level, index) => {
                const stylistCount = getStylistCount(level.id);
                const hasStylists = stylistCount > 0;
                const promo = promotionCriteria?.find(cr => cr.stylist_level_id === level.dbId && cr.is_active);
                const retention = retentionCriteria?.find(rc => rc.stylist_level_id === level.dbId && rc.is_active);
                const hasAnyCriteria = !!promo || !!retention;
                const promoSummary = promo ? formatCriteriaSummary(promo) : '';
                const retSummary = retention ? formatRetentionSummary(retention) : '';
                const isExpanded = expandedLevels.has(level.id) || editingIndex === index;
                

                return (
                  <div
                    key={level.id}
                    className={cn(
                      "group rounded-xl bg-card border transition-all duration-200",
                      editingIndex === index && "ring-2 ring-primary/50 shadow-sm",
                      !isExpanded && "hover:bg-muted/30"
                    )}
                  >
                    {/* Collapsed header row — grid layout for column alignment */}
                    <div
                      className="grid grid-cols-[auto_auto_1fr_7rem_6rem_5rem_auto] items-center px-3 py-2 cursor-pointer select-none"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button, input, [role="dialog"]')) return;
                        toggleExpanded(level.id);
                      }}
                    >
                      {/* Col 1: Reorder — left-aligned */}
                      <div className="flex flex-col shrink-0 opacity-40 group-hover:opacity-100 transition-opacity mr-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          disabled={index === levels.length - 1}
                          onClick={() => handleMoveDown(index)}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Col 2: Level badge — center-aligned */}
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground text-center w-7 mr-3">
                        {index + 1}
                      </span>

                      {/* Col 3: Name — left-aligned, always static */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-display text-xs tracking-wide truncate">{level.label}</span>
                      </div>

                      {/* Col 4: Service Commission — center-aligned */}
                      <span className="text-xs text-muted-foreground text-center hidden sm:block">
                        {level.serviceCommissionRate ? `Service ${level.serviceCommissionRate}%` : '—'}
                      </span>

                      {/* Col 5: Retail Commission — center-aligned */}
                      <span className="text-xs text-muted-foreground text-center hidden sm:block">
                        {level.retailCommissionRate ? `Retail ${level.retailCommissionRate}%` : '—'}
                      </span>

                      {/* Col 6: Stylist count — center-aligned */}
                      <div className="text-center">
                        {hasStylists && (
                          <span className="text-xs text-muted-foreground">
                            {stylistCount} <span className="hidden sm:inline">stylist{stylistCount !== 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </div>

                      {/* Col 7: Actions — right-aligned */}
                        <div className="flex items-center gap-1.5 justify-end">
                          <div onClick={(e) => e.stopPropagation()}>
                            <AlertDialog onOpenChange={(open) => { if (!open) { setDeleteTargetIndex(null); setReassignToSlug(''); } }}>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors opacity-60 hover:opacity-100 disabled:opacity-30"
                                  disabled={levels.length <= 1}
                                  onClick={() => setDeleteTargetIndex(index)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    {hasStylists && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                                    Delete "{level.label}"?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription asChild>
                                    <div className="space-y-3">
                                      {hasStylists ? (
                                        <>
                                          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200">
                                            <p className="font-medium flex items-center gap-2">
                                              <AlertTriangle className="w-4 h-4" />
                                              {stylistCount} stylist{stylistCount !== 1 ? 's are' : ' is'} assigned to this level
                                            </p>
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium">Reassign stylists to:</label>
                                            <Select value={reassignToSlug} onValueChange={setReassignToSlug}>
                                              <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a level..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {levels.filter((_, i) => i !== index).map((l) => (
                                                  <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </>
                                      ) : (
                                        <p>No stylists are currently assigned to this level.</p>
                                      )}
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={hasStylists && !reassignToSlug}
                                    onClick={() => handleDeleteWithReassign(index)}
                                  >
                                    {hasStylists ? 'Reassign & Delete' : 'Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          {/* Expand chevron */}
                          <ChevronRight className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform duration-200",
                            isExpanded && "rotate-90"
                          )} />
                        </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/40">
                        {/* Details label */}
                        <div className="ml-[3.25rem] flex items-center gap-2 pt-1">
                          <span className="text-[11px] font-display tracking-wide text-muted-foreground">Details</span>
                          <div className="flex-1 h-px bg-border/40" />
                        </div>
                        {/* Level Name */}
                        <div className="ml-[3.25rem]">
                          <label className="text-xs font-medium text-muted-foreground">Level Name</label>
                          <Input
                            value={level.label}
                            onChange={(e) => handleRename(index, e.target.value)}
                            placeholder="Level name..."
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        {/* Description */}
                        <div className="ml-[3.25rem]">
                          <label className="text-xs font-medium text-muted-foreground">Description</label>
                          <Input
                            value={level.description}
                            onChange={(e) => handleDescriptionChange(index, e.target.value)}
                            placeholder="Brief description for tooltip..."
                            className="h-8 text-xs text-muted-foreground bg-background/50 border focus-visible:ring-1 mt-1"
                          />
                        </div>

                        {/* Commission fields */}
                        <div className="ml-[3.25rem] grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Service Commission %</label>
                            <Input
                              type="number"
                              placeholder="e.g. 40"
                              value={level.serviceCommissionRate}
                              onChange={(e) => handleCommissionChange(index, 'serviceCommissionRate', e.target.value)}
                              className="h-8 text-xs"
                              min={0}
                              max={100}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Retail Commission %</label>
                            <Input
                              type="number"
                              placeholder="e.g. 10"
                              value={level.retailCommissionRate}
                              onChange={(e) => handleCommissionChange(index, 'retailCommissionRate', e.target.value)}
                              className="h-8 text-xs"
                              min={0}
                              max={100}
                            />
                          </div>
                        </div>

                        {/* Level Criteria */}
                        <div className="ml-[3.25rem]">
                        {level.dbId ? (
                            hasAnyCriteria ? (
                              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-sans text-xs text-foreground flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    Level Criteria
                                  </span>
                                  <button
                                    onClick={() => {
                                      setWizardLevelId(level.dbId!);
                                      setWizardLevelLabel(level.label);
                                      setWizardLevelIndex(index);
                                    }}
                                    className="text-xs text-primary hover:text-primary/80 transition-colors font-sans"
                                  >
                                    Edit
                                  </button>
                                </div>
                                {promoSummary && (
                                  <div className="flex items-start gap-2">
                                    <TrendingUp className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                                    <p className="text-xs text-muted-foreground">{promoSummary}</p>
                                  </div>
                                )}
                                {retSummary && (
                                  <div className="flex items-start gap-2">
                                    <Shield className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                                    <p className="text-xs text-muted-foreground">{retSummary}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setWizardLevelId(level.dbId!);
                                  setWizardLevelLabel(level.label);
                                  setWizardLevelIndex(index);
                                }}
                                className="w-full rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 bg-muted/20 hover:bg-primary/5 p-3 flex items-center gap-3 transition-all group/cta"
                              >
                                <div className="w-8 h-8 rounded-lg bg-muted/60 group-hover/cta:bg-primary/10 flex items-center justify-center transition-colors">
                                  <Sparkles className="w-4 h-4 text-muted-foreground group-hover/cta:text-primary transition-colors" />
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-sans text-foreground">Set up promotion & retention criteria</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">Define what it takes to reach this level</p>
                                </div>
                              </button>
                            )
                          ) : (
                            <p className="text-xs text-muted-foreground/50 italic">
                              Save this level to configure criteria
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}


              {/* Progression Roadmap removed — now in Criteria tab */}
            </div>
          </TabsContent>

          {/* === TAB 2: Criteria Comparison === */}
          <TabsContent value="criteria">
            {(!promotionCriteria || !retentionCriteria) ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className={tokens.loading.spinner} />
              </div>
            ) : (
              <CriteriaComparisonTable
                levels={levels}
                promotionCriteria={promotionCriteria || []}
                retentionCriteria={retentionCriteria || []}
                onEditLevel={(level, index) => {
                  if (!level.dbId) return;
                  setWizardLevelId(level.dbId);
                  setWizardLevelLabel(level.label);
                  setWizardLevelIndex(index);
                }}
              />
            )}
          </TabsContent>

          {/* === TAB: Location Overrides === */}
          <TabsContent value="overrides">
            <LocationOverridesTab
              levels={levels}
              promotionCriteria={promotionCriteria || []}
              retentionCriteria={retentionCriteria || []}
            />
          </TabsContent>

          {/* === TAB: Economics === */}
          <TabsContent value="economics">
            <CommissionEconomicsTab levels={dbLevels || []} />
          </TabsContent>

          {/* === TAB 3: Team Roster === */}

          <TabsContent value="team">
            {/* Team Distribution summary */}
            {levels.length > 0 && (
              <div className="rounded-xl border bg-card p-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Users className="w-4 h-4" />
                  <span>Team Distribution</span>
                  <span className="ml-auto text-foreground font-medium">{totalAssigned}</span>
                </div>
                <div className="space-y-2">
                  {levels.map((level, idx) => {
                    const count = getStylistCount(level.id);
                    const percentage = totalAssigned > 0 ? (count / totalAssigned) * 100 : 0;
                    return (
                      <div key={level.id} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs truncate">{level.label}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {count}{totalAssigned > 0 && ` (${Math.round((count / totalAssigned) * 100)}%)`}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary/60 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalAssigned === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No stylists assigned to levels yet
                  </p>
                )}
              </div>
            )}
            {effectiveOrganization?.id && dbLevels && dbLevels.length > 0 ? (
              <TeamCommissionRoster orgId={effectiveOrganization.id} levels={dbLevels} />
            ) : (
              <div className={tokens.empty.container}>
                <Users className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>No levels configured</h3>
                <p className={tokens.empty.description}>Add and save levels first to see team assignments</p>
              </div>
            )}
          </TabsContent>

          {/* === TAB 4: Previews === */}
          <TabsContent value="previews">
            <div className="space-y-6 max-w-lg">
              {/* Level selector for previews */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Preview level:</span>
                <div className="flex flex-wrap gap-1">
                  {levels.map((level, idx) => (
                    <button
                      key={level.id}
                      onClick={() => setPreviewLevel(idx)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs transition-colors",
                        previewLevel === idx 
                          ? "bg-foreground text-background" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Preview */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>Card Preview</span>
                </div>
                <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-gradient-to-b from-neutral-600 to-neutral-800 max-w-[280px]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-[10px] tracking-[0.2em] text-white/70">
                        LEVEL {previewLevel + 1} STYLIST
                      </p>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-white/50 hover:text-white/90 transition-colors">
                              <Info className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[240px] p-3">
                            <p className="font-medium text-xs mb-1.5">Stylist Level System</p>
                            <ul className="text-[10px] space-y-1 text-muted-foreground">
                              {levels.map((level, idx) => (
                                <li key={level.id}>
                                  <span className="font-medium text-foreground">Level {idx + 1}:</span>{' '}
                                  {level.description}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <h3 className="font-display text-lg">Stylist Name</h3>
                  </div>
                </div>
              </div>

              {/* Services Dropdown */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>Services Dropdown</span>
                </div>
                <div className="bg-foreground rounded-xl p-4 space-y-3 max-w-[320px]">
                  <button
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-background/30 rounded-full text-xs font-sans bg-background/10 text-background"
                  >
                    <span className="text-background/70">Level:</span>
                    <span className="font-medium truncate">
                      {levels[previewLevel]?.label || 'New Talent'}
                    </span>
                    <ChevronDown size={14} className="text-background/70 shrink-0" />
                  </button>
                  <div className="bg-card rounded-lg border shadow-lg overflow-hidden max-h-32 overflow-y-auto">
                    {levels.map((level, idx) => (
                      <button
                        key={level.id}
                        onClick={() => setPreviewLevel(idx)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs font-sans transition-colors",
                          previewLevel === idx 
                            ? "bg-foreground text-background" 
                            : "hover:bg-secondary text-foreground"
                        )}
                      >
                        Level {idx + 1} — {level.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tooltip Preview */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>Tooltip Preview</span>
                </div>
                <div className="bg-card border rounded-xl p-4 space-y-3 max-w-[320px]">
                  <p className="font-medium text-sm">Stylist Level System</p>
                  <ul className="text-xs space-y-1.5 text-muted-foreground">
                    {levels.map((level, idx) => (
                      <li key={level.id}>
                        <span className="font-medium text-foreground">Level {idx + 1}:</span>{' '}
                        {level.description || 'No description'}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground/70 pt-1 border-t">
                    Higher levels reflect experience, training, and demand.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Graduation Wizard Dialog */}
      <GraduationWizard
        open={!!wizardLevelId}
        onOpenChange={(open) => { if (!open) setWizardLevelId(null); }}
        levelId={wizardLevelId || ''}
        levelLabel={wizardLevelLabel}
        levelIndex={wizardLevelIndex}
        totalLevels={levels.length}
      />

      {/* AI Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-base tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Zura Configuration Analysis
            </DialogTitle>
            <DialogDescription>
              AI-powered review of your level structure and KPI settings
            </DialogDescription>
          </DialogHeader>

          {analysisLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your configuration…</p>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-5">
              {/* Overall Rating */}
              <div className={cn(
                "rounded-lg p-4 border",
                analysisResult.overallRating === 'well_structured'
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : analysisResult.overallRating === 'needs_attention'
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-destructive/10 border-destructive/30"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {analysisResult.overallRating === 'well_structured' ? '✅' : analysisResult.overallRating === 'needs_attention' ? '⚠️' : '🔍'}
                  </span>
                  <span className="font-display text-sm tracking-wide">
                    {analysisResult.overallRating === 'well_structured'
                      ? 'WELL STRUCTURED'
                      : analysisResult.overallRating === 'needs_attention'
                      ? 'NEEDS ATTENTION'
                      : 'REQUIRES REVIEW'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{analysisResult.overallSummary}</p>
              </div>

              {/* Strengths */}
              {analysisResult.strengths.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-display text-xs tracking-wide text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    STRENGTHS
                  </h4>
                  {analysisResult.strengths.map((item, i) => (
                    <div key={i} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      {item.affectedLevels && item.affectedLevels.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {item.affectedLevels.map(l => (
                            <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{l}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {analysisResult.suggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-display text-xs tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    SUGGESTIONS
                  </h4>
                  {analysisResult.suggestions.map((item, i) => (
                    <div key={i} className={cn(
                      "rounded-lg border p-3",
                      item.severity === 'high'
                        ? "border-destructive/30 bg-destructive/5"
                        : item.severity === 'medium'
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-muted/30"
                    )}>
                      <div className="flex items-start gap-2">
                        <span className="text-xs mt-0.5">
                          {item.severity === 'high' ? '🔴' : item.severity === 'medium' ? '🟡' : '🔵'}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          {item.affectedLevels && item.affectedLevels.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {item.affectedLevels.map(l => (
                                <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">{l}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Considerations */}
              {analysisResult.considerations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-display text-xs tracking-wide text-primary flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    CONSIDERATIONS
                  </h4>
                  {analysisResult.considerations.map((item, i) => (
                    <div key={i} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      {item.affectedLevels && item.affectedLevels.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {item.affectedLevels.map(l => (
                            <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{l}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground/60 text-center pt-2 border-t border-border/50">
                This analysis is advisory only. Zura recommends — you decide.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
