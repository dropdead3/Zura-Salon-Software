/**
 * STRUCTURE LAYERS TAB
 * 
 * Shows the section tree for the selected page.
 * Homepage: grouped built-in sections + custom sections with DnD.
 * Other pages: flat section list with DnD.
 * Also includes Site Content items for quick access.
 */

import { useMemo, useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
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
  Layers,
} from 'lucide-react';
import { SectionNavItem } from '../SectionNavItem';
import { SectionGroupHeader } from '../SectionGroupHeader';
import { ContentNavItem } from '../ContentNavItem';
import {
  isBuiltinSection,
  type SectionConfig,
  type BuiltinSectionType,
} from '@/hooks/useWebsiteSections';

// Global Elements (site-wide, always present)
const GLOBAL_ELEMENTS = [
  { tab: 'banner', label: 'Announcement Bar', description: 'Site-wide top banner', icon: Megaphone },
  { tab: 'footer-cta', label: 'Footer CTA', description: 'Pre-footer call to action', icon: MousePointerClick },
  { tab: 'footer', label: 'Footer', description: 'Footer links & copyright', icon: PanelBottom },
];

// Content Managers (data sources used by sections)
const CONTENT_MANAGERS = [
  { tab: 'services', label: 'Services', description: 'Manage service catalog', icon: Scissors },
  { tab: 'testimonials', label: 'Testimonials', description: 'Manage client reviews', icon: MessageSquareQuote },
  { tab: 'gallery', label: 'Gallery', description: 'Manage portfolio images', icon: Images },
  { tab: 'stylists', label: 'Stylists', description: 'Manage team profiles', icon: Users },
  { tab: 'locations', label: 'Locations', description: 'Manage salon locations', icon: MapPin },
];

// Built-in section → tab mapping
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
    return BUILTIN_SECTION_TO_TAB[section.type as BuiltinSectionType];
  }
  return `custom-${section.id}`;
}

// Homepage section groups
const SECTION_GROUPS: { title: string; sectionTypes: BuiltinSectionType[] }[] = [
  { title: 'Above the Fold', sectionTypes: ['hero', 'brand_statement'] },
  { title: 'Social Proof', sectionTypes: ['testimonials', 'brands'] },
  { title: 'Services & Portfolio', sectionTypes: ['services_preview', 'popular_services', 'extensions', 'gallery'] },
  { title: 'Conversion', sectionTypes: ['new_client', 'faq'] },
  { title: 'Team & Extras', sectionTypes: ['stylists', 'locations', 'drink_menu'] },
];

interface StructureLayersTabProps {
  isHomePage: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** Homepage sections (ordered) */
  homeSections: SectionConfig[];
  onHomeSectionsReorder: (sections: SectionConfig[]) => void;
  onHomeSectionToggle: (sectionId: string, enabled: boolean) => void;
  onHomeSectionDuplicate: (section: SectionConfig) => void;
  onHomeSectionDelete: (section: SectionConfig) => void;
  /** Non-home page sections */
  pageSections: SectionConfig[];
  onPageSectionsReorder: (sections: SectionConfig[]) => void;
  onPageSectionToggle: (sectionId: string, enabled: boolean) => void;
  onPageSectionDuplicate: (section: SectionConfig) => void;
  onPageSectionDelete: (section: SectionConfig) => void;
  pageTitle?: string;
  onAddSection: () => void;
}

