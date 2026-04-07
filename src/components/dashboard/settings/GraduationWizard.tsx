import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { 
  DollarSign, 
  ShoppingBag, 
  CalendarCheck, 
  Receipt, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  Check, 
  Loader2,
  ShieldCheck,
  Sparkles,
  Shield,
  Users,
  UserPlus,
  CalendarClock,
  Info,
  BookOpen,
  Scale,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useLevelPromotionCriteriaForLevel,
  useUpsertLevelPromotionCriteria,
  useDeleteLevelPromotionCriteria,
  type LevelPromotionCriteria,
  type LevelPromotionCriteriaUpsert,
} from '@/hooks/useLevelPromotionCriteria';
import {
  useLevelRetentionCriteriaForLevel,
  useUpsertLevelRetentionCriteria,
  useDeleteLevelRetentionCriteria,
  type LevelRetentionCriteria,
  type LevelRetentionCriteriaUpsert,
} from '@/hooks/useLevelRetentionCriteria';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useUpdateStylistLevel } from '@/hooks/useStylistLevels';

interface GraduationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levelId: string;
  levelLabel: string;
  levelIndex: number;
  totalLevels: number;
}

interface CriterionConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  unit: string;
  enabledKey: keyof FormState;
  thresholdKey: keyof FormState;
  weightKey: keyof FormState;
  placeholder: string;
  step?: number;
}

export interface FormState {
  revenue_enabled: boolean;
  revenue_threshold: number;
  retail_enabled: boolean;
  retail_pct_threshold: number;
  rebooking_enabled: boolean;
  rebooking_pct_threshold: number;
  avg_ticket_enabled: boolean;
  avg_ticket_threshold: number;
  retention_rate_enabled: boolean;
  retention_rate_threshold: number;
  new_clients_enabled: boolean;
  new_clients_threshold: number;
  utilization_enabled: boolean;
  utilization_threshold: number;
  rev_per_hour_enabled: boolean;
  rev_per_hour_threshold: number;
  tenure_enabled: boolean;
  tenure_days: number;
  revenue_weight: number;
  retail_weight: number;
  rebooking_weight: number;
  avg_ticket_weight: number;
  retention_rate_weight: number;
  new_clients_weight: number;
  utilization_weight: number;
  rev_per_hour_weight: number;
  evaluation_window_days: number;
  requires_manual_approval: boolean;
}

export interface RetentionFormState {
  retention_enabled: boolean;
  revenue_enabled: boolean;
  revenue_minimum: number;
  retail_enabled: boolean;
  retail_pct_minimum: number;
  rebooking_enabled: boolean;
  rebooking_pct_minimum: number;
  avg_ticket_enabled: boolean;
  avg_ticket_minimum: number;
  retention_rate_enabled: boolean;
  retention_rate_minimum: number;
  new_clients_enabled: boolean;
  new_clients_minimum: number;
  utilization_enabled: boolean;
  utilization_minimum: number;
  rev_per_hour_enabled: boolean;
  rev_per_hour_minimum: number;
  evaluation_window_days: number;
  grace_period_days: number;
  action_type: 'coaching_flag' | 'demotion_eligible';
}

const CRITERIA: CriterionConfig[] = [
  { key: 'revenue', label: 'Service Revenue', description: 'Total service revenue generated per evaluation period. Typical range: $3K–$12K/mo depending on level and market.', icon: DollarSign, unit: '/mo', enabledKey: 'revenue_enabled', thresholdKey: 'revenue_threshold', weightKey: 'revenue_weight', placeholder: '8000' },
  { key: 'retail', label: 'Retail Attachment', description: 'Retail product sales as a percentage of total revenue. Industry benchmark: 10–20%.', icon: ShoppingBag, unit: '%', enabledKey: 'retail_enabled', thresholdKey: 'retail_pct_threshold', weightKey: 'retail_weight', placeholder: '15' },
  { key: 'rebooking', label: 'Rebooking Rate', description: 'Percentage of clients who rebook their next appointment before leaving. Strong salons target 60–80%.', icon: CalendarCheck, unit: '%', enabledKey: 'rebooking_enabled', thresholdKey: 'rebooking_pct_threshold', weightKey: 'rebooking_weight', placeholder: '70' },
  { key: 'avg_ticket', label: 'Average Ticket', description: 'Average revenue per completed appointment. Varies by service mix — track trend over time.', icon: Receipt, unit: '$', enabledKey: 'avg_ticket_enabled', thresholdKey: 'avg_ticket_threshold', weightKey: 'avg_ticket_weight', placeholder: '120' },
  { key: 'retention_rate', label: 'Client Retention', description: 'Percentage of clients who return within their expected rebooking window. Healthy retention: 70–85%.', icon: Users, unit: '%', enabledKey: 'retention_rate_enabled', thresholdKey: 'retention_rate_threshold', weightKey: 'retention_rate_weight', placeholder: '70' },
  { key: 'new_clients', label: 'New Clients', description: 'Number of first-time clients seen per month. Proves book-building ability beyond existing base.', icon: UserPlus, unit: '/mo', enabledKey: 'new_clients_enabled', thresholdKey: 'new_clients_threshold', weightKey: 'new_clients_weight', placeholder: '10' },
  { key: 'utilization', label: 'Schedule Utilization', description: 'Percentage of available hours that are booked. Proves demand at current pricing. Target: 70–85%.', icon: CalendarClock, unit: '%', enabledKey: 'utilization_enabled', thresholdKey: 'utilization_threshold', weightKey: 'utilization_weight', placeholder: '75' },
  { key: 'rev_per_hour', label: 'Revenue Per Hour', description: 'Revenue generated per booked hour. The ultimate efficiency signal for pricing decisions.', icon: DollarSign, unit: '$/hr', enabledKey: 'rev_per_hour_enabled', thresholdKey: 'rev_per_hour_threshold', weightKey: 'rev_per_hour_weight', placeholder: '55' },
];

const RECOMMENDED_WEIGHTS: Record<string, number> = {
  revenue_weight: 40,
  retail_weight: 10,
  rebooking_weight: 15,
  avg_ticket_weight: 10,
  retention_rate_weight: 15,
  new_clients_weight: 5,
  utilization_weight: 5,
  rev_per_hour_weight: 5,
};

interface RetentionCriterionConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  unit: string;
  enabledKey: keyof RetentionFormState;
  minimumKey: keyof RetentionFormState;
  placeholder: string;
}

