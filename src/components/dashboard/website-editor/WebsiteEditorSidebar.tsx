import { useMemo, useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { writeSiteSettingDraft, fetchSiteSetting } from '@/lib/siteSettingsDraft';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

import { toast } from 'sonner';
import {
  Scissors,
  MessageSquareQuote,
  Images,
  Users,
  MapPin,
  Megaphone,
  MousePointerClick,
  PanelBottom,
  Plus,
  Trash2,
  FileText,
  LayoutTemplate,
  ChevronsRight,
  ChevronsLeft,
  Layers,
  EyeOff,
  Eye,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useWebsiteSections,
  useUpdateWebsiteSections,
  SECTION_LABELS,
  SECTION_DESCRIPTIONS,
  isBuiltinSection,
  generateSectionId,
  CUSTOM_TYPE_INFO,
  type SectionConfig,
  type BuiltinSectionType,
  type CustomSectionType,
} from '@/hooks/useWebsiteSections';
import { useWebsitePages } from '@/hooks/useWebsitePages';
import { useEditorSidebarPrefs } from '@/hooks/useEditorSidebarPrefs';
import { SectionNavItem } from './SectionNavItem';
import { SectionGroupHeader } from './SectionGroupHeader';
import { ContentNavItem } from './ContentNavItem';
import { WebsiteEditorSearch } from './WebsiteEditorSearch';
import { AddSectionDialog } from './AddSectionDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Site-wide & content-library items (data managers — not part of any page's
// section ordering). Grouped by intent so the editor sidebar reads as a
// hierarchy not a flat list. Each group carries an explanatory caption that
// reinforces what makes it different from the page-section list above it.
//
// "Pages" is intentionally NOT in this list: page selection lives in the
// toolbar picker at the top of the rail (avoid duplicating that affordance).
type SiteContentItem = {
  tab: string;
  label: string;
  description: string;
  icon: typeof Megaphone;
};

const SITE_CONTENT_GROUPS: { title: string; caption: string; items: SiteContentItem[] }[] = [
  {
    title: 'Site Chrome',
    caption: 'Applies to every page',
    items: [
      { tab: 'banner', label: 'Announcement Bar', description: 'Site-wide top banner', icon: Megaphone },
      { tab: 'navigation', label: 'Navigation', description: 'Header & footer menus', icon: Layers },
      { tab: 'footer-cta', label: 'Footer CTA', description: 'Pre-footer call to action', icon: MousePointerClick },
      { tab: 'footer', label: 'Footer', description: 'Footer links, social & copyright', icon: PanelBottom },
    ],
  },
  {
    title: 'Content Library',
    caption: 'Reusable data, not layout',
    items: [
      { tab: 'services', label: 'Services', description: 'Manage service catalog', icon: Scissors },
      { tab: 'testimonials', label: 'Testimonials', description: 'Manage client reviews', icon: MessageSquareQuote },
      { tab: 'gallery', label: 'Gallery', description: 'Manage portfolio images', icon: Images },
      { tab: 'stylists', label: 'Stylists', description: 'Manage team profiles', icon: Users },
      { tab: 'locations', label: 'Locations', description: 'Manage salon locations', icon: MapPin },
    ],
  },
];

// Flattened list — used for the collapsed icon rail and lookups.
const SITE_CONTENT_ITEMS: SiteContentItem[] = SITE_CONTENT_GROUPS.flatMap((g) => g.items);

// Map built-in section IDs to UNIQUE tab values
const BUILTIN_SECTION_TO_TAB: Record<BuiltinSectionType, string> = {
  hero: 'hero',
  brand_statement: 'brand',
  testimonials: 'testimonials-section',
  services_preview: 'services-preview',
  popular_services: 'popular-services',
  gallery: 'gallery-section',
  new_client: 'new-client',
  stylists: 'stylists-section',
  locations: 'locations-section',
  faq: 'faq',
  extensions: 'extensions',
  brands: 'brands',
  drink_menu: 'drinks',
};

function getSectionTab(section: SectionConfig): string {
  if (isBuiltinSection(section.type)) {
    return BUILTIN_SECTION_TO_TAB[section.type];
  }
  return `custom-${section.id}`;
}

// Homepage section groupings for logical organization (built-in only)
const SECTION_GROUPS: { title: string; sectionTypes: BuiltinSectionType[] }[] = [
  { title: 'Above the Fold', sectionTypes: ['hero', 'brand_statement'] },
  { title: 'Social Proof', sectionTypes: ['testimonials', 'brands'] },
  { title: 'Services & Portfolio', sectionTypes: ['services_preview', 'popular_services', 'extensions', 'gallery'] },
  { title: 'Conversion', sectionTypes: ['new_client', 'faq'] },
  { title: 'Team & Extras', sectionTypes: ['stylists', 'locations', 'drink_menu'] },
];

interface WebsiteEditorSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSectionsChange?: (sections: SectionConfig[]) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  selectedPageId?: string;
  onPageChange?: (pageId: string) => void;
  onAddPage?: () => void;
  onDeletePage?: (pageId: string) => void;
  onApplyPageTemplate?: () => void;
  // Non-home page section operations
  onPageSectionToggle?: (sectionId: string, enabled: boolean) => void;
  onPageSectionReorder?: (sections: SectionConfig[]) => void;
  onPageSectionDelete?: (sectionId: string) => void;
  onPageSectionDuplicate?: (section: SectionConfig) => void;
  onPageSectionAdd?: (type: CustomSectionType, label: string) => void;
}

