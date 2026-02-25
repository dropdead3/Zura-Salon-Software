import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  LayoutGrid,
  ExternalLink,
  Loader2,
  Save,
  Undo2,
  Redo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { HeroEditor } from '@/components/dashboard/website-editor/HeroEditor';
import { BrandStatementEditor } from '@/components/dashboard/website-editor/BrandStatementEditor';
import { NewClientEditor } from '@/components/dashboard/website-editor/NewClientEditor';
import { TestimonialsEditor } from '@/components/dashboard/website-editor/TestimonialsEditor';
import { ExtensionsEditor } from '@/components/dashboard/website-editor/ExtensionsEditor';
import { FAQEditor } from '@/components/dashboard/website-editor/FAQEditor';
import { BrandsManager } from '@/components/dashboard/website-editor/BrandsManager';
import { DrinksManager } from '@/components/dashboard/website-editor/DrinksManager';
import { FooterCTAEditor } from '@/components/dashboard/website-editor/FooterCTAEditor';
import { FooterEditor } from '@/components/dashboard/website-editor/FooterEditor';
import { ServicesPreviewEditor } from '@/components/dashboard/website-editor/ServicesPreviewEditor';
import { PopularServicesEditor } from '@/components/dashboard/website-editor/PopularServicesEditor';
import { GalleryDisplayEditor } from '@/components/dashboard/website-editor/GalleryDisplayEditor';
import { StylistsDisplayEditor } from '@/components/dashboard/website-editor/StylistsDisplayEditor';
import { LocationsDisplayEditor } from '@/components/dashboard/website-editor/LocationsDisplayEditor';
import { CustomSectionEditor } from '@/components/dashboard/website-editor/CustomSectionEditor';
// Embedded Content Components
import { TestimonialsContent } from '@/components/dashboard/website-editor/TestimonialsContent';
import { GalleryContent } from '@/components/dashboard/website-editor/GalleryContent';
import { StylistsContent } from '@/components/dashboard/website-editor/StylistsContent';
import { LocationsContent } from '@/components/dashboard/website-editor/LocationsContent';
import { ServicesContent } from '@/components/dashboard/website-editor/ServicesContent';
import { AnnouncementBarContent } from '@/components/dashboard/website-editor/AnnouncementBarContent';

// Multi-page components
import { PageSettingsEditor } from '@/components/dashboard/website-editor/PageSettingsEditor';
import { PageTemplatePicker } from '@/components/dashboard/website-editor/PageTemplatePicker';

// Sidebar Navigation
import { WebsiteEditorSidebar } from '@/components/dashboard/website-editor/WebsiteEditorSidebar';
// Live Preview
import { LivePreviewPanel, triggerPreviewRefresh } from '@/components/dashboard/website-editor/LivePreviewPanel';

// Undo/Redo
import { useUndoRedo } from '@/hooks/useUndoRedo';
import {
  useWebsiteSections,
  useUpdateWebsiteSections,
  type SectionConfig,
  type BuiltinSectionType,
  type CustomSectionType,
  generateSectionId,
  CUSTOM_TYPE_INFO,
} from '@/hooks/useWebsiteSections';
import {
  useWebsitePages,
  useUpdateWebsitePages,
  type PageConfig,
  type WebsitePagesConfig,
  generatePageId,
} from '@/hooks/useWebsitePages';
import { SectionStyleEditor } from '@/components/dashboard/website-editor/SectionStyleEditor';
import type { PageTemplate } from '@/data/page-templates';

// Unsaved changes dialog
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

// Layout Components
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';

// Map of tab values to editor components (built-in)
const EDITOR_COMPONENTS: Record<string, React.ComponentType> = {
  // Site Content (Data Managers)
  'services': ServicesContent,
  'testimonials': TestimonialsContent,
  'gallery': GalleryContent,
  'stylists': StylistsContent,
  'locations': LocationsContent,
  'banner': AnnouncementBarContent,
  
  // Homepage Section Editors
  'hero': HeroEditor,
  'brand': BrandStatementEditor,
  'testimonials-section': TestimonialsEditor,
  'services-preview': ServicesPreviewEditor,
  'popular-services': PopularServicesEditor,
  'gallery-section': GalleryDisplayEditor,
  'new-client': NewClientEditor,
  'stylists-section': StylistsDisplayEditor,
  'locations-section': LocationsDisplayEditor,
  'extensions': ExtensionsEditor,
  'faq': FAQEditor,
  'brands': BrandsManager,
  'drinks': DrinksManager,
  'footer-cta': FooterCTAEditor,
  'footer': FooterEditor,
};

