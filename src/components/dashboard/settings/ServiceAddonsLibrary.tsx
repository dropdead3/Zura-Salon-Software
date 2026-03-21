import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Package, Check, X, Clock, Link2, AlertTriangle, GripVertical, Sparkles, FolderOpen, Scissors, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useServiceAddons, useCreateServiceAddon, useUpdateServiceAddon, useDeleteServiceAddon, useReorderServiceAddons, type ServiceAddon } from '@/hooks/useServiceAddons';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useAllServicesByCategory } from '@/hooks/usePhorestServices';
import { useCreateAddonAssignment } from '@/hooks/useServiceAddonAssignments';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { getServiceCategory } from '@/utils/serviceCategorization';
import { ChevronDown } from 'lucide-react';

// dnd-kit
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Modifier } from '@dnd-kit/core';

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

interface ServiceAddonsLibraryProps {
  organizationId: string;
  categories?: { id: string; category_name: string }[];
}

function computeMargin(price: number, cost: number | null): number | null {
  if (cost == null || price <= 0) return null;
  return ((price - cost) / price) * 100;
}

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin == null) return <span className="text-xs text-muted-foreground">—</span>;
  const color = margin >= 50 ? 'text-emerald-600 bg-emerald-500/10' : margin >= 30 ? 'text-amber-600 bg-amber-500/10' : 'text-red-600 bg-red-500/10';
  return <Badge variant="outline" className={cn('text-[11px] font-medium border-0', color)}>{Math.round(margin)}% margin</Badge>;
}

