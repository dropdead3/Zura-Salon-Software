import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Check,
  Circle,
  ExternalLink,
  Globe,
  History,
  Loader2,
  MousePointer2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  FileText,
  Menu,
  MoreHorizontal,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrgPublicUrl } from '@/hooks/useOrgPublicUrl';
import {
  useWebsitePages,
  useUpdateWebsitePages,
  generatePageId,
  type PageConfig,
} from '@/hooks/useWebsitePages';
import {
  CUSTOM_TYPE_INFO,
  generateSectionId,
  isBuiltinSection,
  type CustomSectionType,
  type SectionConfig,
} from '@/hooks/useWebsiteSections';
import {
  useChangelogSummary,
  useDiscardToLastPublished,
  useHasEverPublished,
} from '@/hooks/usePublishChangelog';
import { WebsiteEditorSidebar } from './WebsiteEditorSidebar';
import { LivePreviewPanel } from './LivePreviewPanel';
import { PublishChangelog } from './PublishChangelog';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { HeroEditor } from './HeroEditor';
import { BrandStatementEditor } from './BrandStatementEditor';
import { NewClientEditor } from './NewClientEditor';
import { TestimonialsEditor } from './TestimonialsEditor';
import { ExtensionsEditor } from './ExtensionsEditor';
import { FAQEditor } from './FAQEditor';
import { BrandsManager } from './BrandsManager';
import { DrinksManager } from './DrinksManager';
import { FooterCTAEditor } from './FooterCTAEditor';
import { FooterEditor } from './FooterEditor';
import { ServicesPreviewEditor } from './ServicesPreviewEditor';
import { PopularServicesEditor } from './PopularServicesEditor';
import { GalleryDisplayEditor } from './GalleryDisplayEditor';
import { StylistsDisplayEditor } from './StylistsDisplayEditor';
import { LocationsDisplayEditor } from './LocationsDisplayEditor';
import { TestimonialsContent } from './TestimonialsContent';
import { GalleryContent } from './GalleryContent';
import { StylistsContent } from './StylistsContent';
import { LocationsContent } from './LocationsContent';
import { ServicesContent } from './ServicesContent';
import { AnnouncementBarContent } from './AnnouncementBarContent';
import { PagesManager } from './PagesManager';
import { PageSettingsEditor } from './PageSettingsEditor';
import { CustomSectionEditor } from './CustomSectionEditor';
import { PageTemplatePicker } from './PageTemplatePicker';
import { Badge } from '@/components/ui/badge';
import type { PageTemplate } from '@/data/page-templates';

// ─── Builtin tab → component map ───
const BUILTIN_EDITORS: Record<string, React.ComponentType> = {
  services: ServicesContent,
  testimonials: TestimonialsContent,
  gallery: GalleryContent,
  stylists: StylistsContent,
  locations: LocationsContent,
  banner: AnnouncementBarContent,
  hero: HeroEditor,
  brand: BrandStatementEditor,
  'testimonials-section': TestimonialsEditor,
  'services-preview': ServicesPreviewEditor,
  'popular-services': PopularServicesEditor,
  'gallery-section': GalleryDisplayEditor,
  'new-client': NewClientEditor,
  'stylists-section': StylistsDisplayEditor,
  'locations-section': LocationsDisplayEditor,
  extensions: ExtensionsEditor,
  faq: FAQEditor,
  brands: BrandsManager,
  drinks: DrinksManager,
  'footer-cta': FooterCTAEditor,
  footer: FooterEditor,
  pages: PagesManager,
};

