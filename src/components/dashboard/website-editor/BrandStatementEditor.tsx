import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Loader2, Settings2, Plus, Trash2, RotateCcw, GripVertical, Type } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useBrandStatementConfig, type BrandStatementConfig, DEFAULT_BRAND_STATEMENT } from '@/hooks/useSectionConfig';
import { RotatingWordsInput } from './RotatingWordsInput';
import { SliderInput } from './inputs/SliderInput';
import { ToggleInput } from './inputs/ToggleInput';
import { CharCountInput } from './inputs/CharCountInput';
import { useDebounce } from '@/hooks/use-debounce';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';
import { EditorCard } from './EditorCard';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SortableParagraphProps {
  id: string;
  index: number;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function SortableParagraph({ id, index, value, onChange, onRemove, canRemove }: SortableParagraphProps) {
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
      className={cn("space-y-2", isDragging && "opacity-50")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Label>Paragraph {index + 1}</Label>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size={tokens.button.inline}
            onClick={onRemove}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}

export function BrandStatementEditor() {
  const __saveTelemetry = useSaveTelemetry('brand-statement-editor');
  const { data, isLoading, isSaving, update } = useBrandStatementConfig();
  const [localConfig, setLocalConfig] = useState<BrandStatementConfig>(DEFAULT_BRAND_STATEMENT);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const debouncedConfig = useDebounce(localConfig, 300);

  const { effectiveOrganization } = useOrganizationContext();
  usePreviewBridge('section_brand_statement', localConfig);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success('Brand Statement saved');
      clearPreviewOverride('section_brand_statement', effectiveOrganization?.id ?? null);
      __saveTelemetry.event('save-success'); triggerPreviewRefresh(); __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, effectiveOrganization?.id]);

  useEditorSaveAction(handleSave);

  const updateField = <K extends keyof BrandStatementConfig>(field: K, value: BrandStatementConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateParagraph = (index: number, value: string) => {
    const newParagraphs = [...localConfig.paragraphs];
    newParagraphs[index] = value;
    updateField('paragraphs', newParagraphs);
  };

  const addParagraph = () => {
    if (localConfig.paragraphs.length < 5) {
      updateField('paragraphs', [...localConfig.paragraphs, '']);
    }
  };

  const removeParagraph = (index: number) => {
    if (localConfig.paragraphs.length > 1) {
      const newParagraphs = localConfig.paragraphs.filter((_, i) => i !== index);
      updateField('paragraphs', newParagraphs);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localConfig.paragraphs.findIndex((_, i) => `para-${i}` === active.id);
      const newIndex = localConfig.paragraphs.findIndex((_, i) => `para-${i}` === over.id);
      updateField('paragraphs', arrayMove(localConfig.paragraphs, oldIndex, newIndex));
    }
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_BRAND_STATEMENT);
    toast.info('Reset to defaults — save to apply');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      <EditorCard
        title="Brand Statement"
        icon={Type}
        headerActions={
          <Button variant="ghost" size={tokens.button.card} onClick={handleReset} className="text-muted-foreground gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        }
      >
        {/* Eyebrow */}
        <ToggleInput
          label="Show Eyebrow"
          value={localConfig.show_eyebrow}
          onChange={(value) => updateField('show_eyebrow', value)}
          description="Display the small introductory text above the headline"
        />
        {localConfig.show_eyebrow && (
          <CharCountInput
            label="Eyebrow Text"
            value={localConfig.eyebrow}
            onChange={(value) => updateField('eyebrow', value)}
            maxLength={40}
            description="Small introductory text above the headline (e.g. 'Our Brand is')"
            aiFieldType="eyebrow"
          />
        )}

        {/* Headline */}
        <ToggleInput
          label="Show Headline"
          value={localConfig.show_headline}
          onChange={(value) => updateField('show_headline', value)}
          description="Display the prefix/suffix/rotating headline block"
        />
        {localConfig.show_headline && (
          <>
            <div className="space-y-4">
              <CharCountInput
                label="Headline Prefix"
                value={localConfig.headline_prefix}
                onChange={(value) => updateField('headline_prefix', value)}
                maxLength={30}
                placeholder="Not Your"
                description="Static text before the rotating words"
                aiFieldType="hero_headline"
              />
              <CharCountInput
                label="Headline Suffix"
                value={localConfig.headline_suffix}
                onChange={(value) => updateField('headline_suffix', value)}
                maxLength={30}
                placeholder="Salon"
                description="Static text after the rotating words"
              />
            </div>
            <RotatingWordsInput
              words={localConfig.rotating_words}
              onChange={(words) => updateField('rotating_words', words)}
              label="Rotating Words (Between Prefix & Suffix)"
              placeholder="e.g. Boring, Average..."
            />
          </>
        )}

        {/* Paragraphs with DnD */}
        <ToggleInput
          label="Show Paragraphs"
          value={localConfig.show_paragraphs}
          onChange={(value) => updateField('show_paragraphs', value)}
          description="Display description paragraphs below the headline"
        />
        {localConfig.show_paragraphs && (
          <div className="space-y-4 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">Description Paragraphs</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Drag to reorder. These appear below the headline.</p>
              </div>
              {localConfig.paragraphs.length < 5 && (
                <Button type="button" variant="outline" size={tokens.button.card} onClick={addParagraph}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localConfig.paragraphs.map((_, i) => `para-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                {localConfig.paragraphs.map((paragraph, index) => (
                  <SortableParagraph
                    key={`para-${index}`}
                    id={`para-${index}`}
                    index={index}
                    value={paragraph}
                    onChange={(value) => updateParagraph(index, value)}
                    onRemove={() => removeParagraph(index)}
                    canRemove={localConfig.paragraphs.length > 1}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Advanced Settings */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between mt-4">
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Advanced Settings
              </span>
              <span className="text-xs text-muted-foreground">
                {showAdvanced ? 'Hide' : 'Show'}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Typewriter Animation</h4>
              <SliderInput
                label="Typing Speed"
                value={localConfig.typewriter_speed}
                onChange={(value) => updateField('typewriter_speed', value)}
                min={50}
                max={200}
                step={10}
                unit="ms"
                description="Time between each character appearing"
              />
              <SliderInput
                label="Pause Between Words"
                value={localConfig.typewriter_pause}
                onChange={(value) => updateField('typewriter_pause', value)}
                min={1}
                max={5}
                step={0.5}
                unit="s"
                description="How long to pause after completing a word"
              />
              <ToggleInput
                label="Show Blinking Cursor"
                value={localConfig.show_typewriter_cursor}
                onChange={(value) => updateField('show_typewriter_cursor', value)}
                description="Display the typewriter cursor animation"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </EditorCard>
    </div>
  );
}
