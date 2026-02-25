import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { GripVertical, User, MapPin, Sparkles, RotateCcw, Save, Loader2, Pencil, Calendar, CalendarOff } from 'lucide-react';
import { getLocationName, type Location } from '@/data/stylists';
import { cn } from '@/lib/utils';
import { EditStylistCardDialog } from './EditStylistCardDialog';

interface StylistProfile {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string | null;
  photo_url: string | null;
  instagram: string | null;
  tiktok?: string | null;
  stylist_level: string | null;
  specialties: string[] | null;
  highlighted_services?: string[] | null;
  location_id: string | null;
  location_ids?: string[] | null;
  bio?: string | null;
  is_booking: boolean | null;
  homepage_visible: boolean | null;
  homepage_order: number | null;
}

interface SortableStylistCardProps {
  stylist: StylistProfile;
  onToggleVisibility: (userId: string, visible: boolean) => void;
  onEdit: (stylist: StylistProfile) => void;
  isUpdating: boolean;
}

function SortableStylistCard({ stylist, onToggleVisibility, onEdit, isUpdating }: SortableStylistCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stylist.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasExtensions = stylist.specialties?.some(s => 
    s.toLowerCase().includes('extension')
  );

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <Card className={cn("transition-shadow", isDragging && "shadow-lg ring-2 ring-primary")}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="touch-none p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-5 h-5 text-muted-foreground" />
            </button>

            <Avatar className="w-12 h-12">
              <AvatarImage src={stylist.photo_url || undefined} alt={stylist.full_name} />
              <AvatarFallback className="bg-muted">
                {stylist.full_name?.charAt(0) || <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">
                  {stylist.display_name || stylist.full_name}
                </h3>
                {hasExtensions && (
                  <Badge variant="secondary" className="text-xs gap-1 flex-shrink-0">
                    <Sparkles className="w-3 h-3" />
                    Extensions
                  </Badge>
                )}
                {/* Booking Status Badge */}
                <Badge 
                  variant={stylist.is_booking ? "outline" : "secondary"} 
                  className={cn("text-xs gap-1 flex-shrink-0", !stylist.is_booking && "opacity-60")}
                >
                  {stylist.is_booking ? (
                    <><Calendar className="w-3 h-3" /> Booking</>
                  ) : (
                    <><CalendarOff className="w-3 h-3" /> Not Booking</>
                  )}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {stylist.stylist_level && (
                  <span className="text-sm text-muted-foreground">{stylist.stylist_level}</span>
                )}
                {stylist.location_id && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    {getLocationName(stylist.location_id as Location)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Edit Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(stylist)}
                className="gap-1"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </Button>
              
              {/* Visibility Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {stylist.homepage_visible ? 'Visible' : 'Hidden'}
                </span>
                <Switch
                  checked={stylist.homepage_visible ?? false}
                  onCheckedChange={(checked) => onToggleVisibility(stylist.user_id, checked)}
                  disabled={isUpdating}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ReorderableStylistListProps {
  stylists: StylistProfile[];
  onReorder: (orderedIds: string[]) => void;
  onToggleVisibility: (userId: string, visible: boolean) => void;
  onSaveOrder: () => void;
  onResetOrder: () => void;
  isUpdating: boolean;
  isSaving: boolean;
  hasChanges: boolean;
}

export function ReorderableStylistList({
  stylists,
  onReorder,
  onToggleVisibility,
  onSaveOrder,
  onResetOrder,
  isUpdating,
  isSaving,
  hasChanges,
}: ReorderableStylistListProps) {
  const [editingStylist, setEditingStylist] = useState<StylistProfile | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = stylists.findIndex((s) => s.id === active.id);
      const newIndex = stylists.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(stylists, oldIndex, newIndex);
      onReorder(newOrder.map(s => s.id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      {hasChanges && (
        <div className="flex items-center justify-between p-3 bg-card/80 backdrop-blur-xl rounded-full border border-border/40 shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)] animate-fade-in">
          <p className="text-sm text-muted-foreground">
            You have unsaved changes to the display order.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetOrder}
              disabled={isSaving}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={onSaveOrder}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save Order
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Drag to reorder. Click "Edit" to modify card details. Stylists appear on the homepage in this order.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stylists.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {stylists.map((stylist) => (
              <SortableStylistCard
                key={stylist.id}
                stylist={stylist}
                onToggleVisibility={onToggleVisibility}
                onEdit={setEditingStylist}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Edit Dialog */}
      <EditStylistCardDialog
        open={!!editingStylist}
        onOpenChange={(open) => !open && setEditingStylist(null)}
        stylist={editingStylist}
      />
    </div>
  );
}