/* ---------- Sortable row ---------- */
function SortableAddonRow({
  addon,
  formatCurrency,
  linkedServiceName,
  onEdit,
  onDelete,
  onQuickAssign,
  categories,
}: {
  addon: ServiceAddon;
  formatCurrency: (v: number) => string;
  linkedServiceName: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onQuickAssign: (targetType: 'category', targetId: string) => void;
  categories: { id: string; category_name: string }[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: addon.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const margin = computeMargin(addon.price, addon.cost);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors group',
        isDragging && 'opacity-50 bg-muted/60 shadow-md z-10'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <p className="text-sm font-medium truncate">{addon.name}</p>
        {addon.description && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{addon.description}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs font-medium">{formatCurrency(addon.price)}</span>
          {addon.cost != null && (
            <span className="text-[11px] text-muted-foreground">Cost {formatCurrency(addon.cost)}</span>
          )}
          <MarginBadge margin={margin} />
          {addon.duration_minutes && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {addon.duration_minutes}m
            </span>
          )}
          {linkedServiceName && (
            <span className="flex items-center gap-0.5 text-[11px] text-primary/70 truncate max-w-[140px]">
              <Link2 className="h-3 w-3" />
              {linkedServiceName}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {/* Quick-assign popover */}
        {categories.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Quick assign">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 pb-1.5">Assign to category</p>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-muted/60 transition-colors flex items-center gap-1.5"
                    onClick={() => onQuickAssign('category', cat.id)}
                  >
                    <FolderOpen className="h-3 w-3 text-muted-foreground" />
                    {cat.category_name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */
export function ServiceAddonsLibrary({ organizationId, categories = [] }: ServiceAddonsLibraryProps) {
  const { data: addons = [], isLoading } = useServiceAddons(organizationId);
  const createAddon = useCreateServiceAddon();
  const updateAddon = useUpdateServiceAddon();
  const deleteAddon = useDeleteServiceAddon();
  const reorderAddons = useReorderServiceAddons();
  const createAssignment = useCreateAddonAssignment();
  const { formatCurrency } = useFormatCurrency();

  const { services = [] } = useAllServicesByCategory();

  // Group services by category for the picker
  const servicesByCategory = services.reduce<Record<string, typeof services>>((acc, s) => {
    const cat = getServiceCategory(s.name);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [duration, setDuration] = useState('');
  const [linkedServiceId, setLinkedServiceId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [assignMode, setAssignMode] = useState<'none' | 'category' | 'service'>('none');

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('');
    setCost('');
    setDuration('');
    setLinkedServiceId(null);
    setSelectedCategoryIds([]);
    setAssignMode('none');
  };

  const startEdit = (addon: ServiceAddon) => {
    setEditingId(addon.id);
    setName(addon.name);
    setDescription(addon.description || '');
    setPrice(String(addon.price));
    setCost(addon.cost != null ? String(addon.cost) : '');
    setDuration(addon.duration_minutes != null ? String(addon.duration_minutes) : '');
    setLinkedServiceId(addon.linked_service_id || null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!name.trim() || !price) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: parseFloat(price),
      cost: cost ? parseFloat(cost) : null,
      duration_minutes: duration ? parseInt(duration) : null,
      linked_service_id: linkedServiceId || null,
    };

    const onSuccessWithAssignment = (data: any) => {
      // Create returns row directly; Update returns { data: row, organizationId }
      const addonId = editingId || data?.id || data?.data?.id;
      if (addonId && selectedCategoryIds.length > 0) {
        if (selectedCategoryIds.length === 1 && assignMode === 'service' && linkedServiceId) {
          // Single category + specific service
          createAssignment.mutate({
            organization_id: organizationId,
            addon_id: addonId,
            target_type: 'service',
            target_service_id: linkedServiceId,
          });
        } else {
          // One or more categories — create one assignment per category
          selectedCategoryIds.forEach(catId => {
            createAssignment.mutate({
              organization_id: organizationId,
              addon_id: addonId,
              target_type: 'category',
              target_category_id: catId,
            });
          });
        }
      }
      resetForm();
    };

    if (editingId) {
      updateAddon.mutate({ id: editingId, organizationId, ...payload }, { onSuccess: onSuccessWithAssignment });
    } else {
      createAddon.mutate({ organization_id: organizationId, ...payload }, { onSuccess: onSuccessWithAssignment });
    }
  };

  const handleQuickAssign = useCallback((addonId: string, targetType: 'category', targetId: string) => {
    createAssignment.mutate({
      organization_id: organizationId,
      addon_id: addonId,
      target_type: targetType,
      target_category_id: targetId,
    });
  }, [organizationId, createAssignment]);

  // dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = addons.findIndex(a => a.id === active.id);
    const newIndex = addons.findIndex(a => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Compute new order
    const reordered = [...addons];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const items = reordered.map((a, i) => ({ id: a.id, display_order: i }));
    reorderAddons.mutate({ organizationId, items });
  };

  // Resolve linked service names
  const linkedServiceNames = new Map<string, string>();
  addons.forEach(a => {
    if (a.linked_service_id) {
      const svc = services.find(s => s.phorest_service_id === a.linked_service_id);
      if (svc) linkedServiceNames.set(a.id, svc.name);
    }
  });

  const isPending = createAddon.isPending || updateAddon.isPending;

  // Build label for category multi-select trigger
  const categoryLabel = (() => {
    if (selectedCategoryIds.length === 0) return 'No assignment';
    if (selectedCategoryIds.length === 1) {
      const cat = categories.find(c => c.id === selectedCategoryIds[0]);
      return cat?.category_name ?? '1 category';
    }
    return `${selectedCategoryIds.length} categories`;
  })();

  const handleCategoryToggle = (catId: string) => {
    setSelectedCategoryIds(prev => {
      const next = prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId];
      // Reset service drill-down when selection changes
      if (next.length !== 1) {
        setAssignMode(next.length > 0 ? 'category' : 'none');
        setLinkedServiceId(null);
      } else {
        setAssignMode('category');
        setLinkedServiceId(null);
      }
      return next;
    });
  };

  const renderAssignmentPicker = () => (
    <div className="col-span-2 space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Apply to Category / Service</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-9 w-full justify-between text-sm font-normal"
          >
            <span className="flex items-center gap-1.5 truncate">
              <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="truncate">{categoryLabel}</span>
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <div className="max-h-[240px] overflow-y-auto p-2 space-y-0.5">
            {categories.map(cat => (
              <label
                key={cat.id}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md hover:bg-accent text-sm"
              >
                <Checkbox
                  checked={selectedCategoryIds.includes(cat.id)}
                  onCheckedChange={() => handleCategoryToggle(cat.id)}
                />
                {cat.category_name}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Service drill-down: only when exactly 1 category selected */}
      {selectedCategoryIds.length === 1 && (
        <Select
          value={assignMode === 'service' && linkedServiceId ? linkedServiceId : '_entire'}
          onValueChange={v => {
            if (v === '_entire') {
              setAssignMode('category');
              setLinkedServiceId(null);
            } else {
              setAssignMode('service');
              setLinkedServiceId(v);
            }
          }}
        >
          <SelectTrigger className="h-9 text-sm">
            <div className="flex items-center gap-1.5">
              <Scissors className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Select a service" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_entire">Entire Category</SelectItem>
            {(() => {
              const catName = categories.find(c => c.id === selectedCategoryIds[0])?.category_name;
              const filtered = catName ? (servicesByCategory[catName] || []) : [];
              return filtered.map(s => (
                <SelectItem key={s.phorest_service_id} value={s.phorest_service_id}>
                  {s.name}
                </SelectItem>
              ));
            })()}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  const renderDurationWarning = () => {
    if (!linkedServiceId || !duration) return null;
    const linkedSvc = services.find(s => s.phorest_service_id === linkedServiceId);
    if (linkedSvc && linkedSvc.duration_minutes !== parseInt(duration)) {
      return (
        <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          Duration ({duration}m) differs from linked service ({linkedSvc.duration_minutes}m)
        </div>
      );
    }
    return null;
  };

  const renderForm = (isNew: boolean) => (
    <div className="mb-4 p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
      <p className="text-xs font-medium text-primary uppercase tracking-wider">{isNew ? 'New Add-On' : 'Edit Add-On'}</p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Name (e.g. Olaplex Treatment)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="col-span-2 h-9 text-sm"
          autoCapitalize="words"
        />
        <Textarea
          placeholder="Description (optional — shown to stylists during booking)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="col-span-2 min-h-[60px] text-sm resize-none"
          rows={2}
        />
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Price" type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} className="h-9 text-sm pl-8" />
        </div>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Cost (optional)" type="number" step="0.01" min="0" value={cost} onChange={e => setCost(e.target.value)} className="h-9 text-sm pl-8" />
        </div>
        <Input placeholder="Duration (min)" type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} className="h-9 text-sm" />
        <div className="flex items-center gap-1">
          {cost && price && <MarginBadge margin={computeMargin(parseFloat(price) || 0, parseFloat(cost) || null)} />}
        </div>
        <div className="col-span-2">{renderAssignmentPicker()}</div>
        {renderDurationWarning()}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim() || !price || isPending}>
          <Check className="h-3.5 w-3.5 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <CardTitle className={tokens.heading.section}>SERVICE ADD-ONS & EXTRAS</CardTitle>
            {addons.length > 0 && (
              <Badge variant="secondary" className="text-xs">{addons.length}</Badge>
            )}
          </div>
          {!showForm && !editingId && (
            <Button variant="outline" className={tokens.button.cardAction} onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Add-On
            </Button>
          )}
        </div>
        <CardDescription>
          Define reusable add-on services with pricing and cost tracking. Assign them to categories or specific services below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* New add-on form */}
        {showForm && renderForm(true)}

        {/* Empty state */}
        {addons.length === 0 && !showForm && (
          <EmptyState
            icon={Package}
            title="No add-ons yet"
            description="Create your first add-on to start building smart booking recommendations."
            action={
              <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create Add-On
              </Button>
            }
          />
        )}

        {/* Add-ons list with drag-to-reorder */}
        {addons.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={addons.map(a => a.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {addons.map(addon => {
                  if (editingId === addon.id) {
                    return <div key={addon.id}>{renderForm(false)}</div>;
                  }
                  return (
                    <SortableAddonRow
                      key={addon.id}
                      addon={addon}
                      formatCurrency={formatCurrency}
                      linkedServiceName={linkedServiceNames.get(addon.id) || null}
                      onEdit={() => startEdit(addon)}
                      onDelete={() => setDeleteId(addon.id)}
                      onQuickAssign={(targetType, targetId) => handleQuickAssign(addon.id, targetType, targetId)}
                      categories={categories}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Add-On?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the add-on and remove it from all booking recommendations. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteId) deleteAddon.mutate({ id: deleteId, organizationId });
                  setDeleteId(null);
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
