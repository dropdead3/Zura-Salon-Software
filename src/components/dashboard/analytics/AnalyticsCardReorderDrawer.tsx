import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { ArrowUpDown, RotateCcw, GripVertical } from 'lucide-react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

export interface CardDefinition {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SortableCardItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
}

function SortableCardItem({ id, label, icon }: SortableCardItemProps) {
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
        'flex items-center gap-3 p-3 rounded-lg bg-muted/50 transition-colors',
        isDragging && 'opacity-50 shadow-lg z-50 bg-background'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        type="button"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-sm font-medium flex-1">{label}</span>
    </div>
  );
}

interface AnalyticsCardReorderDrawerProps {
  pageId: string;
  cards: CardDefinition[];
  orderedIds: string[];
  onReorder: (newOrder: string[]) => void;
  onReset: () => void;
}

export function AnalyticsCardReorderDrawer({
  pageId,
  cards,
  orderedIds,
  onReorder,
  onReset,
}: AnalyticsCardReorderDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedIds.indexOf(active.id as string);
    const newIndex = orderedIds.indexOf(over.id as string);
    const newOrder = arrayMove(orderedIds, oldIndex, newIndex);
    onReorder(newOrder);
  };

  // Build ordered card definitions
  const orderedCards = orderedIds
    .map(id => cards.find(c => c.id === id))
    .filter(Boolean) as CardDefinition[];

  return (
    <>
      <Button
        variant="ghost"
        size={tokens.button.card}
        className="gap-1.5 text-muted-foreground hover:text-foreground h-8"
        onClick={() => setIsOpen(true)}
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-xs">Reorganize</span>
      </Button>

      <PremiumFloatingPanel open={isOpen} onOpenChange={setIsOpen} maxWidth="440px">
        <div className="p-5 pb-3 border-b border-border/40">
          <h2 className="font-display text-sm tracking-wide uppercase flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5" />
            Reorganize Cards
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Drag cards to reorder them on this page
          </p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {orderedCards.map(card => (
                  <SortableCardItem
                    key={card.id}
                    id={card.id}
                    label={card.label}
                    icon={card.icon}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size={tokens.button.card}
            className="w-full gap-2"
            onClick={() => {
              onReset();
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Default
          </Button>
        </div>
      </PremiumFloatingPanel>
    </>
  );
}