// Map editor tabs to homepage section IDs for scroll-to-section
const TAB_TO_SECTION: Record<string, string> = {
  'hero': 'hero',
  'brand': 'brand_statement',
  'testimonials-section': 'testimonials',
  'services-preview': 'services_preview',
  'popular-services': 'popular_services',
  'gallery-section': 'gallery',
  'new-client': 'new_client',
  'stylists-section': 'stylists',
  'locations-section': 'locations',
  'faq': 'faq',
  'extensions': 'extensions',
  'brands': 'brands',
  'drinks': 'drink_menu',
};

// Tab labels for breadcrumb display
const TAB_LABELS: Record<string, string> = {
  'services': 'Services Manager',
  'testimonials': 'Testimonials Manager',
  'gallery': 'Gallery Manager',
  'stylists': 'Stylists Manager',
  'locations': 'Locations Manager',
  'banner': 'Announcement Banner',
  'hero': 'Hero Section',
  'brand': 'Brand Statement',
  'testimonials-section': 'Testimonials Display',
  'services-preview': 'Services Preview',
  'popular-services': 'Popular Services',
  'gallery-section': 'Gallery Display',
  'new-client': 'New Client CTA',
  'stylists-section': 'Stylists Display',
  'locations-section': 'Locations Display',
  'extensions': 'Extensions Spotlight',
  'faq': 'FAQ',
  'brands': 'Partner Brands',
  'drinks': 'Drink Menu',
  'footer-cta': 'Footer CTA',
  'footer': 'Footer Settings',
  'page-settings': 'Page Settings',
};