export function StructureLayersTab({
  isHomePage,
  activeTab,
  onTabChange,
  homeSections,
  onHomeSectionsReorder,
  onHomeSectionToggle,
  onHomeSectionDuplicate,
  onHomeSectionDelete,
  pageSections,
  onPageSectionsReorder,
  onPageSectionToggle,
  onPageSectionDuplicate,
  onPageSectionDelete,
  pageTitle,
  onAddSection,
}: StructureLayersTabProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const builtinSections = useMemo(
    () => homeSections.filter(s => isBuiltinSection(s.type)),
    [homeSections]
  );
  const customSections = useMemo(
    () => homeSections.filter(s => !isBuiltinSection(s.type)),
    [homeSections]
  );

  const getBuiltinSection = (type: BuiltinSectionType) =>
    homeSections.find(s => s.type === type);

  // Home page DnD
  const handleHomeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = homeSections.findIndex(s => s.id === active.id);
    const newIndex = homeSections.findIndex(s => s.id === over.id);
    const reordered = arrayMove(homeSections, oldIndex, newIndex).map((s, i) => ({ ...s, order: i + 1 }));
    onHomeSectionsReorder(reordered);
  };

  // Non-home page DnD
  const handlePageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pageSections.findIndex(s => s.id === active.id);
    const newIndex = pageSections.findIndex(s => s.id === over.id);
    const reordered = arrayMove(pageSections, oldIndex, newIndex).map((s, i) => ({ ...s, order: i + 1 }));
    onPageSectionsReorder(reordered);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* Site Content (home page only) */}
          {isHomePage && (
            <>
              <SectionGroupHeader title="Global Elements" />
              <div className="space-y-0.5 mb-1">
                {GLOBAL_ELEMENTS.map(item => (
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
              <SectionGroupHeader title="Content Managers" />
              <div className="space-y-0.5 mb-2">
                {CONTENT_MANAGERS.map(item => (
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
              <div className="my-3 mx-3 border-t-2 border-border/50" />
            </>
          )}

          {/* Homepage Sections */}
          {isHomePage && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleHomeDragEnd}>
              <SortableContext items={homeSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="mb-1 px-4 py-1">
                  <span className="text-[10px] font-display tracking-wider text-muted-foreground/70">
                    HOMEPAGE LAYOUT
                  </span>
                </div>
                {SECTION_GROUPS.map((group, gi) => {
                  const groupSections = group.sectionTypes
                    .map(type => getBuiltinSection(type))
                    .filter(Boolean) as SectionConfig[];
                  if (groupSections.length === 0) return null;
                  return (
                    <div key={group.title}>
                      {gi > 0 && <Separator className="my-2 mx-3" />}
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
                          onToggle={(enabled) => onHomeSectionToggle(section.id, enabled)}
                          onDuplicate={() => onHomeSectionDuplicate(section)}
                        />
                      ))}
                    </div>
                  );
                })}
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
                        onToggle={(enabled) => onHomeSectionToggle(section.id, enabled)}
                        deletable
                        onDelete={() => onHomeSectionDelete(section)}
                        onDuplicate={() => onHomeSectionDuplicate(section)}
                      />
                    ))}
                  </>
                )}
              </SortableContext>
            </DndContext>
          )}

          {/* Non-home page sections */}
          {!isHomePage && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePageDragEnd}>
              <SortableContext items={pageSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <SectionGroupHeader title={`${pageTitle ?? 'Page'} Sections`} />
                {pageSections.map(section => (
                  <SectionNavItem
                    key={section.id}
                    id={section.id}
                    label={section.label}
                    description={section.description}
                    order={section.order}
                    enabled={section.enabled}
                    isActive={activeTab === `custom-${section.id}`}
                    onSelect={() => onTabChange(`custom-${section.id}`)}
                    onToggle={(enabled) => onPageSectionToggle(section.id, enabled)}
                    deletable={section.deletable}
                    onDelete={() => onPageSectionDelete(section)}
                    onDuplicate={() => onPageSectionDuplicate(section)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </ScrollArea>

      {/* Add Section */}
      <div className="p-3 border-t border-border/40">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8"
          onClick={onAddSection}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Section
        </Button>
      </div>

      {/* Stats */}
      <div className="px-3 pb-2">
        <p className="text-[10px] text-muted-foreground text-center">
          {isHomePage
            ? `${homeSections.filter(s => s.enabled).length}/${homeSections.length} sections visible`
            : `${pageSections.filter(s => s.enabled).length}/${pageSections.length} sections visible`
          }
        </p>
      </div>
    </div>
  );
}
