import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { 
  format, 
  addDays, 
  addWeeks, 
  setDay, 
  differenceInWeeks, 
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter,
  getDay,
} from 'date-fns';
import { toast } from 'sonner';

export type PayScheduleType = 'semi_monthly' | 'bi_weekly' | 'weekly' | 'monthly';

export type PayrollProcessingMode = 'manual' | 'automatic';

export interface PayScheduleSettings {
  id: string;
  organization_id: string;
  pay_schedule_type: PayScheduleType;
  semi_monthly_first_day: number;
  semi_monthly_second_day: number;
  bi_weekly_day_of_week: number;
  bi_weekly_start_date: string | null;
  weekly_day_of_week: number;
  monthly_pay_day: number;
  days_until_check: number;
  processing_mode: PayrollProcessingMode;
  auto_run_days_before_check: number;
  created_at: string;
  updated_at: string;
}

export interface PayPeriodInfo {
  periodStart: Date;
  periodEnd: Date;
  nextPayDay: Date;
}

// Default settings when no configuration exists
const DEFAULT_SETTINGS: Omit<PayScheduleSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  pay_schedule_type: 'semi_monthly',
  semi_monthly_first_day: 1,
  semi_monthly_second_day: 15,
  bi_weekly_day_of_week: 5, // Friday
  bi_weekly_start_date: null,
  weekly_day_of_week: 5, // Friday
  monthly_pay_day: 1,
  days_until_check: 5,
  processing_mode: 'manual',
  auto_run_days_before_check: 2,
};

/**
 * Calculate the next pay day based on semi-monthly schedule
 */
function getNextSemiMonthlyPayDay(settings: PayScheduleSettings): Date {
  const today = new Date();
  const currentDay = today.getDate();
  const { semi_monthly_first_day, semi_monthly_second_day } = settings;
  
  if (currentDay < semi_monthly_first_day) {
    return new Date(today.getFullYear(), today.getMonth(), semi_monthly_first_day);
  } else if (currentDay < semi_monthly_second_day) {
    return new Date(today.getFullYear(), today.getMonth(), semi_monthly_second_day);
  } else {
    // Next month's first pay day
    return new Date(today.getFullYear(), today.getMonth() + 1, semi_monthly_first_day);
  }
}

/**
 * Calculate the next pay day based on bi-weekly schedule
 */
function getNextBiWeeklyPayDay(settings: PayScheduleSettings): Date {
  const today = new Date();
  const dayOfWeek = settings.bi_weekly_day_of_week;
  
  // Use anchor date or default to a known Friday
  const anchor = settings.bi_weekly_start_date 
    ? new Date(settings.bi_weekly_start_date) 
    : new Date(2026, 0, 3); // Jan 3, 2026 (a Friday)
  
  // Calculate weeks since anchor
  const weeksSinceAnchor = Math.floor(differenceInWeeks(today, anchor));
  const isPayWeek = weeksSinceAnchor % 2 === 0;
  
  // Find current week's pay day
  const currentWeekPayDay = setDay(today, dayOfWeek, { weekStartsOn: 0 });
  
  if (isPayWeek && isAfter(currentWeekPayDay, today)) {
    return currentWeekPayDay;
  }
  
  // Calculate next pay week
  const weeksToAdd = isPayWeek ? 2 : 1;
  const nextPayWeek = addWeeks(startOfWeek(today), weeksToAdd);
  return setDay(nextPayWeek, dayOfWeek, { weekStartsOn: 0 });
}

/**
 * Calculate the next pay day based on weekly schedule
 */
function getNextWeeklyPayDay(settings: PayScheduleSettings): Date {
  const today = new Date();
  const dayOfWeek = settings.weekly_day_of_week;
  const todayDayOfWeek = getDay(today);
  
  if (todayDayOfWeek < dayOfWeek) {
    return setDay(today, dayOfWeek, { weekStartsOn: 0 });
  }
  
  return setDay(addWeeks(today, 1), dayOfWeek, { weekStartsOn: 0 });
}

/**
 * Calculate the next pay day based on monthly schedule
 */
function getNextMonthlyPayDay(settings: PayScheduleSettings): Date {
  const today = new Date();
  const currentDay = today.getDate();
  const { monthly_pay_day } = settings;
  
  if (currentDay < monthly_pay_day) {
    return new Date(today.getFullYear(), today.getMonth(), monthly_pay_day);
  }
  
  return new Date(today.getFullYear(), today.getMonth() + 1, monthly_pay_day);
}

/**
 * Get the next pay day based on the configured schedule
 */
