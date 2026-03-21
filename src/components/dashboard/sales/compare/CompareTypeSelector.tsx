import { Calendar, MapPin, Tag, TrendingUp, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompareMode } from '@/hooks/useComparisonData';

interface CompareTypeSelectorProps {
  value: CompareMode;
  onChange: (mode: CompareMode) => void;
}

const modes: { value: CompareMode; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'time', label: 'Time Periods', icon: Calendar, description: 'Compare different date ranges' },
  { value: 'location', label: 'Locations', icon: MapPin, description: 'Compare salon locations' },
  { value: 'category', label: 'Categories', icon: Tag, description: 'Compare service/product categories' },
  { value: 'yoy', label: 'Year over Year', icon: TrendingUp, description: 'Compare to same period last year' },
];

export function CompareTypeSelector({ value, onChange }: CompareTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = value === mode.value;
        
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            className={cn(
              'relative flex flex-col items-start gap-1.5 px-3.5 py-3 rounded-lg border transition-all text-left',
              isActive
                ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                : 'bg-card hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2 w-full">
              <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-sm font-medium', isActive && 'text-foreground')}>{mode.label}</span>
              {isActive && (
                <Check className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-tight hidden sm:block">
              {mode.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