export default function WebsiteSectionsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { effectiveOrganization, currentOrganization, selectedOrganization } = useOrganizationContext();
  const contextSlug = effectiveOrganization?.slug || selectedOrganization?.slug || currentOrganization?.slug;
  const queryClient = useQueryClient();

  const { data: fallbackSlug } = useQuery({
    queryKey: ['website-editor-org-slug-fallback'],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('slug')
        .limit(1)
        .single();
      return data?.slug ?? null;
    },
    enabled: !contextSlug,
  });

  const orgSlug = contextSlug || fallbackSlug;
  const defaultTab = searchParams.get('tab') || 'hero';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [sidebarMode, setSidebarMode] = useState<'expanded' | 'collapsed'>(() => {
    const saved = localStorage.getItem('website-editor-sidebar-mode');
    return saved === 'collapsed' ? 'collapsed' : 'expanded';
  });

  useEffect(() => {
    localStorage.setItem('website-editor-sidebar-mode', sidebarMode);
  }, [sidebarMode]);

  const toggleSidebarMode = useCallback(() => {
    setSidebarMode(prev => prev === 'expanded' ? 'collapsed' : 'expanded');
  }, []);
  
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const isDirtyRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dirtyToastShownRef = useRef(false);
  const isMobile = useIsMobile();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Multi-page state
  const [selectedPageId, setSelectedPageId] = useState('home');
  const { data: pagesConfig } = useWebsitePages();
  const updatePages = useUpdateWebsitePages();
  const selectedPage = useMemo(() => {
    return pagesConfig?.pages.find(p => p.id === selectedPageId);
  }, [pagesConfig, selectedPageId]);

  // Page template picker
  const [showPageTemplatePicker, setShowPageTemplatePicker] = useState(false);
  // Template confirmation
  const [pendingTemplate, setPendingTemplate] = useState<PageTemplate | null>(null);

  // Compute preview URL based on selected page
  const previewUrl = useMemo(() => {
    if (!orgSlug) return '/?preview=true';
    if (selectedPageId === 'home' || !selectedPage?.slug) {
      return `/org/${orgSlug}?preview=true`;
    }
    return `/org/${orgSlug}/${selectedPage.slug}?preview=true`;
  }, [orgSlug, selectedPageId, selectedPage]);

  // Undo/Redo for layout changes
  const { data: sectionsConfig } = useWebsiteSections();
  const updateSections = useUpdateWebsiteSections();
  const {
    state: undoState,
    setState: pushUndoState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<SectionConfig[] | null>(null);

  // Initialize undo state when sections load
  const initializedRef = useRef(false);
  useEffect(() => {
    if (sectionsConfig?.homepage && !initializedRef.current) {
      pushUndoState([...sectionsConfig.homepage].sort((a, b) => a.order - b.order), true);
      initializedRef.current = true;
    }
  }, [sectionsConfig, pushUndoState]);

  // Track layout changes from sidebar
  const handleSectionsChange = useCallback((sections: SectionConfig[]) => {
    pushUndoState(sections);
  }, [pushUndoState]);

  const handleUndo = useCallback(async () => {
    const prev = undo();
    if (prev) {
      try {
        await updateSections.mutateAsync({ homepage: prev });
        toast.success('Undone');
      } catch {
        toast.error('Failed to undo');
      }
    }
  }, [undo, updateSections]);

  const handleRedo = useCallback(async () => {
    const next = redo();
    if (next) {
      try {
        await updateSections.mutateAsync({ homepage: next });
        toast.success('Redone');
      } catch {
        toast.error('Failed to redo');
      }
    }
  }, [redo, updateSections]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  const activeSectionId = useMemo(() => {
    if (activeTab.startsWith('custom-')) {
      return activeTab.replace('custom-', '');
    }
    return TAB_TO_SECTION[activeTab];
  }, [activeTab]);

  // Dirty state tracking
  useEffect(() => {
    const handleDirtyChange = (e: Event) => {
      const dirty = (e as CustomEvent).detail?.dirty ?? false;
      isDirtyRef.current = dirty;
      setIsDirty(dirty);
      if (dirty && !dirtyToastShownRef.current) {
        dirtyToastShownRef.current = true;
        toast.warning('You have unsaved changes', { duration: 4000 });
      }
      if (!dirty) dirtyToastShownRef.current = false;
    };

    const handleSavingState = (e: Event) => {
      setIsSaving((e as CustomEvent).detail?.saving ?? false);
    };

    window.addEventListener('editor-dirty-state', handleDirtyChange);
    window.addEventListener('editor-saving-state', handleSavingState);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('editor-dirty-state', handleDirtyChange);
      window.removeEventListener('editor-saving-state', handleSavingState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  const handleTabChange = useCallback((tab: string) => {
    if (isDirtyRef.current) {
      setPendingTab(tab);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(tab);
    }
  }, []);

  const handleDiscardAndSwitch = () => {
    isDirtyRef.current = false;
    window.dispatchEvent(new CustomEvent('editor-dirty-state', { detail: { dirty: false } }));
    setShowUnsavedDialog(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const triggerSave = useCallback(() => {
    window.dispatchEvent(new CustomEvent('editor-save-request'));
  }, []);

  // Helper: get sections for the currently selected page
  const getSelectedPageSections = useCallback((): SectionConfig[] => {
    if (selectedPageId === 'home') return sectionsConfig?.homepage ?? [];
    return selectedPage?.sections ?? [];
  }, [selectedPageId, sectionsConfig, selectedPage]);

  // Debounced style override saves with optimistic cache update
  const styleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleStyleOverrideChange = useCallback((sectionId: string, overrides: Record<string, unknown>) => {
    if (!pagesConfig) return;

    // Build updated pages config
    const updatedPages: WebsitePagesConfig = {
      pages: pagesConfig.pages.map(p => {
        if (p.id !== selectedPageId) return p;
        return {
          ...p,
          sections: p.sections.map(s =>
            s.id === sectionId ? { ...s, style_overrides: overrides } : s
          ),
        };
      }),
    };

    // Optimistic cache update for instant UI feedback
    queryClient.setQueryData(['site-settings', 'website_pages'], updatedPages);

    // Debounce the actual DB save
    if (styleDebounceRef.current) clearTimeout(styleDebounceRef.current);
    styleDebounceRef.current = setTimeout(async () => {
      try {
        await updatePages.mutateAsync(updatedPages);
        triggerPreviewRefresh();
      } catch {
        toast.error('Failed to save style');
        // Revert on error
        queryClient.invalidateQueries({ queryKey: ['site-settings', 'website_pages'] });
      }
    }, 500);
  }, [pagesConfig, selectedPageId, updatePages, queryClient]);

  // Section CRUD for non-home pages
  const handlePageSectionToggle = useCallback(async (sectionId: string, enabled: boolean) => {
    if (!pagesConfig || selectedPageId === 'home') return;
    const updatedPages: WebsitePagesConfig = {
      pages: pagesConfig.pages.map(p => {
        if (p.id !== selectedPageId) return p;
        return { ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, enabled } : s) };
      }),
    };
    try {
      await updatePages.mutateAsync(updatedPages);
      toast.success(`Section ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update section');
    }
  }, [pagesConfig, selectedPageId, updatePages]);

  const handlePageSectionReorder = useCallback(async (reorderedSections: SectionConfig[]) => {
    if (!pagesConfig || selectedPageId === 'home') return;
    const updatedPages: WebsitePagesConfig = {
      pages: pagesConfig.pages.map(p => {
        if (p.id !== selectedPageId) return p;
        return { ...p, sections: reorderedSections.map((s, i) => ({ ...s, order: i + 1 })) };
      }),
    };
    try {
      await updatePages.mutateAsync(updatedPages);
    } catch {
      toast.error('Failed to reorder');
    }
  }, [pagesConfig, selectedPageId, updatePages]);

  const handlePageSectionAdd = useCallback(async (type: CustomSectionType, label: string) => {
    if (!pagesConfig || selectedPageId === 'home') return;
    const currentSections = selectedPage?.sections ?? [];
    const newSection: SectionConfig = {
      id: generateSectionId(),
      type,
      label,
      description: CUSTOM_TYPE_INFO[type].description,
      enabled: true,
      order: currentSections.length + 1,
      deletable: true,
    };
    const updatedPages: WebsitePagesConfig = {
      pages: pagesConfig.pages.map(p => {
        if (p.id !== selectedPageId) return p;
        return { ...p, sections: [...p.sections, newSection] };
      }),
    };
    try {
      await updatePages.mutateAsync(updatedPages);
      toast.success(`"${label}" added`);
      setActiveTab(`custom-${newSection.id}`);
    } catch {
      toast.error('Failed to add section');
    }
  }, [pagesConfig, selectedPageId, selectedPage, updatePages]);

  const handlePageSectionDelete = useCallback(async (sectionId: string) => {
    if (!pagesConfig || selectedPageId === 'home') return;
    const updatedPages: WebsitePagesConfig = {
      pages: pagesConfig.pages.map(p => {
        if (p.id !== selectedPageId) return p;
        return { ...p, sections: p.sections.filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i + 1 })) };
      }),
    };
    try {
      await updatePages.mutateAsync(updatedPages);
      // Clean up orphaned settings
      const settingsKey = `section_custom_${sectionId}`;
      supabase.from('site_settings').delete().eq('id', settingsKey).then(() => {});
      toast.success('Section deleted');
      if (activeTab === `custom-${sectionId}`) {
        setActiveTab('page-settings');
      }
    } catch {
      toast.error('Failed to delete section');
    }
  }, [pagesConfig, selectedPageId, updatePages, activeTab]);

  const handlePageSectionDuplicate = useCallback(async (section: SectionConfig) => {
    if (!pagesConfig || selectedPageId === 'home') return;
    const newId = generateSectionId();
    const newSection: SectionConfig = {
      ...section,
      id: newId,
      label: `${section.label} (Copy)`,
      order: (selectedPage?.sections.length ?? 0) + 1,
      deletable: true,
    };
    const updatedPages: WebsitePagesConfig = {
      pages: pagesConfig.pages.map(p => {
        if (p.id !== selectedPageId) return p;
        return { ...p, sections: [...p.sections, newSection] };
      }),
    };
    try {
      await updatePages.mutateAsync(updatedPages);
      // Copy config
      const sourceKey = `section_custom_${section.id}`;
      const destKey = `section_custom_${newId}`;
      const { data: sourceConfig } = await supabase.from('site_settings').select('value').eq('id', sourceKey).maybeSingle();
      if (sourceConfig?.value) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('site_settings').upsert({ id: destKey, value: sourceConfig.value as never, updated_by: user?.id });
      }
      toast.success(`"${section.label}" duplicated`);
      setActiveTab(`custom-${newId}`);
    } catch {
      toast.error('Failed to duplicate');
    }
  }, [pagesConfig, selectedPageId, selectedPage, updatePages]);

  // Section label rename
  const handleSectionLabelChange = useCallback(async (sectionId: string, newLabel: string) => {
    if (!pagesConfig) return;
    const updatedPages: WebsitePagesConfig = {
      pages: pagesConfig.pages.map(p => {
        if (p.id !== selectedPageId) return p;
        return { ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, label: newLabel } : s) };
      }),
    };
    // Also update home sections if on home page
    if (selectedPageId === 'home' && sectionsConfig) {
      // The adapter handles this through pages
    }
    try {
      await updatePages.mutateAsync(updatedPages);
    } catch {
      toast.error('Failed to rename section');
    }
  }, [pagesConfig, selectedPageId, updatePages, sectionsConfig]);

  // Page management handlers
  const handlePageChange = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
    if (pageId !== 'home') {
      setActiveTab('page-settings');
    } else {
      setActiveTab('hero');
    }
  }, []);

  const handleAddPage = useCallback(async () => {
    if (!pagesConfig) return;
    const newPage: PageConfig = {
      id: generatePageId(),
      slug: `page-${Date.now().toString(36)}`,
      title: 'New Page',
      seo_title: '',
      seo_description: '',
      enabled: true,
      show_in_nav: true,
      nav_order: pagesConfig.pages.length,
      sections: [
        {
          id: generateSectionId(),
          type: 'rich_text',
          label: 'Content',
          description: 'Main content block',
          enabled: true,
          order: 1,
          deletable: true,
        },
      ],
      page_type: 'custom',
      deletable: true,
    };
    const updated = { pages: [...pagesConfig.pages, newPage] };
    try {
      await updatePages.mutateAsync(updated);
      toast.success('Page created');
      setSelectedPageId(newPage.id);
      setActiveTab('page-settings');
    } catch {
      toast.error('Failed to create page');
    }
  }, [pagesConfig, updatePages]);

  const handleDeletePage = useCallback(async (pageId: string) => {
    if (!pagesConfig) return;
    const page = pagesConfig.pages.find(p => p.id === pageId);
    if (!page?.deletable) {
      toast.error('This page cannot be deleted');
      return;
    }
    const updated = { pages: pagesConfig.pages.filter(p => p.id !== pageId) };
    try {
      await updatePages.mutateAsync(updated);
      toast.success(`"${page.title}" deleted`);
      setSelectedPageId('home');
      setActiveTab('hero');
    } catch {
      toast.error('Failed to delete page');
    }
  }, [pagesConfig, updatePages]);

  const handleUpdatePageSettings = useCallback(async (updatedPage: PageConfig) => {
    if (!pagesConfig) return;
    const updated = {
      pages: pagesConfig.pages.map(p => p.id === updatedPage.id ? updatedPage : p),
    };
    await updatePages.mutateAsync(updated);
  }, [pagesConfig, updatePages]);

  const handleApplyPageTemplate = useCallback(async (template: PageTemplate) => {
    if (!pagesConfig || !selectedPage) return;
    const newSections: SectionConfig[] = template.sections.map((ts, i) => ({
      id: generateSectionId(),
      type: ts.type,
      label: ts.label,
      description: CUSTOM_TYPE_INFO[ts.type]?.description ?? '',
      enabled: true,
      order: i + 1,
      deletable: true,
    }));

    const updated = {
      pages: pagesConfig.pages.map(p =>
        p.id === selectedPageId ? { ...p, sections: newSections } : p
      ),
    };

    try {
      await updatePages.mutateAsync(updated);
      const { data: { user } } = await supabase.auth.getUser();
      for (let i = 0; i < template.sections.length; i++) {
        const ts = template.sections[i];
        const settingsKey = `section_custom_${newSections[i].id}`;
        await supabase.from('site_settings').upsert({
          id: settingsKey,
          value: ts.config as never,
          updated_by: user?.id,
        });
      }
      toast.success(`"${template.name}" template applied`);
    } catch {
      toast.error('Failed to apply template');
    }
  }, [pagesConfig, selectedPage, selectedPageId, updatePages]);

  // Template confirmation wrapper
  const handleTemplateSelect = useCallback((template: PageTemplate) => {
    setPendingTemplate(template);
  }, []);

  const handleConfirmTemplate = useCallback(async () => {
    if (pendingTemplate) {
      await handleApplyPageTemplate(pendingTemplate);
      setPendingTemplate(null);
    }
  }, [pendingTemplate, handleApplyPageTemplate]);

  // Determine editor component
  const renderEditor = () => {
    // Page settings tab
    if (activeTab === 'page-settings' && selectedPage) {
      return (
        <PageSettingsEditor
          page={selectedPage}
          allPages={pagesConfig ?? undefined}
          onUpdate={handleUpdatePageSettings}
        />
      );
    }

    // Check built-in editors first (only for home page)
    if (selectedPageId === 'home') {
      const EditorComponent = EDITOR_COMPONENTS[activeTab];
      if (EditorComponent) {
        const sectionId = TAB_TO_SECTION[activeTab];
        const section = sectionId ? sectionsConfig?.homepage.find(s => s.id === sectionId) : null;
        
        return (
          <div className="space-y-4">
            <EditorComponent />
            {section && (
              <SectionStyleEditor
                value={section.style_overrides ?? {}}
                onChange={(overrides) => handleStyleOverrideChange(section.id, overrides)}
                sectionId={section.id}
              />
            )}
          </div>
        );
      }
    }

    // Check if it's a custom section — look in the SELECTED page's sections
    if (activeTab.startsWith('custom-')) {
      const sectionId = activeTab.replace('custom-', '');
      const pageSections = getSelectedPageSections();
      const section = pageSections.find(s => s.id === sectionId);
      if (section) {
        return (
          <CustomSectionEditor
            sectionId={section.id}
            sectionType={section.type as CustomSectionType}
            sectionLabel={section.label}
            styleOverrides={section.style_overrides}
            onStyleChange={(overrides) => handleStyleOverrideChange(section.id, overrides)}
            onLabelChange={(newLabel) => handleSectionLabelChange(section.id, newLabel)}
          />
        );
      }
    }

    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a section from the sidebar to edit
      </div>
    );
  };

  // Get tab label (including custom sections)
  const getTabLabel = () => {
    if (TAB_LABELS[activeTab]) return TAB_LABELS[activeTab];
    if (activeTab.startsWith('custom-')) {
      const sectionId = activeTab.replace('custom-', '');
      const pageSections = getSelectedPageSections();
      const section = pageSections.find(s => s.id === sectionId);
      return section?.label ?? 'Custom Section';
    }
    return 'Select a section';
  };

  // Open Site URL — page-aware, strip preview param
  const openSiteUrl = useMemo(() => {
    return previewUrl.replace('?preview=true', '');
  }, [previewUrl]);

  return (
    <DashboardLayout hideFooter hideTopBar>
      <div className="h-screen flex">
        {/* Fixed-width Sidebar */}
        {!isMobile && (
          <div className={cn(
            'flex-shrink-0 border-r overflow-auto transition-all duration-200',
            sidebarMode === 'expanded' ? 'w-[300px]' : 'w-14'
          )}>
            <WebsiteEditorSidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              collapsed={sidebarMode === 'collapsed'}
              onToggleCollapse={toggleSidebarMode}
              onSectionsChange={handleSectionsChange}
              selectedPageId={selectedPageId}
              onPageChange={handlePageChange}
              onAddPage={handleAddPage}
              onDeletePage={handleDeletePage}
              onApplyPageTemplate={() => setShowPageTemplatePicker(true)}
              onPageSectionToggle={handlePageSectionToggle}
              onPageSectionReorder={handlePageSectionReorder}
              onPageSectionDelete={handlePageSectionDelete}
              onPageSectionDuplicate={handlePageSectionDuplicate}
              onPageSectionAdd={handlePageSectionAdd}
            />
          </div>
        )}

        {/* Mobile floating drawer trigger */}
        {isMobile && (
          <Button
            variant="default"
            size={tokens.button.card}
            className="fixed bottom-20 right-4 z-50 rounded-full shadow-lg h-12 w-12 p-0"
            onClick={() => setShowMobileSidebar(prev => !prev)}
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
        )}

        {/* Mobile sidebar drawer */}
        {isMobile && showMobileSidebar && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}>
            <div
              className="absolute left-0 top-0 bottom-0 w-[320px] bg-background border-r shadow-xl overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              <WebsiteEditorSidebar
                activeTab={activeTab}
                onTabChange={(tab) => { handleTabChange(tab); setShowMobileSidebar(false); }}
                onSectionsChange={handleSectionsChange}
                selectedPageId={selectedPageId}
                onPageChange={handlePageChange}
                onAddPage={handleAddPage}
                onDeletePage={handleDeletePage}
                onApplyPageTemplate={() => setShowPageTemplatePicker(true)}
                onPageSectionToggle={handlePageSectionToggle}
                onPageSectionReorder={handlePageSectionReorder}
                onPageSectionDelete={handlePageSectionDelete}
                onPageSectionDuplicate={handlePageSectionDuplicate}
                onPageSectionAdd={handlePageSectionAdd}
              />
            </div>
          </div>
        )}

        {/* Resizable Editor + Preview */}
        <ResizablePanelGroup direction="horizontal" className="h-full flex-1">
          {/* Main Editor Panel */}
          <ResizablePanel defaultSize={isMobile ? 100 : 42} minSize={30}>
            <div className="h-full flex flex-col overflow-hidden">
              {/* Compact Toolbar */}
              <div className="flex-shrink-0 px-3 py-3 border-b border-border/40 bg-card/80 backdrop-blur-md flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {selectedPage && selectedPageId !== 'home' ? `${selectedPage.title} › ` : ''}
                    {getTabLabel()}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={handleUndo}>
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Undo (⌘Z)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={handleRedo}>
                        <Redo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
                  </Tooltip>
                  <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => window.open(openSiteUrl, '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Open
                  </Button>
                  {isDirty && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Unsaved changes" />
                  )}
                  <Button size="sm" className="h-8 px-3" onClick={triggerSave} disabled={!isDirty || isSaving}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    Save
                  </Button>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6 bg-muted/30">
                {renderEditor()}
              </div>
            </div>
          </ResizablePanel>

          {/* Live Preview Panel */}
          {!isMobile && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={58} minSize={20} collapsible collapsedSize={0}>
                <LivePreviewPanel activeSectionId={activeSectionId} previewUrl={previewUrl} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Unsaved Changes Dialog */}
        <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes that will be lost if you switch sections. Do you want to discard them?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setShowUnsavedDialog(false); setPendingTab(null); }}>
                Stay & Keep Editing
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDiscardAndSwitch}>
                Discard & Switch
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Page Template Picker */}
        <PageTemplatePicker
          open={showPageTemplatePicker}
          onOpenChange={setShowPageTemplatePicker}
          onSelect={handleTemplateSelect}
        />

        {/* Template Confirmation Dialog */}
        <AlertDialog open={!!pendingTemplate} onOpenChange={(open) => !open && setPendingTemplate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply "{pendingTemplate?.name}" Template?</AlertDialogTitle>
              <AlertDialogDescription>
                This will replace all sections on "{selectedPage?.title}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmTemplate}>
                Apply Template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
