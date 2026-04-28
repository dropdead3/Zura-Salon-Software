import { useState, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Settings2, 
  LayoutDashboard, 
  RotateCcw,
  Sparkles,
  Bell,
  BarChart3,
  Calendar,
  CheckSquare,
  Megaphone,
  Target,
  Armchair,
  DollarSign,
  Trophy,
  PieChart,
  Users,
  TrendingUp,
  Gauge,
  UserPlus,
  LineChart,
  Briefcase,
  CalendarPlus,
  ClipboardCheck,
  Search,
  FileText,
  Sun,
  HeartPulse,
  Activity,
  RefreshCw,
  MapPin,
  Layers,
  ShoppingBag,
  Wallet,
  Receipt,
  Scale,
  Award,
  FlaskConical,
  PackageSearch,
  GraduationCap,
  CalendarClock,
  Wallet2,
  Send,
  Sunrise,
} from 'lucide-react';
import { 
  useDashboardLayout, 
  useResetToDefault, 
  useSaveDashboardLayout,
  getPinnedCardIdsFromLayout,
  isPinnedInLayout,
  isPinnedCardEntry,
  getPinnedCardId,
  getPinnedVisibilityKey,
  toPinnedEntry,
  isRetiredSectionId,
  ANALYTICS_SECTION_ID,
} from '@/hooks/useDashboardLayout';
import { useCanCustomizeDashboardLayouts } from '@/hooks/useDashboardLayout';
import { DashboardLayoutAuditPanel } from '@/components/dashboard/DashboardLayoutAuditPanel';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useCustomizeDrawer } from '@/contexts/CustomizeDrawerContext';
import { useGodModeTargetUserId } from '@/hooks/useGodModeTargetUserId';
import { Link } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/contexts/AuthContext';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  arrayMove 
} from '@dnd-kit/sortable';
import { SortableSectionItem } from './SortableSectionItem';
import { SortableWidgetItem } from './SortableWidgetItem';
import { SortablePinnedCardItem } from './SortablePinnedCardItem';
// SortableHubItem & hubLinks removed — Quick Access Hubs section retired.
import { useDashboardVisibility, useRegisterVisibilityElement, type DashboardElementVisibility } from '@/hooks/useDashboardVisibility';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { usePayrollEntitlement } from '@/hooks/payroll/usePayrollEntitlement';
import { usePaySchedule } from '@/hooks/usePaySchedule';
import { useDismissedStubs } from '@/hooks/dashboard/useDismissedStubs';


type AppRole = Database['public']['Enums']['app_role'];

export interface RoleContext {
  isLeadership: boolean;
  hasStylistRole: boolean;
  isFrontDesk: boolean;
  isReceptionist: boolean;
}

interface SectionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  isVisible?: (ctx: RoleContext) => boolean;
}