export function WebsiteEditorSidebar({
  activeTab,
  onTabChange,
  onSectionsChange,
  collapsed = false,
  onToggleCollapse,
  selectedPageId = 'home',
  onPageChange,
  onAddPage,
  onDeletePage,
  onApplyPageTemplate,
  onPageSectionToggle,
  onPageSectionReorder,
  onPageSectionDelete,
  onPageSectionDuplicate,
  onPageSectionAdd,
}: WebsiteEditorSidebarProps) {
  const { data: sectionsConfig, isLoading } = useWebsiteSections();
  const { data: pagesConfig } = useWebsitePages();
  const updateSections = useUpdateWebsiteSections();
  const orgId = useSettingsOrgId();
  const { isCollapsed: isGroupCollapsed, toggleGroup } = useEditorSidebarPrefs(orgId);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SectionConfig | null>(null);
  const [hiddenSectionsOpen, setHiddenSectionsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const orderedSections = useMemo<SectionConfig[]>(() => {
    if (!sectionsConfig?.homepage) return [];
    return [...sectionsConfig.homepage].sort((a, b) => a.order - b.order);
  }, [sectionsConfig]);

  const [localSections, setLocalSections] = useState<SectionConfig[]>([]);

  useEffect(() => {
    if (orderedSections.length > 0) {
      setLocalSections(orderedSections);
    }
  }, [orderedSections]);

  const builtinSections = useMemo(() => localSections.filter(s => isBuiltinSection(s.type)), [localSections]);
  const customSections = useMemo(() => localSections.filter(s => !isBuiltinSection(s.type)), [localSections]);

  // --- Homepage section operations ---
  const saveSections = async (newSections: SectionConfig[]) => {
    if (!sectionsConfig) return;
    const reordered = newSections.map((s, i) => ({ ...s, order: i + 1 }));
    setLocalSections(reordered);
    onSectionsChange?.(reordered);
    try {
      await updateSections.mutateAsync({ homepage: reordered });
    } catch {
      toast.error('Failed to save');
      setLocalSections(orderedSections);
    }
  };

  const handleToggleSection = async (sectionId: string, enabled: boolean) => {
    const newSections = localSections.map(s =>
      s.id === sectionId ? { ...s, enabled } : s
    );
    setLocalSections(newSections);
    onSectionsChange?.(newSections);
    try {
      await updateSections.mutateAsync({ homepage: newSections });
      const label = newSections.find(s => s.id === sectionId)?.label ?? 'Section';
      toast.success(`${label} ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update section');
      setLocalSections(orderedSections);
    }
  };

  // ── Live reflow during drag ──
  // Posts the in-flight order to the preview iframe via a parent CustomEvent
  // bridge, so the canvas reflows the moment the operator drags — not on drop.
  // Commit is debounced server-side via saveSections() on drop.
  const emitProvisional = (pageId: string, order: string[]) => {
    window.dispatchEvent(
      new CustomEvent('editor-provisional-order', { detail: { pageId, order } }),
    );
  };
  const emitCommit = (pageId: string, order: string[]) => {
    window.dispatchEvent(
      new CustomEvent('editor-commit-order', { detail: { pageId, order } }),
    );
  };

  const handleDragOver = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localSections.findIndex(s => s.id === active.id);
    const newIndex = localSections.findIndex(s => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const provisional = arrayMove(localSections, oldIndex, newIndex);
    emitProvisional('home', provisional.map(s => s.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localSections.findIndex(s => s.id === active.id);
    const newIndex = localSections.findIndex(s => s.id === over.id);
    const reordered = arrayMove(localSections, oldIndex, newIndex);
    // Send commit BEFORE save so the iframe locks in provisional layer
    // (prevents a snap-back to stale cached order while the save round-trips).
    emitCommit('home', reordered.map(s => s.id));
    await saveSections(reordered);
    // Soft-reload the iframe so it rehydrates from the new canonical order;
    // this is what naturally clears the provisional layer.
    window.dispatchEvent(new CustomEvent('website-preview-refresh'));
    toast.success('Section order updated');
  };

  const handleAddSection = async (type: CustomSectionType, label: string) => {
    if (!isHomePage && onPageSectionAdd) {
      onPageSectionAdd(type, label);
      return;
    }
    const newSection: SectionConfig = {
      id: generateSectionId(),
      type,
      label,
      description: CUSTOM_TYPE_INFO[type].description,
      enabled: true,
      order: localSections.length + 1,
      deletable: true,
    };
    const newSections = [...localSections, newSection];
    await saveSections(newSections);
    toast.success(`"${label}" added`);
    onTabChange(`custom-${newSection.id}`);
  };

  const handleAddFromTemplate = async (template: import('@/data/section-templates').SectionTemplate) => {
    const newSection: SectionConfig = {
      id: generateSectionId(),
      type: template.section_type as CustomSectionType,
      label: template.name,
      description: template.description,
      enabled: true,
      order: (isHomePage ? localSections.length : (selectedPage?.sections.length ?? 0)) + 1,
      deletable: true,
      style_overrides: template.style_overrides,
    };

    if (!isHomePage && onPageSectionAdd) {
      // For non-home pages, we use the page section add handler
      onPageSectionAdd(template.section_type as CustomSectionType, template.name);
      return;
    }

    const newSections = [...localSections, newSection];
    await saveSections(newSections);

    // Also save the template's default config as the section content.
    // Draft-only — Publish promotes to live so visitors don't see new
    // template content before the operator finishes editing.
    const settingsKey = `section_custom_${newSection.id}`;
    const { data: { user } } = await supabase.auth.getUser();
    if (orgId) {
      await writeSiteSettingDraft(orgId, settingsKey, template.default_config, user?.id ?? null);
    }

    toast.success(`"${template.name}" added from template`);
    onTabChange(`custom-${newSection.id}`);
  };

  const handleDeleteSection = async () => {
    if (!deleteTarget) return;
    const newSections = localSections.filter(s => s.id !== deleteTarget.id);
    await saveSections(newSections);
    
    const settingsKey = `section_custom_${deleteTarget.id}`;
    supabase.from('site_settings').delete().eq('id', settingsKey).eq('organization_id', orgId).then(() => {});
    
    toast.success(`"${deleteTarget.label}" deleted`);
    setDeleteTarget(null);
    if (activeTab === `custom-${deleteTarget.id}` && newSections.length > 0) {
      onTabChange(getSectionTab(newSections[0]));
    }
  };

  const handleDuplicateSection = async (section: SectionConfig) => {
    const newId = generateSectionId();
    const newSection: SectionConfig = {
      ...section,
      id: newId,
      label: `${section.label} (Copy)`,
      order: localSections.length + 1,
      deletable: true,
    };
    const newSections = [...localSections, newSection];
    await saveSections(newSections);

    // Copy the custom section config if it exists. Read draft so the
    // operator's in-progress edits are duplicated, not the last-published
    // version. Write to draft so the duplicate isn't live until publish.
    const sourceKey = `section_custom_${section.id}`;
    const destKey = `section_custom_${newId}`;
    if (orgId) {
      const sourceValue = await fetchSiteSetting<Record<string, unknown>>(orgId, sourceKey, 'draft');
      if (sourceValue) {
        const { data: { user } } = await supabase.auth.getUser();
        await writeSiteSettingDraft(orgId, destKey, sourceValue, user?.id ?? null);
      }
    }

    toast.success(`"${section.label}" duplicated`);
    onTabChange(`custom-${newId}`);
  };

  const getBuiltinSection = (type: BuiltinSectionType): SectionConfig | undefined => {
    return localSections.find(s => s.type === type);
  };

  const isHomePage = selectedPageId === 'home';
  const selectedPage = pagesConfig?.pages.find(p => p.id === selectedPageId);

  // --- Non-home page sections with DnD ---
  const [localPageSections, setLocalPageSections] = useState<SectionConfig[]>([]);

  useEffect(() => {
    if (!isHomePage && selectedPage) {
      setLocalPageSections([...selectedPage.sections].sort((a, b) => a.order - b.order));
    }
  }, [isHomePage, selectedPage]);

  const handlePageDragOver = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localPageSections.findIndex(s => s.id === active.id);
    const newIndex = localPageSections.findIndex(s => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const provisional = arrayMove(localPageSections, oldIndex, newIndex);
    emitProvisional(selectedPageId, provisional.map(s => s.id));
  };

  const handlePageDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localPageSections.findIndex(s => s.id === active.id);
    const newIndex = localPageSections.findIndex(s => s.id === over.id);
    const reordered = arrayMove(localPageSections, oldIndex, newIndex).map((s, i) => ({ ...s, order: i + 1 }));
    setLocalPageSections(reordered);
    emitCommit(selectedPageId, reordered.map(s => s.id));
    onPageSectionReorder?.(reordered);
    // Soft-reload iframe so it rehydrates with the canonical order.
    window.dispatchEvent(new CustomEvent('website-preview-refresh'));
    toast.success('Section order updated');
  };

  // Non-home page delete target
  const [pageDeleteTarget, setPageDeleteTarget] = useState<SectionConfig | null>(null);


  if (collapsed) {
    // Collapsed rail prioritises the *page section* icons (the primary
    // editing surface) and tucks chrome/library into one expand affordance.
    const collapsedSections = isHomePage ? localSections : localPageSections;
    return (
      <div className="h-full flex flex-col bg-card/60 backdrop-blur-xl border-r border-border/50 py-2 w-full">
        {/* Expand toggle */}
        <div className="px-2 mb-2 pb-2 border-b border-border/40">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
                aria-label="Expand sidebar"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>

        {/* Page section icons — the primary editing surface */}
        <ScrollArea className="flex-1">
          <div className="px-2 space-y-0.5">
            {collapsedSections.map((section) => {
              const tab = isHomePage ? getSectionTab(section) : `custom-${section.id}`;
              const isActive = activeTab === tab;
              return (
                <Tooltip key={section.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onTabChange(tab)}
                      className={cn(
                        'w-full flex items-center justify-center p-2 rounded-lg transition-colors text-[10px] font-medium tabular-nums',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted/60 text-muted-foreground',
                        !section.enabled && 'opacity-40',
                      )}
                    >
                      {section.order}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {section.label}
                    {!section.enabled && ' (hidden)'}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <Separator className="my-2 mx-2" />

          {/* Site chrome + library — secondary in collapsed mode */}
          <div className="px-2 space-y-0.5">
            {SITE_CONTENT_ITEMS.map((item) => (
              <ContentNavItem
                key={item.tab}
                label={item.label}
                icon={item.icon}
                isActive={activeTab === item.tab}
                onSelect={() => onTabChange(item.tab)}
                collapsed
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card/60 backdrop-blur-xl border-r border-border/50">
      {/* Page actions — picker lives in the toolbar; this block surfaces page-scoped actions only */}
      {(!isHomePage || onAddPage) && (
        <div className="p-3 border-b border-border/40 space-y-2">
          {!isHomePage && selectedPage ? (
            <>
              <p className="text-[10px] font-medium text-muted-foreground font-display uppercase tracking-wider px-1 truncate">
                {selectedPage.title}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size={tokens.button.inline}
                  className="h-7 text-xs flex-1"
                  onClick={() => onTabChange('page-settings')}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Settings
                </Button>
                {onApplyPageTemplate && (
                  <Button
                    variant="ghost"
                    size={tokens.button.inline}
                    className="h-7 text-xs flex-1"
                    onClick={onApplyPageTemplate}
                  >
                    <LayoutTemplate className="h-3 w-3 mr-1" />
                    Templates
                  </Button>
                )}
                {selectedPage.deletable && (
                  <Button
                    variant="ghost"
                    size={tokens.button.inline}
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => onDeletePage?.(selectedPageId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            onAddPage && (
              <Button
                variant="ghost"
                size={tokens.button.inline}
                className="h-8 w-full justify-start text-xs"
                onClick={onAddPage}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Page
              </Button>
            )
          )}
        </div>
      )}

      {/* Search + collapse — single row reclaims ~44px of vertical real estate */}
      <div className="p-3 border-b flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <WebsiteEditorSearch onSelectResult={onTabChange} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleCollapse}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Collapse sidebar (⌘\)</TooltipContent>
        </Tooltip>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {isHomePage && (
            <>
              {SITE_CONTENT_GROUPS.map((group, groupIndex) => (
                <div key={group.title}>
                  {groupIndex > 0 && <Separator className="my-2 mx-3" />}
                  <SectionGroupHeader title={group.title} />
                  <div className="space-y-0.5 mb-2">
                    {group.items.map((item) => (
                      <ContentNavItem
                        key={item.tab}
                        label={item.label}
                        description={item.description}
                        icon={item.icon}
                        isActive={activeTab === item.tab}
                        onSelect={() => onTabChange(item.tab)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <Separator className="my-3 mx-3" />
            </>
          )}

          {/* Homepage Sections (with DND) - only show for home page */}
          {isHomePage && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              <SortableContext items={localSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="mb-1">
                  <p className="px-4 py-1 text-[10px] font-medium text-muted-foreground font-display uppercase tracking-wider">
                    Homepage Layout
                  </p>
                </div>

                {/* Built-in section groups */}
                {SECTION_GROUPS.map((group, groupIndex) => {
                  const groupSections = group.sectionTypes
                    .map(type => getBuiltinSection(type))
                    .filter(Boolean) as SectionConfig[];
                  if (groupSections.length === 0) return null;
                  return (
                    <div key={group.title}>
                      {groupIndex > 0 && <Separator className="my-2 mx-3" />}
                      <SectionGroupHeader title={group.title} />
                      {groupSections.map(section => (
                        <SectionNavItem
                          key={section.id}
                          id={section.id}
                          label={section.label}
                          description={section.description}
                          order={section.order}
                          enabled={section.enabled}
                          isActive={activeTab === getSectionTab(section)}
                          onSelect={() => onTabChange(getSectionTab(section))}
                          onToggle={(enabled) => handleToggleSection(section.id, enabled)}
                          onDuplicate={() => handleDuplicateSection(section)}
                        />
                      ))}
                    </div>
                  );
                })}

                {/* Custom sections */}
                {customSections.length > 0 && (
                  <>
                    <Separator className="my-2 mx-3" />
                    <SectionGroupHeader title="Custom Sections" />
                    {customSections.map(section => (
                      <SectionNavItem
                        key={section.id}
                        id={section.id}
                        label={section.label}
                        description={section.description}
                        order={section.order}
                        enabled={section.enabled}
                        isActive={activeTab === `custom-${section.id}`}
                        onSelect={() => onTabChange(`custom-${section.id}`)}
                        onToggle={(enabled) => handleToggleSection(section.id, enabled)}
                        deletable
                        onDelete={() => setDeleteTarget(section)}
                        onDuplicate={() => handleDuplicateSection(section)}
                      />
                    ))}
                  </>
                )}
              </SortableContext>
            </DndContext>
          )}

          {/* Non-home page sections with DnD */}
          {!isHomePage && selectedPage && localPageSections.length === 0 && (
            <div className="mx-3 mt-2 mb-3 rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-6 text-center">
              <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border/60">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="font-display text-xs uppercase tracking-wider text-foreground mb-1">
                No sections yet
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Start from a template or add a section manually.
              </p>
              <div className="flex flex-col gap-2">
                {onApplyPageTemplate && (
                  <Button
                    variant="default"
                    size={tokens.button.card}
                    className="w-full text-xs rounded-full"
                    onClick={onApplyPageTemplate}
                  >
                    Choose a template
                  </Button>
                )}
                <Button
                  variant="outline"
                  size={tokens.button.card}
                  className="w-full text-xs rounded-full"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add a blank section
                </Button>
              </div>
            </div>
          )}
          {!isHomePage && selectedPage && localPageSections.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragOver={handlePageDragOver} onDragEnd={handlePageDragEnd}>
              <SortableContext items={localPageSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <SectionGroupHeader title={`${selectedPage.title} Sections`} />
                {localPageSections.map(section => (
                  <SectionNavItem
                    key={section.id}
                    id={section.id}
                    label={section.label}
                    description={section.description}
                    order={section.order}
                    enabled={section.enabled}
                    isActive={activeTab === `custom-${section.id}`}
                    onSelect={() => onTabChange(`custom-${section.id}`)}
                    onToggle={(enabled) => onPageSectionToggle?.(section.id, enabled)}
                    deletable={section.deletable}
                    onDelete={() => setPageDeleteTarget(section)}
                    onDuplicate={() => onPageSectionDuplicate?.(section)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          {/* Add Section Button — shown for ALL pages */}
          <div className="px-3 mt-3">
            <Button
              variant="outline"
              size={tokens.button.card}
              className="w-full text-xs"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Section
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Stats Footer */}
      <div className="p-3 border-t bg-muted/30">
        <div className="text-[10px] text-muted-foreground text-center">
          {isHomePage
            ? `${localSections.filter(s => s.enabled).length}/${localSections.length} sections visible`
            : `${selectedPage?.title ?? 'Page'} • ${localPageSections.filter(s => s.enabled).length}/${localPageSections.length} sections visible`
          }
        </div>
      </div>

      {/* Add Section Dialog */}
      <AddSectionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddSection}
        onAddFromTemplate={handleAddFromTemplate}
      />


      {/* Delete Confirmation (home page sections) */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this section and its configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation (non-home page sections) */}
      <AlertDialog open={!!pageDeleteTarget} onOpenChange={(open) => !open && setPageDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pageDeleteTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this section. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pageDeleteTarget) {
                  onPageSectionDelete?.(pageDeleteTarget.id);
                  setPageDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
