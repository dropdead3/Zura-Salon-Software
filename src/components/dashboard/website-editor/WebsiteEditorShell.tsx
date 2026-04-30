import { useEffect, useMemo, useRef, useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Command,
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
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrgPublicUrl } from '@/hooks/useOrgPublicUrl';
import { useWebsitePages } from '@/hooks/useWebsitePages';
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
import { Badge } from '@/components/ui/badge';

const EDITOR_COMPONENTS: Record<string, React.ComponentType> = {
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
  // Default Live Canvas ON for desktop, OFF for mobile.
  const [showPreview, setShowPreview] = useState<boolean>(
    persisted.showPreview ?? (typeof window !== 'undefined' ? window.innerWidth >= 1280 : true),
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [publishOpen, setPublishOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const pagePickerRef = useRef<HTMLButtonElement>(null);

  const { hasChanges, totalChanges } = useChangelogSummary();
  const { data: hasEverPublished } = useHasEverPublished();
  const discardMutation = useDiscardToLastPublished();

  const { data: pagesConfig } = useWebsitePages();
  const selectedPage = pagesConfig?.pages?.find((p) => p.id === selectedPageId);
  const selectedPageTitle = selectedPage?.title ?? 'Home';

  const { publicUrl: getPublicUrl, publicPageUrl } = useOrgPublicUrl();
  const orgPreviewUrl = getPublicUrl();
  const livePreviewUrl = publicPageUrl(selectedPage?.slug, { preview: true, mode: 'view' });

  // Persist last-used editor state per org.
  useEffect(() => {
    writePersisted(orgId, { editorTab, selectedPageId, showPreview });
  }, [orgId, editorTab, selectedPageId, showPreview]);

  // Keyboard shortcuts: ⌘S publish, ⌘P toggle canvas, ⌘K focus page picker, ⌘\ toggle sidebar.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      // Don't intercept when typing in inputs/textareas/contenteditable
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

  const EditorComponent = EDITOR_COMPONENTS[editorTab];
  const sectionLabel = TAB_LABELS[editorTab] ?? 'Editor';

  return (
    <div className="space-y-0 -mx-1">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {/* Page picker — always visible */}
          <Select value={selectedPageId} onValueChange={setSelectedPageId}>
            <SelectTrigger
              ref={pagePickerRef}
              className="h-9 text-xs min-w-[180px] max-w-[260px] rounded-full"
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
                      {!p.enabled && <span className="text-muted-foreground">(disabled)</span>}
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

          {/* Unified breadcrumb */}
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
          <Button
            variant={showPreview ? 'default' : 'outline'}
            size={tokens.button.card}
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? 'Hide live canvas (⌘P)' : 'Show live canvas (⌘P)'}
          >
            {showPreview ? (
              <>
                <PanelRightClose className="h-4 w-4 mr-1" />
                Hide Canvas
              </>
            ) : (
              <>
                <PanelRightOpen className="h-4 w-4 mr-1" />
                Live Canvas
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size={tokens.button.card}
            onClick={() => setHistoryOpen(true)}
            title="View version history"
          >
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
          <Button
            variant="ghost"
            size={tokens.button.card}
            onClick={() => setDiscardOpen(true)}
            disabled={!hasChanges || !hasEverPublished || discardMutation.isPending}
            title={
              !hasEverPublished
                ? 'No published version yet — publish first to enable discard.'
                : !hasChanges
                  ? 'No unpublished changes to discard.'
                  : 'Revert all unpublished changes to last published version'
            }
            className="text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Discard Changes
          </Button>
          <Button
            variant="default"
            size={tokens.button.card}
            onClick={() => setPublishOpen(true)}
            className="relative"
            title="Publish changes (⌘S)"
          >
            <Globe className="h-4 w-4 mr-1" />
            Publish Changes
            {hasChanges && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 px-1.5 text-[10px] bg-primary-foreground/20 text-primary-foreground border-0"
              >
                {totalChanges}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size={tokens.button.card}
            onClick={() => orgPreviewUrl && window.open(orgPreviewUrl, '_blank', 'noopener,noreferrer')}
            disabled={!orgPreviewUrl}
            title={orgPreviewUrl ?? 'No organization slug available'}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open Public Site
          </Button>
        </div>
      </div>

      <PublishChangelog open={publishOpen} onOpenChange={setPublishOpen} />
      <VersionHistoryPanel open={historyOpen} onOpenChange={setHistoryOpen} />

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

      {/* Editor canvas: sidebar + main + live preview */}
      <div className="border rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 18rem)' }}>
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {showSidebar && !isMobile && (
            <>
              <ResizablePanel defaultSize={22} minSize={15} maxSize={30}>
                <WebsiteEditorSidebar
                  activeTab={editorTab}
                  onTabChange={setEditorTab}
                  selectedPageId={selectedPageId}
                  onPageChange={setSelectedPageId}
                  onToggleCollapse={() => setShowSidebar(false)}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          <ResizablePanel defaultSize={showPreview ? 48 : 78} minSize={30}>
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-shrink-0 px-4 py-2 border-b bg-muted/30 flex items-center gap-2">
                {!isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="h-7 w-7"
                  >
                    {showSidebar ? (
                      <PanelLeftClose className="h-3.5 w-3.5" />
                    ) : (
                      <PanelLeftOpen className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">
                  Editing: <span className="text-foreground font-medium">{selectedPageTitle}</span>
                  <span className="mx-1.5 opacity-50">•</span>
                  {sectionLabel}
                </span>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {EditorComponent ? (
                  <EditorComponent />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Select a section from the sidebar
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          {showPreview && (
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
