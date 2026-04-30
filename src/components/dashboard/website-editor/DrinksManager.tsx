import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Trash2, GripVertical, Upload, X, Coffee } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useDrinkMenuConfig, type DrinkMenuConfig, type Drink, DEFAULT_DRINK_MENU } from '@/hooks/useSectionConfig';
import { ToggleInput } from './inputs/ToggleInput';
import { SliderInput } from './inputs/SliderInput';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { EditorCard } from './EditorCard';
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

interface SortableDrinkItemProps {
  drink: Drink;
  onUpdate: (id: string, updates: Partial<Drink>) => void;
  onDelete: (id: string) => void;
  onImageUpload: (id: string, file: File) => void;
  isUploading: boolean;
}

function SortableDrinkItem({ drink, onUpdate, onDelete, onImageUpload, isUploading }: SortableDrinkItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: drink.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(drink.id, file);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card/60 border border-border/40 rounded-xl p-4 space-y-4"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1 space-y-3">
          <div className="relative w-20 h-24 bg-muted rounded-lg overflow-hidden group">
            {drink.image_url ? (
              <>
                <img
                  src={drink.image_url}
                  alt={drink.name}
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={() => onUpdate(drink.id, { image_url: '' })}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/80 transition-colors">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Drink Name</Label>
            <Input
              value={drink.name}
              onChange={(e) => onUpdate(drink.id, { name: e.target.value })}
              placeholder="e.g. Dirty Peach"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ingredients (comma-separated)</Label>
            <Textarea
              value={drink.ingredients}
              onChange={(e) => onUpdate(drink.id, { ingredients: e.target.value })}
              placeholder="e.g. Coke, peach, vanilla cream"
              className="mt-1 min-h-[60px] resize-none"
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(drink.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function DrinksManager() {
  const { data, isLoading, isSaving, update } = useDrinkMenuConfig();
  const [localConfig, setLocalConfig] = useState<DrinkMenuConfig>(DEFAULT_DRINK_MENU);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const debouncedConfig = useDebounce(localConfig, 300);

  // Live-edit bridge — stream in-memory edits into the preview iframe.
  const { effectiveOrganization } = useOrganizationContext();
  usePreviewBridge('section_drink_menu', localConfig);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success('Drink Menu saved successfully');
      clearPreviewOverride('section_drink_menu', effectiveOrganization?.id ?? null);
      triggerPreviewRefresh();
    } catch {
      toast.error('Failed to save drink menu');
    }
  }, [localConfig, update, effectiveOrganization?.id]);

  useEditorSaveAction(handleSave);

  const updateField = <K extends keyof DrinkMenuConfig>(field: K, value: DrinkMenuConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleAddDrink = () => {
    const newDrink: Drink = {
      id: `drink-${Date.now()}`,
      name: '',
      image_url: '',
      ingredients: '',
    };
    setLocalConfig(prev => ({
      ...prev,
      drinks: [...prev.drinks, newDrink],
    }));
  };

  const handleUpdateDrink = (id: string, updates: Partial<Drink>) => {
    setLocalConfig(prev => ({
      ...prev,
      drinks: prev.drinks.map(drink =>
        drink.id === id ? { ...drink, ...updates } : drink
      ),
    }));
  };

  const handleDeleteDrink = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      drinks: prev.drinks.filter(drink => drink.id !== id),
    }));
  };

  const handleImageUpload = async (drinkId: string, file: File) => {
    setUploadingId(drinkId);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `drinks/drink-${drinkId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);
      handleUpdateDrink(drinkId, { image_url: urlData.publicUrl });
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalConfig(prev => {
        const oldIndex = prev.drinks.findIndex(d => d.id === active.id);
        const newIndex = prev.drinks.findIndex(d => d.id === over.id);
        return {
          ...prev,
          drinks: arrayMove(prev.drinks, oldIndex, newIndex),
        };
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EditorCard title="Drink Menu Section" icon={Coffee} description="Configure the header text and carousel behavior for the drink menu section.">
        <ToggleInput
          label="Show Eyebrow Header"
          value={localConfig.show_eyebrow}
          onChange={(val) => updateField('show_eyebrow', val)}
          description="Display the header text above the drink carousel"
        />
        {localConfig.show_eyebrow && (
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="eyebrow">Eyebrow Start</Label>
              <Input
                id="eyebrow"
                value={localConfig.eyebrow}
                onChange={(e) => updateField('eyebrow', e.target.value)}
                placeholder="Drinks on us. We have an exclusive menu of"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="highlight">Highlighted Word (underlined)</Label>
              <Input
                id="highlight"
                value={localConfig.eyebrow_highlight}
                onChange={(e) => updateField('eyebrow_highlight', e.target.value)}
                placeholder="complimentary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suffix">Eyebrow End</Label>
              <Input
                id="suffix"
                value={localConfig.eyebrow_suffix}
                onChange={(e) => updateField('eyebrow_suffix', e.target.value)}
                placeholder="options for your appointment."
              />
            </div>
          </div>
        )}
        <ToggleInput
          label="Show Drink Images"
          value={localConfig.show_drink_images}
          onChange={(val) => updateField('show_drink_images', val)}
          description="Display drink images in the carousel (text-only mode when off)"
        />
        <div className="pt-4 border-t border-border/40 space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Carousel Settings</h4>
          <SliderInput
            label="Carousel Speed"
            value={localConfig.carousel_speed}
            onChange={(val) => updateField('carousel_speed', val)}
            min={15}
            max={60}
            step={5}
            unit=" px/s"
            description="How fast drinks scroll across the screen"
          />
          <SliderInput
            label="Hover Slowdown"
            value={localConfig.hover_slowdown_factor}
            onChange={(val) => updateField('hover_slowdown_factor', val)}
            min={0.05}
            max={0.5}
            step={0.05}
            unit="x"
            description="Speed multiplier when hovering (lower = slower)"
          />
        </div>
      </EditorCard>

      <EditorCard
        title={`Drinks (${localConfig.drinks.length})`}
        icon={Coffee}
        headerActions={
          <Button onClick={handleAddDrink} size={tokens.button.card} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Drink
          </Button>
        }
      >
        {localConfig.drinks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No drinks added yet.</p>
            <p className="text-xs mt-1">Click "Add Drink" to create your first menu item.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localConfig.drinks.map(d => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {localConfig.drinks.map((drink) => (
                  <SortableDrinkItem
                    key={drink.id}
                    drink={drink}
                    onUpdate={handleUpdateDrink}
                    onDelete={handleDeleteDrink}
                    onImageUpload={handleImageUpload}
                    isUploading={uploadingId === drink.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/40">
          <strong>Tip:</strong> Drag drinks to reorder them. Changes are saved when you click "Save Changes" above.
        </p>
      </EditorCard>
    </div>
  );
}
