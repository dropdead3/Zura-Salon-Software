import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';

interface SortablePinnedCardItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  isPinned: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  previewSrc?: string;
}

export function SortablePinnedCardItem({ 
  id, 
  label, 
  icon, 
  isPinned, 
  onToggle,
  isLoading = false,
  previewSrc,
}: SortablePinnedCardItemProps) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
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
        'flex items-center justify-between p-3 rounded-lg transition-colors',
        isPinned ? 'bg-muted/50' : 'bg-transparent opacity-60',
        isDragging && 'opacity-50 shadow-lg z-50 bg-background'
      )}
    >
      {/* Drag Handle */}
      <button 
        {...attributes} 
        {...listeners} 
        className="touch-none mr-2 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        type="button"
        disabled={!isPinned}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      {/* Icon + Label */}
      <div className="flex items-center gap-3 flex-1">
        <div className="text-muted-foreground">
          {icon}
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>

      {/* Preview Eye */}
      {previewSrc && (
        <HoverCardPrimitive.Root openDelay={200} closeDelay={100}>
          <HoverCardPrimitive.Trigger asChild>
            <button
              type="button"
              className="p-1 mr-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </HoverCardPrimitive.Trigger>
          <HoverCardPrimitive.Portal>
            <HoverCardPrimitive.Content
              side="left"
              align="start"
              sideOffset={16}
              className={cn(
                "z-[60] w-[380px] p-2 rounded-xl border bg-popover text-popover-foreground shadow-xl",
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              )}
            >
              <div className="space-y-2">
                <img
                  src={previewSrc}
                  alt={`${label} preview`}
                  className="rounded-lg border border-border/60 shadow-sm w-full"
                  loading="lazy"
                />
                <p className="text-[10px] text-muted-foreground text-center">
                  Preview with example data
                </p>
              </div>
            </HoverCardPrimitive.Content>
          </HoverCardPrimitive.Portal>
        </HoverCardPrimitive.Root>
      )}
      
      {/* Toggle */}
      <Switch 
        checked={isPinned} 
        onCheckedChange={onToggle} 
        disabled={isLoading}
      />
    </div>
  );
}
