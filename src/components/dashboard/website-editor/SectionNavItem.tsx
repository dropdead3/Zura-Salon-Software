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
      style={style}
      className={cn(
        // Keep a real inset on the right edge instead of relying on a scaled
        // switch plus negative margin hacks; this gives the action cluster a
        // stable gutter away from the rail and scrollbar.
        'group flex items-center gap-2 pl-2 pr-4 py-2 mx-3 rounded-lg cursor-pointer transition-all',
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

      {/* Actions — keep a real inner gutter on the right so the controls never
          read as touching the rail edge, even when the scrollbar is visible. */}
      <div
        className="flex items-center gap-1 shrink-0 pr-1"
        onClick={(e) => e.stopPropagation()}
      >
        {onDuplicate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onDuplicate}
            title="Duplicate section"
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
        {deletable && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            onClick={onDelete}
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
