import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { UserCheck, ClipboardCheck, CalendarPlus, FileSignature, Upload, Loader2, Tablet, ChevronDown, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useLocations } from '@/hooks/useLocations';
import { useAllOrgKioskSettings, usePushDefaultsToAllLocations, useKioskDeviceStatus, KioskDeviceStatus } from '@/hooks/useKioskSettings';
import { OnlineIndicator } from '@/components/platform/ui/OnlineIndicator';
import { KioskLocationSettingsForm } from './KioskLocationSettingsForm';
import { KioskPreviewPanel } from './KioskPreviewPanel';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface KioskLocationStatusCardProps {
  orgId: string;
}

type LocationStatus = 'Customized' | 'Using Defaults' | 'Not Configured';

interface LocationRow {
  locationId: string;
  locationName: string;
  status: LocationStatus;
  enableWalkIns: boolean | null;
  enableSelfBooking: boolean | null;
  requireFormSigning: boolean | null;
}

function FeatureDot({ enabled }: { enabled: boolean | null }) {
  if (enabled === null) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full',
        enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
      )}
    />
  );
}

function StatusBadge({ status }: { status: LocationStatus }) {
  const variants: Record<LocationStatus, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
    'Customized': { variant: 'default', label: 'Customized' },
    'Using Defaults': { variant: 'secondary', label: 'Defaults' },
    'Not Configured': { variant: 'outline', label: 'No Config' },
  };
  const { variant, label } = variants[status];
  return <Badge variant={variant} className="text-[10px] px-2 py-0.5">{label}</Badge>;
}