export function getNextPayDay(settings: PayScheduleSettings | null): Date {
  if (!settings) {
    // Default to semi-monthly with 1st and 15th
    return getNextSemiMonthlyPayDay({
      ...DEFAULT_SETTINGS,
      id: '',
      organization_id: '',
      created_at: '',
      updated_at: '',
    } as PayScheduleSettings);
  }
  
  switch (settings.pay_schedule_type) {
    case 'semi_monthly':
      return getNextSemiMonthlyPayDay(settings);
    case 'bi_weekly':
      return getNextBiWeeklyPayDay(settings);
    case 'weekly':
      return getNextWeeklyPayDay(settings);
    case 'monthly':
      return getNextMonthlyPayDay(settings);
    default:
      return getNextSemiMonthlyPayDay(settings);
  }
}

/**
 * Get the current pay period based on the configured schedule
 */
export function getCurrentPayPeriod(settings: PayScheduleSettings | null): PayPeriodInfo {
  const today = new Date();
  const nextPayDay = getNextPayDay(settings);
  
  if (!settings) {
    // Default to semi-monthly
    const dayOfMonth = today.getDate();
    let periodStart: Date;
    let periodEnd: Date;
    
    if (dayOfMonth <= 15) {
      periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      periodEnd = new Date(today.getFullYear(), today.getMonth(), 15);
    } else {
      periodStart = new Date(today.getFullYear(), today.getMonth(), 16);
      periodEnd = endOfMonth(today);
    }
    
    return {
      periodStart,
      periodEnd,
      nextPayDay: addDays(periodEnd, 5),
    };
  }
  
  let periodStart: Date;
  let periodEnd: Date;
  
  switch (settings.pay_schedule_type) {
    case 'semi_monthly': {
      const dayOfMonth = today.getDate();
      const { semi_monthly_first_day, semi_monthly_second_day } = settings;
      
      if (dayOfMonth < semi_monthly_first_day) {
        // We're before the first pay day - period is last month's second period
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        periodStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), semi_monthly_second_day);
        periodEnd = endOfMonth(lastMonth);
      } else if (dayOfMonth < semi_monthly_second_day) {
        // First period of the month
        periodStart = new Date(today.getFullYear(), today.getMonth(), semi_monthly_first_day);
        periodEnd = new Date(today.getFullYear(), today.getMonth(), semi_monthly_second_day - 1);
      } else {
        // Second period of the month
        periodStart = new Date(today.getFullYear(), today.getMonth(), semi_monthly_second_day);
        periodEnd = endOfMonth(today);
      }
      break;
    }
    
    case 'bi_weekly': {
      const anchor = settings.bi_weekly_start_date 
        ? new Date(settings.bi_weekly_start_date) 
        : new Date(2026, 0, 3);
      
      const weeksSinceAnchor = Math.floor(differenceInWeeks(today, anchor));
      const periodWeekStart = weeksSinceAnchor % 2 === 0 ? weeksSinceAnchor : weeksSinceAnchor - 1;
      
      periodStart = addWeeks(startOfWeek(anchor), periodWeekStart);
      periodEnd = endOfWeek(addWeeks(periodStart, 1));
      break;
    }
    
    case 'weekly': {
      periodStart = startOfWeek(today, { weekStartsOn: 0 });
      periodEnd = endOfWeek(today, { weekStartsOn: 0 });
      break;
    }
    
    case 'monthly': {
      periodStart = startOfMonth(today);
      periodEnd = endOfMonth(today);
      break;
    }
    
    default:
      periodStart = startOfMonth(today);
      periodEnd = endOfMonth(today);
  }
  
  return {
    periodStart,
    periodEnd,
    nextPayDay: addDays(periodEnd, settings.days_until_check),
  };
}

/**
 * Hook to manage pay schedule settings
 */
export function usePaySchedule() {
  const { selectedOrganization } = useOrganizationContext();
  const organizationId = selectedOrganization?.id;
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['pay-schedule-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase
        .from('organization_payroll_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as PayScheduleSettings | null;
    },
    enabled: !!organizationId,
  });
  
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<PayScheduleSettings>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      // Check if settings exist
      const { data: existing } = await supabase
        .from('organization_payroll_settings')
        .select('id')
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('organization_payroll_settings')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('organization_payroll_settings')
          .insert({
            organization_id: organizationId,
            ...DEFAULT_SETTINGS,
            ...updates,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-schedule-settings', organizationId] });
      toast.success('Pay schedule saved');
    },
    onError: (error) => {
      console.error('Failed to save pay schedule:', error);
      toast.error('Failed to save pay schedule');
    },
  });
  
  // Calculate derived values
  const nextPayDay = getNextPayDay(settings);
  const currentPeriod = getCurrentPayPeriod(settings);
  
  return {
    settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    nextPayDay,
    currentPeriod,
    // Expose effective settings (with defaults applied)
    effectiveSettings: settings || {
      ...DEFAULT_SETTINGS,
      id: '',
      organization_id: organizationId || '',
      created_at: '',
      updated_at: '',
    } as PayScheduleSettings,
  };
}
