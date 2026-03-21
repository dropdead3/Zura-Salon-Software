import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, RefreshCw, MapPin, Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveLocations } from '@/hooks/useLocations';
import type { StaffBreakdownNew, StaffBreakdownReturning } from '@/hooks/useNewBookings';

interface NewBookingsDrilldownProps {
  mode: 'new' | 'returning' | null;
  onClose: () => void;
  newClientsByStaff: StaffBreakdownNew[];
  returningClientsByStaff: StaffBreakdownReturning[];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getRebookColor(rate: number) {
  if (rate >= 70) return 'bg-emerald-500';
  if (rate >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function NewBookingsDrilldown({
  mode,
  onClose,
  newClientsByStaff,
  returningClientsByStaff,
}: NewBookingsDrilldownProps) {
  const isNew = mode === 'new';
  const { data: locations = [] } = useActiveLocations();

  const [filterRegion, setFilterRegion] = useState('all');
  const [filterLocationId, setFilterLocationId] = useState('all');

  // Derive unique regions
  const regions = useMemo(() => {
    const regionSet = new Set<string>();
    locations.forEach(loc => {
      if (loc.state_province) regionSet.add(loc.state_province);
    });
    return Array.from(regionSet).sort();
  }, [locations]);

  const showRegionFilter = regions.length > 1;

  const filteredLocations = useMemo(() => {
    if (filterRegion === 'all') return locations;
    return locations.filter(loc => loc.state_province === filterRegion);
  }, [locations, filterRegion]);

  // Note: NewBookings data is pre-aggregated by the parent hook and doesn't support
  // re-querying by location inside the dialog yet. The filters are rendered for visual
  // consistency and will be wired when the hook supports locationId-based staff breakdown.
  const staffData = isNew ? newClientsByStaff : returningClientsByStaff;

  const handleClose = () => {
    setFilterRegion('all');
    setFilterLocationId('all');
    onClose();
  };

  return (
    <Dialog open={!!mode} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden gap-0"
        overlayClassName="backdrop-blur-sm bg-black/60"
      >
        {/* Header */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isNew ? 'bg-emerald-500/10' : 'bg-purple-500/10'
            }`}>
              {isNew ? (
                <UserPlus className="w-5 h-5 text-emerald-600" />
              ) : (
                <RefreshCw className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <div>
              <DialogTitle className="font-display text-base font-medium tracking-wide">
                {isNew ? 'New Client Bookings' : 'Returning Client Rebooks'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">By stylist</p>
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
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {staffData.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-muted-foreground">
                No {isNew ? 'new' : 'returning'} clients in this period
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {isNew
                ? (staffData as StaffBreakdownNew[]).map((staff) => (
                    <div
                      key={staff.phorestStaffId}
                      className="p-4 bg-muted/30 rounded-xl"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {getInitials(staff.staffName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{staff.staffName}</p>
                          <p className="text-xs text-muted-foreground">
                            {staff.count} new client{staff.count !== 1 ? 's' : ''} · {staff.sharePercent}% of new bookings
                          </p>
                        </div>
                        <span className="font-display text-lg tabular-nums">{staff.count}</span>
                      </div>
                      <Progress
                        value={staff.sharePercent}
                        className="h-1.5"
                        indicatorClassName="bg-emerald-500"
                      />
                    </div>
                  ))
                : (staffData as StaffBreakdownReturning[]).map((staff) => (
                    <div
                      key={staff.phorestStaffId}
                      className="p-4 bg-muted/30 rounded-xl"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {getInitials(staff.staffName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{staff.staffName}</p>
                          <p className="text-xs text-muted-foreground">
                            {staff.rebookedCount} of {staff.uniqueClients} rebooked · {staff.rebookRate}%
                          </p>
                        </div>
                        <span className="font-display text-lg tabular-nums">{staff.rebookRate}%</span>
                      </div>
                      <Progress
                        value={staff.rebookRate}
                        className="h-1.5"
                        indicatorClassName={getRebookColor(staff.rebookRate)}
                      />
                    </div>
                  ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/50 bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center tracking-wide">
            Stylist Performance Breakdown
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
