import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLiveSessionSnapshot } from '@/hooks/useLiveSessionSnapshot';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { LiveSessionDrilldown } from './LiveSessionDrilldown';
import { Moon, Clock } from 'lucide-react';
import { parse, format } from 'date-fns';

const MAX_AVATARS = 7;
const ENTERPRISE_THRESHOLD = 40;

interface LiveSessionIndicatorProps {
  locationId?: string;
  /** Shorten labels for compact layouts */
  compact?: boolean;
}

export function LiveSessionIndicator({ locationId, compact }: LiveSessionIndicatorProps) {
  const live = useLiveSessionSnapshot(locationId);
  const [drilldownOpen, setDrilldownOpen] = useState(false);

  const { inSessionCount, activeStylistCount, activeAssistantCount, stylists, dayHadAppointments, firstAppointmentTime, isLoading } = live;

  if (isLoading) return null;

  // Day concluded state
  if (inSessionCount === 0) {
    // Pre-service: appointments exist but haven't started yet
    if (firstAppointmentTime) {
      let formattedTime = firstAppointmentTime;
      try {
        formattedTime = format(parse(firstAppointmentTime, 'HH:mm:ss', new Date()), 'h:mm a');
      } catch {
        // fallback to raw value
      }
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border select-none whitespace-nowrap">
          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap font-sans truncate">
            {compact ? `Starts ${formattedTime}` : `First appt at ${formattedTime}`}
          </span>
        </div>
      );
    }

    if (!dayHadAppointments) return null;
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border select-none whitespace-nowrap">
        <Moon className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap font-sans truncate">
          {compact ? 'Concluded' : 'Day concluded'}
        </span>
      </div>
    );
  }

  const isEnterprise = activeStylistCount > ENTERPRISE_THRESHOLD;
  const visibleStylists = stylists.slice(0, MAX_AVATARS);
  const overflowCount = activeStylistCount - MAX_AVATARS;

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name[0] || '?').toUpperCase();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border cursor-pointer select-none hover:bg-accent/50 transition-colors"
            onClick={() => setDrilldownOpen(true)}
          >
            {/* Pulsating green dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>

            {/* Count text */}
            <span className="text-xs font-medium text-foreground whitespace-nowrap font-sans truncate">
              {compact
                ? `${activeStylistCount + activeAssistantCount} in service`
                : activeAssistantCount > 0
                  ? `${activeStylistCount} stylists, ${activeAssistantCount} assistants in service now`
                  : `${activeStylistCount} stylists in service now`}
            </span>

            {/* Stacked avatars (hidden for enterprise) */}
            {!isEnterprise && visibleStylists.length > 0 && (
              <div className="flex items-center -space-x-2 ml-1">
                {visibleStylists.map((stylist, i) => (
                  <Avatar
                    key={i}
                    className="h-6 w-6 border-2 border-background"
                  >
                    {stylist.photoUrl ? (
                      <AvatarImage src={stylist.photoUrl} alt={stylist.name} />
                    ) : null}
                    <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                      {getInitials(stylist.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {overflowCount > 0 && (
                  <div className="flex items-center justify-center h-6 w-6 rounded-full border-2 border-background bg-muted text-[9px] font-medium text-muted-foreground">
                    +{overflowCount}
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs font-sans">
            {inSessionCount} appointment{inSessionCount !== 1 ? 's' : ''} in progress
            {activeStylistCount > 0 && ` · ${activeStylistCount} stylist${activeStylistCount !== 1 ? 's' : ''} working`}
          </p>
          {stylists.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 font-sans">
              {stylists.map(s => s.name.split(' ')[0]).join(', ')}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
      <LiveSessionDrilldown
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        inSessionCount={inSessionCount}
        activeStylistCount={activeStylistCount}
        stylistDetails={live.stylistDetails}
        locationId={locationId}
      />
    </TooltipProvider>
  );
}