// Map home built-in section TYPES → editor tab keys (mirrors sidebar).
// Used by canvas click-to-edit to resolve postMessage section IDs into tabs.
const BUILTIN_TYPE_TO_TAB: Record<string, string> = {
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

const TAB_LABELS: Record<string, string> = {
  services: 'Services Manager',
  testimonials: 'Testimonials Manager',
  gallery: 'Gallery Manager',
  stylists: 'Stylists Manager',
  locations: 'Locations Manager',
  banner: 'Announcement Banner',
  hero: 'Hero Section',
  brand: 'Brand Statement',
  'testimonials-section': 'Testimonials Display',
  'services-preview': 'Services Preview',
  'popular-services': 'Popular Services',
  'gallery-section': 'Gallery Display',
  'new-client': 'New Client CTA',
  'stylists-section': 'Stylists Display',
  'locations-section': 'Locations Display',
  extensions: 'Extensions Spotlight',
  faq: 'FAQ',
  brands: 'Partner Brands',
  drinks: 'Drink Menu',
  'footer-cta': 'Footer CTA',
  footer: 'Footer Settings',
  pages: 'All Pages',
  'page-settings': 'Page Settings',
  navigation: 'Navigation Menus',
};

type PersistedState = {
  editorTab: string;
  selectedPageId: string;
  showPreview: boolean;
};

function readPersisted(orgId: string | undefined): Partial<PersistedState> {
  if (!orgId || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(`zura.websiteEditor.${orgId}`);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return {};
  }
}

function writePersisted(orgId: string | undefined, state: PersistedState) {
  if (!orgId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`zura.websiteEditor.${orgId}`, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function WebsiteEditorShell() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const persisted = useMemo(() => readPersisted(orgId), [orgId]);

  const [editorTab, setEditorTab] = useState<string>(persisted.editorTab ?? 'hero');
  const [selectedPageId, setSelectedPageId] = useState<string>(persisted.selectedPageId ?? 'home');
  const [showPreview, setShowPreview] = useState<boolean>(
    persisted.showPreview ?? (typeof window !== 'undefined' ? window.innerWidth >= 1280 : true),
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [addPageOpen, setAddPageOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [deletePageTarget, setDeletePageTarget] = useState<PageConfig | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const pagePickerRef = useRef<HTMLButtonElement>(null);

  // Wave 3: dirty + saving + last-saved tracking from active editor surfaces.
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [, setSavedTick] = useState(0); // forces re-render of relative timestamp
  // Pending navigation when an unsaved-changes guard intercepts a tab/page switch.
  const [pendingNav, setPendingNav] = useState<
    | { type: 'tab'; tab: string }
    | { type: 'page'; pageId: string }
    | null
  >(null);

  const { hasChanges, totalChanges } = useChangelogSummary();
  const { data: hasEverPublished } = useHasEverPublished();
  const discardMutation = useDiscardToLastPublished();

  const { data: pagesConfig } = useWebsitePages();
  const updatePages = useUpdateWebsitePages();
  const selectedPage = pagesConfig?.pages?.find((p) => p.id === selectedPageId);
  const selectedPageTitle = selectedPage?.title ?? 'Home';
  const isHomePage = selectedPageId === 'home';

  const { publicUrl: getPublicUrl, publicPageUrl } = useOrgPublicUrl();
  const orgPreviewUrl = getPublicUrl();
  const livePreviewUrl = publicPageUrl(selectedPage?.slug, { preview: true, mode: 'view' });

  // Persist last-used editor state per org.
  useEffect(() => {
    writePersisted(orgId, { editorTab, selectedPageId, showPreview });
  }, [orgId, editorTab, selectedPageId, showPreview]);

  // When switching to a non-home page, default to its first section so the
  // canvas isn't stranded on an irrelevant home-page editor.
  useEffect(() => {
    if (isHomePage) return;
    if (!selectedPage) return;
    const tabIsForThisPage =
      editorTab === 'page-settings' ||
      editorTab === 'pages' ||
      selectedPage.sections.some((s) => `custom-${s.id}` === editorTab);
    if (!tabIsForThisPage) {
      const first = selectedPage.sections[0];
      if (first) setEditorTab(`custom-${first.id}`);
      else setEditorTab('page-settings');
    }
  }, [selectedPageId, selectedPage, isHomePage, editorTab]);

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (key === 's' && !isEditable) {
        e.preventDefault();
        setPublishOpen(true);
      } else if (key === 'p' && !isEditable) {
        e.preventDefault();
        setShowPreview((v) => !v);
      } else if (key === 'k' && !isEditable) {
        e.preventDefault();
        pagePickerRef.current?.click();
      } else if (key === '\\' && !isEditable) {
        e.preventDefault();
        setShowSidebar((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Wave 3: dirty + saving listeners (from CustomSectionEditor / PageSettingsEditor) ───
  useEffect(() => {
    const onDirty = (e: Event) => {
      const dirty = !!(e as CustomEvent).detail?.dirty;
      setIsDirty(dirty);
      if (!dirty) setLastSavedAt(Date.now());
    };
    const onSaving = (e: Event) => setIsSaving(!!(e as CustomEvent).detail?.saving);
    window.addEventListener('editor-dirty-state', onDirty);
    window.addEventListener('editor-saving-state', onSaving);
    return () => {
      window.removeEventListener('editor-dirty-state', onDirty);
      window.removeEventListener('editor-saving-state', onSaving);
    };
  }, []);

  // Tick the "Saved 2s ago" label every 30s so it stays current without spamming renders.
  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => setSavedTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  // Browser-level guard: warn before unloading the page with unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Guarded navigation — used by sidebar tab change, page picker, and click-to-edit.
  const requestTabChange = useCallback(
    (tab: string) => {
      if (tab === editorTab) return;
      if (isDirty) {
        setPendingNav({ type: 'tab', tab });
        return;
      }
      setEditorTab(tab);
    },
    [editorTab, isDirty],
  );

  const requestPageChange = useCallback(
    (pageId: string) => {
      if (pageId === selectedPageId) return;
      if (isDirty) {
        setPendingNav({ type: 'page', pageId });
        return;
      }
      setSelectedPageId(pageId);
    },
    [selectedPageId, isDirty],
  );

  // ─── Page CRUD ───
  const handleCreatePage = useCallback(async () => {
    const title = newPageTitle.trim();
    if (!title || !pagesConfig) return;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
    if (!slug) {
      toast({ variant: 'destructive', title: 'Invalid title', description: 'Page needs a URL-safe name.' });
      return;
    }
    if (pagesConfig.pages.some((p) => p.slug === slug)) {
      toast({ variant: 'destructive', title: 'Slug taken', description: `"${slug}" is already used.` });
      return;
    }
    const newPage: PageConfig = {
      id: generatePageId(),
      slug,
      title,
      seo_title: title,
      seo_description: '',
      enabled: false,
      show_in_nav: true,
      nav_order: pagesConfig.pages.length,
      sections: [],
      page_type: 'custom',
      deletable: true,
    };
    try {
      await updatePages.mutateAsync({ pages: [...pagesConfig.pages, newPage] });
      toast({ title: 'Page created', description: `"${title}" is in draft mode.` });
      setAddPageOpen(false);
      setNewPageTitle('');
      setSelectedPageId(newPage.id);
      setEditorTab('page-settings');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to create page',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [newPageTitle, pagesConfig, updatePages, toast]);

  const handleDeletePage = useCallback(async () => {
    if (!deletePageTarget || !pagesConfig) return;
    try {
      await updatePages.mutateAsync({
        pages: pagesConfig.pages.filter((p) => p.id !== deletePageTarget.id),
      });
      toast({ title: 'Page deleted', description: `"${deletePageTarget.title}" removed.` });
      if (selectedPageId === deletePageTarget.id) {
        setSelectedPageId('home');
        setEditorTab('hero');
      }
      setDeletePageTarget(null);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [deletePageTarget, pagesConfig, updatePages, selectedPageId, toast]);

  const updateSelectedPage = useCallback(
    async (mutator: (p: PageConfig) => PageConfig) => {
      if (!pagesConfig || !selectedPage) return;
      const updated = pagesConfig.pages.map((p) => (p.id === selectedPage.id ? mutator(p) : p));
      try {
        await updatePages.mutateAsync({ pages: updated });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [pagesConfig, selectedPage, updatePages, toast],
  );

  // Per-page section operations (non-home pages).
  const handlePageSectionToggle = useCallback(
    (sectionId: string, enabled: boolean) => {
      void updateSelectedPage((p) => ({
        ...p,
        sections: p.sections.map((s) => (s.id === sectionId ? { ...s, enabled } : s)),
      }));
    },
    [updateSelectedPage],
  );

  const handlePageSectionReorder = useCallback(
    (sections: SectionConfig[]) => {
      void updateSelectedPage((p) => ({ ...p, sections }));
    },
    [updateSelectedPage],
  );

  const handlePageSectionDelete = useCallback(
    (sectionId: string) => {
      void updateSelectedPage((p) => ({
        ...p,
        sections: p.sections.filter((s) => s.id !== sectionId),
      }));
      if (editorTab === `custom-${sectionId}`) setEditorTab('page-settings');
    },
    [updateSelectedPage, editorTab],
  );

  const handlePageSectionDuplicate = useCallback(
    (section: SectionConfig) => {
      const newId = generateSectionId();
      void updateSelectedPage((p) => ({
        ...p,
        sections: [
          ...p.sections,
          { ...section, id: newId, label: `${section.label} (Copy)`, order: p.sections.length + 1 },
        ],
      }));
      toast({ title: 'Section duplicated', description: section.label });
    },
    [updateSelectedPage, toast],
  );

  const handlePageSectionAdd = useCallback(
    (type: CustomSectionType, label: string) => {
      const newSection: SectionConfig = {
        id: generateSectionId(),
        type,
        label,
        description: CUSTOM_TYPE_INFO[type].description,
        enabled: true,
        order: 0,
        deletable: true,
      };
      void updateSelectedPage((p) => ({
        ...p,
        sections: [...p.sections, { ...newSection, order: p.sections.length + 1 }],
      }));
      setEditorTab(`custom-${newSection.id}`);
    },
    [updateSelectedPage],
  );

  const handleApplyPageTemplate = useCallback(
    (template: PageTemplate) => {
      const newSections: SectionConfig[] = template.sections.map((s, i) => ({
        id: generateSectionId(),
        type: s.type as CustomSectionType,
        label: s.label,
        description: CUSTOM_TYPE_INFO[s.type as CustomSectionType]?.description ?? '',
        enabled: true,
        order: i + 1,
        deletable: true,
      }));
      void updateSelectedPage((p) => ({ ...p, sections: newSections }));
      toast({ title: 'Template applied', description: template.name });
      const first = newSections[0];
      if (first) setEditorTab(`custom-${first.id}`);
    },
    [updateSelectedPage, toast],
  );

  // ─── Wave 2: canvas → editor bridge (click-to-edit, hover toggle, duplicate, delete, add) ───
  // Resolves a SectionConfig.id arriving from the iframe into an editor tab key.
  const resolveSectionTab = useCallback(
    (sectionId: string): string | null => {
      // Per-page sections (non-home) carry random IDs and use custom-<id>.
      const pageSection = selectedPage?.sections.find((s) => s.id === sectionId);
      if (pageSection) {
        if (isBuiltinSection(pageSection.type)) {
          return BUILTIN_TYPE_TO_TAB[pageSection.type] ?? null;
        }
        return `custom-${pageSection.id}`;
      }
      // Home page: built-in section IDs equal their type ('hero', 'gallery', …).
      const homeSection = pagesConfig?.pages
        .find((p) => p.id === 'home')
        ?.sections.find((s) => s.id === sectionId);
      if (homeSection) {
        if (isBuiltinSection(homeSection.type)) {
          return BUILTIN_TYPE_TO_TAB[homeSection.type] ?? null;
        }
        return `custom-${homeSection.id}`;
      }
      // Defensive fallback: maybe sectionId IS a built-in type.
      return BUILTIN_TYPE_TO_TAB[sectionId] ?? null;
    },
    [pagesConfig, selectedPage],
  );

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;
      if (!msg.type.startsWith('EDITOR_')) return;
      const sectionId: string | undefined = msg.sectionId;

      switch (msg.type) {
        case 'EDITOR_SELECT_SECTION': {
          if (!sectionId) return;
          const tab = resolveSectionTab(sectionId);
          if (tab) requestTabChange(tab);
          break;
        }
        case 'EDITOR_TOGGLE_SECTION': {
          if (!sectionId || !selectedPage) return;
          // Only meaningful on per-page sections; home built-ins are managed in sidebar.
          const onPage = selectedPage.sections.some((s) => s.id === sectionId);
          if (onPage) handlePageSectionToggle(sectionId, !!msg.enabled);
          break;
        }
        case 'EDITOR_DUPLICATE_SECTION': {
          if (!sectionId || !selectedPage) return;
          const section = selectedPage.sections.find((s) => s.id === sectionId);
          if (section) handlePageSectionDuplicate(section);
          break;
        }
        case 'EDITOR_DELETE_SECTION': {
          if (!sectionId || !selectedPage) return;
          const onPage = selectedPage.sections.some((s) => s.id === sectionId);
          if (onPage) handlePageSectionDelete(sectionId);
          break;
        }
        case 'EDITOR_ADD_SECTION_AT': {
          // Open the page-settings/sections manager for now; granular insertion
          // would require lifting the AddSectionDialog into the shell.
          if (!isHomePage) requestTabChange('page-settings');
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [
    resolveSectionTab,
    requestTabChange,
    selectedPage,
    isHomePage,
    handlePageSectionToggle,
    handlePageSectionDuplicate,
    handlePageSectionDelete,
  ]);

  // Sidebar → canvas: highlight the active section in the iframe whenever the tab changes.
  useEffect(() => {
    // Find a sectionId that maps back to this tab so we can post it.
    const allSections: SectionConfig[] = [
      ...(selectedPage?.sections ?? []),
      ...(pagesConfig?.pages.find((p) => p.id === 'home')?.sections ?? []),
    ];
    let activeSectionId: string | undefined;
    if (editorTab.startsWith('custom-')) {
      activeSectionId = editorTab.replace('custom-', '');
    } else {
      const match = allSections.find(
        (s) => isBuiltinSection(s.type) && BUILTIN_TYPE_TO_TAB[s.type] === editorTab,
      );
      activeSectionId = match?.id;
    }
    if (!activeSectionId) return;
    // Broadcast — LivePreviewPanel posts to its iframe; we also fire a window event
    // for any embedded preview that listens directly.
    window.postMessage({ type: 'PREVIEW_SET_ACTIVE_SECTION', sectionId: activeSectionId }, '*');
  }, [editorTab, pagesConfig, selectedPage]);

  // ─── Resolve current editor component ───
  const renderActiveEditor = () => {
    // Custom section editor (matches both home custom_* and per-page sections)
    if (editorTab.startsWith('custom-')) {
      const sectionId = editorTab.replace('custom-', '');
      // Look for it on the selected page first, then home.
      const allSections: SectionConfig[] = [
        ...(selectedPage?.sections ?? []),
        ...(pagesConfig?.pages.find((p) => p.id === 'home')?.sections ?? []),
      ];
      const section = allSections.find((s) => s.id === sectionId);
      if (section && !isBuiltinSection(section.type)) {
        return (
          <CustomSectionEditor
            sectionId={section.id}
            sectionType={section.type as CustomSectionType}
            sectionLabel={section.label}
          />
        );
      }
    }

    // Page settings editor
    if (editorTab === 'page-settings' && selectedPage) {
      return (
        <PageSettingsEditor
          page={selectedPage}
          allPages={pagesConfig}
          onUpdate={async (updated) => {
            await updateSelectedPage(() => updated);
          }}
        />
      );
    }

    const Component = BUILTIN_EDITORS[editorTab];
    if (Component) return <Component />;

    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <MousePointer2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="font-display text-base tracking-wide uppercase text-foreground">
            Pick a section to edit
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose a section from the sidebar — Hero, Services, Testimonials, Footer — and your
            changes appear in the live canvas on the right.
          </p>
        </div>
        {!showSidebar && !isMobile && (
          <Button variant="outline" size="sm" onClick={() => setShowSidebar(true)} className="mt-2">
            <PanelLeftOpen className="h-4 w-4 mr-1.5" />
            Show sections
          </Button>
        )}
      </div>
    );
  };

  const sectionLabel = TAB_LABELS[editorTab] ?? (editorTab.startsWith('custom-') ? 'Custom Section' : 'Editor');

  // Sidebar element (reused for desktop pane and mobile sheet).
  const sidebarEl = (
    <WebsiteEditorSidebar
      activeTab={editorTab}
      onTabChange={(t) => {
        setEditorTab(t);
        if (isMobile) setMobileSidebarOpen(false);
      }}
      selectedPageId={selectedPageId}
      onPageChange={(p) => {
        setSelectedPageId(p);
        if (isMobile) setMobileSidebarOpen(false);
      }}
      onToggleCollapse={() => setShowSidebar(false)}
      onAddPage={() => setAddPageOpen(true)}
      onDeletePage={(pageId) => {
        const page = pagesConfig?.pages.find((p) => p.id === pageId);
        if (page) setDeletePageTarget(page);
      }}
      onApplyPageTemplate={() => setTemplatePickerOpen(true)}
      onPageSectionToggle={handlePageSectionToggle}
      onPageSectionReorder={handlePageSectionReorder}
      onPageSectionDelete={handlePageSectionDelete}
      onPageSectionDuplicate={handlePageSectionDuplicate}
      onPageSectionAdd={handlePageSectionAdd}
    />
  );

  return (
    <div className="space-y-0 -mx-1">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && (
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full shrink-0"
              onClick={() => setMobileSidebarOpen(true)}
              title="Open sections"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}

          {/* Page picker — always visible */}
          <Select value={selectedPageId} onValueChange={setSelectedPageId}>
            <SelectTrigger
              ref={pagePickerRef}
              className="h-9 text-xs min-w-[160px] max-w-[260px] rounded-full"
              title="Switch page (⌘K)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Select page" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {pagesConfig?.pages?.length ? (
                pagesConfig.pages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>{p.title}</span>
                      {!p.enabled && <span className="text-muted-foreground">(draft)</span>}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="home">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span>Home</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {/* Breadcrumb */}
          <nav
            aria-label="Editor breadcrumb"
            className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0"
          >
            <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
            <span className="truncate text-foreground font-medium">{selectedPageTitle}</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
            <span className="truncate text-foreground font-medium">{sectionLabel}</span>
          </nav>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Primary action: Publish */}
          <Button
            variant="default"
            size={tokens.button.card}
            onClick={() => setPublishOpen(true)}
            className="relative"
            title="Publish changes (⌘S)"
          >
            <Globe className="h-4 w-4 mr-1" />
            Publish
            {hasChanges && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 px-1.5 text-[10px] bg-primary-foreground/20 text-primary-foreground border-0"
              >
                {totalChanges}
              </Badge>
            )}
          </Button>

          {/* Live Canvas inline toggle */}
          <Button
            variant={showPreview ? 'secondary' : 'outline'}
            size={tokens.button.card}
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? 'Hide live canvas (⌘P)' : 'Show live canvas (⌘P)'}
          >
            {showPreview ? (
              <PanelRightClose className="h-4 w-4 mr-1" />
            ) : (
              <PanelRightOpen className="h-4 w-4 mr-1" />
            )}
            Canvas
          </Button>

          {/* Overflow */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9" title="More">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                <History className="h-4 w-4 mr-2" />
                Version History
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDiscardOpen(true)}
                disabled={!hasChanges || !hasEverPublished || discardMutation.isPending}
                className="text-destructive focus:text-destructive"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Discard Unpublished
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  orgPreviewUrl && window.open(orgPreviewUrl, '_blank', 'noopener,noreferrer')
                }
                disabled={!orgPreviewUrl}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Public Site
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <PublishChangelog open={publishOpen} onOpenChange={setPublishOpen} />
      <VersionHistoryPanel open={historyOpen} onOpenChange={setHistoryOpen} />

      {/* Mobile sidebar Sheet */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[320px] max-w-[85vw]">
          <SheetTitle className="sr-only">Website Editor Sections</SheetTitle>
          <div className="h-full overflow-hidden">{sidebarEl}</div>
        </SheetContent>
      </Sheet>

      {/* Discard confirmation */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unpublished changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert pages, theme, footer, and announcement bar to the last published
              version. A backup of the current state is saved to History so you can recover it
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={discardMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={discardMutation.isPending}
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await discardMutation.mutateAsync();
                  toast({
                    title: 'Reverted to last published',
                    description: 'A backup of your changes was saved to History.',
                  });
                  setDiscardOpen(false);
                } catch (err) {
                  toast({
                    variant: 'destructive',
                    title: 'Discard failed',
                    description: err instanceof Error ? err.message : 'Unknown error',
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {discardMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reverting…
                </>
              ) : (
                'Discard & Restore'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add page dialog */}
      <Dialog open={addPageOpen} onOpenChange={setAddPageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new page</DialogTitle>
            <DialogDescription>
              Pages start in draft mode. Add sections, then enable in Page Settings to publish.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-page-title">Page title</Label>
              <Input
                id="new-page-title"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                placeholder="e.g. Services Menu"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreatePage();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePage} disabled={!newPageTitle.trim() || updatePages.isPending}>
              {updatePages.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create page'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete page confirmation */}
      <AlertDialog
        open={!!deletePageTarget}
        onOpenChange={(open) => !open && setDeletePageTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deletePageTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the page and its sections. Public links to this page will
              return 404. This cannot be undone (but a snapshot is preserved in Version History).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeletePage();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Page template picker */}
      <PageTemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onSelect={handleApplyPageTemplate}
      />

      {/* Editor canvas */}
      <div className="border rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 18rem)' }}>
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {showSidebar && !isMobile && (
            <>
              <ResizablePanel defaultSize={22} minSize={15} maxSize={30}>
                {sidebarEl}
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          <ResizablePanel defaultSize={showPreview ? 48 : 78} minSize={30}>
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-shrink-0 px-4 py-2 border-b bg-muted/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {!isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="h-7 w-7"
                      title={showSidebar ? 'Hide sections (⌘\\)' : 'Show sections (⌘\\)'}
                    >
                      {showSidebar ? (
                        <PanelLeftClose className="h-3.5 w-3.5" />
                      ) : (
                        <PanelLeftOpen className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground truncate">{sectionLabel}</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  }
                >
                  {renderActiveEditor()}
                </Suspense>
              </div>
            </div>
          </ResizablePanel>

          {showPreview && !isMobile && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <LivePreviewPanel previewUrl={livePreviewUrl ?? undefined} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
