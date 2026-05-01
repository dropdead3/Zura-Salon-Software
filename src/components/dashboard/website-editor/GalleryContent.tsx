import { useState, useMemo } from 'react';
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
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Images, 
  Plus, 
  ArrowLeftRight,
  Image as ImageIcon,
  Loader2,
  Upload,
} from 'lucide-react';
// Canonical path post November 2026 consolidation. The
// `@/components/ui/image-upload-input` shim still re-exports this for
// back-compat but new callsites should import from the inputs/ tree.
import { ImageUploadInput } from './inputs/ImageUploadInput';
import { BulkImageUpload } from '@/components/ui/bulk-image-upload';
import { SortableGalleryImage } from './gallery/SortableGalleryImage';
import { SortableTransformation } from './gallery/SortableTransformation';
import { EditorCard } from './EditorCard';
import {
  useGalleryImages,
  useAddGalleryImage,
  useBulkAddGalleryImages,
  useUpdateGalleryImage,
  useDeleteGalleryImage,
  useReorderGalleryImages,
  useGalleryTransformations,
  useAddGalleryTransformation,
  useUpdateGalleryTransformation,
  useDeleteGalleryTransformation,
  useReorderGalleryTransformations,
} from '@/hooks/useGalleryImages';

export function GalleryContent() {
  const [isAddImageOpen, setIsAddImageOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isAddTransformOpen, setIsAddTransformOpen] = useState(false);
  const [newImage, setNewImage] = useState({ src: '', alt: '' });
  const [newTransform, setNewTransform] = useState({ 
    beforeImage: '', 
    afterImage: '', 
    beforeLabel: 'Before', 
    afterLabel: 'After' 
  });

  // Queries
  const { data: galleryImages = [], isLoading: imagesLoading } = useGalleryImages();
  const { data: transformations = [], isLoading: transformsLoading } = useGalleryTransformations();

  // Mutations
  const addImage = useAddGalleryImage();
  const bulkAddImages = useBulkAddGalleryImages();
  const updateImage = useUpdateGalleryImage();
  const deleteImage = useDeleteGalleryImage();
  const reorderImages = useReorderGalleryImages();
  const addTransformation = useAddGalleryTransformation();
  const updateTransformation = useUpdateGalleryTransformation();
  const deleteTransformation = useDeleteGalleryTransformation();
  const reorderTransformations = useReorderGalleryTransformations();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoized IDs for sortable context
  const imageIds = useMemo(() => galleryImages.map(img => img.id), [galleryImages]);
  const transformationIds = useMemo(() => transformations.map(t => t.id), [transformations]);

  const handleToggleImageVisibility = (id: string, currentVisibility: boolean) => {
    updateImage.mutate({ id, updates: { is_visible: !currentVisibility } });
  };

  const handleToggleTransformVisibility = (id: string, currentVisibility: boolean) => {
    updateTransformation.mutate({ id, updates: { is_visible: !currentVisibility } });
  };

  const handleDeleteImage = (id: string) => {
    deleteImage.mutate(id);
  };

  const handleDeleteTransform = (id: string) => {
    deleteTransformation.mutate(id);
  };

  const handleAddImage = () => {
    if (!newImage.src || !newImage.alt) return;
    
    addImage.mutate(
      { src: newImage.src, alt: newImage.alt },
      {
        onSuccess: () => {
          setNewImage({ src: '', alt: '' });
          setIsAddImageOpen(false);
        },
      }
    );
  };

  const handleBulkUploadComplete = (images: { src: string; alt: string }[]) => {
    bulkAddImages.mutate(images, {
      onSuccess: () => {
        setIsBulkUploadOpen(false);
      },
    });
  };

  const handleAddTransform = () => {
    if (!newTransform.beforeImage || !newTransform.afterImage) return;
    
    addTransformation.mutate(
      {
        before_image: newTransform.beforeImage,
        after_image: newTransform.afterImage,
        before_label: newTransform.beforeLabel,
        after_label: newTransform.afterLabel,
      },
      {
        onSuccess: () => {
          setNewTransform({ beforeImage: '', afterImage: '', beforeLabel: 'Before', afterLabel: 'After' });
          setIsAddTransformOpen(false);
        },
      }
    );
  };

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = galleryImages.findIndex((img) => img.id === active.id);
      const newIndex = galleryImages.findIndex((img) => img.id === over.id);

      const reordered = arrayMove(galleryImages, oldIndex, newIndex);
      const updates = reordered.map((img, index) => ({
        id: img.id,
        display_order: index,
      }));

      reorderImages.mutate(updates);
    }
  };

  const handleTransformationDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = transformations.findIndex((t) => t.id === active.id);
      const newIndex = transformations.findIndex((t) => t.id === over.id);

      const reordered = arrayMove(transformations, oldIndex, newIndex);
      const updates = reordered.map((t, index) => ({
        id: t.id,
        display_order: index,
      }));

      reorderTransformations.mutate(updates);
    }
  };

  const visibleImages = galleryImages.filter(img => img.is_visible).length;
  const visibleTransforms = transformations.filter(t => t.is_visible).length;
  const isLoading = imagesLoading || transformsLoading;

  return (
    <EditorCard
      title="Gallery Manager"
      icon={Images}
      description="Manage gallery images and before/after transformations"
      className="overflow-hidden"
    >

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <ImageIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-medium">{galleryImages.length}</p>
              <p className="text-xs text-muted-foreground truncate">Gallery Images ({visibleImages} visible)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <ArrowLeftRight className="w-4 h-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-medium">{transformations.length}</p>
              <p className="text-xs text-muted-foreground truncate">Before/After ({visibleTransforms} visible)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="gallery">
          <TabsList>
            <TabsTrigger value="gallery" className="gap-1.5 text-xs sm:text-sm">
              Gallery
            </TabsTrigger>
            <TabsTrigger value="transformations" className="gap-1.5 text-xs sm:text-sm">
              Before/After
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="space-y-4 mt-4">
      <div className="flex flex-col gap-2">
              {/* Bulk Upload Dialog */}
              <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 w-full">
                    <Upload className="w-4 h-4" />
                    Bulk Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Upload Images</DialogTitle>
                    <DialogDescription>
                      Select multiple images to upload at once. Images will be automatically optimized.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <BulkImageUpload
                      onComplete={handleBulkUploadComplete}
                      onCancel={() => setIsBulkUploadOpen(false)}
                      folder="gallery/images"
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Single Image Dialog */}
              <Dialog open={isAddImageOpen} onOpenChange={setIsAddImageOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 w-full">
                    <Plus className="w-4 h-4" />
                    Add Image
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Gallery Image</DialogTitle>
                    <DialogDescription>
                      Upload an image or paste a URL to add to the gallery.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <ImageUploadInput
                      label="Image"
                      value={newImage.src}
                      onChange={(url) => setNewImage(prev => ({ ...prev, src: url }))}
                      folder="gallery/images"
                      aspectRatio="3/4"
                    />
                    <div className="space-y-2">
                      <Label>Alt Text (Description)</Label>
                      <Input 
                        placeholder="e.g., Blonde balayage transformation"
                        value={newImage.alt}
                        onChange={(e) => setNewImage(prev => ({ ...prev, alt: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddImageOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={handleAddImage} 
                      disabled={!newImage.src || !newImage.alt || addImage.isPending}
                    >
                      {addImage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Add Image
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {galleryImages.length === 0 ? (
              <Card className="p-6 text-center">
                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No gallery images yet. Add your first image to get started.</p>
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleImageDragEnd}
              >
                <SortableContext items={imageIds} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 gap-2">
                    {galleryImages.map((image) => (
                      <SortableGalleryImage
                        key={image.id}
                        image={image}
                        onToggleVisibility={handleToggleImageVisibility}
                        onDelete={handleDeleteImage}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </TabsContent>

          <TabsContent value="transformations" className="space-y-4 mt-4">
            <div className="flex flex-col gap-2">
              <Dialog open={isAddTransformOpen} onOpenChange={setIsAddTransformOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 w-full">
                    <Plus className="w-4 h-4" />
                    Add Before/After
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Before/After Transformation</DialogTitle>
                    <DialogDescription>
                      Upload before and after images to showcase your work.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <ImageUploadInput
                        label="Before Image"
                        value={newTransform.beforeImage}
                        onChange={(url) => setNewTransform(prev => ({ ...prev, beforeImage: url }))}
                        folder="gallery/transformations"
                        aspectRatio="3/4"
                      />
                      <ImageUploadInput
                        label="After Image"
                        value={newTransform.afterImage}
                        onChange={(url) => setNewTransform(prev => ({ ...prev, afterImage: url }))}
                        folder="gallery/transformations"
                        aspectRatio="3/4"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Before Label</Label>
                        <Input 
                          value={newTransform.beforeLabel}
                          onChange={(e) => setNewTransform(prev => ({ ...prev, beforeLabel: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>After Label</Label>
                        <Input 
                          value={newTransform.afterLabel}
                          onChange={(e) => setNewTransform(prev => ({ ...prev, afterLabel: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddTransformOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={handleAddTransform} 
                      disabled={!newTransform.beforeImage || !newTransform.afterImage || addTransformation.isPending}
                    >
                      {addTransformation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Add Transformation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {transformations.length === 0 ? (
              <Card className="p-6 text-center">
                <ArrowLeftRight className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No transformations yet. Add your first before/after to get started.</p>
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleTransformationDragEnd}
              >
                <SortableContext items={transformationIds} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-1 gap-4">
                    {transformations.map((transform) => (
                      <SortableTransformation
                        key={transform.id}
                        transform={transform}
                        onToggleVisibility={handleToggleTransformVisibility}
                        onDelete={handleDeleteTransform}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </TabsContent>
        </Tabs>
      )}
    </EditorCard>
  );
}
