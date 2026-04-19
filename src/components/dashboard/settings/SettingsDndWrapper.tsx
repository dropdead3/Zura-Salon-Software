import { ReactNode } from 'react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { GripVertical } from 'lucide-react';
import { DragFeedback } from '@/components/dnd/DragFeedback';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { SECTION_GROUPS } from '@/hooks/useSettingsLayout';

interface CategoryInfo {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

function SortableCard({ category, onClick }: { category: CategoryInfo; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: category.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = category.icon;

  return (
    <DragFeedback ref={setNodeRef} style={style} isDragging={isDragging} isOver={isOver} className="group relative">
      <Card className={cn("transition-all relative h-[140px] border-dashed", isDragging && "opacity-50")}>
        <div {...attributes} {...listeners} className="absolute top-3 right-3 p-1.5 rounded-md bg-muted hover:bg-muted/80 cursor-grab active:cursor-grabbing z-10">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4 text-center">
          <div className={tokens.card.iconBox}><Icon className={tokens.card.icon} /></div>
          <span className={cn(tokens.card.title, 'leading-tight')}>{category.label}</span>
        </div>
      </Card>
    </DragFeedback>
  );
}

interface SettingsDndWrapperProps {
  localOrder: string[];
  onReorder: (newOrder: string[]) => void;
  categoriesMap: Record<string, CategoryInfo>;
  isSuperAdmin: boolean;
  canViewBilling: boolean;
  onCategoryClick: (id: string) => void;
}

export function SettingsDndWrapper({ localOrder, onReorder, categoriesMap, isSuperAdmin, canViewBilling, onCategoryClick }: SettingsDndWrapperProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localOrder.indexOf(active.id as string);
      const newIndex = localOrder.indexOf(over.id as string);
      onReorder(arrayMove(localOrder, oldIndex, newIndex));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-8">
        {SECTION_GROUPS.map((section) => {
          const sectionCategoryIds = section.categories.filter(id =>
            localOrder.includes(id) && categoriesMap[id] && (id !== 'feedback' || isSuperAdmin) && (id !== 'account-billing' || canViewBilling)
          );
          sectionCategoryIds.sort((a, b) => localOrder.indexOf(a) - localOrder.indexOf(b));
          if (sectionCategoryIds.length === 0) return null;

          return (
            <div key={section.id} className="space-y-4">
              <h2 className="font-display text-xs uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2">{section.label}</h2>
              <SortableContext items={sectionCategoryIds} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sectionCategoryIds.map(categoryId => {
                    const category = categoriesMap[categoryId];
                    if (!category) return null;
                    return <SortableCard key={category.id} category={category} onClick={() => onCategoryClick(category.id)} />;
                  })}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
