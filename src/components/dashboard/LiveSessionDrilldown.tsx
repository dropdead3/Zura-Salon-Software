import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Clock, MapPin, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DRILLDOWN_DIALOG_CONTENT_CLASS, DRILLDOWN_OVERLAY_CLASS } from './drilldownDialogStyles';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { LocationSelect } from '@/components/ui/location-select';
import { useLiveSessionSnapshot } from '@/hooks/useLiveSessionSnapshot';
import { isAllLocations } from '@/lib/locationFilter';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

import type { StylistDetail } from '@/hooks/useLiveSessionSnapshot';


function formatTimeDisplay(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function getInitials(name: string) {
  const clean = name.replace(/\.$/, '').trim();
  const parts = clean.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (clean[0] || '?').toUpperCase();
}

/** Ensures single-letter last names end with a period (e.g., "Sarah M" → "Sarah M.") */
function formatNameWithPeriod(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (last.length === 1) {
      parts[parts.length - 1] = last + '.';
    }
  }
  return parts.join(' ');
}

interface LiveSessionDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inSessionCount: number;
  activeStylistCount: number;
  stylistDetails: StylistDetail[];
  locationId?: string;
}

export function LiveSessionDrilldown({
  open,
  onOpenChange,
  inSessionCount,
  activeStylistCount,
  stylistDetails,
  locationId,
}: LiveSessionDrilldownProps) {
  const [drilldownLocationId, setDrilldownLocationId] = useState(locationId || 'all');

  // Sync with parent filter when dialog opens
  useEffect(() => {
    if (open) setDrilldownLocationId(locationId || 'all');
  }, [open, locationId]);

  const live = useLiveSessionSnapshot(drilldownLocationId);
  

  const details = live.stylistDetails;
  const stylistCount = details.length;
  const sessionCount = live.inSessionCount;
  const assistantCount = live.activeAssistantCount;
  const showGrouped = isAllLocations(drilldownLocationId);

  // Group stylists by location when showing all locations
  const groupedDetails = useMemo(() => {
    if (!showGrouped) return null;
    const groups = new Map<string, StylistDetail[]>();
    for (const s of details) {
      const key = s.locationName || 'Unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [details, showGrouped]);

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={DRILLDOWN_DIALOG_CONTENT_CLASS} overlayClassName={DRILLDOWN_OVERLAY_CLASS}>
          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <DialogTitle className={cn(tokens.heading.section, 'text-sm')}>Happening Now</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1.5">
              {sessionCount} appointment{sessionCount !== 1 ? 's' : ''} in progress · {stylistCount} stylist{stylistCount !== 1 ? 's' : ''}{assistantCount > 0 ? `, ${assistantCount} assistant${assistantCount !== 1 ? 's' : ''}` : ''} working
            </DialogDescription>
          </DialogHeader>

          {/* Location filter */}
          <div className="px-5 pb-3">
            <LocationSelect
              value={drilldownLocationId}
              onValueChange={setDrilldownLocationId}
              includeAll
              allLabel="All Locations"
              triggerClassName="h-8 text-xs"
            />
          </div>

          {/* Gradient divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Stylist list */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="py-1">
              {showGrouped && groupedDetails ? (
                groupedDetails.map(([locationName, stylists]) => (
                  <div key={locationName}>
                    {/* Location section header */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-2 bg-muted/60 backdrop-blur-sm border-b border-border/50">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">{locationName}</span>
                      <span className="text-[10px] text-muted-foreground">· {stylists.length} stylist{stylists.length !== 1 ? 's' : ''}</span>
                      {(() => {
                        const latestEnd = stylists.reduce((latest, s) => s.lastEndTime > latest ? s.lastEndTime : latest, '');
                        if (!latestEnd) return null;
                        const [h, m] = latestEnd.split(':').map(Number);
                        const d = new Date(); d.setHours(h, m, 0, 0);
                        const formatted = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        return <span className="ml-auto text-[10px] text-muted-foreground">Last appointment finishes at ~{formatted}</span>;
                      })()}
                    </div>
                    {stylists.map((stylist, i) => (
                      <StylistRow key={i} stylist={stylist} />
                    ))}
                  </div>
                ))
              ) : (
                details.map((stylist, i) => (
                  <StylistRow key={i} stylist={stylist} />
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

/** Single stylist row — extracted to avoid duplication between grouped/flat modes */
function StylistRow({ stylist }: { stylist: StylistDetail }) {
  const { dashPath } = useOrgDashboardPath();
  const progress = stylist.totalAppts > 0
    ? (stylist.currentApptIndex / stylist.totalAppts) * 100
    : 0;

  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/30 transition-colors">
      <Avatar className="h-9 w-9 shrink-0 border border-border">
        {stylist.photoUrl ? (
          <AvatarImage src={stylist.photoUrl} alt={stylist.name} />
        ) : null}
        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground rounded-lg">
          {getInitials(stylist.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={cn(
              "text-sm font-medium truncate",
              stylist.isUnmapped ? "text-muted-foreground italic" : "text-foreground"
            )}>
              {formatNameWithPeriod(stylist.name)}
            </p>
            {stylist.isUnmapped && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={dashPath('/admin/settings/staff-mapping')}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors text-[10px] font-medium shrink-0"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>Sync needed</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium">Unmapped staff</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    This stylist exists in Phorest but isn't linked to a Zura profile yet.
                    Click to open Staff Mapping.
                  </p>
                  {stylist.phorestStaffId && (
                    <p className="text-muted-foreground/70 text-[10px] mt-1 font-mono">
                      ID: {stylist.phorestStaffId}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
            {stylist.conflictPeers && stylist.conflictPeers.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-medium shrink-0 cursor-help">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Double-booked in Phorest</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium">Client double-booked</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {stylist.clientName || 'This client'} also has a concurrent appointment:
                  </p>
                  <ul className="text-muted-foreground text-xs mt-1 space-y-0.5">
                    {stylist.conflictPeers.map((peer, idx) => (
                      <li key={idx}>
                        • {formatNameWithPeriod(peer.stylistName)}
                        {peer.locationName ? ` at ${peer.locationName}` : ''}
                        {' '}({formatTimeDisplay(peer.startTime)}–{formatTimeDisplay(peer.endTime)})
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground/70 text-[10px] mt-1.5">
                    Verify with front desk — Phorest holds the source of truth.
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {stylist.assistedBy.length > 0 && (
            <span className="bg-muted/60 text-muted-foreground/80 text-[10px] px-2 py-0.5 rounded-full italic whitespace-nowrap">
              Assisted by {stylist.assistedBy.map(formatNameWithPeriod).join(', ')}
            </span>
          )}
        </div>
        {stylist.currentService && (
          <p className="text-xs text-muted-foreground truncate">
            {stylist.currentService}{stylist.clientName ? ` on ${stylist.clientName}` : ''}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          Appointment {stylist.currentApptIndex} of {stylist.totalAppts}
        </p>
        {/* Progress bar */}
        <div className="h-1 w-full bg-border/50 rounded-full mt-1">
          <div
            className="h-full bg-primary/40 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Wrap-up time chip */}
      <div className="flex flex-col items-end shrink-0 bg-muted/40 rounded-md px-2.5 py-1.5">
        <span className="text-[10px] text-muted-foreground/70 leading-tight">Last wrap-up</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <Clock className="h-3 w-3" />
          <span>~{formatTimeDisplay(stylist.lastEndTime)}</span>
        </div>
      </div>
    </div>
  );
}
