import { useState, useRef, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, GripVertical, Upload, X, ImageIcon, Tag } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useDirtyState } from '@/hooks/useDirtyState';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useBrandsConfig, type Brand, DEFAULT_BRANDS } from '@/hooks/useSectionConfig';
import { supabase } from '@/integrations/supabase/client';
import { SliderInput } from './inputs/SliderInput';
import { ToggleInput } from './inputs/ToggleInput';
import { useDebounce } from '@/hooks/use-debounce';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';
import { EditorCard } from './EditorCard';
import { SectionStyleEditor } from './SectionStyleEditor';
import type { StyleOverrides } from '@/components/home/SectionStyleWrapper';
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

interface SortableBrandItemProps {
  brand: Brand;
  onUpdate: (id: string, updates: Partial<Brand>) => void;
  onRemove: (id: string) => void;
  onImageUpload: (id: string, file: File) => void;
  onImageRemove: (id: string) => void;
  isUploading: boolean;
}

function SortableBrandItem({ brand, onUpdate, onRemove, onImageUpload, onImageRemove, isUploading }: SortableBrandItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: brand.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(brand.id, file);
    }
    // Allow re-uploading the same filename later by resetting the input.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const logoHeight = brand.logo_height_px ?? 32;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid grid-cols-[auto_auto_1fr_auto] items-start gap-3 p-4 rounded-xl border border-border/40 bg-card/60 transition-all",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
      )}
    >
      <button
        className="mt-3 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors self-start"
        {...attributes}
        {...listeners}
        aria-label="Reorder brand"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-shrink-0 self-start">
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        {brand.logo_url ? (
          <div className="relative group">
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="w-16 h-16 object-contain rounded-lg border bg-background p-1"
            />
            <button
              type="button"
              onClick={() => onImageRemove(brand.id)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove logo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
            disabled={isUploading}
            aria-label="Upload logo"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Brand Name</Label>
            <Input
              value={brand.name}
              onChange={(e) => onUpdate(brand.id, { name: e.target.value })}
              placeholder="Brand name..."
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Display Text (Marquee)</Label>
            <Input
              value={brand.display_text}
              onChange={(e) => onUpdate(brand.id, { display_text: e.target.value })}
              placeholder="BRAND NAME"
              className="h-9 font-display uppercase"
            />
          </div>
        </div>
        {brand.logo_url ? (
          <SliderInput
            label="Logo Height"
            value={logoHeight}
            onChange={(value) => onUpdate(brand.id, { logo_height_px: value })}
            min={16}
            max={64}
            step={2}
            unit="px"
            description="Height in the marquee. Width scales to keep the logo's aspect ratio."
          />
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size={tokens.button.inline}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-xs"
            >
              <Upload className="h-3 w-3 mr-1" />
              Upload Logo (SVG recommended)
            </Button>
            <span className="text-[11px] text-muted-foreground">Optional — text alone looks great.</span>
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(brand.id)}
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 self-start"
        aria-label="Delete brand"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function BrandsManager() {
  const __saveTelemetry = useSaveTelemetry('brands-manager');
  const { data, isLoading, isSaving, update } = useBrandsConfig();
  const [localConfig, setLocalConfig] = useState(DEFAULT_BRANDS);
  const [uploadingBrandId, setUploadingBrandId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const debouncedConfig = useDebounce(localConfig, 300);

  // Live-edit bridge — stream in-memory edits into the preview iframe.
  const { effectiveOrganization } = useOrganizationContext();
  usePreviewBridge('section_brands', localConfig);

  if (data && !hasInitialized && !isLoading) {
    setLocalConfig(data);
    setHasInitialized(true);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localConfig.brands.findIndex((b) => b.id === active.id);
      const newIndex = localConfig.brands.findIndex((b) => b.id === over.id);
      setLocalConfig({
        ...localConfig,
        brands: arrayMove(localConfig.brands, oldIndex, newIndex),
      });
    }
  };

  const handleAddBrand = () => {
    const newBrand: Brand = {
      id: crypto.randomUUID(),
      name: '',
      display_text: '',
      logo_url: undefined,
    };
    setLocalConfig({
      ...localConfig,
      brands: [...localConfig.brands, newBrand],
    });
  };

  const handleUpdateBrand = (id: string, updates: Partial<Brand>) => {
    setLocalConfig({
      ...localConfig,
      brands: localConfig.brands.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    });
  };

  const handleRemoveBrand = (id: string) => {
    setLocalConfig({
      ...localConfig,
      brands: localConfig.brands.filter((b) => b.id !== id),
    });
  };

  const handleImageUpload = async (brandId: string, file: File) => {
    try {
      setUploadingBrandId(brandId);
      const fileExt = file.name.split('.').pop();
      const fileName = `brand-${brandId}-${Date.now()}.${fileExt}`;
      const filePath = `brands/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);
      handleUpdateBrand(brandId, { logo_url: urlData.publicUrl });
      toast.success('Logo uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingBrandId(null);
    }
  };

  const handleImageRemove = (brandId: string) => {
    handleUpdateBrand(brandId, { logo_url: undefined });
  };

  const handleSave = useCallback(async () => {
    try {
      const validBrands = localConfig.brands.filter(
        (b) => b.name.trim() && b.display_text.trim()
      );
      await update({ ...localConfig, brands: validBrands });
      toast.success('Brands section saved');
      clearPreviewOverride('section_brands', effectiveOrganization?.id ?? null);
      __saveTelemetry.event('save-success'); triggerPreviewRefresh(); __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, effectiveOrganization?.id]);

  useEditorSaveAction(handleSave);
  useDirtyState(localConfig, data, 'section_brands');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EditorCard title="Brands Section" icon={Tag}>
        <ToggleInput
          label="Show Introduction Text"
          description="Display the intro paragraph above the brand marquee"
          value={localConfig.show_intro_text}
          onChange={(value) => setLocalConfig({ ...localConfig, show_intro_text: value })}
        />
        {localConfig.show_intro_text && (
          <div className="space-y-2">
            <Label htmlFor="intro_text">Introduction Text</Label>
            <Input
              id="intro_text"
              value={localConfig.intro_text}
              onChange={(e) => setLocalConfig({ ...localConfig, intro_text: e.target.value })}
              placeholder="Our favorite brands..."
            />
          </div>
        )}
        <ToggleInput
          label="Show Brand Logos"
          description="Display logo images alongside brand text in the marquee"
          value={localConfig.show_logos}
          onChange={(value) => setLocalConfig({ ...localConfig, show_logos: value })}
        />
        <SliderInput
          label="Marquee Speed"
          value={localConfig.marquee_speed}
          onChange={(value) => setLocalConfig({ ...localConfig, marquee_speed: value })}
          min={20}
          max={80}
          step={5}
          unit="s"
          description="Duration for one complete scroll cycle"
        />
      </EditorCard>

      <EditorCard
        title="Brand Logos"
        description="Drag to reorder. Logos are optional - text will display in the marquee."
        headerActions={
          <Button onClick={handleAddBrand} variant="outline" size={tokens.button.card}>
            <Plus className="h-4 w-4 mr-2" />
            Add Brand
          </Button>
        }
      >
        {localConfig.brands.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No brands added yet</p>
            <p className="text-sm">Click "Add Brand" to get started</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localConfig.brands.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {localConfig.brands.map((brand) => (
                  <SortableBrandItem
                    key={brand.id}
                    brand={brand}
                    onUpdate={handleUpdateBrand}
                    onRemove={handleRemoveBrand}
                    onImageUpload={handleImageUpload}
                    onImageRemove={handleImageRemove}
                    isUploading={uploadingBrandId === brand.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </EditorCard>

      <EditorCard title="Background &amp; Style" description="Background, container, and media for the Brands section.">
        <SectionStyleEditor
          value={localConfig.style_overrides ?? {}}
          onChange={(next: Partial<StyleOverrides>) => setLocalConfig({ ...localConfig, style_overrides: next })}
          sectionId="brands"
        />
      </EditorCard>
    </div>
  );
}
