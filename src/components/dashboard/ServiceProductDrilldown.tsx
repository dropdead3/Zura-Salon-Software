import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Scissors, ShoppingBag, MapPin, Globe, ChevronDown } from 'lucide-react';
import { Scissors, ShoppingBag, MapPin, Globe, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveLocations } from '@/hooks/useLocations';
import { useServiceProductDrilldown } from '@/hooks/useServiceProductDrilldown';
import type { StaffServiceProduct } from '@/hooks/useServiceProductDrilldown';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface ServiceProductDrilldownProps {
  mode: 'services' | 'products' | null;
  onClose: () => void;
  dateFrom: string;
  dateTo: string;
  parentLocationId?: string;
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}





export function ServiceProductDrilldown({
  mode,
  onClose,
  dateFrom,
  dateTo,
  parentLocationId,
}: ServiceProductDrilldownProps) {
  const isServices = mode === 'services';
  const { data: locations = [] } = useActiveLocations();
  const { formatCurrencyWhole: fmt } = useFormatCurrency();

  // Local filter state — resets when dialog closes
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterLocationId, setFilterLocationId] = useState(parentLocationId || 'all');

  // Sync local filter when parent location changes
  useEffect(() => {
    setFilterLocationId(parentLocationId || 'all');
  }, [parentLocationId]);

  // Derive unique regions from locations
  const regions = useMemo(() => {
    const regionSet = new Set<string>();
    locations.forEach(loc => {
      if (loc.state_province) regionSet.add(loc.state_province);
    });
    return Array.from(regionSet).sort();
  }, [locations]);

  const showRegionFilter = regions.length > 1;

  // Filter locations by selected region
  const filteredLocations = useMemo(() => {
    if (filterRegion === 'all') return locations;
    return locations.filter(loc => loc.state_province === filterRegion);
  }, [locations, filterRegion]);

  // Determine effective locationId for the query
  const effectiveLocationId = useMemo(() => {
    if (filterLocationId !== 'all') return filterLocationId;
    if (filterRegion !== 'all') {
      // Return comma-separated IDs for region filtering — hook handles array
      const ids = filteredLocations.map(l => l.id);
      return ids.length > 0 ? ids.join(',') : 'none';
    }
    return parentLocationId || 'all';
  }, [filterLocationId, filterRegion, filteredLocations, parentLocationId]);

  const { data: drilldownData } = useServiceProductDrilldown({
    dateFrom,
    dateTo,
    locationId: effectiveLocationId,
  });

  const staffData = drilldownData?.staffData || [];
  const totalServiceRevenue = drilldownData?.totalServiceRevenue || 0;
  const totalProductRevenue = drilldownData?.totalProductRevenue || 0;

  // No longer filtering extensions — drilldown shows all product items
  const adjustedStaffData = staffData;

  const adjustedTotalProduct = totalProductRevenue;

  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    if (!adjustedStaffData?.length) return [];
    const total = isServices ? totalServiceRevenue : adjustedTotalProduct;
    return adjustedStaffData
      .map(s => ({
        ...s,
        primaryRevenue: isServices ? s.serviceRevenue : s.productRevenue,
        primaryCount: isServices ? s.serviceCount : s.productCount,
        sharePercent: total > 0
          ? Math.round(((isServices ? s.serviceRevenue : s.productRevenue) / total) * 100)
          : 0,
      }))
      .filter(s => s.primaryRevenue > 0 || s.primaryCount > 0)
      .sort((a, b) => b.primaryRevenue - a.primaryRevenue);
  }, [adjustedStaffData, isServices, totalServiceRevenue, adjustedTotalProduct]);

  // Reset filters when dialog closes
  const handleClose = () => {
    setFilterRegion('all');
    setFilterLocationId(parentLocationId || 'all');
    onClose();
  };

  return (
    <Dialog open={!!mode} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col duration-200 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        overlayClassName="backdrop-blur-sm bg-black/60 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      >
        {/* Header */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
              {isServices ? (
                <Scissors className="w-5 h-5 text-primary" />
              ) : (
                <ShoppingBag className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle className="font-display text-base font-medium tracking-wide">
                {isServices ? 'Services by Stylist' : 'Products by Stylist'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Revenue &amp; share of total</p>
            </div>
          </div>
        </div>

        {/* Filter Row */}
        <div className="px-6 py-3 border-b border-border/40 flex items-center gap-2 flex-wrap">
          {showRegionFilter && (
            <Select value={filterRegion} onValueChange={(v) => { setFilterRegion(v); setFilterLocationId('all'); }}>
              <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs gap-1.5">
                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={filterLocationId} onValueChange={setFilterLocationId}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {filteredLocations.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {parentLocationId && parentLocationId !== 'all' && filterLocationId === parentLocationId && (
            <span className="text-[10px] text-muted-foreground">Filtered from Command Center</span>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex-1 min-h-0 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="py-14 text-center">
              {!isServices && <ShoppingBag className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />}
              <p className="text-sm text-muted-foreground">
                {isServices ? 'No service data in this period' : 'No product sales in this period'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((staff) => {
                const isExpanded = !isServices && expandedStaffId === staff.phorestStaffId;
                const canExpand = !isServices && staff.productItems && staff.productItems.length > 0;
                return (
                  <div
                    key={staff.phorestStaffId}
                    className={`p-4 bg-muted/30 rounded-xl ${canExpand ? 'cursor-pointer transition-colors hover:bg-muted/50' : ''}`}
                    onClick={() => canExpand && setExpandedStaffId(isExpanded ? null : staff.phorestStaffId)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {getInitials(staff.staffName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{staff.staffName}</p>
                        <p className="text-xs text-muted-foreground">
                          {isServices
                            ? <>{staff.primaryCount} service{staff.primaryCount !== 1 ? 's' : ''} · {staff.sharePercent}% of total{staff.tipTotal > 0 && ` · ${fmt(staff.tipTotal)} tips`}</>
                            : <>{staff.primaryCount} product{staff.primaryCount !== 1 ? 's' : ''} · {staff.sharePercent}% of total</>
                          }
                        </p>
                      </div>
                      <span className="font-display text-lg tabular-nums">{fmt(staff.primaryRevenue)}</span>
                      {canExpand && (
                        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                    {isExpanded && staff.productItems && (
                      <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
                        {staff.productItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between pl-12 pr-1">
                            <span className="text-xs text-muted-foreground truncate">{item.itemName}</span>
                            <span className="text-xs tabular-nums text-foreground shrink-0 ml-2">{fmt(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/50 bg-muted/30 sticky bottom-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground tracking-wide">
              {isServices ? 'Total Service Revenue' : 'Total Product Revenue'}
            </p>
            <span className="font-display text-lg tabular-nums font-medium">
              {fmt(isServices ? totalServiceRevenue : adjustedTotalProduct)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
