import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Star, 
  Plus, 
  Pencil, 
  Trash2, 
  Quote,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import {
  useTestimonials,
  useCreateTestimonial,
  useUpdateTestimonial,
  useDeleteTestimonial,
  useToggleTestimonialVisibility,
  useUpdateTestimonialOrder,
  type Testimonial,
} from '@/hooks/useTestimonials';

interface SortableTestimonialCardProps {
  testimonial: Testimonial;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onEdit: (testimonial: Testimonial) => void;
  onDelete: (id: string) => void;
}

function SortableTestimonialCard({ testimonial, onToggleVisibility, onEdit, onDelete }: SortableTestimonialCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: testimonial.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-opacity",
        !testimonial.is_visible && "opacity-60",
        isDragging && "opacity-50 z-50"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div 
            className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-medium">{testimonial.title}</h3>
              <span className="text-sm text-muted-foreground">— {testimonial.author}</span>
              {!testimonial.is_visible && (
                <Badge variant="outline" className="text-xs">Hidden</Badge>
              )}
            </div>
            
            <div className="flex gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={cn(
                    "w-3 h-3",
                    i < testimonial.rating 
                      ? "fill-amber-400 text-amber-400" 
                      : "text-muted-foreground"
                  )} 
                />
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {testimonial.text}
            </p>

            <div className="flex justify-end gap-1 pt-2 border-t mt-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onToggleVisibility(testimonial.id, !testimonial.is_visible)}
              >
                {testimonial.is_visible ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(testimonial)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Testimonial?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the testimonial from "{testimonial.author}". This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(testimonial.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestimonialsContent() {
  const { data: testimonials, isLoading } = useTestimonials();
  const createTestimonial = useCreateTestimonial();
  const updateTestimonial = useUpdateTestimonial();
  const deleteTestimonial = useDeleteTestimonial();
  const toggleVisibility = useToggleTestimonialVisibility();
  const updateOrder = useUpdateTestimonialOrder();

  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({
    title: '',
    author: '',
    text: '',
    rating: 5,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && testimonials) {
      const oldIndex = testimonials.findIndex(t => t.id === active.id);
      const newIndex = testimonials.findIndex(t => t.id === over.id);
      const newOrder = arrayMove(testimonials, oldIndex, newIndex);
      updateOrder.mutate(newOrder.map(t => t.id));
    }
  };

  const handleToggleVisibility = (id: string, isVisible: boolean) => {
    toggleVisibility.mutate({ id, is_visible: isVisible });
  };

  const handleDelete = (id: string) => {
    deleteTestimonial.mutate(id);
  };

  const handleAdd = () => {
    createTestimonial.mutate({
      ...newTestimonial,
      is_visible: true,
      display_order: (testimonials?.length || 0),
      organization_id: null,
    }, {
      onSuccess: () => {
        setNewTestimonial({ title: '', author: '', text: '', rating: 5 });
        setIsAddDialogOpen(false);
      },
    });
  };

  const handleUpdate = () => {
    if (!editingTestimonial) return;
    updateTestimonial.mutate({
      id: editingTestimonial.id,
      title: editingTestimonial.title,
      author: editingTestimonial.author,
      text: editingTestimonial.text,
      rating: editingTestimonial.rating,
    }, {
      onSuccess: () => {
        setEditingTestimonial(null);
        setIsEditDialogOpen(false);
      },
    });
  };

  const visibleCount = testimonials?.filter(t => t.is_visible).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-display flex items-center gap-2">
            <Quote className="w-5 h-5" />
            Testimonials
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage customer reviews displayed on the website
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Testimonial
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Testimonial</DialogTitle>
              <DialogDescription>
                Add a new customer review to display on the website.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  placeholder="e.g., Amazing experience!"
                  value={newTestimonial.title}
                  onChange={(e) => setNewTestimonial(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Author Name</Label>
                <Input 
                  placeholder="e.g., Jane D."
                  value={newTestimonial.author}
                  onChange={(e) => setNewTestimonial(prev => ({ ...prev, author: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Review Text</Label>
                <Textarea 
                  placeholder="What did they say?"
                  value={newTestimonial.text}
                  onChange={(e) => setNewTestimonial(prev => ({ ...prev, text: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewTestimonial(prev => ({ ...prev, rating: star }))}
                      className="p-1"
                    >
                      <Star 
                        className={cn(
                          "w-6 h-6 transition-colors",
                          star <= newTestimonial.rating 
                            ? "fill-amber-400 text-amber-400" 
                            : "text-muted-foreground"
                        )} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAdd} 
                disabled={!newTestimonial.title || !newTestimonial.author || !newTestimonial.text || createTestimonial.isPending}
              >
                {createTestimonial.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Testimonial'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Star className="w-5 h-5 text-amber-600 fill-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-medium">{testimonials?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-medium">{visibleCount}</p>
              <p className="text-sm text-muted-foreground">Visible on Website</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Testimonials List with Drag and Drop */}
      {testimonials && testimonials.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={testimonials.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {testimonials.map((testimonial) => (
                <SortableTestimonialCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  onToggleVisibility={handleToggleVisibility}
                  onEdit={(t) => {
                    setEditingTestimonial(t);
                    setIsEditDialogOpen(true);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card className="p-8 text-center">
          <Quote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No testimonials yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first customer testimonial to display on the website.
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Testimonial
          </Button>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Testimonial</DialogTitle>
          </DialogHeader>
          {editingTestimonial && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  value={editingTestimonial.title}
                  onChange={(e) => setEditingTestimonial(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Author Name</Label>
                <Input 
                  value={editingTestimonial.author}
                  onChange={(e) => setEditingTestimonial(prev => prev ? { ...prev, author: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Review Text</Label>
                <Textarea 
                  value={editingTestimonial.text}
                  onChange={(e) => setEditingTestimonial(prev => prev ? { ...prev, text: e.target.value } : null)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditingTestimonial(prev => prev ? { ...prev, rating: star } : null)}
                      className="p-1"
                    >
                      <Star 
                        className={cn(
                          "w-6 h-6 transition-colors",
                          star <= (editingTestimonial?.rating || 0)
                            ? "fill-amber-400 text-amber-400" 
                            : "text-muted-foreground"
                        )} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateTestimonial.isPending}>
              {updateTestimonial.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Quote className="w-4 h-4" />
            About Testimonials
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Visibility:</strong> Toggle the eye icon to show or hide testimonials on the website.
          </p>
          <p>
            <strong className="text-foreground">Order:</strong> Drag and drop to reorder testimonials.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
