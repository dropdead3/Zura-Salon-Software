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
} from '@/hooks/useDashboardLayout';
import { useCanCustomizeDashboardLayouts } from '@/hooks/useDashboardLayout';
import { useViewAs } from '@/contexts/ViewAsContext';
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
import { SortableHubItem } from './SortableHubItem';
import { hubLinks } from './HubQuickLinks';
import { useDashboardVisibility, useRegisterVisibilityElement, type DashboardElementVisibility } from '@/hooks/useDashboardVisibility';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


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
    id: 'schedule_tasks', 
    label: 'Tasks', 
    icon: <CheckSquare className="w-4 h-4" />, 
    description: 'Your to-dos and action items',
  },
  { 
    id: 'announcements', 
    label: 'Announcements', 
    icon: <Megaphone className="w-4 h-4" />, 
    description: 'Team updates and news',
  },
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

const PINNABLE_CARDS = [
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
  { id: 'locations_rollup', label: 'Locations Rollup', category: 'Operations', icon: <MapPin className="w-4 h-4" />, size: 'full' as const },
  // Financial
  { id: 'commission_summary', label: 'Commission Summary', category: 'Financial', icon: <Wallet className="w-4 h-4" />, size: 'full' as const },
  { id: 'staff_commission_breakdown', label: 'Staff Commission Breakdown', category: 'Financial', icon: <Receipt className="w-4 h-4" />, size: 'full' as const },
  { id: 'true_profit', label: 'True Profit', category: 'Financial', icon: <Scale className="w-4 h-4" />, size: 'full' as const },
  { id: 'service_profitability', label: 'Service Profitability', category: 'Financial', icon: <BarChart3 className="w-4 h-4" />, size: 'full' as const },
  // Staffing
  { id: 'staff_performance', label: 'Staff Performance', category: 'Staffing', icon: <Award className="w-4 h-4" />, size: 'full' as const },
  { id: 'staffing_trends', label: 'Staffing Trends', category: 'Staffing', icon: <LineChart className="w-4 h-4" />, size: 'full' as const },
  { id: 'hiring_capacity', label: 'Hiring Capacity', category: 'Staffing', icon: <UserPlus className="w-4 h-4" />, size: 'half' as const },
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

const PREVIEWABLE_ROLES: { role: AppRole; label: string }[] = [
  { role: 'admin', label: 'General Manager' },
  { role: 'manager', label: 'Manager' },
  { role: 'receptionist', label: 'Front Desk' },
  { role: 'stylist', label: 'Stylist' },
  { role: 'stylist_assistant', label: 'Assistant' },
];

export function DashboardCustomizeMenu({ variant = 'icon', roleContext }: DashboardCustomizeMenuProps) {
  const { dashPath } = useOrgDashboardPath();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const SECTIONS = useMemo(() => {
    const allSections = getSections();
    if (!roleContext) return allSections;
    return allSections.filter(section => {
      if (!section.isVisible) return true;
      return section.isVisible(roleContext);
    });
  }, [roleContext]);
  const { targetUserId } = useGodModeTargetUserId();
  const { layout, isLoading, roleTemplate } = useDashboardLayout(targetUserId);
  const resetToDefault = useResetToDefault(targetUserId);
  const saveLayout = useSaveDashboardLayout(targetUserId);
  const { can } = usePermission();
  const canManageVisibility = can('manage_visibility_console');
  const canCustomize = useCanCustomizeDashboardLayouts();
  const { isViewingAs, viewAsRole, setViewAsRole, clearViewAs } = useViewAs();

  const { data: visibilityData, isLoading: isLoadingVisibility } = useDashboardVisibility();
  const registerElement = useRegisterVisibilityElement();
  const [isTogglingPin, setIsTogglingPin] = useState(false);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const leadershipRoles: AppRole[] = ['super_admin', 'admin', 'manager'];
  const effectivePinnedCardIds = useMemo(() => getPinnedCardIdsFromLayout(layout), [layout]);
  
  const isCardPinned = (cardId: string): boolean => {
    if (isPinnedInLayout(layout, cardId)) return true;
    if (!visibilityData) return false;
    const visibilityKey = getPinnedVisibilityKey(cardId);
    return leadershipRoles.some(role => 
      visibilityData.find(v => v.element_key === visibilityKey && v.role === role)?.is_visible ?? false
    );
  };

  const orderedUnifiedItems = useMemo(() => {
    const savedOrder = layout.sectionOrder || [];
    const sectionIds = SECTIONS.map(s => s.id);
    const pinnedCardIds = PINNABLE_CARDS
      .map(c => c.id)
      .filter(id => effectivePinnedCardIds.includes(id) || isCardPinned(id));
    const pinnedEntries = pinnedCardIds.map(id => toPinnedEntry(id));
    
    const result: string[] = [];
    
    for (const id of savedOrder) {
      if (result.includes(id)) continue;
      if (sectionIds.includes(id)) {
        result.push(id);
      } else if (isPinnedCardEntry(id)) {
        const cardId = getPinnedCardId(id);
        if (isCardPinned(cardId)) {
          result.push(id);
        }
      }
    }
    
    for (const sectionId of sectionIds) {
      if (!result.includes(sectionId)) {
        result.push(sectionId);
      }
    }
    
    for (const entry of pinnedEntries) {
      if (!result.includes(entry)) {
        result.push(entry);
      }
    }
    
    return result;
  }, [layout.sectionOrder, SECTIONS, visibilityData, effectivePinnedCardIds]);

  const orderedWidgets = useMemo(() => {
    const savedWidgetOrder = layout.widgetOrder || [];
    const allIds = WIDGETS.map(w => w.id);
    // Start with saved order, keeping only valid IDs
    const ordered = savedWidgetOrder.filter((id: string) => allIds.includes(id));
    // Add any missing widget IDs
    const missing = allIds.filter(id => !ordered.includes(id));
    return [...ordered, ...missing];
  }, [layout.widgetOrder, layout.widgets]);
  
  const unpinnedCards = useMemo(() => {
    return PINNABLE_CARDS.filter(card => !isCardPinned(card.id));
  }, [visibilityData]);

  // Group unpinned cards by category
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
  const permittedHubs = useMemo(() => {
    return hubLinks.filter(hub => !hub.permission || hasPermission(hub.permission));
  }, [hasPermission]);
  
  const orderedHubs = useMemo(() => {
    const savedOrder = layout.hubOrder || [];
    const enabledHubs = layout.enabledHubs;
    const hubHrefs = permittedHubs.map(h => h.href);
    
    const result = savedOrder.filter(href => hubHrefs.includes(href));
    
    for (const href of hubHrefs) {
      if (!result.includes(href)) {
        result.push(href);
      }
    }
    
    return result;
  }, [layout.hubOrder, permittedHubs]);

  const handleToggleSection = (sectionId: string) => {
    const sections = layout.sections.includes(sectionId)
      ? layout.sections.filter(s => s !== sectionId)
      : [...layout.sections, sectionId];
    
    saveLayout.mutate({ ...layout, sections, sectionOrder: orderedUnifiedItems });
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

      // Optimistically update the visibility cache so UI reflects immediately
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

      // Also optimistically update the per-role visibility map
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

      // Refetch to get authoritative server data
      await queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
    } catch (err: any) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
      toast({ title: 'Failed to update pinned card', description: err?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsTogglingPin(false);
    }
    
    if (newIsVisible) {
      const pinnedEntry = toPinnedEntry(cardId);
      if (!orderedUnifiedItems.includes(pinnedEntry)) {
        const newSectionOrder = [...orderedUnifiedItems, pinnedEntry];
        const newPinnedCards = [...(layout.pinnedCards || []), cardId];
        saveLayout.mutate({ ...layout, pinnedCards: newPinnedCards, sectionOrder: newSectionOrder });
      }
    } else {
      const pinnedEntry = toPinnedEntry(cardId);
      const newSectionOrder = orderedUnifiedItems.filter(id => id !== pinnedEntry);
      const newPinnedCards = (layout.pinnedCards || []).filter(id => id !== cardId);
      saveLayout.mutate({ ...layout, pinnedCards: newPinnedCards, sectionOrder: newSectionOrder });
    }
  };

  const handleUnifiedDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = orderedUnifiedItems.indexOf(active.id as string);
    const newIndex = orderedUnifiedItems.indexOf(over.id as string);
    const newOrder = arrayMove(orderedUnifiedItems, oldIndex, newIndex);
    
    const enabledSections = newOrder.filter(id => !isPinnedCardEntry(id) && layout.sections.includes(id));
    const pinnedCardsOrder = newOrder
      .filter(id => isPinnedCardEntry(id))
      .map(id => getPinnedCardId(id));
    
    saveLayout.mutate({ 
      ...layout, 
      sections: enabledSections, 
      sectionOrder: newOrder,
      pinnedCards: pinnedCardsOrder,
    });
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
        
        const newPinnedEntries = unpinnedCards.map(c => toPinnedEntry(c.id));
        const newSectionOrder = [...orderedUnifiedItems, ...newPinnedEntries];
        const newPinnedCards = [...(layout.pinnedCards || []), ...unpinnedCards.map(c => c.id)];
        saveLayout.mutate({ ...layout, pinnedCards: newPinnedCards, sectionOrder: newSectionOrder });
      }
    } catch (err: any) {
      toast({ title: 'Failed to pin all cards', description: err?.message, variant: 'destructive' });
    } finally {
      setIsTogglingPin(false);
    }
  };
  
  const handleToggleHub = (hubHref: string) => {
    const currentEnabled = layout.enabledHubs || permittedHubs.map(h => h.href);
    const newEnabled = currentEnabled.includes(hubHref)
      ? currentEnabled.filter(h => h !== hubHref)
      : [...currentEnabled, hubHref];
    
    saveLayout.mutate({ ...layout, enabledHubs: newEnabled, hubOrder: orderedHubs });
  };
  
  const handleHubDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = orderedHubs.indexOf(active.id as string);
    const newIndex = orderedHubs.indexOf(over.id as string);
    const newOrder = arrayMove(orderedHubs, oldIndex, newIndex);
    
    const currentEnabled = layout.enabledHubs || permittedHubs.map(h => h.href);
    saveLayout.mutate({ ...layout, hubOrder: newOrder, enabledHubs: currentEnabled });
  };

  if (isLoading) return null;
  if (!canCustomize) return null;

  const editingLabel = isViewingAs && viewAsRole
    ? `Editing org-wide layout for ${viewAsRole.replace(/_/g, ' ')}`
    : "Editing your own layout";

  const handlePreviewRoleChange = (value: string) => {
    if (value === '__self__') {
      clearViewAs();
    } else {
      setViewAsRole(value as AppRole);
    }
  };

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

          {/* Preview-as-role: owner picks which role's canvas to author. */}
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
            <label className="text-[10px] font-display tracking-wider uppercase text-muted-foreground">
              Preview as role
            </label>
            <RoleSelect
              value={isViewingAs && viewAsRole ? viewAsRole : '__self__'}
              onChange={handlePreviewRoleChange}
            />
            <p className="text-[10px] text-muted-foreground leading-snug">
              Pick a role to see its dashboard live. Your edits save org-wide for that role — every user with that role will see them.
            </p>
          </div>
        </div>

        <div className="px-5 pb-3 border-b border-border/40">
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
            <h3 className="text-sm font-medium text-muted-foreground mb-3">SECTIONS & ANALYTICS</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Drag to reorder. Toggle to show/hide sections. Pinned analytics can be moved among sections.
            </p>
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleUnifiedDragEnd}
            >
              <SortableContext 
                items={orderedUnifiedItems} 
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {orderedUnifiedItems.map(itemId => {
                    if (isPinnedCardEntry(itemId)) {
                      const cardId = getPinnedCardId(itemId);
                      const card = PINNABLE_CARDS.find(c => c.id === cardId);
                      if (!card) return null;
                      return (
                        <SortablePinnedCardItem
                          key={itemId}
                          id={itemId}
                          cardId={cardId}
                          label={card.label}
                          icon={card.icon}
                          isPinned={true}
                          onToggle={() => handleTogglePinnedCard(cardId)}
                          isLoading={isTogglingPin}
                        />
                      );
                    }
                    
                    const section = SECTIONS.find(s => s.id === itemId);
                    if (!section) return null;
                    return (
                      <SortableSectionItem
                        key={section.id}
                        id={section.id}
                        label={section.label}
                        description={section.description}
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

          {roleContext?.isLeadership && permittedHubs.length > 0 && (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">QUICK ACCESS HUBS</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Drag to reorder. Toggle to show/hide hubs.
                </p>
                <DndContext 
                  sensors={sensors} 
                  collisionDetection={closestCenter} 
                  onDragEnd={handleHubDragEnd}
                >
                  <SortableContext 
                    items={orderedHubs} 
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {orderedHubs.map(hubHref => {
                        const hub = permittedHubs.find(h => h.href === hubHref);
                        if (!hub) return null;
                        const Icon = hub.icon;
                        const isEnabled = layout.enabledHubs 
                          ? layout.enabledHubs.includes(hub.href)
                          : true;
                        return (
                          <SortableHubItem
                            key={hub.href}
                            id={hub.href}
                            label={hub.label}
                            icon={<Icon className="w-4 h-4" />}
                            colorClass={hub.colorClass}
                            isEnabled={isEnabled}
                            onToggle={() => handleToggleHub(hub.href)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              <Separator />
            </>
          )}

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
                            isPinned={false}
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
