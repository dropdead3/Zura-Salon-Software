import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Save,
  Loader2,
  LayoutDashboard,
  Target,
  Trophy,
  Video,
  BarChart3,
  Users,
  FileText,
  Settings,
  Bell,
  CalendarClock,
  Contact,
  Globe,
  UserPlus,
  Shield,
  Quote,
  Images,
  Layers,
  MapPin,
  Cake,
  AlertTriangle,
  CreditCard,
  Camera,
  Briefcase,
  GraduationCap,
  HandHelping,
  CalendarDays,
  DollarSign,
  Scissors,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Check,
  X,
  FolderPlus,
  Crown,
  ChevronsDown,
  ChevronsUp,
  Flag,
  Wallet,
  ArrowLeftRight,
  Gift,
  Sparkles,
  HelpCircle,
  LayoutGrid,
  TrendingUp,
  Store,
  Terminal,
  Building2,
  Upload,
} from 'lucide-react';
import {
  useSidebarLayout,
  useUpdateSidebarLayout,
  DEFAULT_SECTION_ORDER,
  DEFAULT_LINK_ORDER,
  SECTION_LABELS,
  isBuiltInSection,
  type SidebarLayoutConfig,
  type CustomSectionConfig,
  type RoleVisibilityConfig,
} from '@/hooks/useSidebarLayout';
import { useRoles, Role } from '@/hooks/useRoles';
import { getRoleIconComponent } from '@/components/dashboard/RoleIconPicker';
import { SidebarPreview } from './SidebarPreview';

// Map hrefs to their labels and icons
const LINK_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  // Main
  '/dashboard': { label: 'Command Center', icon: LayoutDashboard },
  '/dashboard/schedule': { label: 'Schedule', icon: CalendarDays },
  
  // Growth
  '/dashboard/training': { label: 'Training', icon: Video },
  '/dashboard/program': { label: 'New-Client Engine Program', icon: Target },
  '/dashboard/admin/team': { label: 'Program Team Overview', icon: Users },
  '/dashboard/ring-the-bell': { label: 'Ring the Bell', icon: Bell },
  '/dashboard/my-graduation': { label: 'My Graduation', icon: GraduationCap },
  
  // Stats
  '/dashboard/stats': { label: 'Stats', icon: BarChart3 },
  '/dashboard/leaderboard': { label: 'Team Leaderboard', icon: Trophy },
  '/dashboard/my-pay': { label: 'My Pay', icon: Wallet },
  
  // Team Tools
  '/dashboard/shift-swaps': { label: 'Shift Swaps', icon: ArrowLeftRight },
  '/dashboard/rewards': { label: 'Rewards', icon: Gift },
  '/dashboard/assistant-schedule': { label: 'Assistant Schedule', icon: Users },
  '/dashboard/schedule-meeting': { label: 'Meetings & Accountability', icon: CalendarClock },
  
  // Housekeeping
  '/dashboard/onboarding': { label: 'Onboarding', icon: Users },
  '/dashboard/handbooks': { label: 'Handbooks', icon: FileText },
  '/dashboard/changelog': { label: "What's New", icon: Sparkles },
  '/dashboard/help': { label: 'Help Center', icon: HelpCircle },
  
  // Management
  '/dashboard/admin/management': { label: 'Management Hub', icon: LayoutGrid },
  '/dashboard/admin/analytics': { label: 'Analytics Hub', icon: TrendingUp },
  '/dashboard/directory': { label: 'Team Directory', icon: Contact },
  '/dashboard/clients': { label: 'Client Directory', icon: Users },
  '/dashboard/admin/payroll': { label: 'Hiring & Payroll Hub', icon: DollarSign },
  '/dashboard/admin/booth-renters': { label: 'Renter Hub', icon: Store },
  
  // Website
  '/dashboard/admin/website-sections': { label: 'Website Editor', icon: LayoutGrid },
  
  // Roles & Controls
  '/dashboard/admin/access-hub': { label: 'Roles & Controls Hub', icon: Shield },
  '/dashboard/admin/settings': { label: 'Settings', icon: Settings },
  
  // Platform
  '/dashboard/platform/overview': { label: 'Platform Overview', icon: Terminal },
  '/dashboard/platform/accounts': { label: 'Accounts', icon: Building2 },
  '/dashboard/platform/import': { label: 'Migrations', icon: Upload },
  '/dashboard/platform/revenue': { label: 'Revenue', icon: DollarSign },
  '/dashboard/platform/permissions': { label: 'Permissions', icon: Shield },
  '/dashboard/platform/settings': { label: 'Platform Settings', icon: Settings },
  
  // Legacy routes (kept for backward compatibility with saved layouts)
  '/dashboard/my-clients': { label: 'My Clients', icon: Users },
  '/dashboard/admin/sales': { label: 'Sales Dashboard', icon: DollarSign },
  '/dashboard/admin/operational-analytics': { label: 'Operational Analytics', icon: BarChart3 },
  '/dashboard/admin/birthdays': { label: 'Birthdays & Anniversaries', icon: Cake },
  '/dashboard/admin/onboarding-tracker': { label: 'Onboarding Hub', icon: Layers },
  '/dashboard/admin/client-engine-tracker': { label: 'Client Engine Tracker', icon: Target },
  '/dashboard/admin/recruiting': { label: 'Recruiting Pipeline', icon: Briefcase },
  '/dashboard/admin/graduation-tracker': { label: 'Graduation Tracker', icon: GraduationCap },
  '/dashboard/admin/assistant-requests': { label: 'Assistant Requests', icon: HandHelping },
  '/dashboard/admin/strikes': { label: 'Staff Strikes', icon: AlertTriangle },
  '/dashboard/admin/business-cards': { label: 'Business Cards', icon: CreditCard },
  '/dashboard/admin/headshots': { label: 'Headshots', icon: Camera },
  '/dashboard/admin/announcements': { label: 'Create Announcement', icon: Bell },
  '/dashboard/admin/homepage-stylists': { label: 'Homepage Stylists', icon: Globe },
  '/dashboard/admin/testimonials': { label: 'Testimonials', icon: Quote },
  '/dashboard/admin/gallery': { label: 'Gallery', icon: Images },
  '/dashboard/admin/services': { label: 'Services', icon: Scissors },
  '/dashboard/admin/locations': { label: 'Locations', icon: MapPin },
  '/dashboard/admin/challenges': { label: 'Team Challenges', icon: Trophy },
};

