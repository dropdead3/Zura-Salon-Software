import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { 
  useDashboardLayout, 
  useResetToDefault, 
  useSaveDashboardLayout,
  isPinnedCardEntry,
  getPinnedCardId,
  toPinnedEntry,
} from '@/hooks/useDashboardLayout';
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
import { useDashboardVisibility, useRegisterVisibilityElement } from '@/hooks/useDashboardVisibility';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';

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

// All analytics cards that can be pinned to Command Center
// size: 'half' = compact card that can pair side-by-side, 'full' = needs full width
const PINNABLE_CARDS = [
  // Sales & Revenue
  { id: 'sales_overview', label: 'Sales Overview', category: 'Sales', icon: <DollarSign className="w-4 h-4" />, size: 'full' as const },
  { id: 'revenue_breakdown', label: 'Revenue Breakdown', category: 'Sales', icon: <PieChart className="w-4 h-4" />, size: 'half' as const },
  { id: 'top_performers', label: 'Top Performers', category: 'Sales', icon: <Trophy className="w-4 h-4" />, size: 'half' as const },
  
  // Forecasting & Goals
  { id: 'week_ahead_forecast', label: 'Revenue Forecast', category: 'Forecasting', icon: <TrendingUp className="w-4 h-4" />, size: 'full' as const },
  { id: 'goal_tracker', label: 'Goal Tracker', category: 'Forecasting', icon: <Target className="w-4 h-4" />, size: 'half' as const },
  { id: 'new_bookings', label: 'New Bookings', category: 'Forecasting', icon: <CalendarPlus className="w-4 h-4" />, size: 'half' as const },
  
  // Clients
  { id: 'client_funnel', label: 'Client Funnel', category: 'Clients', icon: <Users className="w-4 h-4" />, size: 'half' as const },
  
  // Operations & Capacity
  { id: 'operations_stats', label: 'Operations Stats', category: 'Operations', icon: <LayoutDashboard className="w-4 h-4" />, size: 'full' as const },
  { id: 'capacity_utilization', label: 'Capacity Utilization', category: 'Operations', icon: <Gauge className="w-4 h-4" />, size: 'full' as const },
  { id: 'stylist_workload', label: 'Stylist Workload', category: 'Operations', icon: <Briefcase className="w-4 h-4" />, size: 'half' as const },
  
  // Staffing
  { id: 'staffing_trends', label: 'Staffing Trends', category: 'Staffing', icon: <LineChart className="w-4 h-4" />, size: 'full' as const },
  { id: 'hiring_capacity', label: 'Hiring Capacity', category: 'Staffing', icon: <UserPlus className="w-4 h-4" />, size: 'half' as const },
];

// Size map for cards registered through the visibility system but not in PINNABLE_CARDS
const CARD_SIZE_OVERRIDES: Record<string, 'half' | 'full'> = {
  executive_summary: 'full',
  daily_brief: 'full',
  operational_health: 'half',
  locations_rollup: 'full',
  service_mix: 'half',
  retail_effectiveness: 'half',
  rebooking: 'half',
  client_health: 'half',
  client_experience_staff: 'full',
};

