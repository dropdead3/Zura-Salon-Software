/**
 * CountsTab — Physical count session management.
 * Start counts, record variances, view shrinkage history.
 * Active sessions can be opened for product-by-product count entry.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ClipboardCheck, Plus, AlertTriangle, TrendingDown, ChevronRight, FileDown, Filter } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useCountSessions, useCreateCountSession, type CountSession } from '@/hooks/inventory/useCountSessions';
import { useShrinkageSummary, type ShrinkageSummary } from '@/hooks/useStockCounts';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { format } from 'date-fns';
import { CountEntryForm } from './CountEntryForm';
import { useBackroomInventoryTable } from '@/hooks/backroom/useBackroomInventoryTable';
import { generateCountSheetPdf, type CountSheetFilters } from '@/lib/generateCountSheetPdf';
import { fetchLogoAsDataUrl } from '@/lib/reportPdfLayout';
import { fetchInventoryForLocation } from '@/lib/fetchInventoryForLocation';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { useActiveLocations } from '@/hooks/useLocations';
import { toast } from 'sonner';

interface CountsTabProps {
  locationId?: string;
  pdfExportRef?: React.MutableRefObject<((locationIds: string[], combined: boolean) => void) | null>;
  locations?: { id: string; name: string }[];
}

export function CountsTab({ locationId, pdfExportRef, locations: locationsProp }: CountsTabProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const { data: allLocations = [] } = useActiveLocations();
  const locations = locationsProp || allLocations;
  const locationInfo = useReportLocationInfo(locationId);
  const orgId = effectiveOrganization?.id;
  const { data: sessions = [], isLoading: sessionsLoading } = useCountSessions();
  const { data: shrinkage = [], isLoading: shrinkageLoading } = useShrinkageSummary(locationId);
  const createSession = useCreateCountSession();
  const { formatCurrency } = useFormatCurrency();
  const { formatNumber } = useFormatNumber();
  const [tab, setTab] = useState<'sessions' | 'shrinkage'>('sessions');
  const [activeSession, setActiveSession] = useState<CountSession | null>(null);

  const isLoading = sessionsLoading || shrinkageLoading;
  const totalShrinkageCost = shrinkage.reduce((s, r) => s + r.shrinkageCost, 0);

  const { data: inventoryProducts = [] } = useBackroomInventoryTable({ locationId });
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Extract unique brands and categories
  const { brands, categories } = useMemo(() => {
    const brandSet = new Set<string>();
    const catSet = new Set<string>();
    for (const p of inventoryProducts) {
      if (p.brand) brandSet.add(p.brand);
      if (p.category) catSet.add(p.category);
    }
    return {
      brands: Array.from(brandSet).sort((a, b) => a.localeCompare(b)),
      categories: Array.from(catSet).sort((a, b) => a.localeCompare(b)),
    };
  }, [inventoryProducts]);

  const handleStartCount = () => {
    if (!orgId) return;
    createSession.mutate({
      organization_id: orgId,
      location_id: locationId,
    });
  };

  const handlePrintCountSheet = async (filters?: CountSheetFilters) => {
    if (inventoryProducts.length === 0) {
      toast.error('No products to include in count sheet');
      return;
    }
    setGeneratingPdf(true);
    setShowFilterDialog(false);
    try {
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      // Build a URL that links back to the inventory counts tab
      const countEntryUrl = `${window.location.origin}/dashboard/admin/backroom-settings?category=inventory`;
      await generateCountSheetPdf({
        products: inventoryProducts,
        orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization',
        locationName: locationInfo?.name,
        logoDataUrl,
        filters,
        countEntryUrl,
      });
      toast.success('Count sheet PDF downloaded');
    } catch (err) {
      toast.error('Failed to generate count sheet');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Multi-location PDF export handler
  const handleMultiLocationExport = useCallback(async (locationIds: string[], combined: boolean) => {
    const orgName = businessSettings?.business_name || effectiveOrganization?.name || 'Organization';
    const logoUrl = businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null;

    setGeneratingPdf(true);
    try {
      const logoDataUrl = await fetchLogoAsDataUrl(logoUrl);
      const countEntryUrl = `${window.location.origin}/dashboard/admin/backroom-settings?category=inventory`;

      // Single location
      if (locationIds.length <= 1) {
        const targetId = locationIds[0] || locationId;
        const products = targetId === locationId ? inventoryProducts : await fetchInventoryForLocation(orgId!, targetId!);
        const locName = locations.find(l => l.id === targetId)?.name || locationInfo?.name;
        await generateCountSheetPdf({ products, orgName, locationName: locName, logoDataUrl, countEntryUrl });
        toast.success('Count sheet downloaded');
        return;
      }

      // Multi-location: always separate files (count sheets are per-location by nature)
      for (let i = 0; i < locationIds.length; i++) {
        const locId = locationIds[i];
        const locName = locations.find(l => l.id === locId)?.name || `Location ${i + 1}`;
        toast.loading(`Exporting ${locName} (${i + 1} of ${locationIds.length})...`, { id: 'pdf-progress' });
        const products = locId === locationId ? inventoryProducts : await fetchInventoryForLocation(orgId!, locId);
        await generateCountSheetPdf({ products, orgName, locationName: locName, logoDataUrl, countEntryUrl });
      }
      toast.dismiss('pdf-progress');
      toast.success(`${locationIds.length} count sheets downloaded`);
    } catch (err) {
      toast.error('Failed to generate count sheet');
    } finally {
      setGeneratingPdf(false);
    }
  }, [inventoryProducts, businessSettings, effectiveOrganization, locationInfo, locationId, orgId, locations]);

  // Register PDF export handler for parent header button
  useEffect(() => {
    if (pdfExportRef) {
      pdfExportRef.current = handleMultiLocationExport;
    }
    return () => { if (pdfExportRef) pdfExportRef.current = null; };
  }, [handleMultiLocationExport, pdfExportRef]);

  const handleFilteredExport = () => {
    const filters: CountSheetFilters = {};
    if (selectedBrands.size > 0) filters.brands = Array.from(selectedBrands);
    if (selectedCategories.size > 0) filters.categories = Array.from(selectedCategories);
    handlePrintCountSheet(filters);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand); else next.add(brand);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // Count how many products match current filter
  const filteredProductCount = useMemo(() => {
    let count = inventoryProducts.length;
    if (selectedBrands.size > 0) {
      count = inventoryProducts.filter(p => p.brand && selectedBrands.has(p.brand)).length;
    }
    if (selectedCategories.size > 0) {
      const brandFiltered = selectedBrands.size > 0
        ? inventoryProducts.filter(p => p.brand && selectedBrands.has(p.brand))
        : inventoryProducts;
      count = brandFiltered.filter(p => p.category && selectedCategories.has(p.category)).length;
    }
    return count;
  }, [inventoryProducts, selectedBrands, selectedCategories]);

  // If a session is active for counting, show the entry form
  if (activeSession) {
    return (
      <CountEntryForm
        session={activeSession}
        locationId={locationId}
        onClose={() => setActiveSession(null)}
      />
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className={tokens.body.emphasis}>Physical Count Sessions</p>
          <p className={tokens.body.muted}>Run periodic counts to detect shrinkage and keep stock accurate.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedBrands(new Set());
              setSelectedCategories(new Set());
              setShowFilterDialog(true);
            }}
            disabled={generatingPdf || inventoryProducts.length === 0}
            className={tokens.button.cardAction}
          >
            <Filter className="w-4 h-4" />
            Filtered Sheet
          </Button>
          <Button size="sm" onClick={handleStartCount} disabled={createSession.isPending} className={tokens.button.cardAction}>
            {createSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Start New Count
          </Button>
        </div>
      </div>

      {/* Filter dialog for count sheet */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className={tokens.card.title}>Filter Count Sheet</DialogTitle>
            <DialogDescription>Select brands and/or categories to include. Leave empty for all products.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Brands */}
            {brands.length > 0 && (
              <div>
                <p className={cn(tokens.label.default, 'mb-2')}>Brands</p>
                <ScrollArea className="max-h-[140px]">
                  <div className="space-y-1.5">
                    {brands.map(brand => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <Checkbox
                          checked={selectedBrands.has(brand)}
                          onCheckedChange={() => toggleBrand(brand)}
                        />
                        <span className="text-sm">{brand}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <p className={cn(tokens.label.default, 'mb-2')}>Categories</p>
                <ScrollArea className="max-h-[140px]">
                  <div className="space-y-1.5">
                    {categories.map(cat => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <Checkbox
                          checked={selectedCategories.has(cat)}
                          onCheckedChange={() => toggleCategory(cat)}
                        />
                        <span className="text-sm">{cat}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <p className="text-muted-foreground text-xs">
              {filteredProductCount} product{filteredProductCount !== 1 ? 's' : ''} will be included
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilterDialog(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleFilteredExport}
              disabled={filteredProductCount === 0}
            >
              <FileDown className="w-4 h-4" />
              Export PDF ({filteredProductCount})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* KPI summary */}
      {shrinkage.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className={cn(tokens.kpi.tile, 'relative')}>
            <span className={tokens.kpi.label}>Total Shrinkage</span>
            <span className={cn(tokens.kpi.value, 'text-destructive')}>{formatCurrency(totalShrinkageCost)}</span>
          </div>
          <div className={cn(tokens.kpi.tile, 'relative')}>
            <span className={tokens.kpi.label}>Products Affected</span>
            <span className={tokens.kpi.value}>{shrinkage.length}</span>
          </div>
          <div className={cn(tokens.kpi.tile, 'relative hidden lg:flex')}>
            <span className={tokens.kpi.label}>Count Sessions</span>
            <span className={tokens.kpi.value}>{sessions.length}</span>
          </div>
        </div>
      )}

      {/* Sub-tab toggle */}
      <div className="flex gap-1">
        <Button variant={tab === 'sessions' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('sessions')}>
          <ClipboardCheck className="w-4 h-4 mr-1" /> Sessions
        </Button>
        <Button variant={tab === 'shrinkage' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('shrinkage')}>
          <TrendingDown className="w-4 h-4 mr-1" /> Shrinkage
        </Button>
      </div>

      {/* Sessions list */}
      {tab === 'sessions' && (
        sessions.length === 0 ? (
          <div className={tokens.empty.container}>
            <ClipboardCheck className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No count sessions yet</h3>
            <p className={tokens.empty.description}>Start your first physical count to ensure stock accuracy.</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden sm:table-cell')}>Products Counted</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden sm:table-cell')}>Variance (units)</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden md:table-cell')}>Variance (cost)</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Notes</TableHead>
                    <TableHead className={tokens.table.columnHeader}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const isActive = session.status === 'in_progress' || session.status === 'open';
                    return (
                      <TableRow
                        key={session.id}
                        className={cn(isActive && 'cursor-pointer hover:bg-muted/40')}
                        onClick={() => isActive && setActiveSession(session)}
                      >
                        <TableCell className={tokens.body.emphasis}>
                          {format(new Date(session.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px] font-medium border',
                            isActive ? 'bg-primary/10 text-primary border-primary/20' : 'bg-success/10 text-success border-success/20'
                          )}>
                            {isActive ? 'In Progress' : 'Completed'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell tabular-nums">{session.total_products_counted}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell tabular-nums">
                          {session.total_variance_units !== 0 ? (
                            <span className={session.total_variance_units < 0 ? 'text-destructive' : 'text-success'}>
                              {session.total_variance_units > 0 ? '+' : ''}{session.total_variance_units}
                            </span>
                          ) : '0'}
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell tabular-nums">
                          {session.total_variance_cost !== 0 ? (
                            <span className="text-destructive">{formatCurrency(Math.abs(session.total_variance_cost))}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                          {session.notes || '—'}
                        </TableCell>
                        <TableCell className="w-10">
                          {isActive && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      )}

      {/* Shrinkage summary */}
      {tab === 'shrinkage' && (
        shrinkage.length === 0 ? (
          <div className={tokens.empty.container}>
            <TrendingDown className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No shrinkage detected</h3>
            <p className={tokens.empty.description}>Complete a count session to identify discrepancies.</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'hidden sm:table-cell')}>Category</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Expected</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Counted</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Loss</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden md:table-cell')}>Cost of Loss</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Last Counted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shrinkage.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className={tokens.body.emphasis}>{item.productName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{item.category || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(item.expectedQty)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(item.countedQty)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive font-medium">
                        <span className="flex items-center justify-end gap-1">
                          <AlertTriangle className="w-3 h-3" /> {item.shrinkageUnits}
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell tabular-nums text-destructive">
                        {formatCurrency(item.shrinkageCost)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {format(new Date(item.lastCountedAt), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
