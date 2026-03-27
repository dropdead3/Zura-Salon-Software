import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Switch } from '@/components/ui/switch';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableWidgetItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  isEnabled: boolean;
  onToggle: () => void;
}

export function SortableWidgetItem({ 
  id, 
  label, 
  icon, 
  isEnabled, 
  onToggle 
}: SortableWidgetItemProps) {
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
        isEnabled ? 'bg-muted/50' : 'bg-transparent',
        isDragging && 'opacity-50 shadow-lg z-50 bg-background'
      )}
    >
      {/* Drag Handle */}
      <button 
        {...attributes} 
        {...listeners} 
        className="touch-none mr-2 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        type="button"
        disabled={!isEnabled}
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
      
      {/* Toggle */}
      <Switch checked={isEnabled} onCheckedChange={onToggle} />
    </div>
  );
}
