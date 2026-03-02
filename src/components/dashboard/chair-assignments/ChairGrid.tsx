import { Link } from 'react-router-dom';
import { User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AvailableChair, AvailableStylist, ChairAssignment } from '@/hooks/useChairAssignments';

interface ChairGridProps {
  chairs: AvailableChair[];
  assignments: ChairAssignment[];
  stylists: AvailableStylist[];
  onRemoveAssignment: (assignmentId: string) => void;
}

export function ChairGrid({ chairs, assignments, stylists, onRemoveAssignment }: ChairGridProps) {
  const stylistMap = new Map(stylists.map(s => [s.user_id, s]));
  const assignmentByChair = new Map(assignments.map(a => [a.chair_id, a]));

  if (chairs.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <User className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No chairs configured</h3>
        <p className={tokens.empty.description}>
          Add stations in your location settings first
        </p>
        <Button variant="outline" size="sm" asChild className="mt-4">
          <Link to="/dashboard/admin/settings?category=services">
            Go to Location Settings
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {chairs.map(chair => {
        const assignment = assignmentByChair.get(chair.id);
        const stylist = assignment ? stylistMap.get(assignment.stylist_user_id) : null;
        const isAssigned = !!assignment;

        return (
          <div
            key={chair.id}
            className={cn(
              'rounded-xl border p-4 flex flex-col items-center gap-3 transition-colors min-h-[140px]',
              isAssigned
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-card border-dashed'
            )}
          >
            {/* Chair label */}
            <span className={cn(tokens.label.tiny, 'text-center')}>
              {chair.station_name}
              {chair.station_number != null && ` #${chair.station_number}`}
            </span>

            {isAssigned && stylist ? (
              <div className="flex flex-col items-center gap-2 flex-1 justify-center">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={stylist.photo_url ?? undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {(stylist.display_name || stylist.full_name || '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(tokens.body.emphasis, 'text-center text-xs leading-tight')}>
                  {stylist.display_name || stylist.full_name || 'Unknown'}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveAssignment(assignment.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove assignment</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 flex-1 justify-center">
                <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground/40" />
                </div>
                <span className={cn(tokens.body.muted, 'text-xs')}>Unassigned</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
