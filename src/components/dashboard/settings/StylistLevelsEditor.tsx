import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Globe,
  TrendingUp,
  Shield,
  Wand2,
  DollarSign,
  Clock,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  useUpdateStylistLevel,
} from '@/hooks/useStylistLevels';
import { LevelRoadmapView } from '@/components/dashboard/settings/LevelRoadmapView';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { GraduationWizard, getZuraDefaults, getZuraRetentionDefaults } from '@/components/dashboard/settings/GraduationWizard';
import { useLevelPromotionCriteria, type LevelPromotionCriteria } from '@/hooks/useLevelPromotionCriteria';
import { useLevelRetentionCriteria, type LevelRetentionCriteria } from '@/hooks/useLevelRetentionCriteria';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { generateLevelRequirementsPDF } from '@/components/dashboard/settings/LevelRequirementsPDF';
import { generateStaffLevelReportPDF } from '@/components/dashboard/settings/StaffLevelReportPDF';
import { useTeamLevelProgress } from '@/hooks/useTeamLevelProgress';

import { TeamCommissionRoster } from '@/components/dashboard/settings/TeamCommissionRoster';
import { LocationOverridesTab } from '@/components/dashboard/settings/LocationOverridesTab';
import { CommissionEconomicsTab } from '@/components/dashboard/settings/CommissionEconomicsTab';
import { useLevelEconomicsAnalyzer } from '@/hooks/useLevelEconomicsAnalyzer';
import { useActiveLocations } from '@/hooks/useLocations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

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
  if (c.revenue_enabled && c.revenue_threshold > 0) parts.push(c.revenue_threshold >= 1000 ? `$${parseFloat((c.revenue_threshold / 1000).toFixed(1))}K rev` : `$${c.revenue_threshold} rev`);
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
  if (!r.retention_enabled) return '';
  return `Retention: ${r.evaluation_window_days}d eval · ${r.grace_period_days}d grace · ${r.action_type === 'demotion_eligible' ? 'Demotion' : 'Coaching'}`;
}