// Sortable Link Component with cross-section drag support
function SortableLink({ 
  href, 
  isHidden,
  onToggleVisibility,
  sectionId,
}: { 
  href: string;
  isHidden: boolean;
  onToggleVisibility: () => void;
  sectionId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: href,
    data: { type: 'link', sectionId, href }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = LINK_CONFIG[href];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border/50",
        isDragging && "opacity-50 ring-2 ring-primary",
        isHidden && "opacity-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility();
        }}
      >
        {isHidden ? (
          <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </Button>
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className={cn("text-sm flex-1", isHidden && "line-through text-muted-foreground")}>
        {config.label}
      </span>
      {isHidden && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          Hidden
        </Badge>
      )}
    </div>
  );
}

// Droppable Section Container for cross-section drops
function DroppableSection({ 
  sectionId, 
  children,
  isOver,
}: { 
  sectionId: string; 
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `droppable-${sectionId}`,
    data: { type: 'section', sectionId }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "space-y-2 min-h-[40px] transition-colors rounded-md p-1 -m-1",
        isOver && "bg-primary/10 ring-2 ring-primary/30"
      )}
    >
      {children}
    </div>
  );
}

// Static Link Display for DragOverlay
function LinkOverlay({ href }: { href: string }) {
  const config = LINK_CONFIG[href];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-primary shadow-lg">
      <GripVertical className="w-4 h-4 text-muted-foreground" />
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm">{config.label}</span>
    </div>
  );
}