const getSections = (): SectionConfig[] => [
  {
    id: 'daily_briefing',
    label: 'Daily Briefing',
    icon: <Sunrise className="w-4 h-4" />,
    description: 'Your morning operating loop',
  },
  { 
    id: 'quick_actions', 
    label: 'Quick Actions', 
    icon: <Sparkles className="w-4 h-4" />, 
    description: 'Shortcuts to common tasks',
    isVisible: (ctx) => ctx.hasStylistRole || !ctx.isLeadership,
  },
  { 
    id: 'todays_queue',
    label: "Today's Queue", 
    icon: <Calendar className="w-4 h-4" />, 
    description: 'Appointment queue',
    isVisible: (ctx) => ctx.isFrontDesk,
  },
  { 
    id: 'quick_stats', 
    label: 'Quick Stats', 
    icon: <LayoutDashboard className="w-4 h-4" />, 
    description: 'Today\'s performance overview',
    isVisible: (ctx) => ctx.hasStylistRole,
  },
  { 
    id: 'todays_prep', 
    label: "Today's Prep", 
    icon: <ClipboardCheck className="w-4 h-4" />, 
    description: 'Pre-visit client prep',
    isVisible: (ctx) => ctx.hasStylistRole,
  },
  {
    id: 'level_progress',
    label: 'Level Progress',
    icon: <GraduationCap className="w-4 h-4" />,
    description: 'Team level readiness — promotions, pace, risk',
    // Visible to stylists (personal nudge) and leadership (4-bucket KPI card)
    isVisible: (ctx) => ctx.hasStylistRole || ctx.isLeadership,
  },
  {
    id: 'graduation_kpi',
    label: 'Team Graduation KPI',
    icon: <GraduationCap className="w-4 h-4" />,
    description: 'Stylists at risk and on-track',
    isVisible: (ctx) => ctx.isLeadership,
  },
  {
    id: ANALYTICS_SECTION_ID,
    label: 'Analytics',
    icon: <BarChart3 className="w-4 h-4" />,
    description: 'Pinned analytics cards — reorder inside this section',
    isVisible: (ctx) => ctx.isLeadership,
  },
  {
    id: 'active_campaigns',
    label: 'Active Campaigns',
    icon: <Send className="w-4 h-4" />,
    description: 'Live marketing campaigns',
    isVisible: (ctx) => ctx.isLeadership,
  },
  {
    id: 'payroll_deadline',
    label: 'Payroll Deadline',
    icon: <CalendarClock className="w-4 h-4" />,
    description: 'Upcoming payroll cutoff',
    isVisible: (ctx) => ctx.isLeadership,
  },
  {
    id: 'payday_countdown',
    label: 'Payday Countdown',
    icon: <Wallet2 className="w-4 h-4" />,
    description: 'Days until next payday',
  },
  { 
    id: 'schedule_tasks', 
    label: 'Tasks', 
    icon: <CheckSquare className="w-4 h-4" />, 
    description: 'Your to-dos and action items',
  },
  // 'announcements' retired — now lives in floating AnnouncementsDrawer.
  // See RETIRED_SECTION_IDS in useDashboardLayout.ts.

  { 
    id: 'client_engine', 
    label: 'Client Engine', 
    icon: <Target className="w-4 h-4" />, 
    description: 'Client growth program',
    isVisible: (ctx) => ctx.hasStylistRole,
  },
  { 
    id: 'widgets', 
    label: 'Widgets', 
    icon: <Armchair className="w-4 h-4" />, 
    description: 'Birthdays, anniversaries, etc.',
  },
];

const WIDGETS = [
  { id: 'changelog', label: "What's New", icon: <Sparkles className="w-4 h-4" /> },
  { id: 'birthdays', label: 'Team Birthdays', icon: <Bell className="w-4 h-4" /> },
  { id: 'anniversaries', label: 'Work Anniversaries', icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'schedule', label: 'My Work Days', icon: <Calendar className="w-4 h-4" /> },
  { id: 'dayrate', label: 'Day Rate Bookings', icon: <Armchair className="w-4 h-4" /> },
];

