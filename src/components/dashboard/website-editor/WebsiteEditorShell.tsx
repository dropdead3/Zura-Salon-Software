import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Circle,
  ExternalLink,
  Globe,
  History,
  Loader2,
  MousePointer2,
  PanelLeftOpen,
  PanelRightClose,
  
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Settings,
  FileText,
  Menu,
  MoreHorizontal,
  Undo2,
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
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog';
import { DirtyActionButton } from '@/components/ui/dirty-action-button';
import { UnsavedChangesToast } from '@/components/ui/unsaved-changes-toast';
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
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  useDiscardDrafts,
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
import { StickyFooterBarEditor } from './StickyFooterBarEditor';
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
import { PromotionalPopupEditor } from './PromotionalPopupEditor';
import { PagesManager } from './PagesManager';
import { PageSettingsEditor } from './PageSettingsEditor';
import { CustomSectionEditor } from './CustomSectionEditor';
import { PageTemplatePicker } from './PageTemplatePicker';
import { SiteDesignPanel } from './SiteDesignPanel';
import { InlineEditCommitHandler } from './InlineEditCommitHandler';
import {
  EditorHistoryProvider,
  pushEditorHistoryEntry,
  useEditorHistory,
} from './EditorHistoryProvider';
import { Palette } from 'lucide-react';
import { AddSectionDialog } from './AddSectionDialog';
import { SectionStyleEditor } from './SectionStyleEditor';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Badge } from '@/components/ui/badge';
import type { PageTemplate } from '@/data/page-templates';
import type { SectionTemplate } from '@/data/section-templates';
import type { StyleOverrides } from '@/components/home/SectionStyleWrapper';

// ─── Builtin tab → component map ───
const BUILTIN_EDITORS: Record<string, React.ComponentType> = {
  services: ServicesContent,
  testimonials: TestimonialsContent,
  gallery: GalleryContent,
  stylists: StylistsContent,
  locations: LocationsContent,
  banner: AnnouncementBarContent,
  promotions: PromotionalPopupEditor,
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
  'sticky-footer': StickyFooterBarEditor,
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
  promotions: 'Promotional Popup',
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
  'sticky-footer': 'Sticky Footer',
  pages: 'All Pages',
  'page-settings': 'Page Settings',
  navigation: 'Navigation Menus',
};

type PersistedState = {
  // Editor entry contract: only layout preferences survive across sessions.
  //   - `editorTab` is NOT persisted — landing deep in whatever surface the
  //     user last touched read as broken navigation.
  //   - `selectedPageId` is NOT persisted for the same reason — re-entering
  //     should always land on Home, not the last page they edited.
  // Explicit deep-links override via `?editor=<tab>`.
  showPreview: boolean;
};

// Legacy persisted shape included `editorTab` and `selectedPageId`. We keep
// reading the old shape only to strip those fields on next write so users
// carrying old localStorage state stop jumping after their next entry.
type LegacyPersistedState = PersistedState & {
  editorTab?: string;
  selectedPageId?: string;
};