/** Scrollable table container with a right-edge fade + arrow indicator when content overflows */
function ScrollableTableWrapper({ children, isFullscreen, onToggleFullscreen }: { children: React.ReactNode; isFullscreen: boolean; onToggleFullscreen: () => void }) {
  const { isImpersonating } = useOrganizationContext();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 4);
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
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

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggleFullscreen();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, onToggleFullscreen]);

  if (isFullscreen) {
    return (
      <div className={cn(
        "fixed inset-x-0 bottom-0 z-[70] bg-background flex flex-col",
        isImpersonating ? (isMobile ? 'top-[40px]' : 'top-[44px]') : 'top-0'
      )}>
        {/* Fullscreen header bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/50">
          <h2 className="font-display text-sm tracking-wide uppercase text-foreground">Criteria Matrix</h2>
          <Button variant="ghost" size="icon" onClick={onToggleFullscreen} className="h-8 w-8">
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
        {/* Scrollable table fills remaining space */}
        <div className="relative flex-1 overflow-hidden">
          <div ref={scrollRef} className="overflow-auto h-full">
            {children}
          </div>
          <div
            className={cn(
              'absolute right-0 top-0 bottom-0 w-12 pointer-events-none transition-opacity duration-200',
              'bg-gradient-to-l from-background to-transparent',
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
          {/* Bottom-edge scroll indicator */}
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-12 pointer-events-none transition-opacity duration-200',
              'bg-gradient-to-t from-background to-transparent',
              canScrollDown ? 'opacity-100' : 'opacity-0'
            )}
          />
          {canScrollDown && (
            <button
              onClick={() => scrollRef.current?.scrollBy({ top: 200, behavior: 'smooth' })}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-7 h-7 rounded-full bg-muted/80 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Scroll down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border bg-card">
      {/* Fullscreen toggle */}
      <button
        onClick={onToggleFullscreen}
        className="absolute top-2 right-6 z-30 w-7 h-7 rounded-full bg-muted/80 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Enter fullscreen"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
      <div ref={scrollRef} className="overflow-auto max-h-[70vh] rounded-xl">
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
      {/* Bottom-edge scroll indicator */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-12 pointer-events-none transition-opacity duration-200 rounded-b-xl',
          'bg-gradient-to-t from-card to-transparent',
          canScrollDown ? 'opacity-100' : 'opacity-0'
        )}
      />
      {canScrollDown && (
        <button
          onClick={() => scrollRef.current?.scrollBy({ top: 200, behavior: 'smooth' })}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-7 h-7 rounded-full bg-muted/80 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Scroll down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

const formatRate = (rate: number | null | undefined): string => {
  if (rate == null) return '';
  return String(Math.round(rate * 100));
};

type EarningsStructure = 'hourly' | 'commission' | 'both';

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
  earningsStructure: EarningsStructure;
  isConfigured: boolean;
  configStatus: 'configured' | 'retention_not_set' | 'incomplete';
};

function deriveEarningsStructure(hourlyEnabled: boolean, serviceRate: string, retailRate: string): EarningsStructure {
  const hasCommission = (parseFloat(serviceRate) || 0) > 0 || (parseFloat(retailRate) || 0) > 0;
  if (hourlyEnabled && hasCommission) return 'both';
  if (hourlyEnabled) return 'hourly';
  return 'commission';
}

const EARNINGS_STRUCTURE_DESCRIPTIONS: Record<EarningsStructure, string> = {
  hourly: 'Base hourly rate with no commission on services or retail',
  commission: 'Commission-based earnings on services and retail sales',
  both: 'Hourly base wage plus commission on services and retail',
};

// Metric field mapping for inline save
type MetricFieldKey = 'revenue' | 'retail_pct' | 'rebooking_pct' | 'avg_ticket' | 'retention_rate' | 'new_clients' | 'utilization' | 'rev_per_hour' | 'tenure';

interface MetricFieldMapping {
  key: MetricFieldKey;
  promoEnabledField: keyof LevelPromotionCriteria;
  promoValueField: keyof LevelPromotionCriteria;
  retEnabledField: keyof LevelRetentionCriteria;
  retValueField: keyof LevelRetentionCriteria;
  isCurrency: boolean;
  isPercent: boolean;
  suffix?: string;
}

const METRIC_FIELD_MAP: Record<string, MetricFieldMapping> = {
  'Revenue': { key: 'revenue', promoEnabledField: 'revenue_enabled', promoValueField: 'revenue_threshold', retEnabledField: 'revenue_enabled', retValueField: 'revenue_minimum', isCurrency: true, isPercent: false },
  'Retail %': { key: 'retail_pct', promoEnabledField: 'retail_enabled', promoValueField: 'retail_pct_threshold', retEnabledField: 'retail_enabled', retValueField: 'retail_pct_minimum', isCurrency: false, isPercent: true },
  'Rebooking %': { key: 'rebooking_pct', promoEnabledField: 'rebooking_enabled', promoValueField: 'rebooking_pct_threshold', retEnabledField: 'rebooking_enabled', retValueField: 'rebooking_pct_minimum', isCurrency: false, isPercent: true },
  'Avg Ticket': { key: 'avg_ticket', promoEnabledField: 'avg_ticket_enabled', promoValueField: 'avg_ticket_threshold', retEnabledField: 'avg_ticket_enabled', retValueField: 'avg_ticket_minimum', isCurrency: true, isPercent: false },
  'Client Retention': { key: 'retention_rate', promoEnabledField: 'retention_rate_enabled', promoValueField: 'retention_rate_threshold', retEnabledField: 'retention_rate_enabled', retValueField: 'retention_rate_minimum', isCurrency: false, isPercent: true },
  'New Clients': { key: 'new_clients', promoEnabledField: 'new_clients_enabled', promoValueField: 'new_clients_threshold', retEnabledField: 'new_clients_enabled', retValueField: 'new_clients_minimum', isCurrency: false, isPercent: false, suffix: '/mo' },
  'Utilization': { key: 'utilization', promoEnabledField: 'utilization_enabled', promoValueField: 'utilization_threshold', retEnabledField: 'utilization_enabled', retValueField: 'utilization_minimum', isCurrency: false, isPercent: true },
  'Rev/Hr': { key: 'rev_per_hour', promoEnabledField: 'rev_per_hour_enabled', promoValueField: 'rev_per_hour_threshold', retEnabledField: 'rev_per_hour_enabled', retValueField: 'rev_per_hour_minimum', isCurrency: true, isPercent: false },
  'Tenure': { key: 'tenure', promoEnabledField: 'tenure_enabled', promoValueField: 'tenure_days', retEnabledField: 'retention_enabled', retValueField: 'evaluation_window_days', isCurrency: false, isPercent: false, suffix: 'd' },
};

function autoStepValues(editValues: Record<string, { enabled: boolean; value: string }>, levelIds: string[]): Record<string, { enabled: boolean; value: string }> {
  // Find first and last enabled values
  const enabledEntries = levelIds
    .map((id, idx) => ({ id, idx, ...editValues[id] }))
    .filter(e => e.enabled && e.value && parseFloat(e.value) > 0);
  
  if (enabledEntries.length < 2) return editValues;
  
  const first = enabledEntries[0];
  const last = enabledEntries[enabledEntries.length - 1];
  const firstVal = parseFloat(first.value);
  const lastVal = parseFloat(last.value);
  const totalSteps = last.idx - first.idx;
  
  if (totalSteps <= 1) return editValues;
  
  const updated = { ...editValues };
  for (let i = first.idx + 1; i < last.idx; i++) {
    const levelId = levelIds[i];
    const stepFraction = (i - first.idx) / totalSteps;
    const interpolated = Math.round(firstVal + (lastVal - firstVal) * stepFraction);
    updated[levelId] = { enabled: true, value: String(interpolated) };
  }
  return updated;
}

interface CriteriaComparisonTableProps {
  levels: LocalStylistLevel[];
  promotionCriteria: LevelPromotionCriteria[];
  retentionCriteria: LevelRetentionCriteria[];
  onEditLevel: (level: LocalStylistLevel, index: number) => void;
  onCompensationChange: (index: number, field: 'serviceCommissionRate' | 'retailCommissionRate' | 'hourlyWage' | 'hourlyWageEnabled', value: string | boolean) => void;
}

const METRIC_TOOLTIPS: Record<string, string> = {
  'Revenue': 'Total service revenue generated per evaluation period. Typical range: $3K–$12K/week depending on level and market.',
  'Retail %': 'Retail product sales as a percentage of total revenue. Industry benchmark: 10–20%.',
  'Rebooking %': 'Percentage of clients who rebook their next appointment before leaving. Strong salons target 60–80%.',
  'Avg Ticket': 'Average revenue per completed appointment. Varies by service mix — track trend over time.',
  'Client Retention': 'Percentage of clients who return within their expected rebooking window. Healthy retention: 70–85%.',
  'New Clients': 'Number of new clients seen per month. 15–30/mo for growth-stage stylists; lower for senior books.',
  'Utilization': 'Percentage of available hours that are booked with appointments. Target: 75–90%. Below 70% signals underutilization.',
  'Rev/Hr': 'Average revenue generated per booked hour of service. Varies by price point — use to compare across team members.',
  'Tenure': 'Minimum days at current level before promotion eligibility. Typical: 90–180 days between levels.',
  'Eval Window': 'Time period over which KPI performance is measured for evaluation.',
  'Approval': 'Whether promotion requires manual manager approval or triggers automatically when thresholds are met.',
  'Grace Period': 'Days a stylist has to recover performance before the configured action is taken.',
  'Action': 'What happens when a stylist falls below retention thresholds — coaching conversation or demotion eligibility.',
};

function CriteriaComparisonTable({ levels, promotionCriteria, retentionCriteria, onEditLevel, onCompensationChange }: CriteriaComparisonTableProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  // Inline editing state for KPI rows
  const [editingMetric, setEditingMetric] = useState<{ label: string; section: 'promotion' | 'retention' } | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { enabled: boolean; value: string }>>({});
  const [isSavingRow, setIsSavingRow] = useState(false);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const toggleTableFullscreen = useCallback(() => setIsTableFullscreen(prev => !prev), []);

  // Inline editing state for compensation rows
  const [editingCompRow, setEditingCompRow] = useState<'serviceCommission' | 'retailCommission' | 'hourlyWage' | null>(null);
  const [compEditValues, setCompEditValues] = useState<Record<number, string>>({});

  const getCriteria = (levelDbId: string | undefined) => ({
    promo: promotionCriteria.find(c => c.stylist_level_id === levelDbId && c.is_active),
    retention: retentionCriteria.find(r => r.stylist_level_id === levelDbId && r.is_active),
  });

  const fmtCurrency = (v: number) => v >= 1000 ? `$${parseFloat((v / 1000).toFixed(1))}K` : `$${v}`;

  type MetricRow = {
    label: string;
    getValue: (promo: LevelPromotionCriteria | undefined, ret: LevelRetentionCriteria | undefined, levelIdx?: number) => string | null;
    getNumeric: (promo: LevelPromotionCriteria | undefined, ret: LevelRetentionCriteria | undefined) => number | null;
    section: 'promotion' | 'retention';
    editable?: boolean;
  };

  const metrics: MetricRow[] = [
    // Promotion
    { label: 'Revenue', section: 'promotion', editable: true, getValue: (p) => p?.revenue_enabled ? fmtCurrency(p.revenue_threshold) : null, getNumeric: (p) => p?.revenue_enabled ? p.revenue_threshold : null },
    { label: 'Retail %', section: 'promotion', editable: true, getValue: (p) => p?.retail_enabled ? `${p.retail_pct_threshold}%` : null, getNumeric: (p) => p?.retail_enabled ? p.retail_pct_threshold : null },
    { label: 'Rebooking %', section: 'promotion', editable: true, getValue: (p) => p?.rebooking_enabled ? `${p.rebooking_pct_threshold}%` : null, getNumeric: (p) => p?.rebooking_enabled ? p.rebooking_pct_threshold : null },
    { label: 'Avg Ticket', section: 'promotion', editable: true, getValue: (p) => p?.avg_ticket_enabled ? `$${p.avg_ticket_threshold}` : null, getNumeric: (p) => p?.avg_ticket_enabled ? p.avg_ticket_threshold : null },
    { label: 'Client Retention', section: 'promotion', editable: true, getValue: (p) => p?.retention_rate_enabled ? `${p.retention_rate_threshold}%` : null, getNumeric: (p) => p?.retention_rate_enabled ? Number(p.retention_rate_threshold) : null },
    { label: 'New Clients', section: 'promotion', editable: true, getValue: (p) => p?.new_clients_enabled ? `${p.new_clients_threshold}/mo` : null, getNumeric: (p) => p?.new_clients_enabled ? Number(p.new_clients_threshold) : null },
    { label: 'Utilization', section: 'promotion', editable: true, getValue: (p) => p?.utilization_enabled ? `${p.utilization_threshold}%` : null, getNumeric: (p) => p?.utilization_enabled ? Number(p.utilization_threshold) : null },
    { label: 'Rev/Hr', section: 'promotion', editable: true, getValue: (p) => p?.rev_per_hour_enabled ? `$${p.rev_per_hour_threshold}` : null, getNumeric: (p) => p?.rev_per_hour_enabled ? Number(p.rev_per_hour_threshold) : null },
    { label: 'Tenure', section: 'promotion', editable: true, getValue: (p) => p?.tenure_enabled ? `${p.tenure_days}d` : null, getNumeric: (p) => p?.tenure_enabled ? p.tenure_days : null },
    { label: 'Eval Window', section: 'promotion', editable: false, getValue: (p) => p ? `${p.evaluation_window_days}d` : null, getNumeric: () => null },
    { label: 'Approval', section: 'promotion', editable: false, getValue: (p) => p ? (p.requires_manual_approval ? 'Manual' : 'Auto') : null, getNumeric: () => null },
    // Retention Policy (no KPI rows — they inherit from promotion)
    { label: 'Eval Window', section: 'retention', editable: false, getValue: (_, r) => r?.retention_enabled ? `${r.evaluation_window_days}d` : null, getNumeric: () => null },
    { label: 'Grace Period', section: 'retention', editable: false, getValue: (_, r) => r?.retention_enabled ? `${r.grace_period_days}d` : null, getNumeric: () => null },
    { label: 'Action', section: 'retention', editable: false, getValue: (_, r) => r?.retention_enabled ? (r.action_type === 'demotion_eligible' ? 'Demotion' : 'Coaching') : null, getNumeric: () => null },
  ];

  const levelData = levels.map(l => getCriteria(l.dbId));

  const hasInconsistency = (metricIdx: number, levelIdx: number): boolean => {
    const metric = metrics[metricIdx];
    if (levelIdx === 0) return false;
    const currentVal = metric.getNumeric(levelData[levelIdx].promo, levelData[levelIdx].retention);
    for (let i = levelIdx - 1; i >= 0; i--) {
      const prevVal = metric.getNumeric(levelData[i].promo, levelData[i].retention);
      if (prevVal !== null && currentVal !== null) {
        return currentVal < prevVal;
      }
    }
    return false;
  };

  // Check inline edit inconsistency
  const hasEditInconsistency = (levelIdx: number, levelIds: string[]): boolean => {
    if (levelIdx === 0) return false;
    const currentEntry = editValues[levelIds[levelIdx]];
    if (!currentEntry?.enabled || !currentEntry.value) return false;
    const currentVal = parseFloat(currentEntry.value);
    if (isNaN(currentVal)) return false;
    for (let i = levelIdx - 1; i >= 0; i--) {
      const prevEntry = editValues[levelIds[i]];
      if (prevEntry?.enabled && prevEntry.value) {
        const prevVal = parseFloat(prevEntry.value);
        if (!isNaN(prevVal)) return currentVal < prevVal;
      }
    }
    return false;
  };

  // Start editing a metric row
  const startEditing = (label: string, section: 'promotion' | 'retention') => {
    const fieldMapping = METRIC_FIELD_MAP[label];
    if (!fieldMapping) return;

    const values: Record<string, { enabled: boolean; value: string }> = {};
    levels.forEach((level, idx) => {
      if (!level.dbId) {
        values[level.id] = { enabled: false, value: '' };
        return;
      }
      const { promo, retention } = getCriteria(level.dbId);
      // Base level editable promotion KPIs read from retention minimums
      const isBaseLevelRet = section === 'promotion' && idx === 0 && label !== 'Tenure' && label !== 'Eval Window' && label !== 'Approval';
      if (isBaseLevelRet && retention) {
        const enabled = retention[fieldMapping.retEnabledField] as boolean;
        const val = retention[fieldMapping.retValueField] as number;
        values[level.id] = { enabled: !!enabled, value: val ? String(val) : '' };
      } else if (section === 'promotion' && promo) {
        const enabled = promo[fieldMapping.promoEnabledField] as boolean;
        const val = promo[fieldMapping.promoValueField] as number;
        values[level.id] = { enabled: !!enabled, value: val ? String(val) : '' };
      } else if (section === 'retention' && retention) {
        const enabled = retention[fieldMapping.retEnabledField] as boolean;
        const val = retention[fieldMapping.retValueField] as number;
        values[level.id] = { enabled: !!enabled, value: val ? String(val) : '' };
      } else {
        values[level.id] = { enabled: false, value: '' };
      }
    });

    setEditValues(values);
    setEditingMetric({ label, section });
  };

  const cancelEditing = () => {
    setEditingMetric(null);
    setEditValues({});
  };

  // Save a metric row across all levels
  const saveMetricRow = async () => {
    if (!editingMetric || !orgId) return;
    const fieldMapping = METRIC_FIELD_MAP[editingMetric.label];
    if (!fieldMapping) return;

    setIsSavingRow(true);
    try {
      for (let li = 0; li < levels.length; li++) {
        const level = levels[li];
        if (!level.dbId) continue;
        const entry = editValues[level.id];
        if (!entry) continue;

        const numVal = parseFloat(entry.value) || 0;
        const isBaseLevelRet = editingMetric.section === 'promotion' && li === 0 && editingMetric.label !== 'Tenure' && editingMetric.label !== 'Eval Window' && editingMetric.label !== 'Approval';

        if (isBaseLevelRet) {
          // Base level promotion KPIs save to retention criteria
          const existing = retentionCriteria.find(r => r.stylist_level_id === level.dbId && r.is_active);
          const retDefaults = getZuraRetentionDefaults(0);
          const base: any = existing ? { ...existing } : {
            organization_id: orgId,
            stylist_level_id: level.dbId,
            retention_enabled: true,
            revenue_enabled: false, revenue_minimum: 0,
            retail_enabled: false, retail_pct_minimum: 0,
            rebooking_enabled: false, rebooking_pct_minimum: 0,
            avg_ticket_enabled: false, avg_ticket_minimum: 0,
            retention_rate_enabled: false, retention_rate_minimum: 0,
            new_clients_enabled: false, new_clients_minimum: 0,
            utilization_enabled: false, utilization_minimum: 0,
            rev_per_hour_enabled: false, rev_per_hour_minimum: 0,
            evaluation_window_days: retDefaults.evaluation_window_days ?? 90,
            grace_period_days: retDefaults.grace_period_days ?? 30,
            action_type: retDefaults.action_type ?? 'coaching_flag',
            is_active: true,
          };
          delete base.id; delete base.created_at; delete base.updated_at;
          base[fieldMapping.retEnabledField] = entry.enabled;
          base[fieldMapping.retValueField] = numVal;
          base.retention_enabled = true;

          const { error } = await supabase
            .from('level_retention_criteria')
            .upsert(base, { onConflict: 'organization_id,stylist_level_id' })
            .select().single();
          if (error) throw error;
        } else if (editingMetric.section === 'promotion') {
          const existing = promotionCriteria.find(c => c.stylist_level_id === level.dbId && c.is_active);
          const defaults = getZuraDefaults(levels.findIndex(l => l.id === level.id));
          const base: any = existing ? { ...existing } : {
            organization_id: orgId,
            stylist_level_id: level.dbId,
            revenue_enabled: false, revenue_threshold: 0,
            retail_enabled: false, retail_pct_threshold: 0,
            rebooking_enabled: false, rebooking_pct_threshold: 0,
            avg_ticket_enabled: false, avg_ticket_threshold: 0,
            tenure_enabled: false, tenure_days: 0,
            revenue_weight: 30, retail_weight: 15, rebooking_weight: 20, avg_ticket_weight: 15,
            retention_rate_enabled: false, retention_rate_threshold: 0, retention_rate_weight: 10,
            new_clients_enabled: false, new_clients_threshold: 0, new_clients_weight: 5,
            utilization_enabled: false, utilization_threshold: 0, utilization_weight: 5,
            rev_per_hour_enabled: false, rev_per_hour_threshold: 0, rev_per_hour_weight: 0,
            evaluation_window_days: defaults.evaluation_window_days ?? 90,
            requires_manual_approval: true,
            is_active: true,
          };
          delete base.id; delete base.created_at; delete base.updated_at;
          base[fieldMapping.promoEnabledField] = entry.enabled;
          base[fieldMapping.promoValueField] = numVal;

          const { error } = await supabase
            .from('level_promotion_criteria')
            .upsert(base, { onConflict: 'organization_id,stylist_level_id' })
            .select().single();
          if (error) throw error;
        } else {
          const existing = retentionCriteria.find(r => r.stylist_level_id === level.dbId && r.is_active);
          const retDefaults = getZuraRetentionDefaults(levels.findIndex(l => l.id === level.id));
          const base: any = existing ? { ...existing } : {
            organization_id: orgId,
            stylist_level_id: level.dbId,
            retention_enabled: false,
            revenue_enabled: false, revenue_minimum: 0,
            retail_enabled: false, retail_pct_minimum: 0,
            rebooking_enabled: false, rebooking_pct_minimum: 0,
            avg_ticket_enabled: false, avg_ticket_minimum: 0,
            retention_rate_enabled: false, retention_rate_minimum: 0,
            new_clients_enabled: false, new_clients_minimum: 0,
            utilization_enabled: false, utilization_minimum: 0,
            rev_per_hour_enabled: false, rev_per_hour_minimum: 0,
            evaluation_window_days: retDefaults.evaluation_window_days ?? 90,
            grace_period_days: retDefaults.grace_period_days ?? 30,
            action_type: retDefaults.action_type ?? 'coaching_flag',
            is_active: true,
          };
          delete base.id; delete base.created_at; delete base.updated_at;
          base[fieldMapping.retEnabledField] = entry.enabled;
          base[fieldMapping.retValueField] = numVal;

          const { error } = await supabase
            .from('level_retention_criteria')
            .upsert(base, { onConflict: 'organization_id,stylist_level_id' })
            .select().single();
          if (error) throw error;
        }
      }

      // Broad invalidation — catches all per-level query keys used by the wizard
      await queryClient.invalidateQueries({ queryKey: ['level-promotion-criteria'] });
      await queryClient.invalidateQueries({ queryKey: ['level-retention-criteria'] });
      toast.success(`${editingMetric.label} updated across all levels`);
      cancelEditing();
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setIsSavingRow(false);
    }
  };

  const handleAutoStep = () => {
    const editableLevelIds = levels
      .filter((_, idx) => {
        if (editingMetric?.section === 'promotion') return idx > 0;
        return true;
      })
      .map(l => l.id);
    setEditValues(autoStepValues(editValues, editableLevelIds));
  };

  // Check if auto-step is available (2+ enabled values)
  const autoStepAvailable = (() => {
    const editableLevelIds = levels
      .filter((_, idx) => {
        if (editingMetric?.section === 'promotion') return idx > 0;
        return true;
      })
      .map(l => l.id);
    const enabledCount = editableLevelIds.filter(id => editValues[id]?.enabled && editValues[id]?.value && parseFloat(editValues[id].value) > 0).length;
    return enabledCount >= 2;
  })();

  // Handle escape key to cancel editing
  useEffect(() => {
    if (!editingMetric && !editingCompRow) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelEditing();
        setEditingCompRow(null);
        setCompEditValues({});
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [editingMetric, editingCompRow]);

  if (levels.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <GraduationCap className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No levels configured</h3>
        <p className={tokens.empty.description}>Add levels first to configure criteria</p>
      </div>
    );
  }

  const isEditing = (label: string, section: 'promotion' | 'retention') =>
    editingMetric?.label === label && editingMetric?.section === section;

  const renderMetricCell = (metric: MetricRow, level: LocalStylistLevel, levelIdx: number, mIdx: number, isEditingRow: boolean) => {
    const { promo, retention } = levelData[levelIdx];
    const fieldMapping = METRIC_FIELD_MAP[metric.label];
    const isBaseLevel = levelIdx === 0;
    const isLastLevel = levelIdx === levels.length - 1;
    // Base level skips only non-editable promotion rows + Tenure (no promotion target)
    const isPromotionSkip = metric.section === 'promotion' && isBaseLevel && (!metric.editable || metric.label === 'Tenure' || metric.label === 'Eval Window' || metric.label === 'Approval');
    const isLastLevelTenure = metric.label === 'Tenure' && isLastLevel;
    // Base level editable promotion KPIs map to retention minimums
    const isBaseLevelRetention = metric.section === 'promotion' && isBaseLevel && metric.editable && metric.label !== 'Tenure';

    if (isEditingRow && metric.editable && fieldMapping && level.dbId && !isPromotionSkip && !isLastLevelTenure) {
      const entry = editValues[level.id] || { enabled: false, value: '' };
      const baseLevelHasRetention = metric.section === 'promotion' && metric.editable && metric.label !== 'Tenure';
      const editableLevelIds = levels.filter((_, idx) => {
        if (metric.section === 'promotion' && !baseLevelHasRetention) return idx > 0;
        return true;
      }).map(l => l.id);
      const editLevelIdx = editableLevelIds.indexOf(level.id);
      const warn = editLevelIdx >= 0 && hasEditInconsistency(editLevelIdx, editableLevelIds);
      
      return (
        <TableCell key={level.id} className="text-center px-3 py-3">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <div className="relative">
                {fieldMapping.isCurrency && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                )}
                <Input
                  type="number"
                  value={entry.value}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditValues(prev => ({
                      ...prev,
                      [level.id]: { ...prev[level.id], value: val, enabled: val !== '' && val !== '0' },
                    }));
                  }}
                  onBlur={() => {
                    // If cleared, mark as disabled
                    if (entry.value === '' || entry.value === '0') {
                      setEditValues(prev => ({
                        ...prev,
                        [level.id]: { ...prev[level.id], enabled: false },
                      }));
                    }
                  }}
                  className={cn(
                    "h-8 w-[90px] text-sm text-center bg-background text-foreground border-border/80",
                    fieldMapping.isCurrency && "pl-5",
                    fieldMapping.isPercent && "pr-6",
                    warn && "border-amber-500 focus-visible:ring-amber-500/30"
                  )}
                  placeholder="—"
                />
                {fieldMapping.isPercent && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                )}
                {fieldMapping.suffix && !fieldMapping.isCurrency && !fieldMapping.isPercent && (
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{fieldMapping.suffix}</span>
                )}
              </div>
            </div>
            {warn && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="w-3 h-3 text-amber-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                  Value is lower than a previous level — thresholds should increase with each level
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TableCell>
      );
    }

    // Read-only display (original logic)
    if (isPromotionSkip || isLastLevelTenure) {
      return (
        <TableCell key={level.id} className="text-center text-sm py-3 px-3">
          <span className="text-muted-foreground/30 text-xs select-none">N/A</span>
        </TableCell>
      );
    }

    // For base level editable KPIs, show retention minimum values instead of promotion thresholds
    let val: string | null;
    if (isBaseLevelRetention && fieldMapping && retention) {
      const enabled = retention[fieldMapping.retEnabledField] as boolean;
      const numVal = retention[fieldMapping.retValueField] as number;
      if (enabled && numVal > 0) {
        val = fieldMapping.isCurrency ? fmtCurrency(numVal) : fieldMapping.isPercent ? `${numVal}%` : fieldMapping.suffix ? `${numVal}${fieldMapping.suffix}` : String(numVal);
      } else {
        val = null;
      }
    } else {
      val = metric.getValue(promo, retention, levelIdx);
    }
    const warn = levelIdx > 0 && !(metric.section === 'promotion' && isBaseLevel) && hasInconsistency(mIdx, levelIdx);

    return (
      <TableCell key={level.id} className="text-center text-sm tabular-nums py-3 px-3">
        {val ? (
          <span className="flex items-center justify-center gap-1">
            {warn && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                  Value is lower than a previous level — thresholds should increase with each level
                </TooltipContent>
              </Tooltip>
            )}
            <span className={warn ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}>{val}</span>
          </span>
        ) : !level.dbId ? (
          <span className="text-muted-foreground/40">—</span>
        ) : (metric.section === 'promotion' && !promo) ? (
          <button
            onClick={() => onEditLevel(level, levelIdx)}
            className="text-xs text-primary/60 hover:text-primary transition-colors"
          >
            Configure
          </button>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </TableCell>
    );
  };

  const renderMetricRow = (metric: MetricRow, mIdx: number, sectionPrefix: string) => {
    const isEditingRow = isEditing(metric.label, metric.section);
    const isEditableMetric = metric.editable && !!METRIC_FIELD_MAP[metric.label];

    return (
      <TableRow
        key={`${sectionPrefix}-${metric.label}`}
        className={cn(
          "border-b border-border/40 transition-colors",
          isEditingRow && "bg-primary/8 ring-1 ring-primary/30",
          isEditableMetric && !editingMetric && "cursor-pointer hover:bg-muted/20",
          metric.section === 'promotion' && !isEditingRow && "border-l-0"
        )}
        onClick={() => {
          if (isEditableMetric && !editingMetric) {
            startEditing(metric.label, metric.section);
          }
        }}
      >
        <TableCell className={cn(
          "text-sm sticky left-0 z-10 py-3 px-4 border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.4)]",
          isEditingRow ? "bg-primary/10 text-foreground" : "text-muted-foreground bg-muted-strong"
        )}>
          <div className="flex items-center gap-1.5">
            <span>{metric.label}</span>
            {!isEditingRow && METRIC_TOOLTIPS[metric.label] && (
              <MetricInfoTooltip description={METRIC_TOOLTIPS[metric.label]} side="right" />
            )}
            {isEditingRow && METRIC_TOOLTIPS[metric.label] && (
              <MetricInfoTooltip description={METRIC_TOOLTIPS[metric.label]} side="right" />
            )}
          </div>
        </TableCell>
        {levels.map((level, levelIdx) => renderMetricCell(metric, level, levelIdx, mIdx, isEditingRow))}
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Click any metric row to configure thresholds across all levels at once. Use "Edit" per-level for advanced settings.
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5 font-sans">
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              const rows: string[][] = [];
              rows.push(['Metric', ...levels.map((l, i) => `Level ${i + 1}: ${l.label}`)]);
              rows.push(['— COMPENSATION —']);
              ['Service Commission', 'Retail Commission'].forEach(label => {
                const field = label === 'Service Commission' ? 'serviceCommissionRate' : 'retailCommissionRate';
                rows.push([label, ...levels.map(l => l[field] ? `${l[field]}%` : '—')]);
              });
              rows.push(['— PROMOTION —']);
              metrics.filter(m => m.section === 'promotion').forEach(m => {
                rows.push([m.label, ...levelData.map(d => m.getValue(d.promo, d.retention) ?? '—')]);
              });
              rows.push(['— RETENTION —']);
              metrics.filter(m => m.section === 'retention').forEach(m => {
                rows.push([m.label, ...levelData.map(d => m.getValue(d.promo, d.retention) ?? '—')]);
              });
              const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `level-criteria-comparison-${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(link.href);
              toast.success('CSV exported');
            }}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export as Spreadsheet (.csv)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
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
                } catch { /* proceed without logo */ }
              }
              const levelInfos = levels.filter(l => l.dbId).map((l, i) => ({
                label: l.label,
                slug: l.slug,
                dbId: l.dbId,
                index: i,
                isConfigured: l.isConfigured,
              }));
              const commissions = levels.filter(l => l.dbId).map(l => ({
                dbId: l.dbId,
                serviceCommissionRate: parseFloat(String(l.serviceCommissionRate)) || 0,
                retailCommissionRate: parseFloat(String(l.retailCommissionRate)) || 0,
                hourlyWageEnabled: l.hourlyWageEnabled,
                hourlyWage: l.hourlyWage ? parseFloat(l.hourlyWage) : null,
              }));
              const doc = generateLevelRequirementsPDF({
                orgName: effectiveOrganization?.name || 'Organization',
                levels: levelInfos,
                criteria: promotionCriteria,
                retentionCriteria: retentionCriteria || [],
                logoDataUrl,
                commissions,
              });
              doc.save('level-criteria-comparison.pdf');
              toast.success('PDF exported');
            }}>
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ScrollableTableWrapper isFullscreen={isTableFullscreen} onToggleFullscreen={toggleTableFullscreen}>
        <table className="w-full caption-bottom text-sm [&_th]:border-r [&_th]:border-border/30 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-border/30 [&_td:last-child]:border-r-0 [&_td[colspan]]:border-r-0">
          <TableHeader className="sticky top-0 z-20 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_4px_-2px_rgba(0,0,0,0.3)]">
            <TableRow className="border-b border-border bg-muted-strong">
              <TableHead className={cn("w-[128px] min-w-[128px] sticky left-0 bg-muted-strong z-30 py-3 px-3 border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.4)] text-center align-middle", tokens.table.columnHeader)}>Metric</TableHead>
              {levels.map((level, idx) => {
                const ret = level.dbId ? getCriteria(level.dbId).retention : undefined;
                const retentionActive = ret?.retention_enabled === true;
                return (
                  <TableHead key={level.id} className={cn("text-center min-w-[140px] py-4 px-3 bg-muted-strong", tokens.table.columnHeader)}>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground/50">
                        Level {idx + 1}
                      </span>
                      <span className="text-sm font-medium">{level.label}</span>
                      {level.configStatus === 'configured' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Configured
                        </span>
                      ) : level.configStatus === 'retention_not_set' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          Retention Not Set
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          Incomplete
                        </span>
                      )}
                      {level.dbId ? (
                        <button
                          onClick={() => onEditLevel(level, idx)}
                          className="text-xs text-primary hover:text-primary/80 transition-colors px-2.5 py-0.5 rounded-full border border-primary/20 hover:border-primary/40"
                        >
                          Edit
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">Unsaved</span>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Compensation section */}
            <TableRow className="bg-muted-strong hover:bg-muted-strong border-t border-border">
              <TableCell className="sticky left-0 z-10 bg-muted-strong py-3 px-3 border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.4)]">
                <span className="flex items-center gap-2 text-xs font-display uppercase tracking-wide text-foreground">
                  <DollarSign className="w-4 h-4 text-primary shrink-0" />
                  Compensation
                </span>
              </TableCell>
              <TableCell colSpan={levels.length} className="py-3 px-4 bg-muted-strong text-sm text-muted-foreground/60">
                At this level
              </TableCell>
            </TableRow>
            {['Service Commission', 'Retail Commission'].map((commLabel) => {
              const field = commLabel === 'Service Commission' ? 'serviceCommissionRate' : 'retailCommissionRate';
              const compRowKey = commLabel === 'Service Commission' ? 'serviceCommission' : 'retailCommission';
              const isEditingThisRow = editingCompRow === compRowKey;

              return (
                <TableRow
                  key={commLabel}
                  className={cn(
                    "border-b border-border/40 transition-colors",
                    isEditingThisRow && "bg-primary/8 ring-1 ring-primary/30",
                    !editingCompRow && !editingMetric && "cursor-pointer hover:bg-muted/20"
                  )}
                  onClick={() => {
                    if (!editingCompRow && !editingMetric) {
                      setEditingCompRow(compRowKey as 'serviceCommission' | 'retailCommission');
                      const vals: Record<number, string> = {};
                      levels.forEach((level, idx) => {
                        vals[idx] = level[field] || '';
                      });
                      setCompEditValues(vals);
                    }
                  }}
                >
                  <TableCell className={cn(
                    "text-sm sticky left-0 z-10 py-3 px-4 border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.4)]",
                    isEditingThisRow ? "bg-primary/10 text-foreground" : "text-muted-foreground bg-muted-strong"
                  )}>
                    <div className="flex items-center gap-1.5">
                      <span>{commLabel}</span>
                      {isEditingThisRow && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Apply all edited values
                              Object.entries(compEditValues).forEach(([idx, val]) => {
                                onCompensationChange(Number(idx), field as 'serviceCommissionRate' | 'retailCommissionRate', val);
                              });
                              setEditingCompRow(null);
                              setCompEditValues({});
                              toast.success(`${commLabel} updated — save to persist`);
                            }}
                            className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            Apply
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingCompRow(null); setCompEditValues({}); }}
                            className="text-xs px-1.5 py-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {levels.map((level, idx) => {
                    if (isEditingThisRow) {
                      const val = compEditValues[idx] ?? '';
                      return (
                        <TableCell key={level.id} className="text-center px-3 py-3">
                          <div className="relative inline-block">
                            <Input
                              type="number"
                              value={val}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                setCompEditValues(prev => ({ ...prev, [idx]: e.target.value }));
                              }}
                              className="h-8 w-[90px] text-sm text-center bg-background text-foreground border-border/80 pr-6"
                              placeholder="—"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                          </div>
                        </TableCell>
                      );
                    }
                    const rate = level[field];
                    return (
                      <TableCell key={level.id} className="text-center text-sm tabular-nums py-3 px-3">
                        {rate != null && rate !== '' && parseFloat(String(rate)) > 0 ? (
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

            {/* Hourly Wage row */}
            {(() => {
              const isEditingHourly = editingCompRow === 'hourlyWage';
              return (
                <TableRow
                  className={cn(
                    "border-b border-border/40 transition-colors",
                    isEditingHourly && "bg-primary/8 ring-1 ring-primary/30",
                    !editingCompRow && !editingMetric && "cursor-pointer hover:bg-muted/20"
                  )}
                  onClick={() => {
                    if (!editingCompRow && !editingMetric) {
                      setEditingCompRow('hourlyWage');
                      const vals: Record<number, string> = {};
                      levels.forEach((level, idx) => {
                        vals[idx] = level.hourlyWage || '';
                      });
                      setCompEditValues(vals);
                    }
                  }}
                >
                  <TableCell className={cn(
                    "text-sm sticky left-0 z-10 py-3 px-4 border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.4)]",
                    isEditingHourly ? "bg-primary/10 text-foreground" : "text-muted-foreground bg-muted-strong"
                  )}>
                    <div className="flex items-center gap-1.5">
                      <span>Hourly Wage</span>
                      {isEditingHourly && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              Object.entries(compEditValues).forEach(([idx, val]) => {
                                const numIdx = Number(idx);
                                if (val && parseFloat(val) > 0) {
                                  onCompensationChange(numIdx, 'hourlyWageEnabled', true);
                                  onCompensationChange(numIdx, 'hourlyWage', val);
                                } else {
                                  onCompensationChange(numIdx, 'hourlyWage', '');
                                  onCompensationChange(numIdx, 'hourlyWageEnabled', false);
                                }
                              });
                              setEditingCompRow(null);
                              setCompEditValues({});
                              toast.success('Hourly Wage updated — save to persist');
                            }}
                            className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            Apply
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingCompRow(null); setCompEditValues({}); }}
                            className="text-xs px-1.5 py-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {levels.map((level, idx) => {
                    if (isEditingHourly) {
                      const val = compEditValues[idx] ?? '';
                      return (
                        <TableCell key={level.id} className="text-center px-3 py-3">
                          <div className="relative inline-block">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                            <Input
                              type="number"
                              value={val}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                setCompEditValues(prev => ({ ...prev, [idx]: e.target.value }));
                              }}
                              className="h-8 w-[90px] text-sm text-center bg-background text-foreground border-border/80 pl-5 pr-6"
                              placeholder="—"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">/hr</span>
                          </div>
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell key={level.id} className="text-center text-sm tabular-nums py-3 px-3">
                        {level.hourlyWageEnabled && level.hourlyWage ? (
                          <span className="text-foreground font-medium">${level.hourlyWage}/hr</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })()}

            {/* Promotion section header */}
            <TableRow className="bg-muted-strong hover:bg-muted-strong border-t border-border">
              <TableCell className="sticky left-0 z-10 bg-muted-strong py-3 px-3 border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.4)]">
                <span className="flex items-center gap-2 text-xs font-display uppercase tracking-wide text-foreground">
                  <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                  Promotion
                </span>
              </TableCell>
              <TableCell colSpan={levels.length} className="py-3 px-4 bg-muted-strong text-sm text-muted-foreground/60">
                To reach this level · <span className="italic">Level 1 shows retention minimums</span>
              </TableCell>
            </TableRow>
            {metrics.filter(m => m.section === 'promotion').map((metric, mIdx) =>
              renderMetricRow(metric, mIdx, 'promo')
            )}

            {/* Retention Policy section header */}
            <TableRow className="bg-muted-strong hover:bg-muted-strong border-t border-border">
              <TableCell className="sticky left-0 z-10 bg-muted-strong py-3 px-3 border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.4)]">
                <span className="flex items-center gap-2 text-xs font-display uppercase tracking-wide text-foreground">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  Retention
                </span>
              </TableCell>
              <TableCell colSpan={levels.length} className="py-3 px-4 bg-muted-strong text-sm text-muted-foreground/60">
                KPI minimums inherited from Level Requirements · Falling below triggers demotion to Level 1
              </TableCell>
            </TableRow>
            {metrics.filter(m => m.section === 'retention').map((metric, mIdx) => {
              const globalIdx = metrics.findIndex(m => m.section === 'retention' && m.label === metric.label);
              return renderMetricRow(metric, globalIdx, 'ret');
            })}
          </TableBody>
        </table>
      </ScrollableTableWrapper>

      {/* Floating action bar for row editing */}
      <AnimatePresence>
        {editingMetric && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-20 right-6 z-50 flex items-center gap-2 bg-card/90 backdrop-blur-xl border border-border rounded-xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.4)] px-4 py-2.5"
          >
            <span className="text-xs font-display uppercase tracking-wide text-muted-foreground mr-1">{editingMetric.label}</span>
            {autoStepAvailable && (
              <button
                onClick={handleAutoStep}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                Auto-step
              </button>
            )}
            <button
              onClick={saveMetricRow}
              disabled={isSavingRow}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
            >
              {isSavingRow ? '…' : 'Save'}
            </button>
            <button
              onClick={cancelEditing}
              className="text-xs p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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
        earningsStructure: 'commission' as EarningsStructure,
        isConfigured: false,
        configStatus: 'incomplete' as const,
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
  /** Callback to expose action buttons to the parent (used when embedded to render in page header) */
  onActions?: (actions: React.ReactNode) => void;
}

export function StylistLevelsEditor({ embedded = false, onActions }: StylistLevelsEditorProps) {
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
  const [showRoadmap, setShowRoadmap] = useState(false);
  const queryClient = useQueryClient();
  const updateLevel = useUpdateStylistLevel();

  const { data: promotionCriteria } = useLevelPromotionCriteria();
  const { data: retentionCriteria } = useLevelRetentionCriteria();
  const { data: activeLocations = [] } = useActiveLocations();
  const { teamProgress, counts: teamCounts } = useTeamLevelProgress();
  const levelEconomics = useLevelEconomicsAnalyzer(dbLevels || []);

  useEffect(() => {
    if (dbLevels && !hasChanges) {
      const localLevels: LocalStylistLevel[] = dbLevels.map((l) => {
        const sRate = formatRate(l.service_commission_rate);
        const rRate = formatRate(l.retail_commission_rate);
        const hEnabled = l.hourly_wage_enabled ?? false;
        return {
          id: l.slug,
          dbId: l.id,
          slug: l.slug,
          label: l.label,
          clientLabel: l.client_label,
          description: l.description || '',
          serviceCommissionRate: sRate,
          retailCommissionRate: rRate,
          hourlyWageEnabled: hEnabled,
          hourlyWage: l.hourly_wage != null ? String(l.hourly_wage) : '',
          earningsStructure: deriveEarningsStructure(hEnabled, sRate, rRate),
          ...(() => {
            if (l.is_configured) return { isConfigured: true, configStatus: 'configured' as const };
            const idx = dbLevels!.indexOf(l);
            const hasRetention = retentionCriteria?.some(rc => rc.stylist_level_id === l.id && rc.is_active) ?? false;
            if (idx === 0) {
              return hasRetention
                ? { isConfigured: true, configStatus: 'configured' as const }
                : { isConfigured: false, configStatus: 'incomplete' as const };
            }
            const hasPromotion = promotionCriteria?.some(pc => pc.stylist_level_id === l.id && pc.is_active) ?? false;
            if (hasPromotion && hasRetention) return { isConfigured: true, configStatus: 'configured' as const };
            if (hasPromotion) return { isConfigured: false, configStatus: 'retention_not_set' as const };
            return { isConfigured: false, configStatus: 'incomplete' as const };
          })(),
        };
      });
      setLevels(localLevels);
    }
  }, [dbLevels, hasChanges, promotionCriteria, retentionCriteria]);

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
      earningsStructure: 'commission' as EarningsStructure,
      isConfigured: false,
      configStatus: 'incomplete' as const,
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
    const levelsToSave = levels.map((level, idx) => {
      const isHourly = level.earningsStructure === 'hourly';
      const isCommission = level.earningsStructure === 'commission';
      return {
        id: level.dbId,
        slug: level.slug,
        label: level.label,
        client_label: `Level ${idx + 1}`,
        description: level.description || undefined,
        display_order: idx,
        service_commission_rate: isHourly ? null : (level.serviceCommissionRate ? parseFloat(level.serviceCommissionRate) / 100 : null),
        retail_commission_rate: isHourly ? null : (level.retailCommissionRate ? parseFloat(level.retailCommissionRate) / 100 : null),
        hourly_wage_enabled: !isCommission,
        hourly_wage: isCommission ? null : (level.hourlyWage ? parseFloat(level.hourlyWage) : null),
      };
    });
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
        hourly_wage_enabled: level.hourlyWageEnabled,
        hourly_wage: level.hourlyWage ? parseFloat(level.hourlyWage) : null,
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
              {
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

  const isEarlyExit = isLoading || !!error;

  const actionButtons = useMemo(() => (
    <div className="flex items-center gap-2">
      {levels.length > 0 && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowRoadmap(true)}
          >
            <Eye className="w-4 h-4" />
            View Level Roadmap
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
  ), [levels.length, hasChanges, saveLevels.isPending, analysisLoading]);

  // Expose action buttons to parent when embedded
  useEffect(() => {
    if (embedded && onActions) {
      onActions(actionButtons);
    }
  }, [embedded, onActions, actionButtons]);

  const totalAssigned = Object.values(stylistsByLevel || {}).reduce((a, b) => a + b, 0);

  if (isEarlyExit) {
    if (isLoading) return <DashboardLoader />;
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
          <>{/* action buttons rendered in parent header */}</>
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
                      className="h-8 px-4 border-dashed border-primary/40 text-sm text-primary hover:bg-primary/10 hover:border-primary/60"
                      onClick={() => setIsAddingNew(true)}
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Level
                    </Button>
                  )}
                </div>
              )}

              {/* Inline add-new form */}
              {isAddingNew && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
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
                      "group rounded-lg bg-card border transition-all duration-200",
                      editingIndex === index && "ring-2 ring-primary/50 shadow-sm",
                      !isExpanded && "hover:bg-muted/30"
                    )}
                  >
                    {/* Collapsed header row — grid layout for column alignment */}
                    <div
                      className="grid grid-cols-[auto_auto_1fr_7rem_6rem_5rem_5rem_auto] items-center px-3 py-2 cursor-pointer select-none"
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

                      {/* Col 3: Name + margin indicator — left-aligned */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-display text-xs tracking-wide truncate">{level.label}</span>
                        {(() => {
                          const summary = levelEconomics.levelSummaries.find(s => s.levelLabel === level.label);
                          if (!summary || !summary.hasEnoughData) return null;
                          const color = summary.status === 'healthy'
                            ? 'bg-emerald-500'
                            : summary.status === 'tight'
                            ? 'bg-amber-500'
                            : 'bg-rose-500';
                          const textColor = summary.status === 'healthy'
                            ? 'text-emerald-600'
                            : summary.status === 'tight'
                            ? 'text-amber-600'
                            : 'text-rose-600';
                          return (
                            <span className={cn('hidden sm:flex items-center gap-1 text-[10px]', textColor)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', color)} />
                              ~{(summary.weightedMarginPct * 100).toFixed(0)}%
                            </span>
                          );
                        })()}
                      </div>

                      {/* Col 4: Service Commission — center-aligned */}
                      <span className="text-xs text-muted-foreground text-center hidden sm:block">
                        {level.serviceCommissionRate ? `Service ${level.serviceCommissionRate}%` : '—'}
                      </span>

                      {/* Col 5: Retail Commission — center-aligned */}
                      <span className="text-xs text-muted-foreground text-center hidden sm:block">
                        {level.retailCommissionRate ? `Retail ${level.retailCommissionRate}%` : '—'}
                      </span>

                      {/* Col 6: Hourly Wage — center-aligned */}
                      <span className="text-xs text-muted-foreground text-center hidden sm:block">
                        {level.hourlyWageEnabled && level.hourlyWage ? `$${level.hourlyWage}/hr` : '—'}
                      </span>

                      {/* Col 7: Stylist count — center-aligned */}
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

                        {/* Earnings Structure Selector */}
                        <div className="ml-[3.25rem] space-y-3">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-muted-foreground">Earnings Structure</label>
                            <MetricInfoTooltip description="Choose how stylists at this level are compensated: hourly wage, commission on services/retail, or a combination of both." />
                          </div>
                          <ToggleGroup
                            type="single"
                            value={level.earningsStructure}
                            onValueChange={(value) => {
                              if (!value) return;
                              const structure = value as EarningsStructure;
                              const newLevels = [...levels];
                              const updated = { ...newLevels[index], earningsStructure: structure };
                              // Smart defaults: clear irrelevant fields
                              if (structure === 'hourly') {
                                updated.serviceCommissionRate = '';
                                updated.retailCommissionRate = '';
                                updated.hourlyWageEnabled = true;
                              } else if (structure === 'commission') {
                                updated.hourlyWage = '';
                                updated.hourlyWageEnabled = false;
                              } else {
                                updated.hourlyWageEnabled = true;
                              }
                              newLevels[index] = updated;
                              setLevels(newLevels);
                              setHasChanges(true);
                            }}
                            className="justify-start"
                          >
                            <ToggleGroupItem value="hourly" className="text-xs gap-1.5 data-[state=on]:bg-foreground data-[state=on]:text-background rounded-full px-3 h-8">
                              <Clock className="w-3.5 h-3.5" />
                              Hourly
                            </ToggleGroupItem>
                            <ToggleGroupItem value="commission" className="text-xs gap-1.5 data-[state=on]:bg-foreground data-[state=on]:text-background rounded-full px-3 h-8">
                              <DollarSign className="w-3.5 h-3.5" />
                              Commission
                            </ToggleGroupItem>
                            <ToggleGroupItem value="both" className="text-xs gap-1.5 data-[state=on]:bg-foreground data-[state=on]:text-background rounded-full px-3 h-8">
                              <DollarSign className="w-3.5 h-3.5" />
                              Hourly + Commission
                            </ToggleGroupItem>
                          </ToggleGroup>
                          <p className="text-[11px] text-muted-foreground">
                            {EARNINGS_STRUCTURE_DESCRIPTIONS[level.earningsStructure]}
                          </p>
                        </div>

                        {/* Hourly Wage — visible for 'hourly' and 'both' */}
                        <div className={cn(
                          "ml-[3.25rem] transition-all duration-200",
                          level.earningsStructure === 'commission' ? "h-0 overflow-hidden opacity-0" : "opacity-100"
                        )}>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Starting Hourly Wage</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={level.hourlyWage}
                                onChange={(e) => {
                                  const newLevels = [...levels];
                                  newLevels[index] = { ...newLevels[index], hourlyWage: e.target.value };
                                  setLevels(newLevels);
                                  setHasChanges(true);
                                }}
                                className="h-8 text-xs pl-7 pr-10"
                                min={0}
                                step={0.25}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/hr</span>
                            </div>
                          </div>
                        </div>

                        {/* Commission fields — visible for 'commission' and 'both' */}
                        <div className={cn(
                          "ml-[3.25rem] grid grid-cols-2 gap-3 transition-all duration-200",
                          level.earningsStructure === 'hourly' ? "h-0 overflow-hidden opacity-0" : "opacity-100"
                        )}>
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

                        {/* Mark as Configured toggle */}
                        {level.dbId && (
                          <div className="ml-[3.25rem] flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
                            <div className="flex items-center gap-2">
                              <Check className={cn("w-3.5 h-3.5", level.configStatus === 'configured' ? "text-emerald-600" : level.configStatus === 'retention_not_set' ? "text-amber-500" : "text-muted-foreground/40")} />
                              <span className="text-xs font-sans text-foreground">Mark as Configured</span>
                              <span className="text-[10px] text-muted-foreground">
                                {level.configStatus === 'configured' ? 'This level is ready and will appear as complete on the roadmap.' : level.configStatus === 'retention_not_set' ? 'Promotion criteria set — retention monitoring still needed.' : 'Mark this level when setup is complete.'}
                              </span>
                            </div>
                            <Switch
                              checked={level.isConfigured}
                              onCheckedChange={(checked) => {
                                if (level.dbId) {
                                  updateLevel.mutate({ id: level.dbId, is_configured: checked });
                                  const newLevels = [...levels];
                                  newLevels[index] = { ...newLevels[index], isConfigured: checked };
                                  setLevels(newLevels);
                                }
                              }}
                            />
                          </div>
                        )}
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
                onCompensationChange={(index, field, value) => {
                  const newLevels = [...levels];
                  if (field === 'hourlyWageEnabled') {
                    newLevels[index] = { ...newLevels[index], hourlyWageEnabled: value as boolean };
                  } else {
                    newLevels[index] = { ...newLevels[index], [field]: value as string };
                  }
                  setLevels(newLevels);
                  setHasChanges(true);
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
              <div className="rounded-lg border bg-card p-4 mb-4">
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
      {showRoadmap && (
        <LevelRoadmapView
          levels={levels.map((l, i) => ({
            label: l.label,
            slug: l.slug,
            dbId: l.dbId,
            index: i,
            isConfigured: l.isConfigured,
            serviceCommissionRate: parseFloat(String(l.serviceCommissionRate)) || 0,
            retailCommissionRate: parseFloat(String(l.retailCommissionRate)) || 0,
            hourlyWageEnabled: l.hourlyWageEnabled,
            hourlyWage: l.hourlyWage ? parseFloat(l.hourlyWage) : null,
          }))}
          promotionCriteria={promotionCriteria || []}
          retentionCriteria={retentionCriteria || []}
          orgName={effectiveOrganization?.name || 'Organization'}
          orgLogoUrl={effectiveOrganization?.logo_url}
          onClose={() => setShowRoadmap(false)}
          onDownloadStaffReport={() => {
            const doc = generateStaffLevelReportPDF({
              orgName: effectiveOrganization?.name || 'Organization',
              teamProgress,
              counts: teamCounts,
              levelEconomics: levelEconomics.levelSummaries.length > 0 ? {
                levelSummaries: levelEconomics.levelSummaries,
                serviceMatrix: levelEconomics.serviceMatrix,
                dateRange: levelEconomics.dateRange,
                totalAppointments: levelEconomics.totalAppointments,
              } : undefined,
            });
            doc.save('staff-level-report.pdf');
            toast.success('Staff level report exported');
          }}
          onDownloadPDF={async () => {
            const levelInfos = levels.map((l, i) => ({
              label: l.label,
              slug: l.slug,
              dbId: l.dbId,
              index: i,
              isConfigured: l.isConfigured,
            }));
            const commissions = levels.map(l => ({
              dbId: l.dbId,
              serviceCommissionRate: parseFloat(String(l.serviceCommissionRate)) || 0,
              retailCommissionRate: parseFloat(String(l.retailCommissionRate)) || 0,
              hourlyWageEnabled: l.hourlyWageEnabled,
              hourlyWage: l.hourlyWage ? parseFloat(l.hourlyWage) : null,
            }));
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
              } catch { /* proceed without logo */ }
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
        />
      )}
    </>
  );
}
