import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
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

  return (
    <Card className="rounded-xl border-border/60 bg-card/80 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Price Sources</CardTitle>
            <CardDescription className="font-sans text-sm">
              Configure distributor API integrations for wholesale pricing
            </CardDescription>
          </div>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-sans font-medium">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className={tokens.card.title}>Add Price Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="font-sans text-sm">Brand / Distributor</Label>
                <Input
                  value={newSource.brand}
                  onChange={(e) => setNewSource((p) => ({ ...p, brand: e.target.value }))}
                  placeholder="e.g. SalonCentric, Wella"
                  className="font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-sans text-sm">Source Type</Label>
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
                  <Label className="font-sans text-sm">API Endpoint</Label>
                  <Input
                    value={newSource.api_endpoint}
                    onChange={(e) => setNewSource((p) => ({ ...p, api_endpoint: e.target.value }))}
                    placeholder="https://api.distributor.com/v1/prices"
                    className="font-sans text-sm"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="font-sans text-sm">Poll Frequency</Label>
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
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="font-sans font-medium">Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="font-sans font-medium">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Add Source
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
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
              <TableRow>
                <TableHead className={tokens.table.columnHeader}>Brand</TableHead>
                <TableHead className={tokens.table.columnHeader}>Type</TableHead>
                <TableHead className={tokens.table.columnHeader}>Frequency</TableHead>
                <TableHead className={tokens.table.columnHeader}>Last Polled</TableHead>
                <TableHead className={tokens.table.columnHeader}>Active</TableHead>
                <TableHead className={cn(tokens.table.columnHeader, 'text-right pr-4')}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-sans text-sm font-medium">{source.brand}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-sans text-xs capitalize">
                      {source.source_type === 'api' ? 'API' : 'CSV'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-sans text-sm capitalize">{source.scrape_frequency}</TableCell>
                  <TableCell className="font-sans text-sm text-muted-foreground">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleSync(source.id)}
                        disabled={syncMutation.isPending}
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', syncMutation.isPending && 'animate-spin')} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(source)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