function DeviceStatusCell({ status }: { status?: KioskDeviceStatus }) {
  if (!status) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const label = status.isOnline ? 'Online' : 'Offline';
  const lastSeenText = status.lastSeen
    ? formatDistanceToNow(status.lastSeen, { addSuffix: true })
    : 'Never';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1.5">
            <OnlineIndicator isOnline={status.isOnline} size="sm" />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{status.deviceName || 'Unknown Device'}</p>
          <p className="text-muted-foreground">Last seen: {lastSeenText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function KioskLocationStatusCard({ orgId }: KioskLocationStatusCardProps) {
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSettings, setPreviewSettings] = useState<any>(null);
  const [previewLocationName, setPreviewLocationName] = useState<string>('');

  const { data: locations = [] } = useLocations();
  const { data: allSettings = [], isLoading } = useAllOrgKioskSettings(orgId);
  const { data: deviceStatusMap = new Map() } = useKioskDeviceStatus(orgId);
  const { data: businessSettings } = useBusinessSettings();
  const pushToAll = usePushDefaultsToAllLocations();

  const activeLocations = locations.filter(l => l.is_active);
  const orgDefault = allSettings.find(s => !s.location_id);

  const rows: LocationRow[] = activeLocations.map(loc => {
    const locSettings = allSettings.find(s => s.location_id === loc.id);
    if (locSettings) {
      return {
        locationId: loc.id,
        locationName: loc.name,
        status: 'Customized',
        enableWalkIns: locSettings.enable_walk_ins,
        enableSelfBooking: locSettings.enable_self_booking,
        requireFormSigning: locSettings.require_form_signing,
      };
    }
    if (orgDefault) {
      return {
        locationId: loc.id,
        locationName: loc.name,
        status: 'Using Defaults',
        enableWalkIns: orgDefault.enable_walk_ins,
        enableSelfBooking: orgDefault.enable_self_booking,
        requireFormSigning: orgDefault.require_form_signing,
      };
    }
    return {
      locationId: loc.id,
      locationName: loc.name,
      status: 'Not Configured',
      enableWalkIns: null,
      enableSelfBooking: null,
      requireFormSigning: null,
    };
  });

  const hasOverrides = allSettings.some(s => s.location_id !== null);

  const handleRowClick = (locationId: string) => {
    setExpandedLocationId(prev => prev === locationId ? null : locationId);
  };

  const handlePreviewOpen = (settings: any, locationName: string) => {
    setPreviewSettings(settings);
    setPreviewLocationName(locationName);
    setPreviewOpen(true);
  };

  if (activeLocations.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">LOCATIONS</CardTitle>
              <CardDescription>
                Click a location to configure its kiosk settings
              </CardDescription>
            </div>
            {hasOverrides && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size={tokens.button.card} disabled={pushToAll.isPending}>
                    {pushToAll.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Apply Defaults to All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apply Defaults to All Locations?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all location-specific customizations. All locations will inherit from the organization defaults.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => pushToAll.mutate(orgId)}>
                      Yes, Apply to All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_80px_56px_56px_56px_56px_80px_40px] items-center px-4 py-2 text-xs text-muted-foreground font-medium">
                <span>Location</span>
                <span className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <Tablet className="h-3.5 w-3.5" />
                    <span className="text-[10px]">Device</span>
                  </div>
                </span>
                <span className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span className="text-[10px]">Check-In</span>
                  </div>
                </span>
                <span className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    <span className="text-[10px]">Walk-In</span>
                  </div>
                </span>
                <span className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <CalendarPlus className="h-3.5 w-3.5" />
                    <span className="text-[10px]">Booking</span>
                  </div>
                </span>
                <span className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <FileSignature className="h-3.5 w-3.5" />
                    <span className="text-[10px]">Forms</span>
                  </div>
                </span>
                <span className="text-center">Status</span>
                <span></span>
              </div>

              {/* Location Rows */}
              {rows.map(row => {
                const isExpanded = expandedLocationId === row.locationId;
                return (
                  <div key={row.locationId}>
                    {/* Summary Row */}
                    <div
                      className={cn(
                        "grid grid-cols-[1fr_80px_56px_56px_56px_56px_80px_40px] items-center px-4 py-3 cursor-pointer transition-colors",
                        isExpanded 
                          ? "bg-primary/5 border-l-2 border-l-primary" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => handleRowClick(row.locationId)}
                    >
                      <span className="flex items-center gap-2 font-medium text-sm">
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                          isExpanded && "rotate-180"
                        )} />
                        {row.locationName}
                      </span>
                      <span className="text-center" onClick={(e) => e.stopPropagation()}>
                        <DeviceStatusCell status={deviceStatusMap instanceof Map ? deviceStatusMap.get(row.locationId) : undefined} />
                      </span>
                      <span className="text-center">
                        <FeatureDot enabled={row.status === 'Not Configured' ? null : true} />
                      </span>
                      <span className="text-center">
                        <FeatureDot enabled={row.enableWalkIns} />
                      </span>
                      <span className="text-center">
                        <FeatureDot enabled={row.enableSelfBooking} />
                      </span>
                      <span className="text-center">
                        <FeatureDot enabled={row.requireFormSigning} />
                      </span>
                      <span className="text-center">
                        <StatusBadge status={row.status} />
                      </span>
                      <span className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size={tokens.button.inline}
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const locSettings = allSettings.find(s => s.location_id === row.locationId) || orgDefault;
                                if (locSettings) handlePreviewOpen(locSettings, row.locationName);
                              }}
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Quick Preview</TooltipContent>
                        </Tooltip>
                      </span>
                    </div>

                    {/* Expanded Settings Panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
                          exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="border-l-2 border-l-primary bg-muted/20 px-6 py-6">
                            <KioskLocationSettingsForm
                              locationId={row.locationId}
                              orgId={orgId}
                              locationName={row.locationName}
                              onPreviewOpen={(settings) => handlePreviewOpen(settings, row.locationName)}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Sheet */}
      <PremiumFloatingPanel open={previewOpen} onOpenChange={setPreviewOpen} maxWidth="720px">
        <div className="p-5 pb-3 border-b border-border/40">
          <h2 className="font-display text-sm tracking-wide uppercase">
            Kiosk Preview — {previewLocationName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live preview of how the kiosk will appear
          </p>
        </div>
        {previewSettings && (
          <div className="flex-1 overflow-y-auto p-5">
            <KioskPreviewPanel 
              settings={previewSettings} 
              businessSettings={businessSettings}
              locationName={previewLocationName}
            />
          </div>
        )}
      </PremiumFloatingPanel>
    </>
  );
}
