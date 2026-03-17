import { useState, useMemo } from 'react';
import { Plus, Copy, Trash2, Archive, FileText, RotateCcw } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EditorCard } from './EditorCard';
import {
  useWebsitePages,
  useUpdateWebsitePages,
  generatePageId,
  type PageConfig,
  type WebsitePagesConfig,
} from '@/hooks/useWebsitePages';
import { usePageVersions, useSavePageVersion } from '@/hooks/usePageVersions';
import { useWebsiteMenus, type MenuItem } from '@/hooks/useWebsiteMenus';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

type StatusFilter = 'all' | 'enabled' | 'disabled';

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  enabled: { label: 'Live', variant: 'default' },
  disabled: { label: 'Draft', variant: 'secondary' },
};

export function PagesManager() {
  const { data: pagesConfig, isLoading } = useWebsitePages();
  const updatePages = useUpdateWebsitePages();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<PageConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const saveVersion = useSavePageVersion();

  const pages = useMemo(() => {
    if (!pagesConfig?.pages) return [];
    let filtered = pagesConfig.pages;
    if (filter === 'enabled') filtered = filtered.filter(p => p.enabled);
    if (filter === 'disabled') filtered = filtered.filter(p => !p.enabled);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [pagesConfig, filter, searchQuery]);

  const handleCreatePage = async () => {
    if (!pagesConfig) return;
    const newPage: PageConfig = {
      id: generatePageId(),
      slug: `page-${Date.now().toString(36)}`,
      title: 'New Page',
      seo_title: '',
      seo_description: '',
      enabled: false,
      show_in_nav: false,
      nav_order: pagesConfig.pages.length,
      sections: [],
      page_type: 'custom',
      deletable: true,
    };
    try {
      await updatePages.mutateAsync({
        pages: [...pagesConfig.pages, newPage],
      });
      toast.success('Page created');
    } catch {
      toast.error('Failed to create page');
    }
  };

  const handleDuplicate = async (page: PageConfig) => {
    if (!pagesConfig) return;
    const dup: PageConfig = {
      ...page,
      id: generatePageId(),
      slug: `${page.slug}-copy`,
      title: `${page.title} (Copy)`,
      enabled: false,
      deletable: true,
      sections: page.sections.map(s => ({ ...s })),
    };
    try {
      await updatePages.mutateAsync({
        pages: [...pagesConfig.pages, dup],
      });
      toast.success(`"${page.title}" duplicated`);
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handleDelete = async () => {
    if (!pagesConfig || !deleteTarget) return;
    if (!deleteTarget.deletable) {
      toast.error('This page cannot be deleted');
      return;
    }
    try {
      await updatePages.mutateAsync({
        pages: pagesConfig.pages.filter(p => p.id !== deleteTarget.id),
      });
      toast.success(`"${deleteTarget.title}" deleted`);
    } catch {
      toast.error('Failed to delete page');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleEnabled = async (page: PageConfig) => {
    if (!pagesConfig) return;
    const updated: WebsitePagesConfig = {
      pages: pagesConfig.pages.map(p =>
        p.id === page.id ? { ...p, enabled: !p.enabled } : p
      ),
    };
    try {
      await updatePages.mutateAsync(updated);
      toast.success(`"${page.title}" ${page.enabled ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('Failed to update page');
    }
  };

  const handleSaveVersion = async (page: PageConfig) => {
    if (!orgId) return;
    try {
      await saveVersion.mutateAsync({ page, organizationId: orgId });
      toast.success('Version saved');
    } catch {
      toast.error('Failed to save version');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EditorCard
        title="Pages"
        icon={FileText}
        description="Manage all pages on your website"
        headerActions={
          <Button variant="outline" size={tokens.button.inline} className="h-7 text-xs" onClick={handleCreatePage}>
            <Plus className="h-3 w-3 mr-1" />
            New Page
          </Button>
        }
      >
        {/* Filters */}
        <div className="flex items-center gap-2 mb-3">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            className="h-8 text-xs flex-1"
          />
          <div className="flex gap-1">
            {(['all', 'enabled', 'disabled'] as StatusFilter[]).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-[10px] px-2"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'enabled' ? 'Live' : 'Draft'}
              </Button>
            ))}
          </div>
        </div>

        {/* Pages Table */}
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-sans">Title</TableHead>
                <TableHead className="text-xs font-sans">Slug</TableHead>
                <TableHead className="text-xs font-sans">Status</TableHead>
                <TableHead className="text-xs font-sans">Type</TableHead>
                <TableHead className="text-xs font-sans w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map(page => (
                <TableRow key={page.id}>
                  <TableCell className="text-sm font-medium">{page.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    /{page.slug || '(home)'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={page.enabled ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {page.enabled ? 'Live' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">
                    {page.page_type}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => handleToggleEnabled(page)}>
                          <Archive className="h-3.5 w-3.5 mr-2" />
                          {page.enabled ? 'Disable' : 'Enable'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(page)}>
                          <Copy className="h-3.5 w-3.5 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSaveVersion(page)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-2" />
                          Save Version
                        </DropdownMenuItem>
                        {page.deletable && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(page)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {pages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    No pages found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </EditorCard>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this page and all its sections. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
