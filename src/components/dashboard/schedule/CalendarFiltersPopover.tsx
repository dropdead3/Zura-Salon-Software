import { useState } from 'react';
import { SlidersHorizontal, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CalendarFilterState {
  clientTypes: string[];
  confirmationStatus: string[];
  leadSources: string[];
}

const CLIENT_TYPES = [
  { id: 'new', label: 'New Clients' },
  { id: 'returning', label: 'Returning Clients' },
];

const CONFIRMATION_STATUS = [
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'unconfirmed', label: 'Unconfirmed' },
];

const LEAD_SOURCES = [
  { id: 'google', label: 'Google' },
  { id: 'social_media', label: 'Social Media' },
  { id: 'website_inquiry', label: 'Salon Website Inquiry' },
  { id: 'phone_inquiry', label: 'Salon Phone Inquiry' },
  { id: 'walk_in', label: 'Walk-In' },
  { id: 'referral', label: 'Referral' },
  { id: 'other', label: 'Other' },
];

interface CalendarFiltersPopoverProps {
  filters: CalendarFilterState;
  onFiltersChange: (filters: CalendarFilterState) => void;
}

export function CalendarFiltersPopover({ 
  filters, 
  onFiltersChange 
}: CalendarFiltersPopoverProps) {
  const [open, setOpen] = useState(false);

  const activeFilterCount = 
    filters.clientTypes.length + 
    filters.confirmationStatus.length + 
    filters.leadSources.length;

  const toggleFilter = (
    category: keyof CalendarFilterState, 
    value: string
  ) => {
    const current = filters[category];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    
    onFiltersChange({
      ...filters,
      [category]: updated,
    });
  };

  const clearAll = () => {
    onFiltersChange({
      clientTypes: [],
      confirmationStatus: [],
      leadSources: [],
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={cn(
            "text-background/70 hover:text-background hover:bg-background/10 relative",
            activeFilterCount > 0 && "text-background"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0"
        align="end"
        onMouseLeave={() => setOpen(false)}
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="font-medium text-sm">Filter Appointments</span>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size={tokens.button.inline}
              className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearAll}
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="p-3 space-y-4 max-h-[400px] overflow-y-auto">
          {/* Client Type */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider mb-2">
              Client Type
            </h4>
            <div className="space-y-1">
              {CLIENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => toggleFilter('clientTypes', type.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  <Checkbox 
                    checked={filters.clientTypes.includes(type.id)}
                    className="pointer-events-none"
                  />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Confirmation Status */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider mb-2">
              Confirmation Status
            </h4>
            <div className="space-y-1">
              {CONFIRMATION_STATUS.map((status) => (
                <button
                  key={status.id}
                  onClick={() => toggleFilter('confirmationStatus', status.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  <Checkbox 
                    checked={filters.confirmationStatus.includes(status.id)}
                    className="pointer-events-none"
                  />
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lead Source */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider mb-2">
              Lead Source
            </h4>
            <div className="space-y-1">
              {LEAD_SOURCES.map((source) => (
                <button
                  key={source.id}
                  onClick={() => toggleFilter('leadSources', source.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  <Checkbox 
                    checked={filters.leadSources.includes(source.id)}
                    className="pointer-events-none"
                  />
                  {source.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && (
          <div className="p-3 border-t border-border bg-muted/30">
            <div className="flex flex-wrap gap-1">
              {filters.clientTypes.map(id => {
                const type = CLIENT_TYPES.find(t => t.id === id);
                return type ? (
                  <Badge 
                    key={id} 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-destructive/20"
                    onClick={() => toggleFilter('clientTypes', id)}
                  >
                    {type.label}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ) : null;
              })}
              {filters.confirmationStatus.map(id => {
                const status = CONFIRMATION_STATUS.find(s => s.id === id);
                return status ? (
                  <Badge 
                    key={id} 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-destructive/20"
                    onClick={() => toggleFilter('confirmationStatus', id)}
                  >
                    {status.label}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ) : null;
              })}
              {filters.leadSources.map(id => {
                const source = LEAD_SOURCES.find(s => s.id === id);
                return source ? (
                  <Badge 
                    key={id} 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-destructive/20"
                    onClick={() => toggleFilter('leadSources', id)}
                  >
                    {source.label}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
