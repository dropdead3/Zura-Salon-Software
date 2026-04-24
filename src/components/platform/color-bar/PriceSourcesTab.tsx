import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import { Select, SelectValue, PlatformSelectContent as SelectContent, PlatformSelectItem as SelectItem, PlatformSelectTrigger as SelectTrigger } from '@/components/platform/ui/PlatformSelect';
import { PlatformTable as Table, PlatformTableBody as TableBody, PlatformTableCell as TableCell, PlatformTableHead as TableHead, PlatformTableHeader as TableHeader, PlatformTableRow as TableRow } from '@/components/platform/ui/PlatformTable';
import { Dialog, PlatformDialogContent as DialogContent, DialogHeader, PlatformDialogTitle as DialogTitle, DialogFooter, DialogTrigger } from '@/components/platform/ui/PlatformDialog';
import { Plus, Database, Loader2, Trash2, RefreshCw } from 'lucide-react';
import {
  useWholesalePriceSources,
  useCreatePriceSource,
  useUpdatePriceSource,
  useDeletePriceSource,
} from '@/hooks/platform/useWholesalePriceSources';
import { useTriggerPriceSync } from '@/hooks/platform/useWholesalePriceQueue';
import { toast } from 'sonner';

export function PriceSourcesTab() {
  const { data: sources = [], isLoading } = useWholesalePriceSources();
  const createMutation = useCreatePriceSource();
  const updateMutation = useUpdatePriceSource();
  const deleteMutation = useDeletePriceSource();
  const syncMutation = useTriggerPriceSync();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSource, setNewSource] = useState({
    brand: '',
    source_type: 'api',
    api_endpoint: '',
    scrape_frequency: 'weekly',
  });

  const handleCreate = () => {
    if (!newSource.brand.trim()) {
      toast.error('Brand name is required');
      return;
    }
    createMutation.mutate(
      {
        brand: newSource.brand,
        source_type: newSource.source_type,
        api_endpoint: newSource.api_endpoint || undefined,
        scrape_frequency: newSource.scrape_frequency,
      },
      {
        onSuccess: () => {
          toast.success(`Added ${newSource.brand} source`);
          setShowAddDialog(false);
          setNewSource({ brand: '', source_type: 'api', api_endpoint: '', scrape_frequency: 'weekly' });
        },
      }
    );
  };

  const toggleActive = (source: typeof sources[0]) => {
    updateMutation.mutate(
      { id: source.id, updates: { is_active: !source.is_active } },
      { onSuccess: () => toast.success(`${source.brand} ${source.is_active ? 'disabled' : 'enabled'}`) }
    );
  };

  const handleDelete = (source: typeof sources[0]) => {
    deleteMutation.mutate(source.id, {
      onSuccess: () => toast.success(`Removed ${source.brand} source`),
    });
  };

  const handleSync = (sourceId: string) => {
    syncMutation.mutate(sourceId, {
      onSuccess: (data) => toast.success(`Sync complete — ${data?.queued || 0} items queued`),
      onError: () => toast.error('Sync failed'),
    });
  };

  const lastSyncTime = sources.reduce<string | null>((latest, s) => {
    if (!s.last_polled_at) return latest;
    if (!latest || s.last_polled_at > latest) return s.last_polled_at;
    return latest;
  }, null);

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
            <Database className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
          </div>
          <div>
            <PlatformCardTitle>Price Sources</PlatformCardTitle>
            <PlatformCardDescription>
              Configure distributor API integrations for wholesale pricing
              {lastSyncTime && (
                <span className="block text-xs text-[hsl(var(--platform-foreground-subtle))] mt-0.5">
                  Last auto-sync: {new Date(lastSyncTime).toLocaleString()}
                </span>
              )}
            </PlatformCardDescription>
          </div>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <PlatformButton size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Source
            </PlatformButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-sans text-base text-[hsl(var(--platform-foreground))]">Add Price Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <PlatformLabel>Brand / Distributor</PlatformLabel>
                <PlatformInput
                  value={newSource.brand}
                  onChange={(e) => setNewSource((p) => ({ ...p, brand: e.target.value }))}
                  placeholder="e.g. SalonCentric, Wella"
                />
              </div>
              <div className="space-y-1.5">
                <PlatformLabel>Source Type</PlatformLabel>
                <Select value={newSource.source_type} onValueChange={(v) => setNewSource((p) => ({ ...p, source_type: v }))}>
                  <SelectTrigger className="font-sans"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">API Integration</SelectItem>
                    <SelectItem value="manual_csv">Manual CSV Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newSource.source_type === 'api' && (
                <div className="space-y-1.5">
                  <PlatformLabel>API Endpoint</PlatformLabel>
                  <PlatformInput
                    value={newSource.api_endpoint}
                    onChange={(e) => setNewSource((p) => ({ ...p, api_endpoint: e.target.value }))}
                    placeholder="https://api.distributor.com/v1/prices"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <PlatformLabel>Poll Frequency</PlatformLabel>
                <Select value={newSource.scrape_frequency} onValueChange={(v) => setNewSource((p) => ({ ...p, scrape_frequency: v }))}>
                  <SelectTrigger className="font-sans"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <PlatformButton variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</PlatformButton>
              <PlatformButton onClick={handleCreate} loading={createMutation.isPending}>
                Add Source
              </PlatformButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PlatformCardHeader>
      <PlatformCardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : sources.length === 0 ? (
          <div className={cn(tokens.empty.container, 'py-16')}>
            <Database className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No sources configured</h3>
            <p className={tokens.empty.description}>Add a distributor API to start syncing wholesale prices.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[hsl(var(--platform-border)/0.5)]">
                <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Brand</TableHead>
                <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Type</TableHead>
                <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Frequency</TableHead>
                <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Last Polled</TableHead>
                <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Active</TableHead>
                <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id} className="border-[hsl(var(--platform-border)/0.3)]">
                  <TableCell className="font-sans text-sm font-medium text-[hsl(var(--platform-foreground))]">{source.brand}</TableCell>
                  <TableCell>
                    <PlatformBadge variant="outline" size="sm">
                      {source.source_type === 'api' ? 'API' : 'CSV'}
                    </PlatformBadge>
                  </TableCell>
                  <TableCell className="font-sans text-sm capitalize text-[hsl(var(--platform-foreground)/0.85)]">{source.scrape_frequency}</TableCell>
                  <TableCell className="font-sans text-sm text-[hsl(var(--platform-foreground-subtle))]">
                    {source.last_polled_at
                      ? new Date(source.last_polled_at).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={source.is_active}
                      onCheckedChange={() => toggleActive(source)}
                    />
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <PlatformButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleSync(source.id)}
                        disabled={syncMutation.isPending}
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', syncMutation.isPending && 'animate-spin')} />
                      </PlatformButton>
                      <PlatformButton
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDelete(source)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </PlatformButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PlatformCardContent>
    </PlatformCard>
  );
}