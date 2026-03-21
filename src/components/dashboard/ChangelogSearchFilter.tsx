import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { 
  Search, Filter, X, Calendar as CalendarIcon, 
  Sparkles, Rocket, Bug, Lightbulb, Clock, Check
} from 'lucide-react';
import { isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import type { ChangelogEntry } from '@/hooks/useChangelog';
import { useIsMobile } from '@/hooks/use-mobile';

const ENTRY_TYPES = [
  { value: 'update', label: 'Update', icon: Sparkles, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'feature', label: 'Feature', icon: Rocket, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'bugfix', label: 'Bug Fix', icon: Bug, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'improvement', label: 'Improvement', icon: Lightbulb, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'coming_soon', label: 'Coming Soon', icon: Clock, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
];

export interface ChangelogFilters {
  keyword: string;
  types: string[];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface ChangelogSearchFilterProps {
  filters: ChangelogFilters;
  onFiltersChange: (filters: ChangelogFilters) => void;
  resultCount: number;
  totalCount: number;
}

export function filterChangelogEntries(entries: ChangelogEntry[], filters: ChangelogFilters): ChangelogEntry[] {
  return entries.filter(entry => {
    // Keyword filter
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      const matchesKeyword = 
        entry.title.toLowerCase().includes(keyword) ||
        entry.content.toLowerCase().includes(keyword) ||
        (entry.version?.toLowerCase().includes(keyword));
      if (!matchesKeyword) return false;
    }

    // Type filter
    if (filters.types.length > 0) {
      if (!filters.types.includes(entry.entry_type)) return false;
    }

    // Date range filter
    const entryDate = entry.published_at ? parseISO(entry.published_at) : null;
    if (entryDate) {
      if (filters.dateFrom && isBefore(entryDate, startOfDay(filters.dateFrom))) return false;
      if (filters.dateTo && isAfter(entryDate, endOfDay(filters.dateTo))) return false;
    }

    return true;
  });
}

export function ChangelogSearchFilter({
  filters,
  onFiltersChange,
  resultCount,
  totalCount,
}: ChangelogSearchFilterProps) {
  const { formatDate } = useFormatDate();
  const isMobile = useIsMobile();
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = 
    (filters.types.length > 0 ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0);

  const handleTypeToggle = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  };

  const clearFilters = () => {
    onFiltersChange({
      keyword: '',
      types: [],
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  const hasActiveFilters = filters.keyword || filters.types.length > 0 || filters.dateFrom || filters.dateTo;

  return (
    <div className="space-y-3 mb-6">
      {/* Search bar and filter button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search updates..."
            value={filters.keyword}
            onChange={(e) => onFiltersChange({ ...filters, keyword: e.target.value })}
            className="pl-9 pr-9"
          />
          {filters.keyword && (
            <button
              onClick={() => onFiltersChange({ ...filters, keyword: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant={showFilters || activeFilterCount > 0 ? 'secondary' : 'outline'}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className="relative shrink-0"
        >
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="p-4 border rounded-lg bg-card space-y-4">
          {/* Type filters */}
          <div>
            <p className="text-sm font-medium mb-2">Filter by Type</p>
            <div className="flex flex-wrap gap-2">
              {ENTRY_TYPES.map(type => {
                const Icon = type.icon;
                const isSelected = filters.types.includes(type.value);
                return (
                  <button
                    key={type.value}
                    onClick={() => handleTypeToggle(type.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                      isSelected
                        ? type.color + ' border-transparent'
                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {type.label}
                    {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div>
            <p className="text-sm font-medium mb-2">Date Range</p>
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size={tokens.button.inline} className={cn(
                    'justify-start text-left font-normal',
                    !filters.dateFrom && 'text-muted-foreground'
                  )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? formatDate(filters.dateFrom, 'MMM d, yyyy') : 'From date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground self-center">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size={tokens.button.inline} className={cn(
                    'justify-start text-left font-normal',
                    !filters.dateTo && 'text-muted-foreground'
                  )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? formatDate(filters.dateTo, 'MMM d, yyyy') : 'To date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => onFiltersChange({ ...filters, dateTo: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {(filters.dateFrom || filters.dateTo) && (
                <Button
                  variant="ghost"
                  size={tokens.button.inline}
                  onClick={() => onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
                  className="text-muted-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear dates
                </Button>
              )}
            </div>
          </div>

          {/* Clear all */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {resultCount} of {totalCount} updates
              </p>
              <Button variant="ghost" size={tokens.button.inline} onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Active filter badges (shown when filter panel is collapsed) */}
      {!showFilters && hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {filters.types.map(type => {
            const typeConfig = ENTRY_TYPES.find(t => t.value === type);
            if (!typeConfig) return null;
            return (
              <Badge
                key={type}
                variant="secondary"
                className={cn('gap-1 cursor-pointer', typeConfig.color)}
                onClick={() => handleTypeToggle(type)}
              >
                {typeConfig.label}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
            >
              {filters.dateFrom && formatDate(filters.dateFrom, 'MMM d')}
              {filters.dateFrom && filters.dateTo && ' - '}
              {filters.dateTo && formatDate(filters.dateTo, 'MMM d')}
              <X className="h-3 w-3" />
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-2">
            ({resultCount} results)
          </span>
        </div>
      )}
    </div>
  );
}
