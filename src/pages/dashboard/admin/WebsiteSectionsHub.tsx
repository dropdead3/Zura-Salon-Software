import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

// Editors
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
import { TestimonialsContent } from '@/components/dashboard/website-editor/TestimonialsContent';
import { GalleryContent } from '@/components/dashboard/website-editor/GalleryContent';
import { StylistsContent } from '@/components/dashboard/website-editor/StylistsContent';
import { LocationsContent } from '@/components/dashboard/website-editor/LocationsContent';
import { ServicesContent } from '@/components/dashboard/website-editor/ServicesContent';
import { AnnouncementBarContent } from '@/components/dashboard/website-editor/AnnouncementBarContent';
import { NavigationManager } from '@/components/dashboard/website-editor/navigation/NavigationManager';
import { PagesManager } from '@/components/dashboard/website-editor/PagesManager';
import { PageSettingsEditor } from '@/components/dashboard/website-editor/PageSettingsEditor';
import { PageTemplatePicker } from '@/components/dashboard/website-editor/PageTemplatePicker';
import { SectionStyleEditor } from '@/components/dashboard/website-editor/SectionStyleEditor';
import { AddSectionDialog } from '@/components/dashboard/website-editor/AddSectionDialog';
import { StructurePanelSkeleton, CanvasPanelSkeleton, InspectorPanelSkeleton } from '@/components/dashboard/website-editor/EditorSkeletons';
import { triggerPreviewRefresh } from '@/lib/preview-utils';

// Three-panel layout
import { StructurePanel, type StructureMode } from '@/components/dashboard/website-editor/panels/StructurePanel';
import { StructurePagesTab } from '@/components/dashboard/website-editor/panels/StructurePagesTab';
import { StructureLayersTab } from '@/components/dashboard/website-editor/panels/StructureLayersTab';
import { StructureNavTab } from '@/components/dashboard/website-editor/panels/StructureNavTab';
import { CanvasPanel } from '@/components/dashboard/website-editor/panels/CanvasPanel';
import { InspectorPanel } from '@/components/dashboard/website-editor/panels/InspectorPanel';

// Hooks
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEditorLayout } from '@/hooks/useEditorLayout';
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
import type { PageTemplate } from '@/data/page-templates';

// UI
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { LayoutGrid } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
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

// Editor component map
const EDITOR_COMPONENTS: Record<string, React.ComponentType> = {
  'services': ServicesContent,
  'testimonials': TestimonialsContent,
  'gallery': GalleryContent,
  'stylists': StylistsContent,
  'locations': LocationsContent,
  'banner': AnnouncementBarContent,
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
  'navigation': NavigationManager,
  'pages': PagesManager,
};

const TAB_TO_SECTION: Record<string, string> = {
  'hero': 'hero',
  'brand': 'brand_statement',
  'testimonials-section': 'testimonials',
  'testimonials': 'testimonials',
  'services-preview': 'services_preview',
  'popular-services': 'popular_services',
  'gallery-section': 'gallery',
  'gallery': 'gallery',
  'new-client': 'new_client',
  'stylists-section': 'stylists',
  'stylists': 'stylists',
  'locations-section': 'locations',
  'locations': 'locations',
  'faq': 'faq',
  'extensions': 'extensions',
  'brands': 'brands',
  'drinks': 'drink_menu',
  'footer-cta': 'footer_cta',
  'footer': 'footer',
};

