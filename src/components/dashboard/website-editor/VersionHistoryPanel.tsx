import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { History, RotateCcw, Loader2, X, FileText, Palette, Megaphone, Layers, Navigation } from 'lucide-react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useWebsitePages } from '@/hooks/useWebsitePages';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  usePageVersions,
  useRestorePageVersion,
  type PageVersion,
} from '@/hooks/usePageVersions';
import {
  useSiteVersions,
  useRestoreSiteVersion,
  SURFACE_LABELS,
  type SiteVersion,
  type SiteVersionSurface,
} from '@/hooks/useSiteVersions';
import { toast } from 'sonner';

interface VersionHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = 'pages' | 'site';

const SURFACE_ICONS: Record<SiteVersionSurface, typeof Palette> = {
  theme: Palette,
  footer: Layers,
  announcement_bar: Megaphone,
  navigation: Navigation,
};

export function VersionHistoryPanel({ open, onOpenChange }: VersionHistoryPanelProps) {
  const [tab, setTab] = useState<Tab>('pages');
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: pagesConfig } = useWebsitePages();

  const pages = pagesConfig?.pages ?? [];
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>(undefined);
  const [selectedSurface, setSelectedSurface] = useState<SiteVersionSurface>('theme');

  const activePageId = selectedPageId ?? pages[0]?.id;

  return (
    <PremiumFloatingPanel
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="32rem"
      showCloseButton={false}
      className="flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h2 className="font-display text-base tracking-wide">Version History</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex-1 flex flex-col min-h-0">
        <div className="px-6 pt-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="site">Site-wide</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pages" className="flex-1 flex flex-col min-h-0 mt-4">
          <div className="px-6 pb-3">
            <Select
              value={activePageId}
              onValueChange={setSelectedPageId}
              disabled={pages.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a page" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      {p.title}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1 px-6 pb-6">
            <PageVersionsList pageId={activePageId} orgId={orgId} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="site" className="flex-1 flex flex-col min-h-0 mt-4">
          <div className="px-6 pb-3">
            <div className="grid grid-cols-3 gap-2">
              {(['theme', 'footer', 'announcement_bar'] as SiteVersionSurface[]).map((s) => {
                const Icon = SURFACE_ICONS[s];
                const active = selectedSurface === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSelectedSurface(s)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs transition-colors',
                      active
                        ? 'bg-muted border-border text-foreground'
                        : 'bg-transparent border-border/50 text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {SURFACE_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>
          <ScrollArea className="flex-1 px-6 pb-6">
            <SiteVersionsList surface={selectedSurface} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </PremiumFloatingPanel>
  );
}

function PageVersionsList({ pageId, orgId }: { pageId: string | undefined; orgId: string | undefined }) {
  const { data: versions, isLoading } = usePageVersions(pageId, orgId);
  const restore = useRestorePageVersion();
  const [pendingRestore, setPendingRestore] = useState<PageVersion | null>(null);

  if (!pageId) {
    return <EmptyState message="Select a page to view its history" />;
  }
  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!versions || versions.length === 0) {
    return <EmptyState message="No versions saved yet. Click Publish Changes to create the first snapshot." />;
  }

  const latestId = versions[0]?.id;

  return (
    <div className="space-y-2">
      {versions.map((v) => (
        <VersionRow
          key={v.id}
          versionNumber={v.version_number}
          savedAt={v.saved_at}
          changeSummary={v.change_summary}
          isLatest={v.id === latestId}
          isRestored={!!v.restored_from_version_id}
          onRestore={() => setPendingRestore(v)}
        />
      ))}

      <RestoreConfirmDialog
        open={!!pendingRestore}
        onOpenChange={(o) => !o && setPendingRestore(null)}
        targetLabel={pendingRestore ? `page to v${pendingRestore.version_number}` : ''}
        savedAt={pendingRestore?.saved_at}
        isPending={restore.isPending}
        onConfirm={async () => {
          if (!pendingRestore) return;
          try {
            await restore.mutateAsync({ versionId: pendingRestore.id });
            toast.success(`Restored to v${pendingRestore.version_number}. A new version was saved as a backup.`);
            setPendingRestore(null);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Restore failed');
          }
        }}
      />
    </div>
  );
}

function SiteVersionsList({ surface }: { surface: SiteVersionSurface }) {
  const { data: versions, isLoading } = useSiteVersions(surface);
  const restore = useRestoreSiteVersion();
  const [pendingRestore, setPendingRestore] = useState<SiteVersion | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!versions || versions.length === 0) {
    return <EmptyState message={`No ${SURFACE_LABELS[surface].toLowerCase()} versions saved yet. Click Publish Changes to create the first snapshot.`} />;
  }

  const latestId = versions[0]?.id;

  return (
    <div className="space-y-2">
      {versions.map((v) => (
        <VersionRow
          key={v.id}
          versionNumber={v.version_number}
          savedAt={v.saved_at}
          changeSummary={v.change_summary}
          isLatest={v.id === latestId}
          isRestored={!!v.restored_from_version_id}
          onRestore={() => setPendingRestore(v)}
        />
      ))}

      <RestoreConfirmDialog
        open={!!pendingRestore}
        onOpenChange={(o) => !o && setPendingRestore(null)}
        targetLabel={pendingRestore ? `${SURFACE_LABELS[surface]} to v${pendingRestore.version_number}` : ''}
        savedAt={pendingRestore?.saved_at}
        isPending={restore.isPending}
        onConfirm={async () => {
          if (!pendingRestore) return;
          try {
            await restore.mutateAsync({ versionId: pendingRestore.id });
            toast.success(`Restored to v${pendingRestore.version_number}. A new version was saved as a backup.`);
            setPendingRestore(null);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Restore failed');
          }
        }}
      />
    </div>
  );
}

interface VersionRowProps {
  versionNumber: number;
  savedAt: string;
  changeSummary: string | null;
  isLatest: boolean;
  isRestored: boolean;
  onRestore: () => void;
}

function VersionRow({ versionNumber, savedAt, changeSummary, isLatest, isRestored, onRestore }: VersionRowProps) {
  const relative = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(savedAt), { addSuffix: true });
    } catch {
      return savedAt;
    }
  }, [savedAt]);

  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card/40">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">v{versionNumber}</span>
          {isLatest && <Badge variant="secondary" className="text-[10px] h-5">Live</Badge>}
          {isRestored && <Badge variant="outline" className="text-[10px] h-5">Restored</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{relative}</p>
        {changeSummary && (
          <p className="text-xs text-muted-foreground/80 mt-1 truncate" title={changeSummary}>
            {changeSummary}
          </p>
        )}
      </div>
      {!isLatest && (
        <Button variant="outline" size="sm" className={tokens.button.cardAction} onClick={onRestore}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Restore
        </Button>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 px-4 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface RestoreConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetLabel: string;
  savedAt: string | undefined;
  isPending: boolean;
  onConfirm: () => void;
}

function RestoreConfirmDialog({ open, onOpenChange, targetLabel, savedAt, isPending, onConfirm }: RestoreConfirmDialogProps) {
  const relative = savedAt
    ? (() => {
        try {
          return formatDistanceToNow(new Date(savedAt), { addSuffix: true });
        } catch {
          return savedAt;
        }
      })()
    : '';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display tracking-wide">Restore version</AlertDialogTitle>
          <AlertDialogDescription>
            This will restore the {targetLabel} (saved {relative}). Your current version will be preserved as a new backup version — nothing is deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Restoring…</>
            ) : (
              'Restore'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