const RETENTION_CRITERIA: RetentionCriterionConfig[] = [
  { key: 'revenue', label: 'Service Revenue', description: 'Total service revenue generated per evaluation period.', icon: DollarSign, unit: '/mo', enabledKey: 'revenue_enabled', minimumKey: 'revenue_minimum', placeholder: '5000' },
  { key: 'retail', label: 'Retail Attachment', description: 'Retail product sales as a percentage of total revenue.', icon: ShoppingBag, unit: '%', enabledKey: 'retail_enabled', minimumKey: 'retail_pct_minimum', placeholder: '8' },
  { key: 'rebooking', label: 'Rebooking Rate', description: 'Percentage of clients who rebook before leaving.', icon: CalendarCheck, unit: '%', enabledKey: 'rebooking_enabled', minimumKey: 'rebooking_pct_minimum', placeholder: '50' },
  { key: 'avg_ticket', label: 'Average Ticket', description: 'Average revenue per completed appointment.', icon: Receipt, unit: '$', enabledKey: 'avg_ticket_enabled', minimumKey: 'avg_ticket_minimum', placeholder: '80' },
  { key: 'retention_rate', label: 'Client Retention', description: 'Percentage of clients who return within their expected window.', icon: Users, unit: '%', enabledKey: 'retention_rate_enabled', minimumKey: 'retention_rate_minimum', placeholder: '50' },
  { key: 'new_clients', label: 'New Clients', description: 'Number of first-time clients seen per month.', icon: UserPlus, unit: '/mo', enabledKey: 'new_clients_enabled', minimumKey: 'new_clients_minimum', placeholder: '3' },
  { key: 'utilization', label: 'Schedule Utilization', description: 'Percentage of available hours that are booked.', icon: CalendarClock, unit: '%', enabledKey: 'utilization_enabled', minimumKey: 'utilization_minimum', placeholder: '50' },
  { key: 'rev_per_hour', label: 'Revenue Per Hour', description: 'Revenue generated per booked hour.', icon: DollarSign, unit: '$/hr', enabledKey: 'rev_per_hour_enabled', minimumKey: 'rev_per_hour_minimum', placeholder: '30' },
];

const INITIAL_STATE: FormState = {
  revenue_enabled: false, revenue_threshold: 0,
  retail_enabled: false, retail_pct_threshold: 0,
  rebooking_enabled: false, rebooking_pct_threshold: 0,
  avg_ticket_enabled: false, avg_ticket_threshold: 0,
  retention_rate_enabled: false, retention_rate_threshold: 0,
  new_clients_enabled: false, new_clients_threshold: 0,
  utilization_enabled: false, utilization_threshold: 0,
  rev_per_hour_enabled: false, rev_per_hour_threshold: 0,
  tenure_enabled: false, tenure_days: 0,
  revenue_weight: 0, retail_weight: 0, rebooking_weight: 0, avg_ticket_weight: 0,
  retention_rate_weight: 0, new_clients_weight: 0, utilization_weight: 0, rev_per_hour_weight: 0,
  evaluation_window_days: 30, requires_manual_approval: false,
};

const INITIAL_RETENTION_STATE: RetentionFormState = {
  retention_enabled: false,
  revenue_enabled: false, revenue_minimum: 0,
  retail_enabled: false, retail_pct_minimum: 0,
  rebooking_enabled: false, rebooking_pct_minimum: 0,
  avg_ticket_enabled: false, avg_ticket_minimum: 0,
  retention_rate_enabled: false, retention_rate_minimum: 0,
  new_clients_enabled: false, new_clients_minimum: 0,
  utilization_enabled: false, utilization_minimum: 0,
  rev_per_hour_enabled: false, rev_per_hour_minimum: 0,
  evaluation_window_days: 90, grace_period_days: 30, action_type: 'coaching_flag',
};

const EVAL_WINDOWS = [30, 60, 90];
const GRACE_PERIODS = [14, 30, 60, 90];

export function getZuraDefaults(levelIndex: number): FormState {
  if (levelIndex <= 1) {
    return {
      revenue_enabled: true, revenue_threshold: 6000,
      retail_enabled: true, retail_pct_threshold: 10,
      rebooking_enabled: true, rebooking_pct_threshold: 60,
      avg_ticket_enabled: false, avg_ticket_threshold: 0,
      retention_rate_enabled: true, retention_rate_threshold: 60,
      new_clients_enabled: true, new_clients_threshold: 5,
      utilization_enabled: true, utilization_threshold: 65,
      rev_per_hour_enabled: true, rev_per_hour_threshold: 40,
      tenure_enabled: false, tenure_days: 0,
      revenue_weight: 30, retail_weight: 10, rebooking_weight: 10, avg_ticket_weight: 0,
      retention_rate_weight: 10, new_clients_weight: 10, utilization_weight: 15, rev_per_hour_weight: 15,
      evaluation_window_days: 30, requires_manual_approval: false,
    };
  }
  if (levelIndex === 2) {
    return {
      revenue_enabled: true, revenue_threshold: 8000,
      retail_enabled: true, retail_pct_threshold: 15,
      rebooking_enabled: true, rebooking_pct_threshold: 65,
      avg_ticket_enabled: true, avg_ticket_threshold: 110,
      retention_rate_enabled: true, retention_rate_threshold: 65,
      new_clients_enabled: true, new_clients_threshold: 8,
      utilization_enabled: true, utilization_threshold: 75,
      rev_per_hour_enabled: true, rev_per_hour_threshold: 55,
      tenure_enabled: false, tenure_days: 0,
      revenue_weight: 20, retail_weight: 10, rebooking_weight: 10, avg_ticket_weight: 10,
      retention_rate_weight: 10, new_clients_weight: 10, utilization_weight: 15, rev_per_hour_weight: 15,
      evaluation_window_days: 60, requires_manual_approval: false,
    };
  }
  if (levelIndex === 3) {
    return {
      revenue_enabled: true, revenue_threshold: 12000,
      retail_enabled: true, retail_pct_threshold: 18,
      rebooking_enabled: true, rebooking_pct_threshold: 70,
      avg_ticket_enabled: true, avg_ticket_threshold: 140,
      retention_rate_enabled: true, retention_rate_threshold: 70,
      new_clients_enabled: true, new_clients_threshold: 10,
      utilization_enabled: true, utilization_threshold: 80,
      rev_per_hour_enabled: true, rev_per_hour_threshold: 75,
      tenure_enabled: true, tenure_days: 365,
      revenue_weight: 15, retail_weight: 10, rebooking_weight: 10, avg_ticket_weight: 10,
      retention_rate_weight: 10, new_clients_weight: 10, utilization_weight: 20, rev_per_hour_weight: 15,
      evaluation_window_days: 60, requires_manual_approval: true,
    };
  }
  return {
    revenue_enabled: true, revenue_threshold: 16000,
    retail_enabled: true, retail_pct_threshold: 22,
    rebooking_enabled: true, rebooking_pct_threshold: 75,
    avg_ticket_enabled: true, avg_ticket_threshold: 170,
    retention_rate_enabled: true, retention_rate_threshold: 80,
    new_clients_enabled: true, new_clients_threshold: 15,
    utilization_enabled: true, utilization_threshold: 85,
    rev_per_hour_enabled: true, rev_per_hour_threshold: 95,
    tenure_enabled: true, tenure_days: 730,
    revenue_weight: 15, retail_weight: 10, rebooking_weight: 10, avg_ticket_weight: 10,
    retention_rate_weight: 10, new_clients_weight: 10, utilization_weight: 20, rev_per_hour_weight: 15,
    evaluation_window_days: 90, requires_manual_approval: true,
  };
}

