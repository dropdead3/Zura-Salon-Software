import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { TableHead } from '@/components/ui/table';

interface SortableColumnHeaderProps {
  label: string;
  sortKey: string;
  currentSortField: string | null;
  onToggleSort: (field: string) => void;
  className?: string;
}

export function SortableColumnHeader({
  label,
  sortKey,
  currentSortField,
  onToggleSort,
  className,
}: SortableColumnHeaderProps) {
  return (
    <TableHead
      className={cn(tokens.table.columnHeader, 'cursor-pointer select-none', className)}
      onClick={() => onToggleSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={cn(
            'w-3 h-3',
            currentSortField === sortKey ? 'text-primary' : 'text-muted-foreground/50'
          )}
        />
      </span>
    </TableHead>
  );
}