export const PINNABLE_CARDS = [
  // Executive
  { id: 'executive_summary', label: 'Executive Summary', category: 'Executive', icon: <FileText className="w-4 h-4" />, size: 'full' as const },
  { id: 'daily_brief', label: 'Appointments Summary', category: 'Executive', icon: <Sun className="w-4 h-4" />, size: 'full' as const },
  // Sales
  { id: 'sales_overview', label: 'Sales Overview', category: 'Sales', icon: <DollarSign className="w-4 h-4" />, size: 'full' as const },
  { id: 'revenue_breakdown', label: 'Revenue Breakdown', category: 'Sales', icon: <PieChart className="w-4 h-4" />, size: 'half' as const },
  { id: 'top_performers', label: 'Top Performers', category: 'Sales', icon: <Trophy className="w-4 h-4" />, size: 'half' as const },
  { id: 'service_mix', label: 'Service Mix', category: 'Sales', icon: <Layers className="w-4 h-4" />, size: 'half' as const },
  { id: 'retail_effectiveness', label: 'Retail Effectiveness', category: 'Sales', icon: <ShoppingBag className="w-4 h-4" />, size: 'half' as const },
  // Forecasting
  { id: 'week_ahead_forecast', label: 'Revenue Forecast', category: 'Forecasting', icon: <TrendingUp className="w-4 h-4" />, size: 'full' as const },
  { id: 'goal_tracker', label: 'Goal Tracker', category: 'Forecasting', icon: <Target className="w-4 h-4" />, size: 'half' as const },
  { id: 'new_bookings', label: 'New Bookings', category: 'Forecasting', icon: <CalendarPlus className="w-4 h-4" />, size: 'half' as const },
  // Clients
  { id: 'client_funnel', label: 'Client Funnel', category: 'Clients', icon: <Users className="w-4 h-4" />, size: 'half' as const },
  { id: 'client_health', label: 'Client Health', category: 'Clients', icon: <HeartPulse className="w-4 h-4" />, size: 'half' as const },
  { id: 'rebooking', label: 'Rebooking Rate', category: 'Clients', icon: <RefreshCw className="w-4 h-4" />, size: 'half' as const },
  // Operations
  { id: 'operational_health', label: 'Operational Health', category: 'Operations', icon: <Activity className="w-4 h-4" />, size: 'half' as const },
  { id: 'operations_stats', label: 'Operations Queue', category: 'Operations', icon: <ClipboardCheck className="w-4 h-4" />, size: 'half' as const },
  { id: 'capacity_utilization', label: 'Capacity Utilization', category: 'Operations', icon: <Gauge className="w-4 h-4" />, size: 'full' as const },
  { id: 'stylist_workload', label: 'Stylist Workload', category: 'Operations', icon: <Briefcase className="w-4 h-4" />, size: 'half' as const },
  { id: 'locations_rollup', label: 'Locations Status', category: 'Operations', icon: <MapPin className="w-4 h-4" />, size: 'full' as const },
  // Financial
  { id: 'commission_summary', label: 'Commission Summary', category: 'Financial', icon: <Wallet className="w-4 h-4" />, size: 'full' as const },
  { id: 'staff_commission_breakdown', label: 'Staff Commission Breakdown', category: 'Financial', icon: <Receipt className="w-4 h-4" />, size: 'full' as const },
  { id: 'true_profit', label: 'True Profit', category: 'Financial', icon: <Scale className="w-4 h-4" />, size: 'full' as const },
  { id: 'service_profitability', label: 'Service Profitability', category: 'Financial', icon: <BarChart3 className="w-4 h-4" />, size: 'full' as const },
  // Staffing
  { id: 'staff_performance', label: 'Staff Performance', category: 'Staffing', icon: <Award className="w-4 h-4" />, size: 'full' as const },
  { id: 'staffing_trends', label: 'Staffing Trends', category: 'Staffing', icon: <LineChart className="w-4 h-4" />, size: 'full' as const },
  { id: 'hiring_capacity', label: 'Hiring Capacity', category: 'Staffing', icon: <UserPlus className="w-4 h-4" />, size: 'half' as const },
  { id: 'level_progress_kpi', label: 'Level Progress', category: 'Staffing', icon: <GraduationCap className="w-4 h-4" />, size: 'full' as const },
  // Clients (advanced)
  { id: 'client_experience_staff', label: 'Client Experience', category: 'Clients', icon: <HeartPulse className="w-4 h-4" />, size: 'full' as const },
  // Backroom
  { id: 'control_tower', label: 'Color Bar Control Tower', category: 'Backroom', icon: <FlaskConical className="w-4 h-4" />, size: 'full' as const },
  { id: 'predictive_inventory', label: 'Predictive Inventory', category: 'Backroom', icon: <PackageSearch className="w-4 h-4" />, size: 'full' as const },
];

const CARD_SIZE_OVERRIDES: Record<string, 'half' | 'full'> = {};

export function getCardSize(cardId: string): 'half' | 'full' {
  const card = PINNABLE_CARDS.find(c => c.id === cardId);
  if (card) return card.size;
  return CARD_SIZE_OVERRIDES[cardId] ?? 'full';
}

interface DashboardCustomizeMenuProps {
  variant?: 'icon' | 'button';
  roleContext?: RoleContext;
}