export function getZuraRetentionDefaults(levelIndex: number): RetentionFormState {
  if (levelIndex <= 1) {
    return {
      retention_enabled: true,
      revenue_enabled: true, revenue_minimum: 4000,
      retail_enabled: true, retail_pct_minimum: 5,
      rebooking_enabled: true, rebooking_pct_minimum: 45,
      avg_ticket_enabled: false, avg_ticket_minimum: 0,
      retention_rate_enabled: true, retention_rate_minimum: 45,
      new_clients_enabled: true, new_clients_minimum: 3,
      utilization_enabled: true, utilization_minimum: 50,
      rev_per_hour_enabled: true, rev_per_hour_minimum: 25,
      evaluation_window_days: 90, grace_period_days: 30, action_type: 'coaching_flag',
    };
  }
  if (levelIndex === 2) {
    return {
      retention_enabled: true,
      revenue_enabled: true, revenue_minimum: 5500,
      retail_enabled: true, retail_pct_minimum: 8,
      rebooking_enabled: true, rebooking_pct_minimum: 50,
      avg_ticket_enabled: true, avg_ticket_minimum: 85,
      retention_rate_enabled: true, retention_rate_minimum: 50,
      new_clients_enabled: true, new_clients_minimum: 4,
      utilization_enabled: true, utilization_minimum: 55,
      rev_per_hour_enabled: true, rev_per_hour_minimum: 35,
      evaluation_window_days: 90, grace_period_days: 30, action_type: 'coaching_flag',
    };
  }
  if (levelIndex === 3) {
    return {
      retention_enabled: true,
      revenue_enabled: true, revenue_minimum: 8000,
      retail_enabled: true, retail_pct_minimum: 12,
      rebooking_enabled: true, rebooking_pct_minimum: 55,
      avg_ticket_enabled: true, avg_ticket_minimum: 100,
      retention_rate_enabled: true, retention_rate_minimum: 55,
      new_clients_enabled: true, new_clients_minimum: 5,
      utilization_enabled: true, utilization_minimum: 60,
      rev_per_hour_enabled: true, rev_per_hour_minimum: 50,
      evaluation_window_days: 90, grace_period_days: 30, action_type: 'demotion_eligible',
    };
  }
  return {
    retention_enabled: true,
    revenue_enabled: true, revenue_minimum: 10000,
    retail_enabled: true, retail_pct_minimum: 15,
    rebooking_enabled: true, rebooking_pct_minimum: 60,
    avg_ticket_enabled: true, avg_ticket_minimum: 120,
    retention_rate_enabled: true, retention_rate_minimum: 60,
    new_clients_enabled: true, new_clients_minimum: 8,
    utilization_enabled: true, utilization_minimum: 65,
    rev_per_hour_enabled: true, rev_per_hour_minimum: 65,
    evaluation_window_days: 90, grace_period_days: 30, action_type: 'demotion_eligible',
  };
}