function readPersisted(orgId: string | undefined): Partial<LegacyPersistedState> {
  if (!orgId || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(`zura.websiteEditor.${orgId}`);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<LegacyPersistedState>;
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
  return (
    <EditorHistoryProvider>
      <WebsiteEditorShellInner />
    </EditorHistoryProvider>
  );
}

function WebsiteEditorShellInner() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const [searchParams] = useSearchParams();

  const persisted = useMemo(() => readPersisted(orgId), [orgId]);

  // Initial editor tab: explicit `?editor=` deep-link wins; otherwise neutral
  // default ('hero' for home page; non-home pages get auto-corrected to a
  // valid page-scoped tab by the effect at lines ~343-351).
  const initialEditorTab = searchParams.get('editor') ?? 'hero';
  const [editorTab, setEditorTab] = useState<string>(initialEditorTab);
  // Always land on Home on entry — see PersistedState comment.
  const [selectedPageId, setSelectedPageId] = useState<string>('home');
  const [showPreview, setShowPreview] = useState<boolean>(
    persisted.showPreview ?? (typeof window !== 'undefined' ? window.innerWidth >= 1280 : true),
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  // Per-editor "Discard Changes" — reverts the active editor's local working
  // copy back to last-saved state. Distinct from `discardOpen` which reverts
  // *all* unpublished drafts back to live.
  const [revertDraftOpen, setRevertDraftOpen] = useState(false);
  const [addPageOpen, setAddPageOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [deletePageTarget, setDeletePageTarget] = useState<PageConfig | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [siteDesignOpen, setSiteDesignOpen] = useState(false);
  // Track Site Design panel dirty state so backdrop/ESC closes can route
  // through the panel's discard-draft confirm dialog instead of silently
  // dropping unsaved color/typography edits.
  const [siteDesignDirty, setSiteDesignDirty] = useState(false);
  useEffect(() => {
    const onDirty = (e: Event) => {
      setSiteDesignDirty(!!(e as CustomEvent).detail?.dirty);
    };
    window.addEventListener('site-design-dirty-state', onDirty);
    return () => window.removeEventListener('site-design-dirty-state', onDirty);
  }, []);
  // Wave 4: insert-at and style inspector
  const [addSectionState, setAddSectionState] = useState<
    | { open: false }
    | { open: true; pageId: string; afterSectionId: string | null }
  >({ open: false });
  const [styleTarget, setStyleTarget] = useState<
    | { pageId: string; sectionId: string }
    | null
  >(null);
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
  // Exit Editor confirm dialog (only opens when there are unsaved/unpublished changes).
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const performExit = useCallback(() => {
    navigate(dashPath('/admin/website-hub'));
  }, [navigate, dashPath]);

  const { hasChanges, totalChanges } = useChangelogSummary();
  // Discard now means "revert unpublished draft to live", not "restore last
  // snapshot". Available whenever drafts have diverged from live.
  const discardMutation = useDiscardDrafts();

  const { data: pagesConfig } = useWebsitePages();
  const updatePages = useUpdateWebsitePages();
  const selectedPage = pagesConfig?.pages?.find((p) => p.id === selectedPageId);
  const isHomePage = selectedPageId === 'home';

  const { publicUrl: getPublicUrl, publicPageUrl } = useOrgPublicUrl();
  const orgPreviewUrl = getPublicUrl();
  const livePreviewUrl = publicPageUrl(selectedPage?.slug, { preview: true, mode: 'view' });

  // Persist layout preferences per org. `editorTab` and `selectedPageId` are
  // intentionally excluded — see PersistedState comment. The writer overwrites
  // the storage entry with only the fields we still persist, which strips any
  // legacy `editorTab` / `selectedPageId` values from prior sessions.
  useEffect(() => {
    writePersisted(orgId, { showPreview });
  }, [orgId, showPreview]);

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
      if (key === 's') {
        // ⌘⇧S → open Publish dialog (promote draft to live).
        // ⌘S    → save current editor's draft (private; not live).
        // We intercept ⌘S even inside form fields so the browser's
        // "Save Page" default never wins over the editor save.
        e.preventDefault();
        if (e.shiftKey) {
          setPublishOpen(true);
        } else {
          window.dispatchEvent(new CustomEvent('editor-save-request'));
        }
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
      // Snapshot the previous order BEFORE the mutation so undo can restore it.
      const prevSections = selectedPage?.sections;
      void updateSelectedPage((p) => ({ ...p, sections })).then(() => {
        if (!prevSections) return;
        pushEditorHistoryEntry({
          label: 'Reorder sections',
          undo: () => updateSelectedPage((p) => ({ ...p, sections: prevSections })),
          redo: () => updateSelectedPage((p) => ({ ...p, sections })),
        });
      });
    },
    [updateSelectedPage, selectedPage],
  );

  const handlePageSectionDelete = useCallback(
    (sectionId: string) => {
      const prevSections = selectedPage?.sections;
      const removed = prevSections?.find((s) => s.id === sectionId);
      void updateSelectedPage((p) => ({
        ...p,
        sections: p.sections.filter((s) => s.id !== sectionId),
      })).then(() => {
        if (!prevSections || !removed) return;
        const nextSections = prevSections.filter((s) => s.id !== sectionId);
        pushEditorHistoryEntry({
          label: `Delete ${removed.label}`,
          undo: () => updateSelectedPage((p) => ({ ...p, sections: prevSections })),
          redo: () => updateSelectedPage((p) => ({ ...p, sections: nextSections })),
        });
      });
      if (editorTab === `custom-${sectionId}`) setEditorTab('page-settings');
    },
    [updateSelectedPage, editorTab, selectedPage],
  );

  const handlePageSectionDuplicate = useCallback(
    (section: SectionConfig) => {
      const prevSections = selectedPage?.sections;
      const newId = generateSectionId();
      const dup = { ...section, id: newId, label: `${section.label} (Copy)`, order: (prevSections?.length ?? 0) + 1 };
      void updateSelectedPage((p) => ({
        ...p,
        sections: [...p.sections, dup],
      })).then(() => {
        if (!prevSections) return;
        const nextSections = [...prevSections, dup];
        pushEditorHistoryEntry({
          label: `Duplicate ${section.label}`,
          undo: () => updateSelectedPage((p) => ({ ...p, sections: prevSections })),
          redo: () => updateSelectedPage((p) => ({ ...p, sections: nextSections })),
        });
      });
      toast({ title: 'Section duplicated', description: section.label });
    },
    [updateSelectedPage, toast, selectedPage],
  );

  const handlePageSectionAdd = useCallback(
    (type: CustomSectionType, label: string) => {
      const prevSections = selectedPage?.sections;
      const newSection: SectionConfig = {
        id: generateSectionId(),
        type,
        label,
        description: CUSTOM_TYPE_INFO[type].description,
        enabled: true,
        order: 0,
        deletable: true,
      };
      const stamped = { ...newSection, order: (prevSections?.length ?? 0) + 1 };
      void updateSelectedPage((p) => ({
        ...p,
        sections: [...p.sections, stamped],
      })).then(() => {
        if (!prevSections) return;
        const nextSections = [...prevSections, stamped];
        pushEditorHistoryEntry({
          label: `Add ${label}`,
          undo: () => updateSelectedPage((p) => ({ ...p, sections: prevSections })),
          redo: () => updateSelectedPage((p) => ({ ...p, sections: nextSections })),
        });
      });
      setEditorTab(`custom-${newSection.id}`);
    },
    [updateSelectedPage, selectedPage],
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

  // ─── Wave 4: insert section at index, on any page (incl. home) ───
  const insertSectionInPage = useCallback(
    (
      pageId: string,
      afterSectionId: string | null,
      build: () => SectionConfig,
    ) => {
      if (!pagesConfig) return null;
      const newSection = build();
      const prevPages = pagesConfig.pages;
      const updated = prevPages.map((p) => {
        if (p.id !== pageId) return p;
        const list = [...p.sections];
        const idx = afterSectionId
          ? list.findIndex((s) => s.id === afterSectionId)
          : -1;
        const insertAt = idx >= 0 ? idx + 1 : list.length;
        list.splice(insertAt, 0, newSection);
        // Re-stamp order to keep things sane.
        const reordered = list.map((s, i) => ({ ...s, order: i + 1 }));
        return { ...p, sections: reordered };
      });
      void updatePages
        .mutateAsync({ pages: updated })
        .then(() => {
          // History: undo restores the prior pages snapshot; redo re-applies
          // the insert. Page-scoped operation so we snapshot the full pages
          // array (insert can target any page incl. home).
          pushEditorHistoryEntry({
            label: `Add ${newSection.label}`,
            undo: () => updatePages.mutateAsync({ pages: prevPages }).then(() => undefined),
            redo: () => updatePages.mutateAsync({ pages: updated }).then(() => undefined),
          });
        })
        .catch((err) =>
          toast({
            variant: 'destructive',
            title: 'Failed to add section',
            description: err instanceof Error ? err.message : 'Unknown error',
          }),
        );
      return newSection;
    },
    [pagesConfig, updatePages, toast],
  );

  const handleAddSectionAt = useCallback(
    (type: CustomSectionType, label: string) => {
      if (!addSectionState.open) return;
      const created = insertSectionInPage(
        addSectionState.pageId,
        addSectionState.afterSectionId,
        () => ({
          id: generateSectionId(),
          type,
          label,
          description: CUSTOM_TYPE_INFO[type].description,
          enabled: true,
          order: 0,
          deletable: true,
        }),
      );
      if (created) setEditorTab(`custom-${created.id}`);
      setAddSectionState({ open: false });
    },
    [addSectionState, insertSectionInPage],
  );

  const handleAddSectionFromTemplate = useCallback(
    (template: SectionTemplate) => {
      if (!addSectionState.open) return;
      const created = insertSectionInPage(
        addSectionState.pageId,
        addSectionState.afterSectionId,
        () => ({
          id: generateSectionId(),
          type: template.section_type,
          label: template.name,
          description: template.description,
          enabled: true,
          order: 0,
          deletable: true,
          style_overrides: template.style_overrides,
        }),
      );
      if (created) setEditorTab(`custom-${created.id}`);
      setAddSectionState({ open: false });
    },
    [addSectionState, insertSectionInPage],
  );

  // Apply style overrides to any section on any page.
  const handleStyleChange = useCallback(
    (next: Partial<StyleOverrides>) => {
      if (!styleTarget || !pagesConfig) return;
      const updated = pagesConfig.pages.map((p) => {
        if (p.id !== styleTarget.pageId) return p;
        return {
          ...p,
          sections: p.sections.map((s) =>
            s.id === styleTarget.sectionId ? { ...s, style_overrides: next } : s,
          ),
        };
      });
      void updatePages.mutateAsync({ pages: updated });
    },
    [styleTarget, pagesConfig, updatePages],
  );

  const styleTargetSection = useMemo(() => {
    if (!styleTarget) return null;
    const page = pagesConfig?.pages.find((p) => p.id === styleTarget.pageId);
    return page?.sections.find((s) => s.id === styleTarget.sectionId) ?? null;
  }, [styleTarget, pagesConfig]);

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
          // Open AddSectionDialog targeting current page, inserting after the given section.
          const afterId =
            typeof msg.afterSectionId === 'string' ? msg.afterSectionId : null;
          setAddSectionState({
            open: true,
            pageId: selectedPageId,
            afterSectionId: afterId,
          });
          break;
        }
        case 'EDITOR_OPEN_STYLE': {
          if (!sectionId) return;
          // Find which page owns it.
          const ownerPage = pagesConfig?.pages.find((p) =>
            p.sections.some((s) => s.id === sectionId),
          );
          if (ownerPage) {
            setStyleTarget({ pageId: ownerPage.id, sectionId });
          }
          break;
        }
        case 'EDITOR_APPLY_STYLE_PRESET': {
          // One-tap chip → patch a subset of style_overrides without opening
          // the full panel. Routes through updatePages so it shares dirty
          // state, undo, and audit logging with every other section write.
          if (!sectionId || !pagesConfig) return;
          const patch = (msg as { patch?: Partial<StyleOverrides> }).patch;
          const label = (msg as { label?: string }).label ?? 'Section style';
          if (!patch || typeof patch !== 'object') return;
          const ownerPage = pagesConfig.pages.find((p) =>
            p.sections.some((s) => s.id === sectionId),
          );
          if (!ownerPage) return;
          const targetSection = ownerPage.sections.find((s) => s.id === sectionId);
          const before = targetSection?.style_overrides ?? {};
          const after = { ...before, ...patch };
          const apply = (next: Partial<StyleOverrides>) => {
            const updated = pagesConfig.pages.map((p) => {
              if (p.id !== ownerPage.id) return p;
              return {
                ...p,
                sections: p.sections.map((s) =>
                  s.id === sectionId ? { ...s, style_overrides: next } : s,
                ),
              };
            });
            return updatePages.mutateAsync({ pages: updated });
          };
          void apply(after).then(() => {
            pushEditorHistoryEntry({
              label,
              undo: () => apply(before).then(() => undefined),
              redo: () => apply(after).then(() => undefined),
            });
          });
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
    selectedPageId,
    pagesConfig,
    isHomePage,
    handlePageSectionToggle,
    handlePageSectionDuplicate,
    handlePageSectionDelete,
    updatePages,
  ]);

  // Sidebar → canvas: resolve the active section id from the current editor tab.
  // LivePreviewPanel consumes this prop and posts PREVIEW_SCROLL_TO_SECTION into
  // the iframe so the draft preview auto-scrolls to whatever the operator clicked.
  const activePreviewSectionId = useMemo<string | undefined>(() => {
    const allSections: SectionConfig[] = [
      ...(selectedPage?.sections ?? []),
      ...(pagesConfig?.pages.find((p) => p.id === 'home')?.sections ?? []),
    ];
    if (editorTab.startsWith('custom-')) {
      return editorTab.replace('custom-', '');
    }
    const match = allSections.find(
      (s) => isBuiltinSection(s.type) && BUILTIN_TYPE_TO_TAB[s.type] === editorTab,
    );
    return match?.id;
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

  // Square-style: rail is in EDITOR mode whenever a section/page-settings tab is active.
  // It returns to LIST mode when the user taps "Done" or the back arrow.
  // We treat 'pages' as a list-mode tab (it IS a list of pages, not a section editor).
  const isEditorMode = editorTab !== 'pages';

  // Sidebar element (reused for desktop pane and mobile sheet) — list mode only.
  const sidebarEl = (
    <WebsiteEditorSidebar
      activeTab={editorTab}
      onTabChange={(t) => {
        requestTabChange(t);
        if (isMobile) setMobileSidebarOpen(false);
      }}
      selectedPageId={selectedPageId}
      onPageChange={(p) => {
        requestPageChange(p);
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

  // Rail editor-mode body — replaces the sidebar in place when a section is active.
  const railEditorEl = (
    <div className="flex flex-col h-full bg-card/80 backdrop-blur-xl">
      {/* Header: [<- back] [TITLE] [Done]  — mirrors Square's section editor */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full shrink-0"
            onClick={() => requestTabChange('pages')}
            title="Back to sections"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-sans text-sm font-medium tracking-tight text-foreground truncate">
            {sectionLabel}
          </h2>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="rounded-full px-4"
          onClick={() => requestTabChange('pages')}
          title="Return to sections list"
        >
          Done
        </Button>
      </div>

      {/* Save status pill — slim row under header so the user always sees draft state.
          Discard + Save actions live exclusively in the floating
          UnsavedChangesToast (bottom-right) when the editor is dirty, so the
          rail header stays calm and uncluttered. */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border/40 shrink-0">
        <SaveStatusPill isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} />
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-auto px-4 py-4">
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
  );

  // Rail list-mode body — page picker header + sections list (existing sidebar component).
  const railListEl = (
    <div className="flex flex-col h-full bg-card/80 backdrop-blur-xl">
      {/* Page picker row — matches Square's "Home ▾  ⚙  +" */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 shrink-0">
        <Select value={selectedPageId} onValueChange={requestPageChange}>
          <SelectTrigger
            ref={pagePickerRef}
            className="h-9 text-xs flex-1 rounded-full"
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
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={() => requestTabChange('page-settings')}
          title="Page settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={() => setAddPageOpen(true)}
          title="Add page"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Sections list */}
      <div className="flex-1 overflow-hidden">{sidebarEl}</div>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col gap-3 p-3 overflow-hidden">
      {/* Inline-edit bridge: listens for INLINE_EDIT_COMMIT messages from the
          preview iframe and persists via the existing useSectionConfig hooks.
          Renders nothing — pure listener. */}
      <InlineEditCommitHandler />
      {/* ── Top toolbar — Square-style: exit pill | (spacer) | upgrade · preview · publish ── */}
      <div className="flex items-center justify-between gap-3 shrink-0 px-1">
        <div className="flex items-center gap-2 min-w-0">
          {/* Exit Editor — returns to Website Hub overview. Guards unsaved/unpublished changes. */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-full px-3 gap-1.5 shrink-0 font-display tracking-wide uppercase text-xs"
            onClick={() => {
              if (isDirty || hasChanges) {
                setExitConfirmOpen(true);
              } else {
                performExit();
              }
            }}
            title="Exit editor and return to Website Hub"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Exit Editor</span>
          </Button>
          {/* Mobile-only: opens the section sheet (no persistent rail on small screens). */}
          {isMobile && (
            <>
              <div className="hidden sm:block h-6 w-px bg-border/60 shrink-0" />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
                onClick={() => setMobileSidebarOpen(true)}
                title="Open sections"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </>
          )}
          {/* Desktop collapse/expand control lives INSIDE the rail (header) and as a
              re-expand stub on the preview's left edge — no orphaned toolbar button. */}
          {/* Breadcrumb: page › section. Hidden on small screens. */}
          <nav
            aria-label="Editor breadcrumb"
            className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0"
          >
            <span className="truncate text-foreground/70 min-w-0">
              {selectedPage?.title ?? 'Home'}
            </span>
            {isEditorMode && (
              <>
                <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
                <span className="truncate text-foreground font-medium min-w-0">
                  {sectionLabel}
                </span>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Undo/Redo — operates on the editor history ledger (reorder, design,
              inline edits). Keyboard: ⌘Z / ⌘⇧Z. */}
          <UndoRedoControls />

          {/* Site Design — global theme/typography/density panel */}
          <Button
            variant="outline"
            size={tokens.button.card}
            onClick={() => setSiteDesignOpen(true)}
            className="rounded-full"
            title="Site Design — global colors, type, density"
          >
            <Palette className="h-4 w-4 mr-1.5" />
            Site Design
          </Button>

          {/* Preview (open public preview in new tab) */}
          <Button
            variant="outline"
            size={tokens.button.card}
            onClick={() =>
              livePreviewUrl && window.open(livePreviewUrl, '_blank', 'noopener,noreferrer')
            }
            disabled={!livePreviewUrl}
            className="rounded-full"
            title="Open preview in new tab"
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Preview
          </Button>

          {/* Publish — primary action, square-shaped pill */}
          <Button
            variant="default"
            size={tokens.button.card}
            onClick={() => setPublishOpen(true)}
            className="relative rounded-full"
            title="Publish draft to live site (⌘⇧S)"
          >
            <Globe className="h-4 w-4 mr-1.5" />
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

          {/* Overflow */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" title="More">
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
                disabled={!hasChanges || discardMutation.isPending}
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

      {/* ── Editor canvas: fixed left rail (list ↔ editor swap) + full-bleed preview ── */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
        {/* Fixed left rail — Square width is ~320–360px. Hidden on mobile (uses Sheet). */}
        {!isMobile && (
          <aside
            aria-hidden={!showSidebar}
            className={cn(
              'shrink-0 rounded-xl border border-border overflow-hidden transition-[width,opacity,margin] duration-150 ease-out',
              showSidebar
                ? 'w-[380px] opacity-100'
                : 'w-0 opacity-0 border-transparent -mr-3 pointer-events-none',
            )}
          >
            <div className="w-[380px] h-full">
              {isEditorMode ? railEditorEl : railListEl}
            </div>
          </aside>
        )}

        {/* Re-expand stub — sibling to the rail/preview, sits in the flex flow
            on the LEFT side so it never overlaps the preview canvas. */}
        {!isMobile && !showSidebar && (
          <button
            type="button"
            onClick={() => setShowSidebar(true)}
            title="Show sections (⌘\)"
            aria-label="Show sections"
            className="group shrink-0 w-9 rounded-xl border border-border bg-card/80 backdrop-blur-md hover:bg-accent hover:border-border/80 transition-colors flex flex-col items-center justify-center gap-3 animate-in slide-in-from-left-2 fade-in duration-150"
          >
            <PanelLeftOpen className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="[writing-mode:vertical-rl] rotate-180 font-display text-[10px] tracking-[0.18em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">
              Sections
            </span>
          </button>
        )}

        {/* Full-bleed preview canvas */}
        <div className="flex-1 min-w-0 rounded-xl border border-border overflow-hidden relative">
          <LivePreviewPanel previewUrl={livePreviewUrl ?? undefined} activeSectionId={activePreviewSectionId} />
        </div>
      </div>

      <PublishChangelog open={publishOpen} onOpenChange={setPublishOpen} />
      <VersionHistoryPanel open={historyOpen} onOpenChange={setHistoryOpen} />

      {/* Site Design — global look & feel overrides. Uses PremiumFloatingPanel
          per Drawer Canon (no raw Sheet on dashboard surfaces). */}
      <PremiumFloatingPanel
        open={siteDesignOpen}
        onOpenChange={(next) => {
          // Closing while dirty? Hand off to the panel's discard-draft dialog
          // instead of dropping unsaved overrides on backdrop click / ESC.
          if (!next && siteDesignDirty) {
            window.dispatchEvent(new CustomEvent('site-design-close-request'));
            return;
          }
          setSiteDesignOpen(next);
        }}
        maxWidth="440px"
        showCloseButton={false}
      >
        <SiteDesignPanel onClose={() => setSiteDesignOpen(false)} />
      </PremiumFloatingPanel>
      {/* Mobile sidebar Sheet — hosts list OR editor depending on mode */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[340px] max-w-[90vw]">
          <SheetTitle className="sr-only">Website Editor</SheetTitle>
          <div className="h-full overflow-hidden">{isEditorMode ? railEditorEl : railListEl}</div>
        </SheetContent>
      </Sheet>

      {/* Discard confirmation */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unpublished changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This reverts your editor drafts back to whatever is currently live on your public
              site. Your live site is not affected. To restore an even older version, use Version
              History instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={discardMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={discardMutation.isPending}
              onClick={async (e) => {
                e.preventDefault();
                try {
                  const reverted = await discardMutation.mutateAsync();
                  toast({
                    title: 'Drafts discarded',
                    description:
                      reverted > 0
                        ? `Reverted ${reverted} unpublished change${reverted === 1 ? '' : 's'} back to live.`
                        : 'No unpublished changes to discard.',
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
                'Discard drafts'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Per-editor Discard Changes — reverts the active editor's unsaved
          edits back to its last-saved state. Does not touch other sections
          or the published live site. */}
      <AlertDialog open={revertDraftOpen} onOpenChange={setRevertDraftOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This reverts the current section back to its last-saved state.
              Unsaved edits in this editor will be lost. Other sections and
              your live site are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.dispatchEvent(new CustomEvent('editor-discard-request'));
                setRevertDraftOpen(false);
                toast({
                  title: 'Changes discarded',
                  description: 'Reverted to last saved state.',
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit editor?</AlertDialogTitle>
            <AlertDialogDescription>
              {isDirty
                ? 'You have unsaved changes in the current section. Exiting now will discard them.'
                : `You have ${totalChanges} unpublished change${totalChanges === 1 ? '' : 's'}. They will remain saved as a draft and can be published later from Website Hub.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setExitConfirmOpen(false);
                performExit();
              }}
            >
              Exit Editor
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

      {/* Wave 4: Add section at insertion index (canvas-driven) */}
      <AddSectionDialog
        open={addSectionState.open}
        onOpenChange={(open) => !open && setAddSectionState({ open: false })}
        onAdd={handleAddSectionAt}
        onAddFromTemplate={handleAddSectionFromTemplate}
      />

      {/* Wave 4: Section style inspector */}
      <PremiumFloatingPanel
        open={!!styleTarget}
        onOpenChange={(open) => !open && setStyleTarget(null)}
        side="right"
        maxWidth="380px"
      >
        <div className="flex flex-col h-full">
          <div className="px-5 py-4 border-b border-border/60">
            <p className="text-[11px] font-display tracking-wider uppercase text-muted-foreground">
              Section Style
            </p>
            <h3 className="text-base font-display tracking-wide uppercase text-foreground truncate">
              {styleTargetSection?.label ?? 'Section'}
            </h3>
          </div>
          <div className="flex-1 overflow-auto px-5 py-4">
            {styleTargetSection ? (
              <SectionStyleEditor
                value={styleTargetSection.style_overrides ?? {}}
                onChange={handleStyleChange}
                sectionId={styleTargetSection.id}
              />
            ) : (
              <p className="text-xs text-muted-foreground">Select a section to style.</p>
            )}
          </div>
        </div>
      </PremiumFloatingPanel>

      {/* Unsaved-changes guard ──
          UI rules applied here:
            • Title uses font-display (Termina) — never font-bold/semibold
              (typography canon: max weight font-medium).
            • Visual hierarchy reads left → right: passive (Stay) → cautious
              (Discard) → primary action (Save). Filled accent reserved for
              Save so the recommended path is obvious without screaming.
            • Discard uses ghost-destructive, not solid red — the previous
              solid red was louder than the primary, inverting hierarchy
              and making operators reflex-click destructive paths.
            • Buttons sized via the canonical `Button` size token (default
              h-9), not raw AlertDialogAction (which used hero-sized fills). */}
      <UnsavedChangesDialog
        open={!!pendingNav}
        isSaving={isSaving}
        hint="Drafts stay private until you Publish from Website Hub."
        onCancel={() => setPendingNav(null)}
        onDiscard={() => {
          if (!pendingNav) return;
          window.dispatchEvent(
            new CustomEvent('editor-dirty-state', { detail: { dirty: false } }),
          );
          setIsDirty(false);
          if (pendingNav.type === 'tab') setEditorTab(pendingNav.tab);
          else setSelectedPageId(pendingNav.pageId);
          setPendingNav(null);
        }}
        onSave={() => {
          if (!pendingNav) return;
          // Trigger the active editor's save handler. When it finishes
          // (editor-saving-state flips back to false), run the deferred
          // navigation. Generic across every panel using useEditorSaveAction.
          const navTarget = pendingNav;
          let armed = false;
          const onSavingChange = (evt: Event) => {
            const saving = !!(evt as CustomEvent).detail?.saving;
            if (saving) {
              armed = true;
              return;
            }
            if (!armed) return;
            window.removeEventListener('editor-saving-state', onSavingChange);
            if (navTarget.type === 'tab') setEditorTab(navTarget.tab);
            else setSelectedPageId(navTarget.pageId);
            setPendingNav(null);
          };
          window.addEventListener('editor-saving-state', onSavingChange);
          window.dispatchEvent(new CustomEvent('editor-save-request'));
        }}
      />

      {/* Persistent unsaved-changes toast — bottom-right, stays until
          Save or Discard succeeds. Replaces the inline header chip
          so the cue is visible regardless of scroll position. */}
      <UnsavedChangesToast
        isDirty={isDirty}
        isSaving={isSaving}
        onDiscard={() => setRevertDraftOpen(true)}
        onSave={() => window.dispatchEvent(new CustomEvent('editor-save-request'))}
      />
    </div>
  );
}

// ─── Save status pill ───
function formatRelative(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function SaveStatusPill({
  isDirty,
  isSaving,
  lastSavedAt,
}: {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
}) {
  let label: string;
  let icon: React.ReactNode;
  let tone: string;
  if (isSaving) {
    label = 'Saving…';
    icon = <Loader2 className="h-3 w-3 animate-spin" />;
    tone = 'text-muted-foreground bg-muted/60';
  } else if (isDirty) {
    // Dirty state is owned by the floating bottom-right toast
    // (UnsavedChangesToast) so the operator sees it while scrolling
    // through long editor panels. Inline pill stays silent here to
    // avoid double-signaling.
    return null;
  } else if (lastSavedAt) {
    label = `Draft saved ${formatRelative(lastSavedAt)}`;
    icon = <Check className="h-3 w-3 text-success-foreground" />;
    tone = 'text-muted-foreground bg-muted/60';
  } else {
    return null;
  }
  return (
    <span
      className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}
      role="status"
      aria-live="polite"
    >
      {icon}
      {label}
    </span>
  );
}

// Canonical UnsavedChangesToast lives at @/components/ui/unsaved-changes-toast
// — see import at top of file. Do not re-implement locally.

// ─── Undo / Redo toolbar controls ───
function UndoRedoControls() {
  const { canUndo, canRedo, undo, redo, lastLabel, nextLabel } = useEditorHistory();
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-full"
        onClick={undo}
        disabled={!canUndo}
        title={canUndo ? `Undo ${lastLabel ?? 'change'} (⌘Z)` : 'Nothing to undo'}
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-full"
        onClick={redo}
        disabled={!canRedo}
        title={canRedo ? `Redo ${nextLabel ?? 'change'} (⌘⇧Z)` : 'Nothing to redo'}
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