export function DashboardCustomizeMenu({ variant = 'icon', roleContext }: DashboardCustomizeMenuProps) {
  const { dashPath } = useOrgDashboardPath();
  const { isOpen, setOpen: setIsOpen } = useCustomizeDrawer();
  const [searchQuery, setSearchQuery] = useState('');
  const { isViewingAs, viewAsRole } = useViewAs();
  const effectiveRoleContext = useMemo<RoleContext | undefined>(() => {
    if (!roleContext) return undefined;
    if (!isViewingAs || !viewAsRole) return roleContext;

    switch (viewAsRole) {
      case 'super_admin':
      case 'admin':
      case 'manager':
        return {
          isLeadership: true,
          hasStylistRole: false,
          isFrontDesk: false,
          isReceptionist: false,
        };
      case 'receptionist':
        return {
          isLeadership: false,
          hasStylistRole: false,
          isFrontDesk: true,
          isReceptionist: true,
        };
      case 'stylist':
      case 'stylist_assistant':
      case 'assistant':
      case 'booth_renter':
      case 'admin_assistant':
      case 'operations_assistant':
        return {
          isLeadership: false,
          hasStylistRole: true,
          isFrontDesk: false,
          isReceptionist: false,
        };
      default:
        return roleContext;
    }
  }, [roleContext, isViewingAs, viewAsRole]);
  const SECTIONS = useMemo(() => {
    const allSections = getSections();
    if (!effectiveRoleContext) return allSections;
    return allSections.filter(section => {
      if (!section.isVisible) return true;
      return section.isVisible(effectiveRoleContext);
    });
  }, [effectiveRoleContext]);
  const { targetUserId } = useGodModeTargetUserId();
  const { layout, isLoading, roleTemplate } = useDashboardLayout(targetUserId);
  const resetToDefault = useResetToDefault(targetUserId);
  const saveLayout = useSaveDashboardLayout(targetUserId);
  const { can } = usePermission();
  const canManageVisibility = can('manage_visibility_console');
  const canCustomize = useCanCustomizeDashboardLayouts();

  const { data: visibilityData, isLoading: isLoadingVisibility } = useDashboardVisibility();
  const { isEntitled: isPayrollEntitled } = usePayrollEntitlement();
  const { settings: paySchedule } = usePaySchedule();
  const { restoreAll: restoreDismissedStubs, dismissed: dismissedStubs } = useDismissedStubs();
  const registerElement = useRegisterVisibilityElement();
  const [isTogglingPin, setIsTogglingPin] = useState(false);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const leadershipRoles: AppRole[] = ['super_admin', 'admin', 'manager'];
  const effectivePinnedCardIds = useMemo(() => getPinnedCardIdsFromLayout(layout), [layout]);
  
  // SOURCE-OF-TRUTH SEPARATION (P0 fix):
  // - `isCardPinnedInLayout` = the operator's personal pinned state. This is
  //   what drives the toggle direction in the Customize drawer.
  // - `isCardVisibleToRole` = role-default eligibility from the global
  //   `dashboard_element_visibility` table. Used only to gate cards an
  //   operator's role isn't allowed to see at all.
  // Conflating these previously caused a two-click bug: the visibility row
  // already said `is_visible=true` for leadership, so the first toggle on an
  // "Available" card was interpreted as an UNPIN and silently noop'd the
  // layout array. See plan in .lovable/plan.md.
  const isCardPinnedInLayout = (cardId: string): boolean => isPinnedInLayout(layout, cardId);

  const isCardVisibleToRole = (cardId: string): boolean => {
    if (!visibilityData) return false;
    const visibilityKey = getPinnedVisibilityKey(cardId);
    return leadershipRoles.some(role =>
      visibilityData.find(v => v.element_key === visibilityKey && v.role === role)?.is_visible ?? false
    );
  };

  // Back-compat alias: anywhere not yet migrated still calls `isCardPinned`.
  // Layout-first, then role visibility as a fallback (preserves old behavior
  // for callers that depended on the union).
  const isCardPinned = (cardId: string): boolean =>
    isCardPinnedInLayout(cardId) || isCardVisibleToRole(cardId);

  // Outer list: sections only. Analytics is a single section entry — its
  // pinned cards reorder inside it, never against unrelated sections.
  const orderedSectionItems = useMemo(() => {
    const savedOrder = layout.sectionOrder || [];
    const sectionIds = new Set(SECTIONS.map(s => s.id));
    const result: string[] = [];

    for (const id of savedOrder) {
      if (result.includes(id)) continue;
      if (isRetiredSectionId(id)) continue;
      // Defensive: skip any legacy `pinned:*` interleaved in saved order.
      if (isPinnedCardEntry(id)) continue;
      if (sectionIds.has(id)) result.push(id);
    }

    // Append any sections not yet present in saved order.
    for (const s of SECTIONS) {
      if (isRetiredSectionId(s.id)) continue;
      if (!result.includes(s.id)) result.push(s.id);
    }

    return result;
  }, [layout.sectionOrder, SECTIONS]);

  // Inner list: pinned analytics cards in their saved display order.
  const orderedPinnedCardIds = useMemo(() => {
    const fromLayout = (layout.pinnedCards || []).filter(id => isCardPinned(id));
    const seen = new Set(fromLayout);
    // Append any cards pinned in the visibility DB but missing from the array.
    const extras = PINNABLE_CARDS
      .map(c => c.id)
      .filter(id => isCardPinned(id) && !seen.has(id));
    return [...fromLayout, ...extras];
  }, [layout.pinnedCards, visibilityData, effectivePinnedCardIds]);

  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(true);

  const orderedWidgets = useMemo(() => {
    const savedWidgetOrder = layout.widgetOrder || [];
    const allIds = WIDGETS.map(w => w.id);
    const ordered = savedWidgetOrder.filter((id: string) => allIds.includes(id));
    const missing = allIds.filter(id => !ordered.includes(id));
    return [...ordered, ...missing];
  }, [layout.widgetOrder, layout.widgets]);
  
  const unpinnedCards = useMemo(() => {
    // Layout-first: a card is "available" iff the operator hasn't personally
    // pinned it, regardless of the global role-visibility row.
    return PINNABLE_CARDS.filter(card => !isCardPinnedInLayout(card.id));
  }, [layout.pinnedCards, layout.sectionOrder]);

  const groupedUnpinnedCards = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = unpinnedCards.filter(card => 
      !searchQuery || card.label.toLowerCase().includes(lowerQuery) || card.category.toLowerCase().includes(lowerQuery)
    );
    const groups: Record<string, typeof PINNABLE_CARDS> = {};
    for (const card of filtered) {
      if (!groups[card.category]) groups[card.category] = [];
      groups[card.category].push(card);
    }
    return groups;
  }, [unpinnedCards, searchQuery]);
  
  const { hasPermission } = useAuth();

  const handleToggleSection = (sectionId: string) => {
    const sections = layout.sections.includes(sectionId)
      ? layout.sections.filter(s => s !== sectionId)
      : [...layout.sections, sectionId];
    
    saveLayout.mutate({ ...layout, sections, sectionOrder: orderedSectionItems });
  };

  const handleToggleWidget = (widgetId: string) => {
    const widgets = layout.widgets.includes(widgetId)
      ? layout.widgets.filter(w => w !== widgetId)
      : [...layout.widgets, widgetId];
    
    saveLayout.mutate({ ...layout, widgets });
  };
  
  const handleTogglePinnedCard = async (cardId: string) => {
    const isPinned = isCardPinned(cardId);
    const newIsVisible = !isPinned;
    const card = PINNABLE_CARDS.find(c => c.id === cardId);
    const visibilityKey = getPinnedVisibilityKey(cardId);
    const visibilityName = visibilityKey === 'operations_quick_stats'
      ? 'Operations Quick Stats'
      : card?.label || cardId;
    
    setIsTogglingPin(true);
    try {
      const rows = leadershipRoles.map(role => ({
        element_key: visibilityKey,
        element_name: visibilityName,
        element_category: card?.category || 'Analytics Hub',
        role,
        is_visible: newIsVisible,
      }));

      queryClient.setQueryData<DashboardElementVisibility[]>(['dashboard-visibility'], (old) => {
        if (!old) return old;
        const updated = [...old];
        for (const row of rows) {
          const idx = updated.findIndex(v => v.element_key === row.element_key && v.role === row.role);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], is_visible: row.is_visible };
          } else {
            updated.push({
              id: `optimistic-${row.element_key}-${row.role}`,
              element_key: row.element_key,
              element_name: row.element_name,
              element_category: row.element_category,
              role: row.role as any,
              is_visible: row.is_visible,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
        return updated;
      });

      queryClient.setQueriesData<Record<string, boolean>>(
        { queryKey: ['dashboard-visibility', 'my'] },
        (old) => {
          if (!old) return old;
          return { ...old, [visibilityKey]: newIsVisible };
        }
      );

      const { error } = await supabase
        .from('dashboard_element_visibility')
        .upsert(rows, { onConflict: 'element_key,role' });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
      toast({ title: 'Failed to update pinned card', description: err?.message || 'Unknown error', variant: 'destructive' });
      setIsTogglingPin(false);
      return;
    } finally {
      setIsTogglingPin(false);
    }

    // Update layout's pinnedCards array. The Analytics section is auto-enabled
    // by sanitizeDashboardLayout when at least one card is pinned.
    if (newIsVisible) {
      if (!(layout.pinnedCards || []).includes(cardId)) {
        const newPinnedCards = [...(layout.pinnedCards || []), cardId];
        const newSections = layout.sections.includes(ANALYTICS_SECTION_ID)
          ? layout.sections
          : [...layout.sections, ANALYTICS_SECTION_ID];
        saveLayout.mutate({ ...layout, pinnedCards: newPinnedCards, sections: newSections });
      }
      toast({
        title: `Pinned to dashboard`,
        description: `${visibilityName} is now visible in your Analytics section.`,
      });
    } else {
      const newPinnedCards = (layout.pinnedCards || []).filter(id => id !== cardId);
      saveLayout.mutate({ ...layout, pinnedCards: newPinnedCards });
      toast({
        title: `Unpinned from dashboard`,
        description: `${visibilityName} was removed from your Analytics section.`,
      });
    }
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = orderedSectionItems.indexOf(active.id as string);
    const newIndex = orderedSectionItems.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(orderedSectionItems, oldIndex, newIndex);
    
    saveLayout.mutate({ 
      ...layout, 
      sectionOrder: newOrder,
    });
  };

  const handleAnalyticsCardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = orderedPinnedCardIds.indexOf(active.id as string);
    const newIndex = orderedPinnedCardIds.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(orderedPinnedCardIds, oldIndex, newIndex);
    
    saveLayout.mutate({ ...layout, pinnedCards: newOrder });
  };

  const handleWidgetDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = orderedWidgets.indexOf(active.id as string);
    const newIndex = orderedWidgets.indexOf(over.id as string);
    const newOrder = arrayMove(orderedWidgets, oldIndex, newIndex);
    
    const enabledWidgets = newOrder.filter(id => layout.widgets.includes(id));
    saveLayout.mutate({ ...layout, widgets: enabledWidgets, widgetOrder: newOrder });
  };

  const handleResetToDefault = () => {
    resetToDefault.mutate();
  };

  const handleBulkPinAll = async () => {
    setIsTogglingPin(true);
    try {
      const rows = unpinnedCards.flatMap(card => {
        const visibilityKey = getPinnedVisibilityKey(card.id);
        const visibilityName = visibilityKey === 'operations_quick_stats'
          ? 'Operations Quick Stats'
          : card.label;

        return leadershipRoles.map(role => ({
          element_key: visibilityKey,
          element_name: visibilityName,
          element_category: card.category,
          role,
          is_visible: true,
        }));
      });
      if (rows.length > 0) {
        const { error } = await supabase
          .from('dashboard_element_visibility')
          .upsert(rows, { onConflict: 'element_key,role' });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
        
        const newPinnedCards = [...(layout.pinnedCards || []), ...unpinnedCards.map(c => c.id)];
        const newSections = layout.sections.includes(ANALYTICS_SECTION_ID)
          ? layout.sections
          : [...layout.sections, ANALYTICS_SECTION_ID];
        saveLayout.mutate({ ...layout, pinnedCards: newPinnedCards, sections: newSections });
      }
    } catch (err: any) {
      toast({ title: 'Failed to pin all cards', description: err?.message, variant: 'destructive' });
    } finally {
      setIsTogglingPin(false);
    }
  };


  if (isLoading) return null;
  if (!canCustomize) return null;

  const editingLabel = isViewingAs && viewAsRole
    ? `Editing org-wide layout for ${viewAsRole.replace(/_/g, ' ')}`
    : "Editing your own layout";



  return (
    <>
      {variant === 'icon' ? (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(true)}>
          <Settings2 className="w-4 h-4" />
        </Button>
      ) : (
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsOpen(true)}>
          <Settings2 className="w-4 h-4" />
        </Button>
      )}

      <PremiumFloatingPanel open={isOpen} onOpenChange={setIsOpen} maxWidth="440px">
        <div className="p-5 pb-3 border-b border-border/40 space-y-3">
          <div>
            <h2 className="font-display text-sm tracking-wide uppercase flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              Customize Dashboard
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Drag to reorder, toggle to show/hide sections
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 text-[11px] text-muted-foreground capitalize">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {editingLabel}
            </div>
          </div>

          {/*
            Role-specific layout authoring is driven by the global "View As" toggle.
            When an Account Owner / Super Admin views as a role, this drawer edits
            that role's org-wide layout in place. The current target is shown in
            `editingLabel` above and audited in the panel below.
          */}

          {/* Owner-only: history of who changed which role layout. */}
          <DashboardLayoutAuditPanel role={isViewingAs && viewAsRole ? (viewAsRole as AppRole) : null} />
        </div>

        <div className="px-5 py-3 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Search sections, widgets, analytics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/30 border-border/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">SECTIONS</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Drag to reorder sections. Toggle to show/hide. Expand Analytics to reorder its pinned cards.
            </p>
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext 
                items={orderedSectionItems} 
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {orderedSectionItems.map(sectionId => {
                    const section = SECTIONS.find(s => s.id === sectionId);
                    if (!section) return null;

                    // Analytics section: render as expandable, with nested
                    // sortable list of pinned cards inside.
                    if (sectionId === ANALYTICS_SECTION_ID) {
                      const isEnabled = layout.sections.includes(ANALYTICS_SECTION_ID);
                      const cardCount = orderedPinnedCardIds.length;
                      return (
                        <div key={sectionId} className="space-y-1">
                          <SortableSectionItem
                            id={section.id}
                            label={section.label}
                            description={
                              cardCount > 0
                                ? `${cardCount} pinned ${cardCount === 1 ? 'card' : 'cards'}`
                                : section.description
                            }
                            icon={section.icon}
                            isEnabled={isEnabled}
                            onToggle={() => handleToggleSection(section.id)}
                          />
                          {isEnabled && cardCount > 0 && (
                            <div className="ml-6 pl-3 border-l border-border/40">
                              <button
                                type="button"
                                onClick={() => setIsAnalyticsExpanded(v => !v)}
                                className="text-[10px] font-display tracking-wider uppercase text-muted-foreground/70 hover:text-muted-foreground py-1.5 px-1 transition-colors"
                              >
                                {isAnalyticsExpanded ? '▾' : '▸'} Pinned cards ({cardCount})
                              </button>
                              {isAnalyticsExpanded && cardCount > 6 && (
                                <div className="mb-2 mr-1 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
                                  <p className="text-[11px] font-sans text-foreground/80 leading-snug">
                                    Simple view shows the first <span className="font-medium text-foreground">6</span> pinned cards
                                    {' '}({cardCount - 6} hidden in Simple). Drag to reorder which appear first,
                                    or switch to Detailed view to see all {cardCount}.
                                  </p>
                                </div>
                              )}
                              {isAnalyticsExpanded && (
                                <DndContext
                                  sensors={sensors}
                                  collisionDetection={closestCenter}
                                  onDragEnd={handleAnalyticsCardDragEnd}
                                >
                                  <SortableContext
                                    items={orderedPinnedCardIds}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {cardCount > 6 && (
                                      <div className="flex items-center gap-2 px-1 pb-2 text-[10px] font-display tracking-wider uppercase text-muted-foreground/70">
                                        <span className="inline-flex items-center gap-1">
                                          <span className="w-3.5 h-3.5 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center text-[9px]">1</span>
                                          –6 Simple
                                        </span>
                                        <span className="opacity-50">·</span>
                                        <span className="inline-flex items-center gap-1">
                                          <span className="w-3.5 h-3.5 rounded-full bg-muted text-muted-foreground/80 inline-flex items-center justify-center text-[9px]">7</span>
                                          + Detailed only
                                        </span>
                                      </div>
                                    )}
                                    <div className="space-y-1">
                                      {orderedPinnedCardIds.map((cardId, index) => {
                                        const card = PINNABLE_CARDS.find(c => c.id === cardId);
                                        if (!card) return null;
                                        return (
                                          <SortablePinnedCardItem
                                            key={cardId}
                                            id={cardId}
                                            cardId={cardId}
                                            label={card.label}
                                            icon={card.icon}
                                            isPinned={true}
                                            onToggle={() => handleTogglePinnedCard(cardId)}
                                            isLoading={isTogglingPin}
                                            simpleViewIndex={index + 1}
                                          />
                                        );
                                      })}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Surface "Needs setup" hints for sections whose live card
                    // would render the ConfigurationStubCard. Operator sees the
                    // gap inside the Customize menu before opening the dashboard.
                    let description = section.description;
                    if (section.id === 'payday_countdown' && !isPayrollEntitled) {
                      description = 'Needs setup — enable Payroll to surface this card.';
                    } else if (section.id === 'payroll_deadline' && !paySchedule) {
                      description = 'Needs setup — configure your pay schedule to surface this card.';
                    }

                    return (
                      <SortableSectionItem
                        key={section.id}
                        id={section.id}
                        label={section.label}
                        description={description}
                        icon={section.icon}
                        isEnabled={layout.sections.includes(section.id)}
                        onToggle={() => handleToggleSection(section.id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <Separator />

          {/* Quick Access Hubs removed — sidebar handles hub navigation. */}

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">WIDGETS</h3>
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleWidgetDragEnd}
            >
              <SortableContext 
                items={orderedWidgets} 
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {orderedWidgets.map(widgetId => {
                    const widget = WIDGETS.find(w => w.id === widgetId);
                    if (!widget) return null;
                    return (
                      <SortableWidgetItem
                        key={widget.id}
                        id={widget.id}
                        label={widget.label}
                        icon={widget.icon}
                        isEnabled={layout.widgets.includes(widget.id)}
                        onToggle={() => handleToggleWidget(widget.id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <Separator />

          {roleContext?.isLeadership && unpinnedCards.length > 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-display font-medium text-muted-foreground tracking-wide">AVAILABLE ANALYTICS</h3>
                  {unpinnedCards.length > 1 && (
                    <button
                      type="button"
                      onClick={handleBulkPinAll}
                      disabled={isTogglingPin}
                      className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                      Pin All
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Toggle to pin analytics cards to your dashboard.
                </p>
                <div className="space-y-3">
                  {Object.entries(groupedUnpinnedCards).map(([category, cards]) => (
                    <div key={category}>
                      <p className="text-[10px] font-display font-medium text-muted-foreground/70 uppercase tracking-wider mb-1 px-1">{category}</p>
                      <div className="space-y-1">
                        {cards.map(card => (
                          <SortablePinnedCardItem
                            key={card.id}
                            id={card.id}
                            label={card.label}
                            icon={card.icon}
                            // Reflect optimistic pinned state so the switch
                            // visibly flips ON before the row migrates to
                            // the Pinned section above. Prevents the "nothing
                            // happens when I toggle" perception.
                            isPinned={isCardPinned(card.id)}
                            onToggle={() => handleTogglePinnedCard(card.id)}
                            isLoading={isTogglingPin}
                            sortable={false}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {Object.keys(groupedUnpinnedCards).length === 0 && searchQuery && (
                  <p className="text-xs text-muted-foreground text-center py-3">No matching analytics found</p>
                )}
                <Button variant="ghost" size={tokens.button.card} className="w-full gap-2 mt-4" asChild>
                  <Link to={dashPath('/admin/analytics')} onClick={() => setIsOpen(false)}>
                    <BarChart3 className="w-4 h-4" />
                    View All in Analytics Hub
                  </Link>
                </Button>
              </div>

              <Separator />
            </>
          )}

          <div className="space-y-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  disabled={resetToDefault.isPending}
                >
                  <RotateCcw className="w-4 h-4" />
                  {resetToDefault.isPending ? 'Resetting...' : 'Reset to Default'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Dashboard Layout</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will restore all sections, widgets, and analytics to their default positions. Your current layout will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetToDefault}>
                    Reset to Default
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {dismissedStubs.size > 0 && (
              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground"
                onClick={() => restoreDismissedStubs()}
              >
                <RotateCcw className="w-4 h-4" />
                Restore dismissed prompts ({dismissedStubs.size})
              </Button>
            )}

            {canManageVisibility && (
              <Button 
                variant="ghost" 
                className="w-full gap-2 text-muted-foreground"
                asChild
              >
                <Link to={dashPath('/admin/visibility')} onClick={() => setIsOpen(false)}>
                  <Settings2 className="w-4 h-4" />
                  Open Visibility Console
                </Link>
              </Button>
            )}
          </div>

          {roleTemplate && (
            <div className="text-xs text-muted-foreground text-center pt-2">
              Default template: {roleTemplate.display_name}
            </div>
          )}
        </div>
      </PremiumFloatingPanel>
    </>
  );
}