export function GraduationWizard({ open, onOpenChange, levelId, levelLabel, levelIndex, totalLevels }: GraduationWizardProps) {
  const [activeTab, setActiveTab] = useState<'promotion' | 'retention'>('promotion');
  const [step, setStep] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [retForm, setRetForm] = useState<RetentionFormState>(INITIAL_RETENTION_STATE);

  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();
  const cacheSeededPromotion = useRef(false);
  const cacheSeededRetention = useRef(false);
  const { data: existing, isLoading } = useLevelPromotionCriteriaForLevel(open ? levelId : undefined);
  const { data: existingRetention, isLoading: loadingRetention } = useLevelRetentionCriteriaForLevel(open ? levelId : undefined);
  const upsert = useUpsertLevelPromotionCriteria();
  const deleteCriteria = useDeleteLevelPromotionCriteria();
  const upsertRetention = useUpsertLevelRetentionCriteria();
  const deleteRetention = useDeleteLevelRetentionCriteria();
  const updateLevel = useUpdateStylistLevel();

  // Optimistic cache-seed: hydrate form instantly from bulk cache to avoid loading flash
  useEffect(() => {
    if (!open || !levelId || !orgId) {
      cacheSeededPromotion.current = false;
      cacheSeededRetention.current = false;
      return;
    }

    // Seed promotion form from bulk cache
    if (!cacheSeededPromotion.current) {
      const cachedPromo = queryClient.getQueryData<LevelPromotionCriteria[]>(
        ['level-promotion-criteria', orgId]
      );
      const promoMatch = cachedPromo?.find(c => c.stylist_level_id === levelId);
      if (promoMatch) {
        setForm({
          revenue_enabled: promoMatch.revenue_enabled,
          revenue_threshold: promoMatch.revenue_threshold,
          retail_enabled: promoMatch.retail_enabled,
          retail_pct_threshold: promoMatch.retail_pct_threshold,
          rebooking_enabled: promoMatch.rebooking_enabled,
          rebooking_pct_threshold: promoMatch.rebooking_pct_threshold,
          avg_ticket_enabled: promoMatch.avg_ticket_enabled,
          avg_ticket_threshold: promoMatch.avg_ticket_threshold,
          retention_rate_enabled: promoMatch.retention_rate_enabled,
          retention_rate_threshold: Number(promoMatch.retention_rate_threshold),
          new_clients_enabled: promoMatch.new_clients_enabled,
          new_clients_threshold: Number(promoMatch.new_clients_threshold),
          utilization_enabled: promoMatch.utilization_enabled,
          utilization_threshold: Number(promoMatch.utilization_threshold),
          rev_per_hour_enabled: promoMatch.rev_per_hour_enabled,
          rev_per_hour_threshold: Number(promoMatch.rev_per_hour_threshold),
          tenure_enabled: promoMatch.tenure_enabled,
          tenure_days: promoMatch.tenure_days,
          revenue_weight: promoMatch.revenue_weight,
          retail_weight: promoMatch.retail_weight,
          rebooking_weight: promoMatch.rebooking_weight,
          avg_ticket_weight: promoMatch.avg_ticket_weight,
          retention_rate_weight: promoMatch.retention_rate_weight,
          new_clients_weight: promoMatch.new_clients_weight,
          utilization_weight: promoMatch.utilization_weight,
          rev_per_hour_weight: promoMatch.rev_per_hour_weight,
          evaluation_window_days: promoMatch.evaluation_window_days,
          requires_manual_approval: promoMatch.requires_manual_approval,
        });
        cacheSeededPromotion.current = true;
      }
    }

    // Seed retention form from bulk cache
    if (!cacheSeededRetention.current) {
      const cachedRet = queryClient.getQueryData<LevelRetentionCriteria[]>(
        ['level-retention-criteria', orgId]
      );
      const retMatch = cachedRet?.find(c => c.stylist_level_id === levelId);
      if (retMatch) {
        setRetForm({
          retention_enabled: retMatch.retention_enabled,
          revenue_enabled: retMatch.revenue_enabled,
          revenue_minimum: Number(retMatch.revenue_minimum),
          retail_enabled: retMatch.retail_enabled,
          retail_pct_minimum: Number(retMatch.retail_pct_minimum),
          rebooking_enabled: retMatch.rebooking_enabled,
          rebooking_pct_minimum: Number(retMatch.rebooking_pct_minimum),
          avg_ticket_enabled: retMatch.avg_ticket_enabled,
          avg_ticket_minimum: Number(retMatch.avg_ticket_minimum),
          retention_rate_enabled: retMatch.retention_rate_enabled,
          retention_rate_minimum: Number(retMatch.retention_rate_minimum),
          new_clients_enabled: retMatch.new_clients_enabled,
          new_clients_minimum: Number(retMatch.new_clients_minimum),
          utilization_enabled: retMatch.utilization_enabled,
          utilization_minimum: Number(retMatch.utilization_minimum),
          rev_per_hour_enabled: retMatch.rev_per_hour_enabled,
          rev_per_hour_minimum: Number(retMatch.rev_per_hour_minimum),
          evaluation_window_days: retMatch.evaluation_window_days,
          grace_period_days: retMatch.grace_period_days,
          action_type: retMatch.action_type as 'coaching_flag' | 'demotion_eligible',
        });
        cacheSeededRetention.current = true;
      }
    }
  }, [open, levelId, orgId, queryClient]);

  // Hydrate promotion form
  useEffect(() => {
    if (existing) {
      setForm({
        revenue_enabled: existing.revenue_enabled,
        revenue_threshold: existing.revenue_threshold,
        retail_enabled: existing.retail_enabled,
        retail_pct_threshold: existing.retail_pct_threshold,
        rebooking_enabled: existing.rebooking_enabled,
        rebooking_pct_threshold: existing.rebooking_pct_threshold,
        avg_ticket_enabled: existing.avg_ticket_enabled,
        avg_ticket_threshold: existing.avg_ticket_threshold,
        retention_rate_enabled: existing.retention_rate_enabled,
        retention_rate_threshold: Number(existing.retention_rate_threshold),
        new_clients_enabled: existing.new_clients_enabled,
        new_clients_threshold: Number(existing.new_clients_threshold),
        utilization_enabled: existing.utilization_enabled,
        utilization_threshold: Number(existing.utilization_threshold),
        tenure_enabled: existing.tenure_enabled,
        tenure_days: existing.tenure_days,
        revenue_weight: existing.revenue_weight,
        retail_weight: existing.retail_weight,
        rebooking_weight: existing.rebooking_weight,
        avg_ticket_weight: existing.avg_ticket_weight,
        retention_rate_weight: existing.retention_rate_weight,
        new_clients_weight: existing.new_clients_weight,
        utilization_weight: existing.utilization_weight,
        rev_per_hour_enabled: existing.rev_per_hour_enabled,
        rev_per_hour_threshold: Number(existing.rev_per_hour_threshold),
        rev_per_hour_weight: existing.rev_per_hour_weight,
        evaluation_window_days: existing.evaluation_window_days,
        requires_manual_approval: existing.requires_manual_approval,
      });
    } else if (open && !isLoading) {
      setForm(INITIAL_STATE);
    }
  }, [existing, open, isLoading]);

  // Hydrate retention form
  useEffect(() => {
    if (existingRetention) {
      setRetForm({
        retention_enabled: existingRetention.retention_enabled,
        revenue_enabled: existingRetention.revenue_enabled,
        revenue_minimum: Number(existingRetention.revenue_minimum),
        retail_enabled: existingRetention.retail_enabled,
        retail_pct_minimum: Number(existingRetention.retail_pct_minimum),
        rebooking_enabled: existingRetention.rebooking_enabled,
        rebooking_pct_minimum: Number(existingRetention.rebooking_pct_minimum),
        avg_ticket_enabled: existingRetention.avg_ticket_enabled,
        avg_ticket_minimum: Number(existingRetention.avg_ticket_minimum),
        retention_rate_enabled: existingRetention.retention_rate_enabled,
        retention_rate_minimum: Number(existingRetention.retention_rate_minimum),
        new_clients_enabled: existingRetention.new_clients_enabled,
        new_clients_minimum: Number(existingRetention.new_clients_minimum),
        utilization_enabled: existingRetention.utilization_enabled,
        utilization_minimum: Number(existingRetention.utilization_minimum),
        rev_per_hour_enabled: existingRetention.rev_per_hour_enabled,
        rev_per_hour_minimum: Number(existingRetention.rev_per_hour_minimum),
        evaluation_window_days: existingRetention.evaluation_window_days,
        grace_period_days: existingRetention.grace_period_days,
        action_type: existingRetention.action_type as 'coaching_flag' | 'demotion_eligible',
      });
    } else if (open && !loadingRetention) {
      setRetForm(INITIAL_RETENTION_STATE);
    }
  }, [existingRetention, open, loadingRetention]);

  // Reset step/tab on open — default to retention for Level 1 (no promotion applicable)
  useEffect(() => {
    if (open) {
      setStep(0);
      setActiveTab(levelIndex === 0 ? 'retention' : 'promotion');
    }
  }, [open, levelIndex]);

  const enabledCriteria = CRITERIA.filter(c => form[c.enabledKey] as boolean);
  const enabledCount = enabledCriteria.length + (form.tenure_enabled ? 1 : 0);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const setRetField = useCallback(<K extends keyof RetentionFormState>(key: K, value: RetentionFormState[K]) => {
    setRetForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // Auto-distribute weights equally when toggling criteria
  const toggleCriterion = useCallback((enabledKey: keyof FormState) => {
    setForm(prev => {
      const next = { ...prev, [enabledKey]: !prev[enabledKey] };
      const active = CRITERIA.filter(c => next[c.enabledKey] as boolean);
      if (active.length === 0) {
        CRITERIA.forEach(c => { next[c.weightKey] = 0 as never; });
      } else {
        const base = Math.floor(100 / active.length);
        const remainder = 100 - base * active.length;
        active.forEach((c, i) => {
          next[c.weightKey] = (base + (i < remainder ? 1 : 0)) as never;
        });
        CRITERIA.filter(c => !(next[c.enabledKey] as boolean)).forEach(c => {
          next[c.weightKey] = 0 as never;
        });
      }
      // Auto-scroll to the toggled criterion after render
      if (!prev[enabledKey]) {
        const criterion = CRITERIA.find(c => c.enabledKey === enabledKey);
        if (criterion) {
          setTimeout(() => {
            const el = document.getElementById(`criterion-${criterion.key}`);
            if (el && scrollContainerRef.current) {
              el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 50);
        }
      }
      return next;
    });
  }, []);

  const adjustWeight = useCallback((key: keyof FormState, newValue: number) => {
    setForm(prev => {
      const next = { ...prev };
      const active = CRITERIA.filter(c => next[c.enabledKey] as boolean);
      if (active.length <= 1) return prev;
      
      const currentCriterion = CRITERIA.find(c => c.weightKey === key);
      if (!currentCriterion) return prev;
      
      const otherActive = active.filter(c => c.weightKey !== key);
      const clampedValue = Math.max(0, Math.min(100, newValue));
      const remaining = 100 - clampedValue;
      
      next[key] = clampedValue as never;
      
      const otherBase = Math.floor(remaining / otherActive.length);
      const otherRemainder = remaining - otherBase * otherActive.length;
      otherActive.forEach((c, i) => {
        next[c.weightKey] = (otherBase + (i < otherRemainder ? 1 : 0)) as never;
      });
      
      return next;
    });
  }, []);

  const totalWeight = CRITERIA.reduce((sum, c) => sum + (form[c.weightKey] as number), 0);

  const handleSave = () => {
    if (!orgId) return;
    const payload: LevelPromotionCriteriaUpsert = {
      organization_id: orgId,
      stylist_level_id: levelId,
      ...form,
      is_active: true,
    };
    upsert.mutate(payload, {
      onSuccess: () => {
        updateLevel.mutate({ id: levelId, is_configured: true });
        setActiveTab('retention');
        setStep(0);
        toast.success('Level requirements saved — now configure retention criteria');
      },
    });
  };

  const handleClear = () => {
    if (existing?.id) {
      deleteCriteria.mutate(existing.id, {
        onSuccess: () => {
          setForm(INITIAL_STATE);
          onOpenChange(false);
        },
      });
    } else {
      setForm(INITIAL_STATE);
    }
  };

  const handleSaveRetention = () => {
    if (!orgId) return;
    const isBaseLevel = levelIndex === 0;
    const payload: LevelRetentionCriteriaUpsert = {
      organization_id: orgId,
      stylist_level_id: levelId,
      retention_enabled: retForm.retention_enabled,
      // For base level (Level 1), use retForm values directly; otherwise inherit from promotion criteria
      revenue_enabled: isBaseLevel ? retForm.revenue_enabled : form.revenue_enabled,
      revenue_minimum: isBaseLevel ? retForm.revenue_minimum : form.revenue_threshold,
      retail_enabled: isBaseLevel ? retForm.retail_enabled : form.retail_enabled,
      retail_pct_minimum: isBaseLevel ? retForm.retail_pct_minimum : form.retail_pct_threshold,
      rebooking_enabled: isBaseLevel ? retForm.rebooking_enabled : form.rebooking_enabled,
      rebooking_pct_minimum: isBaseLevel ? retForm.rebooking_pct_minimum : form.rebooking_pct_threshold,
      avg_ticket_enabled: isBaseLevel ? retForm.avg_ticket_enabled : form.avg_ticket_enabled,
      avg_ticket_minimum: isBaseLevel ? retForm.avg_ticket_minimum : form.avg_ticket_threshold,
      retention_rate_enabled: isBaseLevel ? retForm.retention_rate_enabled : form.retention_rate_enabled,
      retention_rate_minimum: isBaseLevel ? retForm.retention_rate_minimum : form.retention_rate_threshold,
      new_clients_enabled: isBaseLevel ? retForm.new_clients_enabled : form.new_clients_enabled,
      new_clients_minimum: isBaseLevel ? retForm.new_clients_minimum : form.new_clients_threshold,
      utilization_enabled: isBaseLevel ? retForm.utilization_enabled : form.utilization_enabled,
      utilization_minimum: isBaseLevel ? retForm.utilization_minimum : form.utilization_threshold,
      rev_per_hour_enabled: isBaseLevel ? retForm.rev_per_hour_enabled : form.rev_per_hour_enabled,
      rev_per_hour_minimum: isBaseLevel ? retForm.rev_per_hour_minimum : form.rev_per_hour_threshold,
      // Retention-specific policy settings
      evaluation_window_days: retForm.evaluation_window_days,
      grace_period_days: retForm.grace_period_days,
      action_type: retForm.action_type,
      is_active: true,
    };
    upsertRetention.mutate(payload, {
      onSuccess: () => {
        updateLevel.mutate({ id: levelId, is_configured: true });
        onOpenChange(false);
      },
    });
  };

  const handleClearRetention = () => {
    if (existingRetention?.id) {
      deleteRetention.mutate(existingRetention.id, {
        onSuccess: () => {
          setRetForm(INITIAL_RETENTION_STATE);
          onOpenChange(false);
        },
      });
    } else {
      setRetForm(INITIAL_RETENTION_STATE);
    }
  };

  const allThresholdsValid = CRITERIA.every(c => {
    if (!(form[c.enabledKey] as boolean)) return true;
    return (form[c.thresholdKey] as number) > 0;
  }) && (!form.tenure_enabled || form.tenure_days > 0);
  const canProceedFromStep0 = enabledCount > 0 && allThresholdsValid;
  const canProceedFromStep1 = totalWeight === 100 || enabledCriteria.length === 0;
  const canSave = canProceedFromStep0 && canProceedFromStep1;

  const steps = ['Requirements', 'Weights', 'Settings'];
  const showWeightsStep = enabledCriteria.length > 1;
  const activeSteps = showWeightsStep ? steps : [steps[0], steps[2]];

  const goNext = () => {
    if (!showWeightsStep && step === 0) setStep(2);
    else setStep(s => Math.min(s + 1, 2));
  };
  const goBack = () => {
    if (!showWeightsStep && step === 2) setStep(0);
    else setStep(s => Math.max(s - 1, 0));
  };

  // Retention just needs master toggle enabled — KPIs are inherited from promotion
  const canSaveRetention = retForm.retention_enabled;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg sm:left-[calc(50%+140px)] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <DialogTitle className={cn(tokens.heading.card, 'text-sm')}>
                Level Criteria
              </DialogTitle>
            </div>
            <DialogDescription className={tokens.body.muted}>
              Define criteria for <span className="font-medium text-foreground">{levelLabel}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Mode tabs */}
          <div className="mt-4 flex bg-muted/70 rounded-full p-1 gap-1">
            <button
              onClick={() => { setActiveTab('promotion'); setStep(0); }}
              disabled={levelIndex === 0}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-all",
                activeTab === 'promotion'
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                levelIndex === 0 && "opacity-50 pointer-events-none"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Level Requirements
            </button>
            <button
              onClick={() => { setActiveTab('retention'); setStep(0); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-all",
                activeTab === 'retention'
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              Required to Stay
            </button>
          </div>

          {/* Step indicators — only for promotion tab */}
          {activeTab === 'promotion' && (
            <div className="flex items-center mt-4">
              {activeSteps.map((s, i) => {
                const actualStep = showWeightsStep ? i : (i === 0 ? 0 : 2);
                const isActive = step === actualStep;
                const isDone = step > actualStep;
                return (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => setStep(actualStep)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-sans transition-colors whitespace-nowrap",
                        isActive && "text-foreground",
                        isDone && "text-primary",
                        !isActive && !isDone && "text-muted-foreground"
                      )}
                    >
                      {isDone ? (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      ) : (
                        <div className={cn(
                          "w-2 h-2 rounded-full border-[1.5px]",
                          isActive ? "border-foreground bg-foreground" : "border-muted-foreground"
                        )} />
                      )}
                      <span>{s}</span>
                    </button>
                    {i < activeSteps.length - 1 && (
                      <div className={cn("flex-1 h-px mx-3", isDone ? "bg-primary" : "bg-border")} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div ref={scrollContainerRef} className="px-6 py-5 min-h-[280px] max-h-[50vh] overflow-y-auto">
          {(isLoading || loadingRetention) ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className={tokens.loading.spinner} />
            </div>
          ) : activeTab === 'promotion' ? (
            <>
              {/* Step 0: Select Requirements */}
              {step === 0 && (
                <div className="space-y-3">
                  {/* Persistent Zura Recommended button */}
                  <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium font-sans">Zura Recommended</p>
                      <p className="text-xs text-muted-foreground font-sans">
                        {enabledCount > 0
                          ? 'Reset to industry benchmarks tuned for this level.'
                          : 'Apply industry benchmarks tuned for this level — tweak as needed.'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 rounded-full h-8 px-3 text-xs border-primary/30 text-primary hover:bg-primary/10 font-sans"
                      onClick={() => setForm(getZuraDefaults(levelIndex))}
                    >
                      {enabledCount > 0 ? 'Reset to Defaults' : 'Apply Defaults'}
                    </Button>
                  </div>

                  {/* Why these KPIs? collapsible */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group w-full">
                      <Info className="w-3.5 h-3.5" />
                      <span className="font-sans">Why these KPIs?</span>
                      <ChevronDown className="w-3 h-3 ml-auto transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-foreground font-sans">Tracked metrics and rationale</p>
                          <div className="space-y-1.5 text-xs text-muted-foreground font-sans">
                            <p><span className="text-foreground font-medium">Service Revenue</span> — Direct output measure. Proves volume at current price point justifies advancement.</p>
                            <p><span className="text-foreground font-medium">Retail Attachment %</span> — Prescribing ability. Increases ticket without adding chair time. A loyalty signal.</p>
                            <p><span className="text-foreground font-medium">Rebooking Rate</span> — Leading behavioral indicator. Clients who rebook at checkout are committed.</p>
                            <p><span className="text-foreground font-medium">Average Ticket</span> — Pricing power. High relative ticket validates premium positioning.</p>
                            <p><span className="text-foreground font-medium">Client Retention Rate</span> — The lagging truth. Rebooking intent means nothing if clients cancel later.</p>
                            <p><span className="text-foreground font-medium">New Client Count</span> — Growth signal. Proves book-building ability, not just maintenance.</p>
                            <p><span className="text-foreground font-medium">Schedule Utilization</span> — Demand proof. An empty schedule at current prices means raising prices will reduce volume.</p>
                            <p><span className="text-foreground font-medium">Revenue Per Hour</span> — Economic efficiency. The ultimate signal for whether a price increase is justified.</p>
                          </div>
                        </div>
                        <div className="border-t border-border pt-2 space-y-1.5 text-xs text-muted-foreground font-sans">
                          <p className="font-medium text-foreground">Why not other metrics?</p>
                          <p><span className="text-foreground">Reviews / Social</span> — Not trackable from POS data. Manual entry degrades data integrity.</p>
                          <p><span className="text-foreground">Education hours</span> — Subjective. Better handled via manager discretion during approval.</p>
                          <p><span className="text-foreground">Satisfaction scores</span> — No reliable automated source. Retention rate is the behavioral proxy.</p>
                          <p><span className="text-foreground">Product sales volume</span> — Already captured by Retail Attachment %. Tracking both would double-count.</p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <p className={cn(tokens.body.muted, 'mb-4')}>
                    Toggle on the metrics that matter to earn this level.
                  </p>

                  {CRITERIA.map(criterion => {
                    const Icon = criterion.icon;
                    const enabled = form[criterion.enabledKey] as boolean;
                    const threshold = form[criterion.thresholdKey] as number;
                    return (
                      <div
                        id={`criterion-${criterion.key}`}
                        key={criterion.key}
                        className={cn(
                          "rounded-lg border p-3 transition-all",
                          enabled ? "border-primary/30 bg-primary/5" : "border-border bg-transparent"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              enabled ? "bg-primary/10" : "bg-muted"
                            )}>
                              <Icon className={cn("w-4 h-4", enabled ? "text-primary" : "text-muted-foreground")} />
                            </div>
                            <span className={cn("text-sm", enabled ? "text-foreground font-medium" : "text-muted-foreground")}>
                              {criterion.label}
                            </span>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px] text-xs">
                                  {criterion.description}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => toggleCriterion(criterion.enabledKey)}
                          />
                        </div>
                        {enabled && (
                          <div className="mt-3 pl-11">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Min:</span>
                              <div className="relative flex-1 max-w-[160px]">
                                {(criterion.unit === '$' || criterion.unit === '/mo') && (
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                )}
                                <Input
                                  type="number"
                                  value={threshold || ''}
                                  onChange={(e) => setField(criterion.thresholdKey, Number(e.target.value))}
                                  placeholder={criterion.placeholder}
                                  className={cn("h-8 text-sm", (criterion.unit === '$' || criterion.unit === '/mo') && "pl-6")}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{criterion.unit}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Tenure */}
                  <div className={cn(
                    "rounded-lg border p-3 transition-all",
                    form.tenure_enabled ? "border-primary/30 bg-primary/5" : "border-border bg-transparent"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          form.tenure_enabled ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Clock className={cn("w-4 h-4", form.tenure_enabled ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <span className={cn("text-sm", form.tenure_enabled ? "text-foreground font-medium" : "text-muted-foreground")}>
                            Minimum Tenure
                          </span>
                          <p className="text-[10px] text-muted-foreground">Time at current level before eligible</p>
                        </div>
                      </div>
                      <Switch
                        checked={form.tenure_enabled}
                        onCheckedChange={() => setField('tenure_enabled', !form.tenure_enabled)}
                      />
                    </div>
                    {form.tenure_enabled && (
                      <div className="mt-3 pl-11">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Min:</span>
                          <Input
                            type="number"
                            value={form.tenure_days || ''}
                            onChange={(e) => setField('tenure_days', Number(e.target.value))}
                            placeholder="90"
                            className="h-8 text-sm max-w-[100px]"
                          />
                          <span className="text-xs text-muted-foreground">days</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 1: Weights */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Explainer */}
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-display text-[11px] tracking-wide text-blue-400">HOW WEIGHTS WORK</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Weights determine how much each metric contributes to the overall readiness score. Most salons weight Service Revenue highest (40%+) since it's the clearest indicator of client demand and book strength. Use the Recommended preset for a proven starting point.
                          <span className="block mt-1 text-blue-400/80">Exceeding one threshold can compensate for being slightly below another — a metric with higher weight has more influence on qualification.</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Weight Presets */}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const active = CRITERIA.filter(c => form[c.enabledKey] as boolean);
                        if (active.length === 0) return;
                        const next = { ...form };
                        // Assign recommended weights to enabled metrics
                        let totalRaw = 0;
                        active.forEach(c => {
                          totalRaw += (RECOMMENDED_WEIGHTS[c.weightKey] || 5);
                        });
                        if (totalRaw === 0) {
                          // Fallback to even distribution
                          const base = Math.floor(100 / active.length);
                          const rem = 100 - base * active.length;
                          active.forEach((c, i) => {
                            (next as any)[c.weightKey] = base + (i < rem ? 1 : 0);
                          });
                        } else {
                          // Scale proportionally to 100
                          let assigned = 0;
                          active.forEach((c, i) => {
                            const raw = RECOMMENDED_WEIGHTS[c.weightKey] || 5;
                            if (i === active.length - 1) {
                              (next as any)[c.weightKey] = 100 - assigned;
                            } else {
                              const scaled = Math.floor((raw / totalRaw) * 100);
                              (next as any)[c.weightKey] = scaled;
                              assigned += scaled;
                            }
                          });
                        }
                        setForm(next);
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Recommended
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const active = CRITERIA.filter(c => form[c.enabledKey] as boolean);
                        if (active.length === 0) return;
                        const base = Math.floor(100 / active.length);
                        const remainder = 100 - base * active.length;
                        const next = { ...form };
                        active.forEach((c, i) => {
                          (next as any)[c.weightKey] = base + (i < remainder ? 1 : 0);
                        });
                        setForm(next);
                      }}
                    >
                      <Scale className="h-3.5 w-3.5" />
                      Distribute Evenly
                    </Button>
                  </div>

                  {enabledCriteria.map(criterion => {
                    const weight = form[criterion.weightKey] as number;
                    const Icon = criterion.icon;
                    return (
                      <div key={criterion.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{criterion.label}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs font-sans tabular-nums">
                            {weight}%
                          </Badge>
                        </div>
                        <Slider
                          value={[weight]}
                          onValueChange={([v]) => adjustWeight(criterion.weightKey, v)}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    );
                  })}

                  <div className={cn(
                    "flex items-center justify-between pt-3 border-t",
                    totalWeight !== 100 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    <span className="text-xs">Total</span>
                    <span className="text-sm font-medium tabular-nums">{totalWeight}%</span>
                  </div>
                </div>
              )}

              {/* Step 2: Settings */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Evaluation Window</p>
                      <p className="text-xs text-muted-foreground">Rolling period used to measure performance</p>
                    </div>
                    <div className="flex gap-2">
                      {EVAL_WINDOWS.map(days => (
                        <button
                          key={days}
                          onClick={() => setField('evaluation_window_days', days)}
                          className={cn(
                            "relative flex-1 py-2 rounded-lg text-sm transition-colors border",
                            form.evaluation_window_days === days
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {days} days
                          {days === 90 && (
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] tracking-wider uppercase font-display text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-px">
                              Rec
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">Require Manager Approval</p>
                        <p className="text-[10px] text-muted-foreground">Notify managers for review when criteria are met instead of auto-qualifying</p>
                      </div>
                    </div>
                    <Switch
                      checked={form.requires_manual_approval}
                      onCheckedChange={(v) => setField('requires_manual_approval', v)}
                    />
                  </div>

                  {/* Promotion approval explainer */}
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-display text-[11px] tracking-wide text-blue-400">ABOUT PROMOTION APPROVAL</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Admins with permissions can promote or demote stylists at any time from the Graduation Tracker — this setting does not restrict that ability.
                          <span className="block mt-1">When enabled, the system will notify managers when a stylist meets their criteria, requiring manual sign-off before the level change takes effect. When disabled, qualifying stylists are automatically flagged as ready without requiring approval.</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {enabledCount > 0 && (
                    <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Summary</p>
                      <p className="text-sm">
                        To earn <span className="font-medium">{levelLabel}</span>, a stylist must maintain:
                      </p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {form.revenue_enabled && form.revenue_threshold > 0 && (
                          <li>• ${form.revenue_threshold.toLocaleString()} monthly revenue ({form.revenue_weight}% weight)</li>
                        )}
                        {form.retail_enabled && form.retail_pct_threshold > 0 && (
                          <li>• {form.retail_pct_threshold}% retail attachment ({form.retail_weight}% weight)</li>
                        )}
                        {form.rebooking_enabled && form.rebooking_pct_threshold > 0 && (
                          <li>• {form.rebooking_pct_threshold}% rebooking rate ({form.rebooking_weight}% weight)</li>
                        )}
                        {form.avg_ticket_enabled && form.avg_ticket_threshold > 0 && (
                          <li>• ${form.avg_ticket_threshold} avg ticket ({form.avg_ticket_weight}% weight)</li>
                        )}
                        {form.retention_rate_enabled && form.retention_rate_threshold > 0 && (
                          <li>• {form.retention_rate_threshold}% client retention ({form.retention_rate_weight}% weight)</li>
                        )}
                        {form.new_clients_enabled && form.new_clients_threshold > 0 && (
                          <li>• {form.new_clients_threshold} new clients/mo ({form.new_clients_weight}% weight)</li>
                        )}
                        {form.tenure_enabled && form.tenure_days > 0 && (
                          <li>• {form.tenure_days} days at current level (pass/fail)</li>
                        )}
                      </ul>
                      <p className="text-xs text-muted-foreground">
                        Evaluated over a rolling {form.evaluation_window_days}-day window
                        {form.requires_manual_approval && ' • Requires manager approval'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* ─── Retention Tab Content (Simplified — KPIs inherited from promotion) ─── */
            <div className="space-y-4">
              {/* Master toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                <div>
                    <p className="text-sm font-medium">Enable Retention Monitoring</p>
                    <p className="text-[10px] text-muted-foreground">
                      {levelIndex === 0
                        ? 'Set minimum performance standards for stylists at this level'
                        : 'Flag stylists who fall below the level\'s KPI requirements'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={retForm.retention_enabled}
                  onCheckedChange={(v) => setRetField('retention_enabled', v)}
                />
              </div>

              {retForm.retention_enabled && (
                <>
                   {levelIndex === 0 ? (
                    <>
                      {/* Blue explainer — why there are no "Requirements to Earn" */}
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-5">
                        <div className="flex gap-3.5">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-blue-400" />
                            </div>
                          </div>
                          <div className="space-y-1.5 min-w-0">
                            <span className="font-display text-[10px] tracking-[0.1em] uppercase text-blue-400/70">
                              Page Explainer
                            </span>
                            <h4 className="font-display text-sm tracking-wide text-foreground">
                              No Requirements to Earn This Level
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                              Every stylist begins here. There are no promotion criteria for the entry level — it is the starting point. Use the retention standards below to define minimum performance expectations. Stylists who fall below these thresholds can be flagged for review or termination.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Zura Recommended for retention */}
                      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium font-sans">Zura Recommended</p>
                          <p className="text-xs text-muted-foreground font-sans">
                            Apply baseline retention benchmarks for entry-level stylists.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 rounded-full h-8 px-3 text-xs border-primary/30 text-primary hover:bg-primary/10 font-sans"
                          onClick={() => {
                            const defaults = getZuraRetentionDefaults(0);
                            setRetForm(defaults);
                          }}
                        >
                          Apply Defaults
                        </Button>
                      </div>

                      {/* Independent KPI toggles for base level */}
                      <div className="space-y-3">
                        {RETENTION_CRITERIA.map(criterion => {
                          const Icon = criterion.icon;
                          const enabled = retForm[criterion.enabledKey] as boolean;
                          const minimum = retForm[criterion.minimumKey] as number;
                          return (
                            <div
                              key={criterion.key}
                              className={cn(
                                "rounded-lg border p-3 transition-all",
                                enabled ? "border-primary/30 bg-primary/5" : "border-border bg-transparent"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                    enabled ? "bg-primary/10" : "bg-muted"
                                  )}>
                                    <Icon className={cn("w-4 h-4", enabled ? "text-primary" : "text-muted-foreground")} />
                                  </div>
                                  <span className={cn("text-sm", enabled ? "text-foreground font-medium" : "text-muted-foreground")}>
                                    {criterion.label}
                                  </span>
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[220px] text-xs">
                                        {criterion.description}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={(v) => setRetField(criterion.enabledKey, v)}
                                />
                              </div>
                              {enabled && (
                                <div className="mt-3 pl-11">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Min:</span>
                                    <div className="relative flex-1 max-w-[160px]">
                                      {(criterion.unit === '$' || criterion.unit === '/mo' || criterion.unit === '$/hr') && (
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                      )}
                                      <Input
                                        type="number"
                                        value={minimum || ''}
                                        onChange={(e) => setRetField(criterion.minimumKey, Number(e.target.value))}
                                        placeholder={criterion.placeholder}
                                        className={cn("h-8 text-sm", (criterion.unit === '$' || criterion.unit === '/mo' || criterion.unit === '$/hr') && "pl-6")}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground">{criterion.unit}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    /* Inherited KPI note for levels 2+ */
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium font-sans">KPI Minimums Inherited</p>
                        <p className="text-xs text-muted-foreground font-sans">
                          Retention thresholds match the Level Requirements configured above. Only the evaluation policy settings below are unique to retention.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Settings */}
                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <div>
                      <p className="text-sm font-medium">Evaluation Window</p>
                      <p className="text-[10px] text-muted-foreground mb-2">Rolling period used to evaluate retention</p>
                      <div className="flex gap-2">
                        {EVAL_WINDOWS.map(days => (
                          <button
                            key={days}
                            onClick={() => setRetField('evaluation_window_days', days)}
                            className={cn(
                              "relative flex-1 py-2 rounded-lg text-sm transition-colors border",
                              retForm.evaluation_window_days === days
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {days} days
                            {days === 90 && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] tracking-wider uppercase font-display text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-px">
                                Rec
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Grace Period</p>
                      <p className="text-[10px] text-muted-foreground mb-2">How long below threshold before flagged for action</p>
                      <div className="flex gap-2">
                        {GRACE_PERIODS.map(days => (
                          <button
                            key={days}
                            onClick={() => setRetField('grace_period_days', days)}
                            className={cn(
                              "relative flex-1 py-2 rounded-lg text-sm transition-colors border",
                              retForm.grace_period_days === days
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {days}d
                            {days === 30 && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] tracking-wider uppercase font-display text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-px">
                                Rec
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      {/* Dynamic grace vs evaluation window explainer */}
                      {(() => {
                        const grace = retForm.grace_period_days;
                        const evalW = retForm.evaluation_window_days;
                        let msg = '';
                        if (grace < evalW) {
                          msg = 'Grace period is shorter than the evaluation window — action will be flagged before a full evaluation cycle completes. Use this for urgent metrics.';
                        } else if (grace === evalW) {
                          msg = 'Grace period matches the evaluation window — a stylist gets exactly one full evaluation cycle to recover before action is taken.';
                        } else {
                          msg = 'Grace period is longer than the evaluation window — the stylist may be re-evaluated multiple times before action is triggered. This is more forgiving.';
                        }
                        return (
                          <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/50 border border-border/50 p-2.5">
                            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{msg}</p>
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <p className="text-sm font-medium">Action When Below Standard</p>
                      <Select value={retForm.action_type} onValueChange={(v) => setRetField('action_type', v as any)}>
                        <SelectTrigger className="mt-2 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="coaching_flag">Coaching Flag — surface for 1:1 review</SelectItem>
                          <SelectItem value="demotion_eligible">Demotion Eligible — flag for potential level change</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-muted/30">
          {activeTab === 'promotion' ? (
            <>
              <div>
                {existing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={handleClear}
                    disabled={deleteCriteria.isPending}
                  >
                    {deleteCriteria.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Clear Criteria
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="ghost" size="sm" onClick={goBack}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
                {((showWeightsStep && step < 2) || (!showWeightsStep && step === 0)) ? (
                  <Button
                    size="sm"
                    onClick={goNext}
                    disabled={step === 0 && !canProceedFromStep0}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!canSave || upsert.isPending}
                  >
                    {upsert.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Check className="w-4 h-4 mr-1" />
                    )}
                    Save Criteria
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                {existingRetention && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={handleClearRetention}
                    disabled={deleteRetention.isPending}
                  >
                    {deleteRetention.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Clear Retention
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleSaveRetention}
                disabled={!canSaveRetention || upsertRetention.isPending}
              >
                {upsertRetention.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Save Retention
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
