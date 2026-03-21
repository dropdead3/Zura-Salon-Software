import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Plus, Infinity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BusinessCapacity } from '@/hooks/useBusinessCapacity';

interface LocationCapacityBarProps {
  capacity: BusinessCapacity;
  onAddSeats: () => void;
}

export function LocationCapacityBar({ capacity, onAddSeats }: LocationCapacityBarProps) {
  const { locations } = capacity;

  if (locations.isUnlimited) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3">
          <Infinity className="h-5 w-5 text-emerald-500" />
          <span className="text-sm">
            <span className="font-medium">{locations.used}</span> location{locations.used !== 1 ? 's' : ''} (unlimited plan)
          </span>
        </div>
      </div>
    );
  }

  const utilization = locations.total > 0 ? (locations.used / locations.total) * 100 : 0;
  const isAtCapacity = locations.remaining === 0;
  const isNearCapacity = utilization >= 80 && !isAtCapacity;

  const getProgressColor = () => {
    if (isAtCapacity) return 'bg-red-500';
    if (isNearCapacity) return 'bg-amber-500';
    return 'bg-primary';
  };

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      isAtCapacity && "bg-red-500/5 border-red-500/20",
      isNearCapacity && !isAtCapacity && "bg-amber-500/5 border-amber-500/20"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {locations.used} of {locations.total} seats used
          </span>
          {isAtCapacity && (
            <span className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
              At capacity
            </span>
          )}
          {isNearCapacity && (
            <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
              Near capacity
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size={tokens.button.card}
          onClick={onAddSeats}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Seat
        </Button>
      </div>
      <div className="relative">
        <Progress 
          value={utilization} 
          className="h-2"
        />
        <div 
          className={cn("absolute top-0 left-0 h-full rounded-full transition-all", getProgressColor())}
          style={{ width: `${Math.min(utilization, 100)}%` }}
        />
      </div>
      {isAtCapacity && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
          You've used all your location seats. Add more to create new locations.
        </p>
      )}
    </div>
  );
}