/** Returns the bento size hint for a pinned card. Defaults to 'full' for unknown cards. */
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
  const [isOpen, setIsOpen] = useState(false);
  
  // Get sections filtered by role
  const SECTIONS = useMemo(() => {
    const allSections = getSections();
    if (!roleContext) return allSections;
    return allSections.filter(section => {
      if (!section.isVisible) return true;
      return section.isVisible(roleContext);
    });
  }, [roleContext]);
  const { layout, isLoading, roleTemplate } = useDashboardLayout();
  const resetToDefault = useResetToDefault();
  const saveLayout = useSaveDashboardLayout();
  const { can } = usePermission();
  const canManageVisibility = can('manage_visibility_console');
  
  // Visibility data for pinned analytics
  const { data: visibilityData, isLoading: isLoadingVisibility } = useDashboardVisibility();
  const registerElement = useRegisterVisibilityElement();
  const [isTogglingPin, setIsTogglingPin] = useState(false);
  const queryClient = useQueryClient();

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Check if a card is pinned (visible for at least one leadership role)
  const leadershipRoles: AppRole[] = ['super_admin', 'admin', 'manager'];
  
  const isCardPinned = (cardId: string): boolean => {
    if (!visibilityData) return false;
    return leadershipRoles.some(role => 
      visibilityData.find(v => v.element_key === cardId && v.role === role)?.is_visible ?? false
    );
  };

  // Compute unified ordered items (sections + pinned cards inline)
  // This creates a single sortable list with both sections and pinned analytics
  const orderedUnifiedItems = useMemo(() => {
    const savedOrder = layout.sectionOrder || [];
    const sectionIds = SECTIONS.map(s => s.id);
    const pinnedCardIds = PINNABLE_CARDS.map(c => c.id).filter(id => isCardPinned(id));
    const pinnedEntries = pinnedCardIds.map(id => toPinnedEntry(id));
    
    // Build unified list from saved order
    const result: string[] = [];
    
    // Add items from saved order that are valid (either a section or a pinned card entry)
    for (const id of savedOrder) {
      if (sectionIds.includes(id)) {
        result.push(id);
      } else if (isPinnedCardEntry(id)) {
        const cardId = getPinnedCardId(id);
        if (isCardPinned(cardId)) {
          result.push(id);
        }
      }
    }
    
    // Add sections not in saved order
    for (const sectionId of sectionIds) {
      if (!result.includes(sectionId)) {
        result.push(sectionId);
      }
    }
    
    // Add pinned cards not in saved order (as pinned: entries)
    for (const entry of pinnedEntries) {
      if (!result.includes(entry)) {
        result.push(entry);
      }
    }
    
    return result;
  }, [layout.sectionOrder, SECTIONS, visibilityData]);

  // Compute ordered widgets
  const orderedWidgets = useMemo(() => {
    const savedOrder = layout.widgets || [];
    const allIds = WIDGETS.map(w => w.id);
    
    // Enabled widgets in saved order
    const enabled = savedOrder.filter(id => allIds.includes(id));
    
    // Disabled widgets
    const disabled = allIds.filter(id => !enabled.includes(id));
    
    return [...enabled, ...disabled];
  }, [layout.widgets]);
  
  // Get unpinned cards for the "pin more" section
  const unpinnedCards = useMemo(() => {
    return PINNABLE_CARDS.filter(card => !isCardPinned(card.id));
  }, [visibilityData]);
  
  // Get hubs filtered by user permission for customization
  const { hasPermission } = useAuth();
  const permittedHubs = useMemo(() => {
    return hubLinks.filter(hub => !hub.permission || hasPermission(hub.permission));
  }, [hasPermission]);
  
  // Compute ordered hubs from layout preferences
  const orderedHubs = useMemo(() => {
    const savedOrder = layout.hubOrder || [];
    const enabledHubs = layout.enabledHubs;
    const hubHrefs = permittedHubs.map(h => h.href);
    
    // Start with hubs in saved order that are still permitted
    const result = savedOrder.filter(href => hubHrefs.includes(href));
    
    // Add any permitted hubs not in saved order
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
    
    // Preserve current order (don't remove from sectionOrder)
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
    
    setIsTogglingPin(true);
    try {
      // Batch upsert all leadership roles at once
      const rows = leadershipRoles.map(role => ({
        element_key: cardId,
        element_name: card?.label || cardId,
        element_category: card?.category || 'Analytics Hub',
        role,
        is_visible: newIsVisible,
      }));

      const { error } = await supabase
        .from('dashboard_element_visibility')
        .upsert(rows, { onConflict: 'element_key,role' });

      if (error) throw error;

      // Invalidate visibility queries so UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
    } catch {
      // Error handled silently; layout update below still proceeds
    } finally {
      setIsTogglingPin(false);
    }
    
    // Update sectionOrder when pinning/unpinning
    if (newIsVisible) {
      // Add pinned entry to sectionOrder if not already there
      const pinnedEntry = toPinnedEntry(cardId);
      if (!orderedUnifiedItems.includes(pinnedEntry)) {
        const newSectionOrder = [...orderedUnifiedItems, pinnedEntry];
        const newPinnedCards = [...(layout.pinnedCards || []), cardId];
        saveLayout.mutate({ ...layout, pinnedCards: newPinnedCards, sectionOrder: newSectionOrder });
      }
    } else {
      // Remove pinned entry from sectionOrder
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
    
    // Update enabled sections (only regular sections, not pinned: entries)
    const enabledSections = newOrder.filter(id => !isPinnedCardEntry(id) && layout.sections.includes(id));
    
    // Update pinnedCards order (extract from pinned: entries)
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
    
    // Keep only enabled widgets in the layout, but respect new order
    const enabledWidgets = newOrder.filter(id => layout.widgets.includes(id));
    saveLayout.mutate({ ...layout, widgets: enabledWidgets });
  };

  const handleResetToDefault = () => {
    resetToDefault.mutate();
  };
  
  // Hub customization handlers
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
    
    // Preserve enabled state or default to all enabled
    const currentEnabled = layout.enabledHubs || permittedHubs.map(h => h.href);
    saveLayout.mutate({ ...layout, hubOrder: newOrder, enabledHubs: currentEnabled });
  };

  if (isLoading) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {variant === 'icon' ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Settings2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Settings2 className="w-4 h-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display tracking-wide flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5" />
            CUSTOMIZE DASHBOARD
          </SheetTitle>
          <SheetDescription>
            Drag to reorder, toggle to show/hide sections
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Unified Sections & Analytics List */}
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
                    // Check if this is a pinned analytics card
                    if (isPinnedCardEntry(itemId)) {
                      const cardId = getPinnedCardId(itemId);
                      const card = PINNABLE_CARDS.find(c => c.id === cardId);
                      if (!card) return null;
                      return (
                        <SortablePinnedCardItem
                          key={itemId}
                          id={itemId}
                          label={card.label}
                          icon={card.icon}
                          isPinned={true}
                          onToggle={() => handleTogglePinnedCard(cardId)}
                          isLoading={isTogglingPin}
                        />
                      );
                    }
                    
                    // Regular section
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

          {/* Quick Access Hubs - Leadership only */}
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
                          : true; // Default to enabled if no preference set
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


          {/* Widgets */}
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

          {/* Unpinned Analytics Section - Leadership only */}
          {roleContext?.isLeadership && unpinnedCards.length > 0 && (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">AVAILABLE ANALYTICS</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Toggle to pin analytics cards to your dashboard.
                </p>
                <div className="space-y-1">
                  {unpinnedCards.map(card => (
                    <SortablePinnedCardItem
                      key={card.id}
                      id={card.id}
                      label={card.label}
                      icon={card.icon}
                      isPinned={false}
                      onToggle={() => handleTogglePinnedCard(card.id)}
                      isLoading={isTogglingPin}
                    />
                  ))}
                </div>
                <Button variant="ghost" size={tokens.button.card} className="w-full gap-2 mt-4" asChild>
                  <Link to="/dashboard/admin/analytics" onClick={() => setIsOpen(false)}>
                    <BarChart3 className="w-4 h-4" />
                    View All in Analytics Hub
                  </Link>
                </Button>
              </div>

              <Separator />
            </>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={handleResetToDefault}
              disabled={resetToDefault.isPending}
            >
              <RotateCcw className="w-4 h-4" />
              {resetToDefault.isPending ? 'Resetting...' : 'Reset to Default'}
            </Button>

            {canManageVisibility && (
              <Button 
                variant="ghost" 
                className="w-full gap-2 text-muted-foreground"
                asChild
              >
                <Link to="/dashboard/admin/visibility" onClick={() => setIsOpen(false)}>
                  <Settings2 className="w-4 h-4" />
                  Open Visibility Console
                </Link>
              </Button>
            )}
          </div>

          {/* Template Info */}
          {roleTemplate && (
            <div className="text-xs text-muted-foreground text-center pt-2">
              Default template: {roleTemplate.display_name}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