// Section Component (non-sortable for links - links are sorted at parent level)
function SectionContainer({
  sectionId,
  sectionName,
  links,
  isExpanded,
  onToggle,
  isHidden,
  hiddenLinks,
  onToggleSectionVisibility,
  onToggleLinkVisibility,
  onBulkToggleLinks,
  isCustom,
  onRename,
  onDelete,
  isDropTarget,
  sectionDragHandleProps,
  sectionDragRef,
  sectionDragStyle,
  isDraggingSection,
}: {
  sectionId: string;
  sectionName: string;
  links: string[];
  isExpanded: boolean;
  onToggle: () => void;
  isHidden: boolean;
  hiddenLinks: string[];
  onToggleSectionVisibility: () => void;
  onToggleLinkVisibility: (href: string) => void;
  onBulkToggleLinks: (showAll: boolean) => void;
  isCustom: boolean;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  isDropTarget: boolean;
  sectionDragHandleProps: Record<string, unknown>;
  sectionDragRef: (node: HTMLElement | null) => void;
  sectionDragStyle: React.CSSProperties;
  isDraggingSection: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(sectionName);
  
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `droppable-${sectionId}`,
    data: { type: 'section', sectionId }
  });

  const handleSaveRename = () => {
    if (editName.trim() && onRename) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setEditName(sectionName);
    setIsEditing(false);
  };

  const visibleLinksCount = links.filter(l => !hiddenLinks.includes(l)).length;
  const allHidden = links.length > 0 && visibleLinksCount === 0;
  const allVisible = links.length > 0 && visibleLinksCount === links.length;

  return (
    <div
      ref={sectionDragRef}
      style={sectionDragStyle}
      className={cn(
        "border border-border rounded-lg overflow-hidden",
        isDraggingSection && "opacity-50 ring-2 ring-primary",
        isHidden && "opacity-60",
        isCustom && "border-primary/30"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className={cn(
            "flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 cursor-pointer transition-colors",
            isHidden && "bg-muted/30",
            isCustom && "bg-primary/5"
          )}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                {...sectionDragHandleProps}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSectionVisibility();
                }}
              >
                {isHidden ? (
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </Button>
              
              {isEditing ? (
                <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-sm font-display uppercase"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveRename}>
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelRename}>
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className={cn(
                    "font-display text-sm uppercase tracking-wider truncate",
                    isHidden && "line-through text-muted-foreground"
                  )}>
                    {sectionName}
                  </span>
                  {isCustom && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary shrink-0">
                      Custom
                    </Badge>
                  )}
                </>
              )}
              
              <Badge variant="secondary" className="text-xs shrink-0">
                {visibleLinksCount}/{links.length}
              </Badge>
              {isHidden && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/50 shrink-0">
                  Hidden
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {isCustom && !isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.();
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div 
            ref={setDroppableRef}
            className={cn(
              "p-3 bg-muted/30 border-t border-border space-y-2 min-h-[60px] transition-colors",
              isDropTarget && "bg-primary/10 ring-2 ring-inset ring-primary/30"
            )}
          >
            {/* Bulk toggle buttons */}
            {links.length > 0 && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                <span className="text-xs text-muted-foreground">Bulk:</span>
                <Button
                  variant="outline"
                  size={tokens.button.inline}
                  className="h-6 text-xs gap-1"
                  onClick={() => onBulkToggleLinks(true)}
                  disabled={allVisible}
                >
                  <Eye className="w-3 h-3" />
                  Show All
                </Button>
                <Button
                  variant="outline"
                  size={tokens.button.inline}
                  className="h-6 text-xs gap-1"
                  onClick={() => onBulkToggleLinks(false)}
                  disabled={allHidden}
                >
                  <EyeOff className="w-3 h-3" />
                  Hide All
                </Button>
              </div>
            )}
            
            {links.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No links in this section. Drag links here from other sections.
              </p>
            ) : (
              <SortableContext items={links} strategy={verticalListSortingStrategy}>
                {links.map((href) => (
                  <SortableLink 
                    key={href} 
                    href={href}
                    sectionId={sectionId}
                    isHidden={hiddenLinks.includes(href)}
                    onToggleVisibility={() => onToggleLinkVisibility(href)}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Wrapper to make section sortable
function SortableSection(props: Omit<Parameters<typeof SectionContainer>[0], 'sectionDragHandleProps' | 'sectionDragRef' | 'sectionDragStyle' | 'isDraggingSection'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: props.sectionId,
    data: { type: 'section-item', sectionId: props.sectionId }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SectionContainer
      {...props}
      sectionDragHandleProps={{ ...attributes, ...listeners }}
      sectionDragRef={setNodeRef}
      sectionDragStyle={style}
      isDraggingSection={isDragging}
    />
  );
}

interface SidebarLayoutEditorProps {
  // When provided, hides internal role selector and uses this role
  externalSelectedRole?: string;
}

export function SidebarLayoutEditor({ externalSelectedRole }: SidebarLayoutEditorProps = {}) {
  const { data: layout, isLoading } = useSidebarLayout();
  const { data: roles = [] } = useRoles();
  const updateLayout = useUpdateSidebarLayout();

  // Local state for editing
  const [localSectionOrder, setLocalSectionOrder] = useState<string[]>([]);
  const [localLinkOrder, setLocalLinkOrder] = useState<Record<string, string[]>>({});
  const [localHiddenSections, setLocalHiddenSections] = useState<string[]>([]);
  const [localHiddenLinks, setLocalHiddenLinks] = useState<Record<string, string[]>>({});
  const [localCustomSections, setLocalCustomSections] = useState<Record<string, CustomSectionConfig>>({});
  const [localRoleVisibility, setLocalRoleVisibility] = useState<Record<string, RoleVisibilityConfig>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);
  
  // Role selection - use external if provided, otherwise internal state
  const [internalSelectedRole, setInternalSelectedRole] = useState<string>('global');
  const selectedRole = externalSelectedRole ?? internalSelectedRole;
  const setSelectedRole = externalSelectedRole !== undefined ? () => {} : setInternalSelectedRole;
  
  // Track active drag item and drop target for cross-section drag
  const [activeDragItem, setActiveDragItem] = useState<{ id: string; type: 'link' | 'section'; sectionId?: string } | null>(null);
  const [dropTargetSection, setDropTargetSection] = useState<string | null>(null);

  // Initialize local state when layout loads
  useMemo(() => {
    if (layout && localSectionOrder.length === 0) {
      setLocalSectionOrder(layout.sectionOrder);
      setLocalLinkOrder(layout.linkOrder);
      setLocalHiddenSections(layout.hiddenSections || []);
      setLocalHiddenLinks(layout.hiddenLinks || {});
      setLocalCustomSections(layout.customSections || {});
      setLocalRoleVisibility(layout.roleVisibility || {});
    }
  }, [layout, localSectionOrder.length]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get current hidden sections/links based on selected role
  // Merge global hidden state with role-specific overrides so the editor
  // accurately reflects what users actually see in the sidebar
  const currentHiddenSections = useMemo(() => {
    if (selectedRole === 'global') {
      return localHiddenSections;
    }
    // Merge global hidden with role-specific hidden
    const roleHidden = localRoleVisibility[selectedRole]?.hiddenSections || [];
    return [...new Set([...localHiddenSections, ...roleHidden])];
  }, [selectedRole, localHiddenSections, localRoleVisibility]);

  const currentHiddenLinks = useMemo(() => {
    if (selectedRole === 'global') {
      return localHiddenLinks;
    }
    // Merge global hidden links with role-specific hidden links
    const roleHiddenLinks = localRoleVisibility[selectedRole]?.hiddenLinks || {};
    const merged: Record<string, string[]> = {};
    
    // Start with global hidden links
    Object.entries(localHiddenLinks).forEach(([sectionId, links]) => {
      merged[sectionId] = [...links];
    });
    
    // Add role-specific hidden links
    Object.entries(roleHiddenLinks).forEach(([sectionId, links]) => {
      if (merged[sectionId]) {
        merged[sectionId] = [...new Set([...merged[sectionId], ...links])];
      } else {
        merged[sectionId] = [...links];
      }
    });
    
    return merged;
  }, [selectedRole, localHiddenLinks, localRoleVisibility]);

  // Get section name (from SECTION_LABELS for built-in, from customSections for custom)
  const getSectionName = (sectionId: string): string => {
    if (isBuiltInSection(sectionId)) {
      return SECTION_LABELS[sectionId] || sectionId;
    }
    return localCustomSections[sectionId]?.name || sectionId;
  };

  // Unified drag start handler
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as { type: string; sectionId?: string } | undefined;
    
    if (data?.type === 'link') {
      setActiveDragItem({ id: active.id as string, type: 'link', sectionId: data.sectionId });
    } else if (data?.type === 'section-item') {
      setActiveDragItem({ id: active.id as string, type: 'section', sectionId: data.sectionId });
    }
  };
  
  // Track drag over for visual feedback
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setDropTargetSection(null);
      return;
    }
    
    const overData = over.data.current as { type: string; sectionId?: string } | undefined;
    
    // If dragging over a section droppable zone
    if (over.id.toString().startsWith('droppable-')) {
      setDropTargetSection(over.id.toString().replace('droppable-', ''));
    } else if (overData?.type === 'link') {
      // Dragging over another link - get its section
      setDropTargetSection(overData.sectionId || null);
    } else {
      setDropTargetSection(null);
    }
  };

  // Unified drag end handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDragItem(null);
    setDropTargetSection(null);
    
    if (!over) return;
    
    const activeData = active.data.current as { type: string; sectionId?: string } | undefined;
    const overData = over.data.current as { type: string; sectionId?: string } | undefined;
    
    // Handle section reordering
    if (activeData?.type === 'section-item') {
      if (active.id === over.id) return;
      const oldIndex = localSectionOrder.indexOf(active.id as string);
      const newIndex = localSectionOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        setLocalSectionOrder(arrayMove(localSectionOrder, oldIndex, newIndex));
        setHasChanges(true);
      }
      return;
    }
    
    // Handle link reordering/moving
    if (activeData?.type === 'link') {
      const activeHref = active.id as string;
      const sourceSectionId = activeData.sectionId!;
      
      let targetSectionId: string | null = null;
      let targetIndex = -1;
      
      // Determine target section
      if (over.id.toString().startsWith('droppable-')) {
        targetSectionId = over.id.toString().replace('droppable-', '');
        targetIndex = (localLinkOrder[targetSectionId] || []).length; // Add to end
      } else if (overData?.type === 'link') {
        targetSectionId = overData.sectionId || null;
        if (targetSectionId) {
          targetIndex = (localLinkOrder[targetSectionId] || []).indexOf(over.id as string);
        }
      }
      
      if (!targetSectionId) return;
      
      // Same section - just reorder
      if (sourceSectionId === targetSectionId) {
        const links = localLinkOrder[sourceSectionId] || [];
        const oldIndex = links.indexOf(activeHref);
        const newIndex = targetIndex !== -1 ? targetIndex : links.length;
        
        if (oldIndex !== -1 && oldIndex !== newIndex) {
          setLocalLinkOrder(prev => ({
            ...prev,
            [sourceSectionId]: arrayMove(links, oldIndex, newIndex),
          }));
          setHasChanges(true);
        }
      } else {
        // Cross-section move
        setLocalLinkOrder(prev => {
          const sourceLinks = [...(prev[sourceSectionId] || [])];
          const targetLinks = [...(prev[targetSectionId!] || [])];
          
          // Remove from source
          const sourceIndex = sourceLinks.indexOf(activeHref);
          if (sourceIndex !== -1) {
            sourceLinks.splice(sourceIndex, 1);
          }
          
          // Add to target at the correct position
          const insertIndex = targetIndex !== -1 ? targetIndex : targetLinks.length;
          targetLinks.splice(insertIndex, 0, activeHref);
          
          return {
            ...prev,
            [sourceSectionId]: sourceLinks,
            [targetSectionId!]: targetLinks,
          };
        });
        setHasChanges(true);
      }
    }
  };

  const handleLinksReorder = (sectionId: string, newLinks: string[]) => {
    setLocalLinkOrder((prev) => ({
      ...prev,
      [sectionId]: newLinks,
    }));
    setHasChanges(true);
  };

  const handleToggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleExpandAllSections = () => {
    setExpandedSections(new Set(localSectionOrder));
  };

  const handleCollapseAllSections = () => {
    setExpandedSections(new Set());
  };

  const handleToggleSectionVisibility = (sectionId: string) => {
    if (selectedRole === 'global') {
      setLocalHiddenSections((prev) => {
        if (prev.includes(sectionId)) {
          return prev.filter(s => s !== sectionId);
        }
        return [...prev, sectionId];
      });
    } else {
      setLocalRoleVisibility((prev) => {
        const roleConfig = prev[selectedRole] || { hiddenSections: [], hiddenLinks: {} };
        const hiddenSections = roleConfig.hiddenSections || [];
        
        return {
          ...prev,
          [selectedRole]: {
            ...roleConfig,
            hiddenSections: hiddenSections.includes(sectionId)
              ? hiddenSections.filter(s => s !== sectionId)
              : [...hiddenSections, sectionId],
          },
        };
      });
    }
    setHasChanges(true);
  };

  const handleToggleLinkVisibility = (sectionId: string, href: string) => {
    if (selectedRole === 'global') {
      setLocalHiddenLinks((prev) => {
        const sectionLinks = prev[sectionId] || [];
        if (sectionLinks.includes(href)) {
          return {
            ...prev,
            [sectionId]: sectionLinks.filter(l => l !== href),
          };
        }
        return {
          ...prev,
          [sectionId]: [...sectionLinks, href],
        };
      });
    } else {
      setLocalRoleVisibility((prev) => {
        const roleConfig = prev[selectedRole] || { hiddenSections: [], hiddenLinks: {} };
        const hiddenLinks = roleConfig.hiddenLinks || {};
        const sectionLinks = hiddenLinks[sectionId] || [];
        
        return {
          ...prev,
          [selectedRole]: {
            ...roleConfig,
            hiddenLinks: {
              ...hiddenLinks,
              [sectionId]: sectionLinks.includes(href)
                ? sectionLinks.filter(l => l !== href)
                : [...sectionLinks, href],
            },
          },
        };
      });
    }
    setHasChanges(true);
  };

  const handleBulkToggleLinks = (sectionId: string, showAll: boolean) => {
    const links = localLinkOrder[sectionId] || [];
    
    if (selectedRole === 'global') {
      setLocalHiddenLinks((prev) => ({
        ...prev,
        [sectionId]: showAll ? [] : [...links],
      }));
    } else {
      setLocalRoleVisibility((prev) => {
        const roleConfig = prev[selectedRole] || { hiddenSections: [], hiddenLinks: {} };
        return {
          ...prev,
          [selectedRole]: {
            ...roleConfig,
            hiddenLinks: {
              ...roleConfig.hiddenLinks,
              [sectionId]: showAll ? [] : [...links],
            },
          },
        };
      });
    }
    setHasChanges(true);
  };

  const handleAddCustomSection = () => {
    if (!newSectionName.trim()) return;
    
    const sectionId = `custom-${Date.now()}`;
    setLocalCustomSections((prev) => ({
      ...prev,
      [sectionId]: { name: newSectionName.trim() },
    }));
    setLocalSectionOrder((prev) => [...prev, sectionId]);
    setLocalLinkOrder((prev) => ({
      ...prev,
      [sectionId]: [],
    }));
    setNewSectionName('');
    setIsAddingSection(false);
    setHasChanges(true);
    setExpandedSections((prev) => new Set([...prev, sectionId]));
  };

  const handleRenameSection = (sectionId: string, newName: string) => {
    setLocalCustomSections((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], name: newName },
    }));
    setHasChanges(true);
  };

  const handleDeleteSection = (sectionId: string) => {
    const linksToRedistribute = localLinkOrder[sectionId] || [];
    
    setLocalSectionOrder((prev) => prev.filter(id => id !== sectionId));
    
    setLocalCustomSections((prev) => {
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
    
    setLocalLinkOrder((prev) => {
      const next = { ...prev };
      delete next[sectionId];
      
      linksToRedistribute.forEach((href) => {
        const originalSection = Object.entries(DEFAULT_LINK_ORDER).find(([, links]) => 
          links.includes(href)
        )?.[0];
        
        if (originalSection && next[originalSection]) {
          if (!next[originalSection].includes(href)) {
            next[originalSection] = [...next[originalSection], href];
          }
        }
      });
      
      return next;
    });
    
    setLocalHiddenSections((prev) => prev.filter(id => id !== sectionId));
    
    setLocalHiddenLinks((prev) => {
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
    
    // Also clean up role visibility
    setLocalRoleVisibility((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((role) => {
        if (next[role].hiddenSections) {
          next[role].hiddenSections = next[role].hiddenSections.filter(id => id !== sectionId);
        }
        if (next[role].hiddenLinks?.[sectionId]) {
          delete next[role].hiddenLinks[sectionId];
        }
      });
      return next;
    });
    
    setHasChanges(true);
  };

  const handleResetRoleToGlobal = (roleName: string) => {
    setLocalRoleVisibility((prev) => {
      const next = { ...prev };
      delete next[roleName];
      return next;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    updateLayout.mutate({
      sectionOrder: localSectionOrder,
      linkOrder: localLinkOrder,
      hiddenSections: localHiddenSections,
      hiddenLinks: localHiddenLinks,
      customSections: localCustomSections,
      roleVisibility: localRoleVisibility,
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSectionOrder(DEFAULT_SECTION_ORDER);
    setLocalLinkOrder(DEFAULT_LINK_ORDER);
    setLocalHiddenSections([]);
    setLocalHiddenLinks({});
    setLocalCustomSections({});
    setLocalRoleVisibility({});
    setSelectedRole('global');
    setHasChanges(true);
  };

  // Get role icon component
  const getRoleIcon = (role: Role | null) => {
    if (!role) return Shield;
    if (role.name === 'super_admin') return Crown;
    return getRoleIconComponent(role.icon || 'shield');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-lg">SIDEBAR NAVIGATION</CardTitle>
            <CardDescription>
              Customize sidebar layout and per-role visibility. Global settings apply to all; role overrides hide additional items.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size={tokens.button.card}
              onClick={handleReset}
              disabled={updateLayout.isPending}
              className="gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <Button
              size={tokens.button.card}
              onClick={handleSave}
              disabled={!hasChanges || updateLayout.isPending}
              className="gap-1.5"
            >
              {updateLayout.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Selector Tabs - only show if not controlled externally */}
        {externalSelectedRole === undefined && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Visibility Mode
            </p>
            <Tabs value={selectedRole} onValueChange={setInternalSelectedRole}>
              <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50">
                <TabsTrigger 
                  value="global" 
                  className="gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Global
                </TabsTrigger>
                {roles.map((role) => {
                  const RoleIcon = getRoleIcon(role);
                  const hasOverrides = localRoleVisibility[role.name]?.hiddenSections?.length || 
                    Object.values(localRoleVisibility[role.name]?.hiddenLinks || {}).some(l => l.length > 0);
                  
                  return (
                    <Tooltip key={role.id}>
                      <TooltipTrigger asChild>
                        <span>
                          <TabsTrigger 
                            value={role.name} 
                            className={cn(
                              "gap-1.5",
                              hasOverrides && "ring-1 ring-primary/50"
                            )}
                          >
                            <RoleIcon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{role.display_name}</span>
                            {hasOverrides && (
                              <Badge variant="secondary" className="h-4 w-4 p-0 text-[9px] flex items-center justify-center">
                                ✓
                              </Badge>
                            )}
                          </TabsTrigger>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {role.display_name}
                        {hasOverrides && ' (has overrides)'}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TabsList>
            </Tabs>
            {selectedRole !== 'global' && (
              <div className="flex items-center justify-between gap-2 bg-muted/50 rounded px-2 py-1">
                <p className="text-xs text-muted-foreground">
                  Editing visibility for <strong>{roles.find(r => r.name === selectedRole)?.display_name || selectedRole}</strong>. 
                  Items hidden here will be hidden for users with this role.
                </p>
                <Button
                  variant="outline"
                  size={tokens.button.inline}
                  className="h-6 text-xs gap-1 shrink-0"
                  onClick={() => handleResetRoleToGlobal(selectedRole)}
                  disabled={!localRoleVisibility[selectedRole]?.hiddenSections?.length && 
                    !Object.values(localRoleVisibility[selectedRole]?.hiddenLinks || {}).some(l => l.length > 0)}
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to Global
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Role hint when controlled externally */}
        {externalSelectedRole !== undefined && (
          <div className="flex items-center justify-between gap-2 bg-muted/50 rounded px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Editing navigation for <strong>{roles.find(r => r.name === selectedRole)?.display_name || selectedRole}</strong>. 
              Items hidden here will be hidden for users with this role.
            </p>
            <Button
              variant="outline"
              size={tokens.button.inline}
              className="h-6 text-xs gap-1 shrink-0"
              onClick={() => handleResetRoleToGlobal(selectedRole)}
              disabled={!localRoleVisibility[selectedRole]?.hiddenSections?.length && 
                !Object.values(localRoleVisibility[selectedRole]?.hiddenLinks || {}).some(l => l.length > 0)}
            >
              <RotateCcw className="w-3 h-3" />
              Reset to Global
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Editor {selectedRole !== 'global' && `(${roles.find(r => r.name === selectedRole)?.display_name})`}
              </p>
              <div className="flex items-center gap-2">
                {/* Expand/Collapse All buttons */}
                <Button
                  variant="outline"
                  size={tokens.button.inline}
                  onClick={handleExpandAllSections}
                  disabled={expandedSections.size === localSectionOrder.length}
                  className="gap-1.5 text-xs"
                >
                  <ChevronsDown className="w-3.5 h-3.5" />
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size={tokens.button.inline}
                  onClick={handleCollapseAllSections}
                  disabled={expandedSections.size === 0}
                  className="gap-1.5 text-xs"
                >
                  <ChevronsUp className="w-3.5 h-3.5" />
                  Collapse All
                </Button>

                {/* Add Section button (only in global mode) */}
                {selectedRole === 'global' && !isAddingSection ? (
                  <Button
                    variant="outline"
                    size={tokens.button.inline}
                    onClick={() => setIsAddingSection(true)}
                    className="gap-1.5 text-xs"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    Add Section
                  </Button>
                ) : selectedRole === 'global' && isAddingSection ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="Section name..."
                      className="h-7 w-32 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCustomSection();
                        if (e.key === 'Escape') {
                          setIsAddingSection(false);
                          setNewSectionName('');
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleAddCustomSection}
                      disabled={!newSectionName.trim()}
                    >
                      <Check className="w-3.5 h-3.5 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setIsAddingSection(false);
                        setNewSectionName('');
                      }}
                    >
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={localSectionOrder} strategy={verticalListSortingStrategy}>
                {localSectionOrder.map((sectionId) => (
                  <SortableSection
                    key={sectionId}
                    sectionId={sectionId}
                    sectionName={getSectionName(sectionId)}
                    links={localLinkOrder[sectionId] || []}
                    isExpanded={expandedSections.has(sectionId)}
                    onToggle={() => handleToggleSection(sectionId)}
                    isHidden={currentHiddenSections.includes(sectionId)}
                    hiddenLinks={currentHiddenLinks[sectionId] || []}
                    onToggleSectionVisibility={() => handleToggleSectionVisibility(sectionId)}
                    onToggleLinkVisibility={(href) => handleToggleLinkVisibility(sectionId, href)}
                    onBulkToggleLinks={(showAll) => handleBulkToggleLinks(sectionId, showAll)}
                    isCustom={!isBuiltInSection(sectionId)}
                    isDropTarget={dropTargetSection === sectionId && activeDragItem?.sectionId !== sectionId}
                    onRename={!isBuiltInSection(sectionId) && selectedRole === 'global' 
                      ? (name) => handleRenameSection(sectionId, name) 
                      : undefined}
                    onDelete={!isBuiltInSection(sectionId) && selectedRole === 'global' 
                      ? () => handleDeleteSection(sectionId) 
                      : undefined}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeDragItem?.type === 'link' ? <LinkOverlay href={activeDragItem.id} /> : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Preview Panel */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Live Preview {selectedRole !== 'global' && `(${roles.find(r => r.name === selectedRole)?.display_name})`}
            </p>
            <SidebarPreview
              sectionOrder={localSectionOrder}
              linkOrder={localLinkOrder}
              hiddenSections={currentHiddenSections}
              hiddenLinks={currentHiddenLinks}
              customSections={localCustomSections}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