export default function WebsiteSectionsHub() {
  const { effectiveOrganization, currentOrganization, selectedOrganization } = useOrganizationContext();
  const contextSlug = effectiveOrganization?.slug || selectedOrganization?.slug || currentOrganization?.slug;
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const layout = useEditorLayout();

  const { data: fallbackSlug } = useQuery({
    queryKey: ['website-editor-org-slug-fallback'],
    queryFn: async () => {
      const { data } = await supabase.from('organizations').select('slug').limit(1).single();
      return data?.slug ?? null;
    },
    enabled: !contextSlug,
  });

  const orgSlug = contextSlug || fallbackSlug;
  const orgName = effectiveOrganization?.name || selectedOrganization?.name || currentOrganization?.name || 'Website';

  // ─── State ───
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'hero');
  const [structureMode, setStructureMode] = useState<StructureMode>('layers');
  const [selectedPageId, setSelectedPageId] = useState('home');
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const isDirtyRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dirtyToastShownRef = useRef(false);
  const [scrollCounter, setScrollCounter] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPageTemplatePicker, setShowPageTemplatePicker] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<PageTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SectionConfig | null>(null);

  // Mobile panel visibility
  const [showMobileStructure, setShowMobileStructure] = useState(false);

  // ─── Data ───
  const { data: pagesConfig, isLoading: pagesLoading } = useWebsitePages();
  const updatePages = useUpdateWebsitePages();
  const { data: sectionsConfig, isLoading: sectionsLoading } = useWebsiteSections();
  const updateSections = useUpdateWebsiteSections();
  const isEditorLoading = pagesLoading || sectionsLoading;

  const selectedPage = useMemo(
    () => pagesConfig?.pages.find(p => p.id === selectedPageId),
    [pagesConfig, selectedPageId]
  );

  const isHomePage = selectedPageId === 'home';

  const previewUrl = useMemo(() => {
    if (!orgSlug) return '/?preview=true';
    if (selectedPageId === 'home' || !selectedPage?.slug) return `/org/${orgSlug}?preview=true`;
    return `/org/${orgSlug}/${selectedPage.slug}?preview=true`;
  }, [orgSlug, selectedPageId, selectedPage]);

  const openSiteUrl = useMemo(() => {
    const path = previewUrl.replace('?preview=true', '');
    return `${window.location.origin}${path}`;
  }, [previewUrl]);

  // ─── Undo/Redo ───
  const { state: undoState, setState: pushUndoState, undo, redo, canUndo, canRedo } = useUndoRedo<SectionConfig[] | null>(null);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (sectionsConfig?.homepage && !initializedRef.current) {
      pushUndoState([...sectionsConfig.homepage].sort((a, b) => a.order - b.order), true);
      initializedRef.current = true;
    }
  }, [sectionsConfig, pushUndoState]);

  const handleUndo = useCallback(async () => {
    const prev = undo();
    if (prev) {
      try { await updateSections.mutateAsync({ homepage: prev }); toast.success('Undone'); }
      catch { toast.error('Failed to undo'); }
    }
  }, [undo, updateSections]);

  const handleRedo = useCallback(async () => {
    const next = redo();
    if (next) {
      try { await updateSections.mutateAsync({ homepage: next }); toast.success('Redone'); }
      catch { toast.error('Failed to redo'); }
    }
  }, [redo, updateSections]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? handleRedo() : handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // ─── Active section for preview scroll ───
  const activeSectionId = useMemo(() => {
    if (activeTab.startsWith('custom-')) return activeTab.replace('custom-', '');
    return TAB_TO_SECTION[activeTab];
  }, [activeTab]);

  // ─── Dirty state tracking ───
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
    const handleSavingState = (e: Event) => setIsSaving((e as CustomEvent).detail?.saving ?? false);

    window.addEventListener('editor-dirty-state', handleDirtyChange);
    window.addEventListener('editor-saving-state', handleSavingState);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (isDirtyRef.current) e.preventDefault(); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('editor-dirty-state', handleDirtyChange);
      window.removeEventListener('editor-saving-state', handleSavingState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // (Editor canvas postMessage listener moved below after all handlers are defined)

  const replaceTabInUrl = useCallback((tab: string) => {
    const nextSearchParams = new URLSearchParams(window.location.search);
    nextSearchParams.set('tab', tab);
    const nextUrl = `${window.location.pathname}?${nextSearchParams.toString()}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, []);

  // ─── Tab change with dirty guard ───
  const handleTabChange = useCallback((tab: string) => {
    if (isDirtyRef.current) {
      setPendingTab(tab);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(tab);
      setScrollCounter(c => c + 1);
      replaceTabInUrl(tab);
    }
  }, [replaceTabInUrl]);

  const handleDiscardAndSwitch = () => {
    isDirtyRef.current = false;
    window.dispatchEvent(new CustomEvent('editor-dirty-state', { detail: { dirty: false } }));
    setShowUnsavedDialog(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setScrollCounter(c => c + 1);
      replaceTabInUrl(pendingTab);
      setPendingTab(null);
    }
  };

  const triggerSave = useCallback(() => {
    window.dispatchEvent(new CustomEvent('editor-save-request'));
  }, []);

  // ─── Ordered sections ───
  const orderedHomeSections = useMemo<SectionConfig[]>(() => {
    if (!sectionsConfig?.homepage) return [];
    return [...sectionsConfig.homepage].sort((a, b) => a.order - b.order);
  }, [sectionsConfig]);

  const orderedPageSections = useMemo<SectionConfig[]>(() => {
    if (!selectedPage || isHomePage) return [];
    return [...selectedPage.sections].sort((a, b) => a.order - b.order);
  }, [selectedPage, isHomePage]);

  // ─── Homepage section operations ───
  const saveSections = useCallback(async (newSections: SectionConfig[]) => {
    if (!sectionsConfig) return;
    const reordered = newSections.map((s, i) => ({ ...s, order: i + 1 }));
    pushUndoState(reordered);
    try { await updateSections.mutateAsync({ homepage: reordered }); }
    catch { toast.error('Failed to save'); }
  }, [sectionsConfig, updateSections, pushUndoState]);

  const handleHomeSectionToggle = useCallback(async (sectionId: string, enabled: boolean) => {
    const newSections = orderedHomeSections.map(s => s.id === sectionId ? { ...s, enabled } : s);
    pushUndoState(newSections);
    try {
      await updateSections.mutateAsync({ homepage: newSections });
      toast.success(`Section ${enabled ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update section'); }
  }, [orderedHomeSections, updateSections, pushUndoState]);

  const handleHomeSectionDuplicate = useCallback(async (section: SectionConfig) => {
    const newId = generateSectionId();
    const newSection: SectionConfig = { ...section, id: newId, label: `${section.label} (Copy)`, order: orderedHomeSections.length + 1, deletable: true };
    const newSections = [...orderedHomeSections, newSection];
    await saveSections(newSections);
    const sourceKey = `section_custom_${section.id}`;
    const destKey = `section_custom_${newId}`;
    const { data: sourceConfig } = await supabase.from('site_settings').select('value').eq('id', sourceKey).maybeSingle();
    if (sourceConfig?.value) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('site_settings').upsert({ id: destKey, value: sourceConfig.value as never, updated_by: user?.id });
    }
    toast.success(`"${section.label}" duplicated`);
    handleTabChange(`custom-${newId}`);
  }, [orderedHomeSections, saveSections, handleTabChange]);

  const handleHomeSectionDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const newSections = orderedHomeSections.filter(s => s.id !== deleteTarget.id);
    await saveSections(newSections);
    supabase.from('site_settings').delete().eq('id', `section_custom_${deleteTarget.id}`).then(() => {});
    toast.success(`"${deleteTarget.label}" deleted`);
    setDeleteTarget(null);
    if (activeTab === `custom-${deleteTarget.id}` && newSections.length > 0) {
      setActiveTab('hero');
    }
  }, [deleteTarget, orderedHomeSections, saveSections, activeTab]);

  const handleAddSection = useCallback(async (type: CustomSectionType, label: string) => {
    if (isHomePage) {
      const newSection: SectionConfig = { id: generateSectionId(), type, label, description: CUSTOM_TYPE_INFO[type].description, enabled: true, order: orderedHomeSections.length + 1, deletable: true };
      await saveSections([...orderedHomeSections, newSection]);
      toast.success(`"${label}" added`);
      handleTabChange(`custom-${newSection.id}`);
    } else {
      await handlePageSectionAdd(type, label);
    }
  }, [isHomePage, orderedHomeSections, saveSections, handleTabChange]);

  const handleAddFromTemplate = useCallback(async (template: import('@/data/section-templates').SectionTemplate) => {
    const newSection: SectionConfig = {
      id: generateSectionId(), type: template.section_type as CustomSectionType, label: template.name,
      description: template.description, enabled: true, order: (isHomePage ? orderedHomeSections.length : orderedPageSections.length) + 1,
      deletable: true, style_overrides: template.style_overrides,
    };
    if (isHomePage) {
      await saveSections([...orderedHomeSections, newSection]);
    } else if (pagesConfig) {
      const updatedPages: WebsitePagesConfig = { pages: pagesConfig.pages.map(p => p.id !== selectedPageId ? p : { ...p, sections: [...p.sections, newSection] }) };
      await updatePages.mutateAsync(updatedPages);
    }
    const settingsKey = `section_custom_${newSection.id}`;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('site_settings').upsert({ id: settingsKey, value: template.default_config as never, updated_by: user?.id });
    toast.success(`"${template.name}" added from template`);
    handleTabChange(`custom-${newSection.id}`);
  }, [isHomePage, orderedHomeSections, orderedPageSections, pagesConfig, selectedPageId, saveSections, updatePages, handleTabChange]);

  // ─── Style override debounce ───
  const styleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleStyleOverrideChange = useCallback((sectionId: string, overrides: Record<string, unknown>) => {
    if (!pagesConfig) return;
    const updatedPages: WebsitePagesConfig = {
      pages: pagesConfig.pages.map(p => p.id !== selectedPageId ? p : {
        ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, style_overrides: overrides } : s),
      }),
    };
    queryClient.setQueryData(['site-settings', 'website_pages'], updatedPages);
    if (styleDebounceRef.current) clearTimeout(styleDebounceRef.current);
    styleDebounceRef.current = setTimeout(async () => {
      try { await updatePages.mutateAsync(updatedPages); triggerPreviewRefresh(); }
      catch { toast.error('Failed to save style'); queryClient.invalidateQueries({ queryKey: ['site-settings', 'website_pages'] }); }
    }, 500);
  }, [pagesConfig, selectedPageId, updatePages, queryClient]);

  // ─── Non-home page section operations ───
  const handlePageSectionToggle = useCallback(async (sectionId: string, enabled: boolean) => {
    if (!pagesConfig || isHomePage) return;
    const updatedPages: WebsitePagesConfig = { pages: pagesConfig.pages.map(p => p.id !== selectedPageId ? p : { ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, enabled } : s) }) };
    try { await updatePages.mutateAsync(updatedPages); toast.success(`Section ${enabled ? 'enabled' : 'disabled'}`); }
    catch { toast.error('Failed to update section'); }
  }, [pagesConfig, selectedPageId, isHomePage, updatePages]);

  const handlePageSectionReorder = useCallback(async (reorderedSections: SectionConfig[]) => {
    if (!pagesConfig || isHomePage) return;
    const updatedPages: WebsitePagesConfig = { pages: pagesConfig.pages.map(p => p.id !== selectedPageId ? p : { ...p, sections: reorderedSections }) };
    try { await updatePages.mutateAsync(updatedPages); }
    catch { toast.error('Failed to reorder'); }
  }, [pagesConfig, selectedPageId, isHomePage, updatePages]);

  const handlePageSectionAdd = useCallback(async (type: CustomSectionType, label: string) => {
    if (!pagesConfig || isHomePage) return;
    const newSection: SectionConfig = { id: generateSectionId(), type, label, description: CUSTOM_TYPE_INFO[type].description, enabled: true, order: (selectedPage?.sections.length ?? 0) + 1, deletable: true };
    const updatedPages: WebsitePagesConfig = { pages: pagesConfig.pages.map(p => p.id !== selectedPageId ? p : { ...p, sections: [...p.sections, newSection] }) };
    try { await updatePages.mutateAsync(updatedPages); toast.success(`"${label}" added`); setActiveTab(`custom-${newSection.id}`); }
    catch { toast.error('Failed to add section'); }
  }, [pagesConfig, selectedPageId, isHomePage, selectedPage, updatePages]);

  const handlePageSectionDelete = useCallback(async (sectionId: string) => {
    if (!pagesConfig || isHomePage) return;
    const updatedPages: WebsitePagesConfig = { pages: pagesConfig.pages.map(p => p.id !== selectedPageId ? p : { ...p, sections: p.sections.filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i + 1 })) }) };
    try { await updatePages.mutateAsync(updatedPages); supabase.from('site_settings').delete().eq('id', `section_custom_${sectionId}`).then(() => {}); toast.success('Section deleted'); if (activeTab === `custom-${sectionId}`) setActiveTab('page-settings'); }
    catch { toast.error('Failed to delete section'); }
  }, [pagesConfig, selectedPageId, isHomePage, updatePages, activeTab]);

  const handlePageSectionDuplicate = useCallback(async (section: SectionConfig) => {
    if (!pagesConfig || isHomePage) return;
    const newId = generateSectionId();
    const newSection: SectionConfig = { ...section, id: newId, label: `${section.label} (Copy)`, order: (selectedPage?.sections.length ?? 0) + 1, deletable: true };
    const updatedPages: WebsitePagesConfig = { pages: pagesConfig.pages.map(p => p.id !== selectedPageId ? p : { ...p, sections: [...p.sections, newSection] }) };
    try {
      await updatePages.mutateAsync(updatedPages);
      const { data: sourceConfig } = await supabase.from('site_settings').select('value').eq('id', `section_custom_${section.id}`).maybeSingle();
      if (sourceConfig?.value) { const { data: { user } } = await supabase.auth.getUser(); await supabase.from('site_settings').upsert({ id: `section_custom_${newId}`, value: sourceConfig.value as never, updated_by: user?.id }); }
      toast.success(`"${section.label}" duplicated`); setActiveTab(`custom-${newId}`);
    } catch { toast.error('Failed to duplicate'); }
  }, [pagesConfig, selectedPageId, isHomePage, selectedPage, updatePages]);

  const handleSectionLabelChange = useCallback(async (sectionId: string, newLabel: string) => {
    if (!pagesConfig) return;
    const updatedPages: WebsitePagesConfig = { pages: pagesConfig.pages.map(p => p.id !== selectedPageId ? p : { ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, label: newLabel } : s) }) };
    try { await updatePages.mutateAsync(updatedPages); }
    catch { toast.error('Failed to rename section'); }
  }, [pagesConfig, selectedPageId, updatePages]);

  // ─── Page management ───
  const handlePageChange = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
    setStructureMode('layers');
    if (pageId !== 'home') setActiveTab('page-settings');
    else setActiveTab('hero');
  }, []);

  const handleAddPage = useCallback(async () => {
    if (!pagesConfig) return;
    const newPage: PageConfig = { id: generatePageId(), slug: `page-${Date.now().toString(36)}`, title: 'New Page', seo_title: '', seo_description: '', enabled: true, show_in_nav: true, nav_order: pagesConfig.pages.length, sections: [{ id: generateSectionId(), type: 'rich_text', label: 'Content', description: 'Main content block', enabled: true, order: 1, deletable: true }], page_type: 'custom', deletable: true };
    try { await updatePages.mutateAsync({ pages: [...pagesConfig.pages, newPage] }); toast.success('Page created'); setSelectedPageId(newPage.id); setActiveTab('page-settings'); setStructureMode('layers'); }
    catch { toast.error('Failed to create page'); }
  }, [pagesConfig, updatePages]);

  const handleDeletePage = useCallback(async (pageId: string) => {
    if (!pagesConfig) return;
    const page = pagesConfig.pages.find(p => p.id === pageId);
    if (!page?.deletable) { toast.error('This page cannot be deleted'); return; }
    try { await updatePages.mutateAsync({ pages: pagesConfig.pages.filter(p => p.id !== pageId) }); toast.success(`"${page.title}" deleted`); setSelectedPageId('home'); setActiveTab('hero'); }
    catch { toast.error('Failed to delete page'); }
  }, [pagesConfig, updatePages]);

  const handleDuplicatePage = useCallback(async (pageId: string) => {
    if (!pagesConfig) return;
    const page = pagesConfig.pages.find(p => p.id === pageId);
    if (!page || page.page_type === 'home') return;
    const newId = generatePageId();
    const newPage: PageConfig = {
      ...page,
      id: newId,
      slug: `${page.slug}-copy`,
      title: `${page.title} (Copy)`,
      deletable: true,
      sections: page.sections.map(s => ({ ...s, id: generateSectionId() })),
    };
    try {
      await updatePages.mutateAsync({ pages: [...pagesConfig.pages, newPage] });
      toast.success(`"${page.title}" duplicated`);
      setSelectedPageId(newId);
      setActiveTab('page-settings');
      setStructureMode('layers');
    } catch { toast.error('Failed to duplicate page'); }
  }, [pagesConfig, updatePages]);

  const handleUpdatePageSettings = useCallback(async (updatedPage: PageConfig) => {
    if (!pagesConfig) return;
    await updatePages.mutateAsync({ pages: pagesConfig.pages.map(p => p.id === updatedPage.id ? updatedPage : p) });
  }, [pagesConfig, updatePages]);

  const handleApplyPageTemplate = useCallback(async (template: PageTemplate) => {
    if (!pagesConfig || !selectedPage) return;
    const newSections: SectionConfig[] = template.sections.map((ts, i) => ({ id: generateSectionId(), type: ts.type, label: ts.label, description: CUSTOM_TYPE_INFO[ts.type]?.description ?? '', enabled: true, order: i + 1, deletable: true }));
    try {
      await updatePages.mutateAsync({ pages: pagesConfig.pages.map(p => p.id === selectedPageId ? { ...p, sections: newSections } : p) });
      const { data: { user } } = await supabase.auth.getUser();
      for (let i = 0; i < template.sections.length; i++) {
        await supabase.from('site_settings').upsert({ id: `section_custom_${newSections[i].id}`, value: template.sections[i].config as never, updated_by: user?.id });
      }
      toast.success(`"${template.name}" template applied`);
    } catch { toast.error('Failed to apply template'); }
  }, [pagesConfig, selectedPage, selectedPageId, updatePages]);

  const handleConfirmTemplate = useCallback(async () => {
    if (pendingTemplate) { await handleApplyPageTemplate(pendingTemplate); setPendingTemplate(null); }
  }, [pendingTemplate, handleApplyPageTemplate]);

  // ─── Structure mode change ───
  const handleStructureModeChange = useCallback((mode: StructureMode) => {
    setStructureMode(mode);
    if (mode === 'navigation') handleTabChange('navigation');
  }, [handleTabChange]);

  const handlePageSettings = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
    setStructureMode('layers');
    setActiveTab('page-settings');
  }, []);

  // ─── Editor canvas postMessage listener ───
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      const sectionId = msg.sectionId as string | undefined;
      if (!sectionId) return;

      switch (msg.type) {
        case 'EDITOR_SELECT_SECTION': {
          const tabEntry = Object.entries(TAB_TO_SECTION).find(([, v]) => v === sectionId);
          if (tabEntry) {
            handleTabChange(tabEntry[0]);
          } else {
            handleTabChange(`custom-${sectionId}`);
          }
          break;
        }
        case 'EDITOR_TOGGLE_SECTION': {
          const enabled = msg.enabled as boolean;
          if (isHomePage) {
            handleHomeSectionToggle(sectionId, enabled);
          } else {
            handlePageSectionToggle(sectionId, enabled);
          }
          break;
        }
        case 'EDITOR_DUPLICATE_SECTION': {
          const sections = isHomePage ? orderedHomeSections : orderedPageSections;
          const section = sections.find(s => s.id === sectionId);
          if (section) {
            if (isHomePage) handleHomeSectionDuplicate(section);
            else handlePageSectionDuplicate(section);
          }
          break;
        }
        case 'EDITOR_DELETE_SECTION': {
          const sections = isHomePage ? orderedHomeSections : orderedPageSections;
          const section = sections.find(s => s.id === sectionId);
          if (section) {
            if (isHomePage) setDeleteTarget(section);
            else handlePageSectionDelete(sectionId);
          }
          break;
        }
        case 'EDITOR_ADD_SECTION_AT': {
          setShowAddDialog(true);
          break;
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isHomePage, orderedHomeSections, orderedPageSections, handleTabChange, handleHomeSectionToggle, handlePageSectionToggle, handleHomeSectionDuplicate, handlePageSectionDuplicate, handlePageSectionDelete]);

  const getSelectedPageSections = useCallback((): SectionConfig[] => {
    if (isHomePage) return sectionsConfig?.homepage ?? [];
    return selectedPage?.sections ?? [];
  }, [isHomePage, sectionsConfig, selectedPage]);

  const renderEditor = () => {
    if (activeTab === 'page-settings' && selectedPage) {
      return <PageSettingsEditor page={selectedPage} allPages={pagesConfig ?? undefined} onUpdate={handleUpdatePageSettings} />;
    }
    // Resolve the section for Zone A (SectionStyleEditor)
    let resolvedSection: SectionConfig | null = null;
    let EditorComponent: React.ComponentType | null = null;

    if (isHomePage) {
      EditorComponent = EDITOR_COMPONENTS[activeTab] ?? null;
      const sectionId = TAB_TO_SECTION[activeTab];
      resolvedSection = sectionId ? (sectionsConfig?.homepage.find(s => s.id === sectionId) ?? null) : null;
    }

    if (activeTab.startsWith('custom-')) {
      const sectionId = activeTab.replace('custom-', '');
      const section = getSelectedPageSections().find(s => s.id === sectionId);
      if (section) {
        resolvedSection = section;
      }
    }

    // Render Zone A + divider + Zone B
    return (
      <div className="space-y-0">
        {/* Zone A: Section-level controls */}
        {resolvedSection && (
          <SectionStyleEditor
            value={resolvedSection.style_overrides ?? {}}
            onChange={(overrides) => handleStyleOverrideChange(resolvedSection!.id, overrides)}
            sectionId={resolvedSection.id}
          />
        )}

        {/* Divider between zones */}
        {resolvedSection && (
          <div className="mx-1 my-1 border-t border-border/30" />
        )}

        {/* Zone B: Content controls */}
        {EditorComponent ? (
          <EditorComponent />
        ) : activeTab.startsWith('custom-') && resolvedSection ? (
          <CustomSectionEditor
            sectionId={resolvedSection.id}
            sectionType={resolvedSection.type as CustomSectionType}
            sectionLabel={resolvedSection.label}
            onLabelChange={(newLabel) => handleSectionLabelChange(resolvedSection!.id, newLabel)}
          />
        ) : null}
      </div>
    );
    return null;
  };

  const hasInspectorContent = activeTab !== '' && (
    EDITOR_COMPONENTS[activeTab] ||
    activeTab === 'page-settings' ||
    activeTab.startsWith('custom-')
  );

  // ─── Inspector breadcrumb ───
  const inspectorBreadcrumb = useMemo(() => {
    const pageName = selectedPage?.title || 'Home';
    if (activeTab === 'page-settings') return [pageName, 'Page Settings'];
    if (activeTab === 'navigation') return ['Navigation'];
    // Find section label
    const sections = isHomePage ? orderedHomeSections : orderedPageSections;
    if (activeTab.startsWith('custom-')) {
      const sectionId = activeTab.replace('custom-', '');
      const section = sections.find(s => s.id === sectionId);
      return section ? [pageName, section.label] : [pageName];
    }
    // Built-in section
    const sectionId = TAB_TO_SECTION[activeTab];
    if (sectionId) {
      const section = sections.find(s => s.id === sectionId);
      return section ? [pageName, section.label] : [pageName, activeTab];
    }
    return [];
  }, [activeTab, selectedPage, isHomePage, orderedHomeSections, orderedPageSections]);

  // Mobile inspector state
  const [showMobileInspector, setShowMobileInspector] = useState(false);

  // Auto-show mobile inspector when a section is selected
  useEffect(() => {
    if (isMobile && hasInspectorContent) {
      setShowMobileInspector(true);
    }
  }, [activeTab, isMobile, hasInspectorContent]);

  // ─── Render ───
  return (
    <DashboardLayout hideFooter hideTopBar hideSidebar>
      <div ref={layout.containerRef} className="h-screen flex gap-3 p-3 bg-muted/30">
        {isEditorLoading ? (
          <>
            <StructurePanelSkeleton width={layout.structureWidth} visible={layout.structureVisible} />
            <CanvasPanelSkeleton />
            <InspectorPanelSkeleton width={layout.inspectorWidth} visible={layout.inspectorVisible} />
          </>
        ) : (<>
        {/* Structure Panel — responsive */}
        {!isMobile && layout.structureVisible && (
          <StructurePanel
            mode={structureMode}
            onModeChange={handleStructureModeChange}
            onSearchSelect={handleTabChange}
            isCollapsed={false}
            onToggleCollapse={layout.toggleStructure}
            style={{ width: layout.structureWidth }}
          >
            {structureMode === 'pages' && (
              <StructurePagesTab
                pages={pagesConfig?.pages ?? []}
                selectedPageId={selectedPageId}
                onSelectPage={handlePageChange}
                onAddPage={handleAddPage}
                onDeletePage={handleDeletePage}
                onPageSettings={handlePageSettings}
                onDuplicatePage={handleDuplicatePage}
              />
            )}
            {structureMode === 'layers' && (
              <StructureLayersTab
                isHomePage={isHomePage}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                homeSections={orderedHomeSections}
                onHomeSectionsReorder={saveSections}
                onHomeSectionToggle={handleHomeSectionToggle}
                onHomeSectionDuplicate={handleHomeSectionDuplicate}
                onHomeSectionDelete={(section) => setDeleteTarget(section)}
                pageSections={orderedPageSections}
                onPageSectionsReorder={handlePageSectionReorder}
                onPageSectionToggle={handlePageSectionToggle}
                onPageSectionDuplicate={handlePageSectionDuplicate}
                onPageSectionDelete={(section) => handlePageSectionDelete(section.id)}
                pageTitle={selectedPage?.title}
                onAddSection={() => setShowAddDialog(true)}
              />
            )}
            {structureMode === 'navigation' && (
              <StructureNavTab
                isActive={activeTab === 'navigation'}
                onActivate={() => setActiveTab('navigation')}
              />
            )}
          </StructurePanel>
        )}

        {/* Structure collapsed rail */}
        {!isMobile && !layout.structureVisible && !layout.isTablet && (
          <StructurePanel
            mode={structureMode}
            onModeChange={handleStructureModeChange}
            onSearchSelect={handleTabChange}
            isCollapsed
            onToggleCollapse={layout.toggleStructure}
          >
            <div />
          </StructurePanel>
        )}

        {/* Mobile: floating trigger */}
        {isMobile && (
          <Button
            variant="default"
            size={tokens.button.card}
            className="fixed bottom-20 right-4 z-50 rounded-full shadow-lg h-12 w-12 p-0"
            onClick={() => setShowMobileStructure(prev => !prev)}
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
        )}

        {/* Mobile: Structure drawer */}
        {isMobile && showMobileStructure && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setShowMobileStructure(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-background border-r shadow-xl overflow-auto" onClick={e => e.stopPropagation()}>
              <StructurePanel mode={structureMode} onModeChange={handleStructureModeChange} onSearchSelect={(tab) => { handleTabChange(tab); setShowMobileStructure(false); }}>
                {structureMode === 'pages' && (
                  <StructurePagesTab pages={pagesConfig?.pages ?? []} selectedPageId={selectedPageId} onSelectPage={(id) => { handlePageChange(id); setShowMobileStructure(false); }} onAddPage={handleAddPage} onDeletePage={handleDeletePage} onPageSettings={handlePageSettings} onDuplicatePage={handleDuplicatePage} />
                )}
                {structureMode === 'layers' && (
                  <StructureLayersTab isHomePage={isHomePage} activeTab={activeTab} onTabChange={(tab) => { handleTabChange(tab); setShowMobileStructure(false); }} homeSections={orderedHomeSections} onHomeSectionsReorder={saveSections} onHomeSectionToggle={handleHomeSectionToggle} onHomeSectionDuplicate={handleHomeSectionDuplicate} onHomeSectionDelete={(section) => setDeleteTarget(section)} pageSections={orderedPageSections} onPageSectionsReorder={handlePageSectionReorder} onPageSectionToggle={handlePageSectionToggle} onPageSectionDuplicate={handlePageSectionDuplicate} onPageSectionDelete={(section) => handlePageSectionDelete(section.id)} pageTitle={selectedPage?.title} onAddSection={() => setShowAddDialog(true)} />
                )}
                {structureMode === 'navigation' && (
                  <StructureNavTab isActive={activeTab === 'navigation'} onActivate={() => setActiveTab('navigation')} />
                )}
              </StructurePanel>
            </div>
          </div>
        )}

        {/* Canvas Panel (flex-1) */}
        <CanvasPanel
          activeSectionId={activeSectionId}
          scrollTrigger={scrollCounter}
          previewUrl={previewUrl}
          siteName={orgName}
          isDirty={isDirty}
          isSaving={isSaving}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={triggerSave}
          onPreview={() => window.open(openSiteUrl, '_blank')}
        />

        {/* Inspector Panel — Desktop, expanded */}
        {!isMobile && layout.inspectorVisible && (
          <InspectorPanel
            hasSelection={!!hasInspectorContent}
            selectionKey={activeTab}
            breadcrumb={inspectorBreadcrumb}
            onToggleCollapse={layout.toggleInspector}
            style={{ width: layout.inspectorWidth }}
          >
            {renderEditor()}
          </InspectorPanel>
        )}

        {/* Inspector collapsed rail */}
        {!isMobile && !layout.inspectorVisible && !layout.isTablet && (
          <InspectorPanel
            hasSelection={false}
            isCollapsed
            onToggleCollapse={layout.toggleInspector}
          >
            <div />
          </InspectorPanel>
        )}

        {/* Inspector Panel - Mobile Bottom Sheet */}
        {isMobile && (
          <Drawer open={showMobileInspector} onOpenChange={setShowMobileInspector}>
            <DrawerContent className="max-h-[80vh]">
              <DrawerHeader className="pb-2">
                <DrawerTitle className="text-sm font-sans">
                  {inspectorBreadcrumb.join(' → ') || 'Inspector'}
                </DrawerTitle>
              </DrawerHeader>
              <ScrollArea className="flex-1 px-4 pb-4 max-h-[65vh]">
                {renderEditor()}
              </ScrollArea>
            </DrawerContent>
          </Drawer>
        )}

        {/* Unsaved Changes Dialog */}
        <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>You have unsaved changes that will be lost if you switch sections.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setShowUnsavedDialog(false); setPendingTab(null); }}>Stay & Keep Editing</AlertDialogCancel>
              <AlertDialogAction onClick={handleDiscardAndSwitch}>Discard & Switch</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{deleteTarget?.label}"?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently remove this section. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleHomeSectionDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Section Dialog */}
        <AddSectionDialog open={showAddDialog} onOpenChange={setShowAddDialog} onAdd={handleAddSection} onAddFromTemplate={handleAddFromTemplate} />

        {/* Page Template Picker */}
        <PageTemplatePicker open={showPageTemplatePicker} onOpenChange={setShowPageTemplatePicker} onSelect={(t) => setPendingTemplate(t)} />

        {/* Template Confirmation */}
        <AlertDialog open={!!pendingTemplate} onOpenChange={(open) => !open && setPendingTemplate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply "{pendingTemplate?.name}" Template?</AlertDialogTitle>
              <AlertDialogDescription>This will replace all sections on "{selectedPage?.title}". This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmTemplate}>Apply Template</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </>)}
      </div>
    </DashboardLayout>
  );
}
