import { useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SectionNavItemProps {
  id: string;
  label: string;
  description: string;
  order: number;
  enabled: boolean;
  isActive: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
  deletable?: boolean;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

// Fixed width reserved for the right-side action cluster, regardless of hover
// state. Sized to fit: [duplicate 24px] [delete 24px] [gap 4px] [switch 36px]
// + 12px right padding + small breathing room. Locking this width prevents the
// hover reveal from re-flowing the title/subtitle column.
const ACTION_ZONE_WIDTH = 92; // px

export function SectionNavItem({
  id,
  label,
  description,
  order,
  enabled,
  isActive,
  onSelect,
  onToggle,
  deletable = false,
  onDelete,
  onDuplicate,
}: SectionNavItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, paddingRight: ACTION_ZONE_WIDTH }}
      className={cn(
        // `relative` so the action cluster can be absolutely positioned and
        // therefore taken out of the row's flex flow — this is what stops the
        // duplicate icon from pushing the subtitle on hover.
        'group relative flex items-center gap-2 pl-2 py-2 mx-3 rounded-lg cursor-pointer transition-all',
        isActive
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-muted/60 border border-transparent',
        isDragging && 'opacity-50 shadow-lg z-50',
        !enabled && 'opacity-50'
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium truncate',
            isActive && 'text-primary'
          )}>
            {label}
          </span>
          <Badge
            variant="outline"
            className="shrink-0 text-[9px] px-1 py-0 h-4 opacity-60"
          >
            {order}
          </Badge>
          {deletable && (
            <Badge variant="secondary" className="shrink-0 text-[9px] px-1 py-0 h-4">Custom</Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground truncate hidden xl:block">
          {description}
        </p>
      </div>

      {/*
        Action zone — absolutely positioned so revealing the duplicate/delete
        icons on hover never changes the row's flex layout. Width is reserved
        via `paddingRight` on the row above, so the subtitle text cannot bleed
        underneath these controls.
      */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-1 pr-3"
        style={{ width: ACTION_ZONE_WIDTH }}
        onClick={(e) => e.stopPropagation()}
      >
        {onDuplicate && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 shrink-0 transition-opacity duration-150',
              // Visual-only reveal — does not affect layout. Always rendered,
              // always occupies its slot, just invisible until row hover/focus.
              'opacity-0 pointer-events-none',
              'group-hover:opacity-100 group-hover:pointer-events-auto',
              'group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
            )}
            onClick={onDuplicate}
            title="Duplicate section"
            tabIndex={-1}
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
        {deletable && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 shrink-0 text-destructive hover:text-destructive transition-opacity duration-150',
              'opacity-0 pointer-events-none',
              'group-hover:opacity-100 group-hover:pointer-events-auto',
              'group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
            )}
            onClick={onDelete}
            title="Delete section"
            tabIndex={-1}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="h-5 w-9 shrink-0 [&>span]:h-4 [&>span]:w-4 [&>span[data-state=checked]]:translate-x-4 [&>span[data-state=unchecked]]:translate-x-0"
        />
      </div>
    </div>
  );
}
