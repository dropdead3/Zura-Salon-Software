import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatMinutesToDuration } from '@/lib/formatDuration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, Plus, Pencil, Trash2, GripVertical, Palette, Info, Clock, DollarSign, Scissors, Search, Eye, Archive, ArchiveRestore, ChevronDown, X, SlidersHorizontal, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { tokens } from '@/lib/design-tokens';
import {
  useServiceCategoryColors,
  useUpdateCategoryColor,
  useReorderCategories,
  getCategoryAbbreviation,
  type ServiceCategoryColor,
} from '@/hooks/useServiceCategoryColors';
import { useCreateCategory, useRenameCategory, useDeleteCategory, useArchivedCategories, useArchiveCategory, useRestoreCategory } from '@/hooks/useServiceCategoryColors';
import { CalendarColorPreview } from './CalendarColorPreview';
import { ThemeSelector } from './ThemeSelector';
import { useServicesData, useCreateService, useUpdateService, useDeleteService, useArchivedServices, useArchiveService, useRestoreService, usePermanentlyDeleteService, type Service } from '@/hooks/useServicesData';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { CategoryFormDialog } from './CategoryFormDialog';
import { ServiceEditorDialog } from './ServiceEditorDialog';
import { ServiceAddonsLibrary } from './ServiceAddonsLibrary';
import { BulkEditServicesDialog } from './BulkEditServicesDialog';
import { RedoPolicySettings } from './RedoPolicySettings';
import { ServiceAddonAssignmentsCard } from './ServiceAddonAssignmentsCard';
import { StaffServiceConfiguratorCard } from './StaffServiceConfiguratorCard';
import { toast } from 'sonner';
import { useUndoToast } from '@/hooks/useUndoToast';
import { useServiceFormCounts } from '@/hooks/useServiceFormCounts';
import {
  getCategoryAbbreviation as getAbbr,
  SPECIAL_GRADIENTS,
  isGradientMarker,
  getGradientFromMarker,
  getContrastingTextColor,
} from '@/utils/categoryColors';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

// Curated color palette
const CATEGORY_PALETTE = [
  '#1a1a1a', '#2d2d2d', '#4a4a4a', '#6b7280', '#9ca3af', '#d1d5db',
  '#f5f5dc', '#e8e4d9', '#d4cfc4', '#c9c2b5', '#b8b0a2', '#a39e93',
  '#fde8d7', '#fbd5c4', '#f5c6aa', '#D4A574', '#C4A77D', '#B5A48C',
  '#fce7f3', '#fbcfe8', '#f9a8d4', '#F472B6', '#EC4899', '#DB2777',
  '#e0f2fe', '#bae6fd', '#7dd3fc', '#60A5FA', '#3B82F6', '#2563EB',
  '#d1fae5', '#a7f3d0', '#6ee7b7', '#f3e8ff', '#e9d5ff', '#c4b5fd',
];

const GRADIENT_OPTIONS = Object.values(SPECIAL_GRADIENTS).map(g => ({
  ...g,
  description: g.id === 'teal-lime' ? 'Fresh & vibrant' :
               g.id === 'rose-gold' ? 'Elegant warm tones' :
               g.id === 'ocean-blue' ? 'Cool aquatic vibes' :
               'Luxurious purple',
}));

function computeMargin(price: number, cost: number | null): number | null {
  if (cost == null || price <= 0) return null;
  return ((price - cost) / price) * 100;
}

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin == null) return null;
  const color = margin >= 50 ? 'text-success-foreground bg-success/10' : margin >= 30 ? 'text-warning-foreground bg-warning/10' : 'text-destructive bg-destructive/10';
  return <Badge variant="outline" className={cn('text-[10px] font-medium border-0 px-1.5 py-0', color)}>{Math.round(margin)}%</Badge>;
}

function SortableCategoryRow({ category, children }: { category: ServiceCategoryColor; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, opacity: isDragging ? 0.9 : undefined };

  return (
    <div ref={setNodeRef} style={style} className={cn('flex items-center gap-3', isDragging && 'shadow-lg')}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
        <GripVertical className="w-4 h-4" />
      </div>
      {children}
    </div>
  );
}

export function ServicesSettingsContent() {
  const { effectiveOrganization, userOrganizations } = useOrganizationContext();
  const resolvedOrgId = effectiveOrganization?.id || userOrganizations[0]?.id;
  const { data: categories, isLoading: catsLoading } = useServiceCategoryColors(resolvedOrgId);
  const { data: allServices, isLoading: servicesLoading } = useServicesData(undefined, resolvedOrgId);
  const updateColor = useUpdateCategoryColor();
  const reorderCategories = useReorderCategories();
  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const deleteCategory = useDeleteCategory();
  const archiveCategory = useArchiveCategory();
  const restoreCategory = useRestoreCategory();
  const { data: archivedCategories } = useArchivedCategories(resolvedOrgId);
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const archiveService = useArchiveService();
  const restoreService = useRestoreService();
  const permanentlyDeleteService = usePermanentlyDeleteService();
  const { data: archivedServices } = useArchivedServices(resolvedOrgId);
  const { data: isPrimaryOwner } = useIsPrimaryOwner();
  // Wave 4: form-count map for the "forms attached" indicator on each row
  const { data: formCounts } = useServiceFormCounts(resolvedOrgId);
  const { formatCurrency } = useFormatCurrency();
  const showUndoToast = useUndoToast();

  const serviceCategories = useMemo(() => 
    categories?.filter(c => !['Block', 'Break'].includes(c.category_name)) || [],
  [categories]);

  const schedulingCategories = useMemo(() =>
    categories?.filter(c => ['Block', 'Break'].includes(c.category_name)) || [],
  [categories]);

  // Build color map for preview and theme selector
  const colorMap = useMemo(() => {
    if (!categories) return {};
    const map: Record<string, { bg: string; text: string; abbr: string }> = {};
    categories.forEach((cat) => {
      map[cat.category_name.toLowerCase()] = {
        bg: cat.color_hex,
        text: cat.text_color_hex,
        abbr: getAbbr(cat.category_name),
      };
    });
    return map;
  }, [categories]);

  const [localOrder, setLocalOrder] = useState<ServiceCategoryColor[]>([]);
  useEffect(() => { if (serviceCategories.length) setLocalOrder(serviceCategories); }, [serviceCategories]);

  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, Service[]> = {};
    allServices?.forEach(s => {
      const cat = s.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });
    return grouped;
  }, [allServices]);

  // Services whose category doesn't match any configured category
  const uncategorizedServices = useMemo(() => {
    if (!allServices) return [];
    const configuredNames = new Set(localOrder.map(c => c.category_name));
    return allServices.filter(s => !configuredNames.has(s.category || ''));
  }, [allServices, localOrder]);

  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = useState<'create' | 'rename'>('create');
  const [editingCategory, setEditingCategory] = useState<ServiceCategoryColor | null>(null);
  const [archiveCategoryId, setArchiveCategoryId] = useState<string | null>(null);
  const [archiveCategoryName, setArchiveCategoryName] = useState('');
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteCategoryName, setDeleteCategoryName] = useState('');

  // Unified editor dialog (replaces ServiceFormDialog)
  const [editorDialogOpen, setEditorDialogOpen] = useState(false);
  const [editorService, setEditorService] = useState<Service | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('edit');
  const [editorPresetCategory, setEditorPresetCategory] = useState('');

  // Archive/delete service confirmation
  const [archiveServiceId, setArchiveServiceId] = useState<string | null>(null);
  const [archiveServiceName, setArchiveServiceName] = useState('');
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [deleteServiceName, setDeleteServiceName] = useState('');

  // Archived sections expanded
  const [showArchivedCategories, setShowArchivedCategories] = useState(false);
  const [showArchivedServices, setShowArchivedServices] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Wave 3: Bulk selection
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const selectedServices = useMemo(
    () => (allServices ?? []).filter((s) => selectedServiceIds.has(s.id)),
    [allServices, selectedServiceIds],
  );
  const toggleServiceSelected = (id: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleCategorySelected = (categoryName: string, allSelected: boolean) => {
    const idsInCat = (servicesByCategory[categoryName] ?? []).map((s) => s.id);
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (allSelected) idsInCat.forEach((id) => next.delete(id));
      else idsInCat.forEach((id) => next.add(id));
      return next;
    });
  };
  const clearSelection = () => setSelectedServiceIds(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const previousOrder = [...localOrder];
    const oldIdx = localOrder.findIndex(c => c.id === active.id);
    const newIdx = localOrder.findIndex(c => c.id === over.id);
    const newOrder = arrayMove(localOrder, oldIdx, newIdx);
    setLocalOrder(newOrder);
    reorderCategories.mutate(newOrder.map(c => c.id), {
      onSuccess: () => {
        showUndoToast('Category order updated', () => {
          setLocalOrder(previousOrder);
          reorderCategories.mutate(previousOrder.map(c => c.id));
        });
      },
      onError: () => toast.error('Failed to save order'),
    });
  };

  const handleCreateCategory = (name: string) => {
    createCategory.mutate(
      { name, organizationId: effectiveOrganization?.id },
      {
        onSuccess: () => { setCategoryDialogOpen(false); toast.success('Category created'); },
        onError: (e) => toast.error('Failed: ' + e.message),
      }
    );
  };

  const handleRenameCategory = (name: string) => {
    if (!editingCategory) return;
    renameCategory.mutate(
      { categoryId: editingCategory.id, newName: name },
      {
        onSuccess: () => { setCategoryDialogOpen(false); setEditingCategory(null); toast.success('Category renamed'); },
        onError: (e) => toast.error('Failed: ' + e.message),
      }
    );
  };

  const handleDeleteCategory = () => {
    if (!deleteCategoryId) return;
    deleteCategory.mutate(deleteCategoryId, {
      onSuccess: () => { setDeleteCategoryId(null); toast.success('Category deleted'); },
      onError: (e) => toast.error('Failed: ' + e.message),
    });
  };

  const handleColorChange = (categoryId: string, colorHex: string) => {
    // Optimistically update localOrder so the avatar reflects the change immediately
    setLocalOrder(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      const isGrad = colorHex.startsWith('gradient:');
      const gradientObj = isGrad ? getGradientFromMarker(colorHex) : null;
      return {
        ...cat,
        color_hex: colorHex,
        text_color_hex: isGrad ? (gradientObj?.textColor ?? '#1f2937') : getContrastingTextColor(colorHex),
      };
    }));
    updateColor.mutate({ categoryId, colorHex }, {
      onSuccess: () => toast.success('Color updated'),
      onError: (err) => {
        toast.error('Failed to update color');
        // Revert optimistic update on failure
        if (serviceCategories.length) setLocalOrder(serviceCategories);
      },
    });
  };

  const handleEditorSubmit = (service: Partial<Service>) => {
    if (editorMode === 'create') {
      createService.mutate(service, {
        onSuccess: () => { setEditorDialogOpen(false); },
        onError: () => {},
      });
    } else if (editorService?.id) {
      // Strip any id from the editor payload — useUpdateService takes id separately.
      const { id: _omit, ...updates } = service;
      updateService.mutate({ id: editorService.id, ...updates }, {
        onSuccess: () => { setEditorDialogOpen(false); setEditorService(null); },
        onError: () => {},
      });
    }
  };

  const handleToggleActive = (service: Service) => {
    const newState = !service.is_active;
    updateService.mutate({ id: service.id, is_active: newState }, {
      onSuccess: () => {
        showUndoToast(
          `'${service.name}' ${newState ? 'activated' : 'deactivated'}`,
          () => updateService.mutate({ id: service.id, is_active: !newState }),
        );
      },
    });
  };

  const handleArchiveCategory = () => {
    if (!archiveCategoryId || !resolvedOrgId) return;
    const catId = archiveCategoryId;
    const catName = archiveCategoryName;
    const orgId = resolvedOrgId;
    archiveCategory.mutate({ categoryId: catId, categoryName: catName, organizationId: orgId }, {
      onSuccess: () => {
        setArchiveCategoryId(null);
        setArchiveCategoryName('');
        showUndoToast(`Archived '${catName}'`, () =>
          restoreCategory.mutate({ categoryId: catId, categoryName: catName, organizationId: orgId }),
        );
      },
    });
  };

  const handleArchiveService = () => {
    if (!archiveServiceId) return;
    const svcId = archiveServiceId;
    const svcName = archiveServiceName;
    archiveService.mutate(svcId, {
      onSuccess: () => {
        setArchiveServiceId(null);
        setArchiveServiceName('');
        showUndoToast(`Archived '${svcName}'`, () => restoreService.mutate(svcId));
      },
    });
  };

  const handleDeleteService = () => {
    if (!deleteServiceId) return;
    permanentlyDeleteService.mutate(deleteServiceId, {
      onSuccess: () => { setDeleteServiceId(null); setDeleteServiceName(''); },
    });
  };

  const handleRestoreToCategory = (svc: Service) => {
    const categoryName = svc.category;
    if (!categoryName) return;
    const alreadyExists = localOrder.some(c => c.category_name === categoryName);
    if (alreadyExists) {
      // Category already exists, nothing to recreate — service is already assigned
      showUndoToast(`'${svc.name}' is already in '${categoryName}'`, () => {});
      return;
    }
    createCategory.mutate(
      { name: categoryName, organizationId: resolvedOrgId },
      {
        onSuccess: () => {
          showUndoToast(`Restored '${svc.name}' to ${categoryName}`, () => {
            // Undo: archive the freshly recreated category
            // We need to find it after invalidation — use name match
            const restored = localOrder.find(c => c.category_name === categoryName);
            if (restored && resolvedOrgId) {
              archiveCategory.mutate({ categoryId: restored.id, categoryName, organizationId: resolvedOrgId });
            }
          });
        },
        onError: (e) => toast.error('Failed to restore: ' + e.message),
      }
    );
  };

  const openCreateService = (categoryName?: string) => {
    setEditorMode('create');
    setEditorService(null);
    setEditorPresetCategory(categoryName || serviceCategories[0]?.category_name || '');
    setEditorDialogOpen(true);
  };

  const openEditService = (svc: Service) => {
    setEditorMode('edit');
    setEditorService(svc);
    setEditorPresetCategory('');
    setEditorDialogOpen(true);
  };

  // Filtered services for search — Wave 8: extend predicate to online_name,
  // description, and pos_hotkey so operators can find services by their
  // public-facing name or POS shortcut, not just the internal name.
  const filteredServicesByCategory = useMemo(() => {
    if (!searchQuery.trim()) return servicesByCategory;
    const q = searchQuery.toLowerCase();
    const filtered: Record<string, Service[]> = {};
    for (const [cat, svcs] of Object.entries(servicesByCategory)) {
      const matches = svcs.filter((s) => {
        const haystack = [
          s.name,
          (s as any).online_name,
          s.description,
          (s as any).pos_hotkey,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
      if (matches.length > 0) filtered[cat] = matches;
    }
    return filtered;
  }, [servicesByCategory, searchQuery]);

  // Auto-expand accordion items when searching
  const searchExpandedValues = useMemo(() => {
    if (!searchQuery.trim()) return undefined;
    return localOrder
      .filter(cat => filteredServicesByCategory[cat.category_name]?.length)
      .map(cat => cat.id);
  }, [searchQuery, localOrder, filteredServicesByCategory]);


  // Tab state synced to URL (?tab=catalog|addons|staff|policies)
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = ['catalog', 'addons', 'staff', 'policies'].includes(tabParam || '')
    ? (tabParam as string)
    : 'catalog';
  const handleTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };
  const [calendarAppearanceOpen, setCalendarAppearanceOpen] = useState(false);

  if (catsLoading || servicesLoading) {
    return <DashboardLoader size="md" className="py-12" />;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
            <TabsTrigger value="addons">Add-Ons</TabsTrigger>
            <TabsTrigger value="staff">Staff Access</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          {/* ============ TAB 1: CATALOG ============ */}
          <TabsContent value="catalog" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Categories Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <CardTitle className={tokens.heading.section}>SERVICE CATEGORIES</CardTitle>
              </div>
              <Button variant="outline" className={tokens.button.cardAction} onClick={() => { setCategoryDialogMode('create'); setEditingCategory(null); setCategoryDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Add Category
              </Button>
            </div>
           <CardDescription>
              Drag to reorder categories. Click the color badge to customize. This order is used across all booking flows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {localOrder.length === 0 ? (
              <div className={tokens.empty.container}>
                <Scissors className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>No categories yet</h3>
                <p className={tokens.empty.description}>Create your first service category to get started.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localOrder.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {localOrder.map((cat) => {
                      const abbr = getCategoryAbbreviation(cat.category_name);
                      const hasGradient = isGradientMarker(cat.color_hex);
                      const gradient = hasGradient ? getGradientFromMarker(cat.color_hex) : null;
                      const serviceCount = servicesByCategory[cat.category_name]?.length || 0;
                      const isEmpty = serviceCount === 0;

                      return (
                        <SortableCategoryRow key={cat.id} category={cat}>
                          {/* Color badge */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-sans font-medium tracking-normal shrink-0 transition-transform hover:scale-105 ring-2 ring-offset-2 ring-offset-background ring-transparent hover:ring-primary/50",
                                  
                                )}
style={gradient ? { background: gradient.background, color: gradient.textColor, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' } : { backgroundColor: cat.color_hex, color: cat.text_color_hex }}
                              >
                                {abbr}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4" align="start">
                              <div className="space-y-3">
                                <p className={tokens.body.emphasis}>{cat.category_name}</p>
                                <div className="space-y-1">
                                  <p className={tokens.label.tiny}>Special Styles</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {GRADIENT_OPTIONS.map(g => (
                                      <Tooltip key={g.id}>
                                        <TooltipTrigger asChild>
                                          <button
                                            className={cn('w-8 h-8 rounded-full shadow-md hover:scale-110 transition-transform', cat.color_hex === `gradient:${g.id}` && 'ring-2 ring-offset-2 ring-primary')}
                                            style={{ background: g.background }}
                                            onClick={() => handleColorChange(cat.id, `gradient:${g.id}`)}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent><p className="text-xs">{g.name}</p></TooltipContent>
                                      </Tooltip>
                                    ))}
                                  </div>
                                </div>
                                <div className="h-px bg-border" />
                                <div className="space-y-1">
                                  <p className={tokens.label.tiny}>Solid Colors</p>
                                  <div className="grid grid-cols-6 gap-1.5">
                                    {CATEGORY_PALETTE.map(c => (
                                      <button
                                        key={c}
                                        className={cn('w-7 h-7 rounded-full hover:scale-110 transition-transform', cat.color_hex.toLowerCase() === c.toLowerCase() && !hasGradient && 'ring-2 ring-offset-2 ring-primary')}
                                        style={{ backgroundColor: c }}
                                        onClick={() => handleColorChange(cat.id, c)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Name & service count */}
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                            setCategoryDialogMode('rename');
                            setEditingCategory(cat);
                            setCategoryDialogOpen(true);
                          }}>
                            <p className={cn(tokens.body.emphasis, 'truncate', isEmpty && 'text-muted-foreground')}>{cat.category_name}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {isEmpty 
                                ? <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-destructive/15 text-destructive border border-destructive/25">No services</span>
                                : <p className={tokens.body.muted}>{serviceCount} service{serviceCount !== 1 ? 's' : ''}</p>
                              }
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setCategoryDialogMode('rename');
                              setEditingCategory(cat);
                              setCategoryDialogOpen(true);
                            }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600" onClick={() => {
                              setArchiveCategoryId(cat.id);
                              setArchiveCategoryName(cat.category_name);
                            }}>
                              <Archive className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </SortableCategoryRow>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Archived Categories */}
            {(archivedCategories?.length || 0) > 0 && (
              <div className="mt-4 border border-dashed border-muted-foreground/30 rounded-lg">
                <button
                  className="flex items-center justify-between w-full px-4 py-3 text-left"
                  onClick={() => setShowArchivedCategories(!showArchivedCategories)}
                >
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-muted-foreground" />
                    <span className={cn(tokens.body.emphasis, 'text-muted-foreground')}>Archived Categories</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{archivedCategories?.length}</Badge>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showArchivedCategories && 'rotate-180')} />
                </button>
                {showArchivedCategories && (
                  <div className="px-4 pb-3 space-y-2">
                    {archivedCategories?.map(cat => (
                      <div key={cat.id} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-sans font-medium opacity-50"
                          style={{ backgroundColor: cat.color_hex, color: cat.text_color_hex }}
                        >
                          {getCategoryAbbreviation(cat.category_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(tokens.body.emphasis, 'text-muted-foreground truncate')}>{cat.category_name}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                            if (!resolvedOrgId) return;
                            restoreCategory.mutate({ categoryId: cat.id, categoryName: cat.category_name, organizationId: resolvedOrgId });
                          }}>
                            <ArchiveRestore className="w-3 h-3" /> Restore
                          </Button>
                          {isPrimaryOwner && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => {
                              setDeleteCategoryId(cat.id);
                              setDeleteCategoryName(cat.category_name);
                            }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-primary" />
                <CardTitle className={tokens.heading.section}>SERVICES</CardTitle>
              </div>
              <Button variant="outline" className={tokens.button.cardAction} onClick={() => openCreateService()}>
                <Plus className="w-4 h-4 mr-1" /> Add Service
              </Button>
            </div>
            <CardDescription>Manage individual services within each category. Select multiple to bulk-edit.</CardDescription>
          </CardHeader>

          {/* Wave 3: Bulk selection toolbar */}
          {selectedServiceIds.size > 0 && (
            <div className="mx-6 mb-4 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearSelection}>
                  <X className="w-4 h-4" />
                </Button>
                <span className={cn(tokens.body.emphasis)}>
                  {selectedServiceIds.size} selected
                </span>
              </div>
              <Button size="sm" onClick={() => setBulkEditOpen(true)}>
                <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Bulk edit
              </Button>
            </div>
          )}
          <CardContent>
            {/* Search */}
            {(allServices?.length || 0) > 5 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                  autoCapitalize="off"
                />
              </div>
            )}

            {localOrder.length === 0 ? (
              <div className={tokens.empty.container}>
                <Scissors className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>No services yet</h3>
                <p className={tokens.empty.description}>Create categories first, then add services.</p>
              </div>
            ) : (
              <Accordion
                type="multiple"
                className="w-full"
                {...(searchExpandedValues ? { value: searchExpandedValues } : {})}
              >
                {localOrder.map((cat) => {
                  const services = filteredServicesByCategory[cat.category_name] || [];
                  const totalServices = servicesByCategory[cat.category_name]?.length || 0;
                  const abbr = getCategoryAbbreviation(cat.category_name);
                  const hasGradient = isGradientMarker(cat.color_hex);
                  const gradient = hasGradient ? getGradientFromMarker(cat.color_hex) : null;

                  // Hide categories with no matching services when searching
                  if (searchQuery.trim() && services.length === 0) return null;

                  const catServiceIds = (servicesByCategory[cat.category_name] ?? []).map((s) => s.id);
                  const selectedInCat = catServiceIds.filter((id) => selectedServiceIds.has(id)).length;
                  const allInCatSelected = catServiceIds.length > 0 && selectedInCat === catServiceIds.length;
                  const someInCatSelected = selectedInCat > 0 && !allInCatSelected;

                  return (
                    <AccordionItem key={cat.id} value={cat.id} className="border rounded-lg mb-2 px-4">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3">
                          <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                            <Checkbox
                              checked={allInCatSelected ? true : someInCatSelected ? 'indeterminate' : false}
                              onCheckedChange={() => toggleCategorySelected(cat.category_name, allInCatSelected)}
                              aria-label={`Select all in ${cat.category_name}`}
                            />
                          </div>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-sans font-medium tracking-normal shrink-0"
style={gradient ? { background: gradient.background, color: gradient.textColor, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' } : { backgroundColor: cat.color_hex, color: cat.text_color_hex }}
                          >
                            {abbr}
                          </div>
                          <span className={cn(tokens.body.emphasis, 'tracking-normal')}>{cat.category_name}</span>
                          <span className={cn(tokens.body.muted, 'tracking-normal')}>
                            ({searchQuery.trim() ? `${services.length}/${totalServices}` : totalServices})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1 pb-2">
                          {services.length === 0 ? (
                            <p className={cn(tokens.empty.description, 'text-center py-4')}>No services in this category</p>
                          ) : (
                            services.map(svc => {
                              const margin = computeMargin(svc.price || 0, svc.cost);
                              const isSelected = selectedServiceIds.has(svc.id);
                              return (
                                <div key={svc.id} className={cn('flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/40 transition-colors group cursor-pointer', isSelected && 'bg-primary/5')} onClick={() => openEditService(svc)}>
                                  <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleServiceSelected(svc.id)}
                                      aria-label={`Select ${svc.name}`}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(tokens.body.emphasis, 'truncate')}>{svc.name}</p>
                                    <div className={cn('flex items-center gap-3', tokens.body.muted)}>
                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatMinutesToDuration(svc.duration_minutes)}</span>
                                      {svc.price != null && (
                                        <span className="flex items-center gap-1">
                                          <DollarSign className="w-3 h-3" />{formatCurrency(svc.price)}
                                        </span>
                                      )}
                                      <MarginBadge margin={margin} />
                                      {(formCounts?.[svc.id] ?? 0) > 0 && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="flex items-center gap-1 text-primary">
                                              <FileText className="w-3 h-3" />
                                              {formCounts?.[svc.id]}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-xs">{formCounts?.[svc.id]} required {formCounts?.[svc.id] === 1 ? 'form' : 'forms'} attached</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div onClick={e => e.stopPropagation()}>
                                          <Switch
                                            checked={svc.is_active !== false}
                                            onCheckedChange={() => handleToggleActive(svc)}
                                            className="scale-75"
                                          />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="text-xs">{svc.is_active !== false ? 'Active' : 'Inactive'}</p></TooltipContent>
                                    </Tooltip>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-600" onClick={(e) => {
                                      e.stopPropagation();
                                      setArchiveServiceId(svc.id);
                                      setArchiveServiceName(svc.name);
                                    }}>
                                      <Archive className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          <Button
                            variant="ghost"
                            size={tokens.button.inline}
                            className="w-full mt-1 text-xs text-muted-foreground"
                            onClick={() => openCreateService(cat.category_name)}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add service to {cat.category_name}
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}

            {/* Uncategorized services section */}
            {uncategorizedServices.length > 0 && (
              <div className="mt-4 border border-dashed border-muted-foreground/30 rounded-lg">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(tokens.body.emphasis, 'text-muted-foreground')}>Uncategorized</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{uncategorizedServices.length}</Badge>
                  </div>
                </div>
                <div className="px-4 pb-3 space-y-1">
                  {uncategorizedServices.map(svc => {
                    const margin = computeMargin(svc.price || 0, svc.cost);
                    return (
                      <div key={svc.id} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/40 transition-colors group cursor-pointer" onClick={() => openEditService(svc)}>
                        <div className="flex-1 min-w-0">
                          <p className={cn(tokens.body.emphasis, 'truncate')}>{svc.name}</p>
                          <div className={cn('flex items-center gap-3', tokens.body.muted)}>
                            {svc.category && (
                              <span className="text-[10px] text-muted-foreground/60 italic">was: {svc.category}</span>
                            )}
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatMinutesToDuration(svc.duration_minutes)}</span>
                            {svc.price != null && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />{formatCurrency(svc.price)}
                              </span>
                            )}
                            <MarginBadge margin={margin} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div onClick={e => e.stopPropagation()}>
                                <Switch
                                  checked={svc.is_active !== false}
                                  onCheckedChange={() => handleToggleActive(svc)}
                                  className="scale-75"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">{svc.is_active !== false ? 'Active' : 'Inactive'}</p></TooltipContent>
                          </Tooltip>
                          {svc.category && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-600" onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreToCategory(svc);
                                }}>
                                  <ArchiveRestore className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs">Restore to {svc.category}</p></TooltipContent>
                            </Tooltip>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-600" onClick={(e) => {
                            e.stopPropagation();
                            setArchiveServiceId(svc.id);
                            setArchiveServiceName(svc.name);
                          }}>
                            <Archive className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Archived Services */}
            {(archivedServices?.length || 0) > 0 && (
              <div className="mt-4 border border-dashed border-muted-foreground/30 rounded-lg">
                <button
                  className="flex items-center justify-between w-full px-4 py-3 text-left"
                  onClick={() => setShowArchivedServices(!showArchivedServices)}
                >
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-muted-foreground" />
                    <span className={cn(tokens.body.emphasis, 'text-muted-foreground')}>Archived Services</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{archivedServices?.length}</Badge>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showArchivedServices && 'rotate-180')} />
                </button>
                {showArchivedServices && (
                  <div className="px-4 pb-3 space-y-1">
                    {archivedServices?.map(svc => (
                      <div key={svc.id} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <p className={cn(tokens.body.emphasis, 'text-muted-foreground truncate')}>{svc.name}</p>
                          <div className={cn('flex items-center gap-3', tokens.body.muted)}>
                            {svc.category && <span className="text-[10px] italic">was: {svc.category}</span>}
                            {svc.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatMinutesToDuration(svc.duration_minutes)}</span>}
                            {svc.price != null && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatCurrency(svc.price)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => restoreService.mutate(svc.id)}>
                            <ArchiveRestore className="w-3 h-3" /> Restore
                          </Button>
                          {isPrimaryOwner && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => {
                              setDeleteServiceId(svc.id);
                              setDeleteServiceName(svc.name);
                            }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

            </div>{/* end catalog two-column grid */}

            {/* Calendar Appearance — collapsible (Theme + Blocks + Preview) */}
            {categories && categories.length > 0 && (
              <Card>
                <Collapsible open={calendarAppearanceOpen} onOpenChange={setCalendarAppearanceOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-primary" />
                        <div>
                          <p className={cn(tokens.heading.section)}>CALENDAR APPEARANCE</p>
                          <p className={tokens.body.muted}>Theme, scheduling blocks, and live calendar preview</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          'w-5 h-5 text-muted-foreground transition-transform',
                          calendarAppearanceOpen && 'rotate-180',
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-6 pb-6 space-y-6">
                      {/* Theme Selector */}
                      <div>
                        <p className={cn(tokens.label.tiny, 'mb-2')}>Calendar Theme</p>
                        <ThemeSelector currentColors={colorMap} />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Scheduling Blocks (inline) */}
                        {schedulingCategories.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-primary" />
                              <p className={tokens.label.tiny}>Scheduling Blocks</p>
                            </div>
                            <p className={cn(tokens.body.muted, 'mb-3')}>
                              <span className="block text-xs"><strong>Block</strong> — Non-service hours (admin tasks, training, meetings)</span>
                              <span className="block text-xs"><strong>Break</strong> — Rest periods (lunch, rest breaks) — tracked for payroll compliance</span>
                            </p>
                            <div className="space-y-2">
                              {schedulingCategories.map((cat) => {
                                const abbr = getCategoryAbbreviation(cat.category_name);
                                const hasGradient = isGradientMarker(cat.color_hex);
                                const gradient = hasGradient ? getGradientFromMarker(cat.color_hex) : null;
                                return (
                                  <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-sans font-medium tracking-normal shrink-0 transition-transform hover:scale-105 ring-2 ring-offset-2 ring-offset-background ring-transparent hover:ring-primary/50"
                                          style={gradient ? { background: gradient.background, color: gradient.textColor } : { backgroundColor: cat.color_hex, color: cat.text_color_hex }}
                                        >
                                          {abbr}
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-4" align="start">
                                        <div className="space-y-3">
                                          <p className={tokens.body.emphasis}>{cat.category_name}</p>
                                          <div className="space-y-1">
                                            <p className={tokens.label.tiny}>Special Styles</p>
                                            <div className="flex gap-2 flex-wrap">
                                              {GRADIENT_OPTIONS.map(g => (
                                                <Tooltip key={g.id}>
                                                  <TooltipTrigger asChild>
                                                    <button
                                                      className={cn('w-8 h-8 rounded-full shadow-md hover:scale-110 transition-transform', cat.color_hex === `gradient:${g.id}` && 'ring-2 ring-offset-2 ring-primary')}
                                                      style={{ background: g.background }}
                                                      onClick={() => handleColorChange(cat.id, `gradient:${g.id}`)}
                                                    />
                                                  </TooltipTrigger>
                                                  <TooltipContent><p className="text-xs">{g.name}</p></TooltipContent>
                                                </Tooltip>
                                              ))}
                                            </div>
                                          </div>
                                          <div className="h-px bg-border" />
                                          <div className="space-y-1">
                                            <p className={tokens.label.tiny}>Solid Colors</p>
                                            <div className="grid grid-cols-6 gap-1.5">
                                              {CATEGORY_PALETTE.map(c => (
                                                <button
                                                  key={c}
                                                  className={cn('w-7 h-7 rounded-full hover:scale-110 transition-transform', cat.color_hex.toLowerCase() === c.toLowerCase() && !hasGradient && 'ring-2 ring-offset-2 ring-primary')}
                                                  style={{ backgroundColor: c }}
                                                  onClick={() => handleColorChange(cat.id, c)}
                                                />
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                    <div className="flex-1 min-w-0">
                                      <p className={tokens.body.emphasis}>{cat.category_name}</p>
                                      <p className={tokens.body.muted}>
                                        {cat.category_name === 'Block' ? 'Blocked time slots (admin tasks, personal time)' : 'Scheduled breaks (lunch, etc.)'}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Calendar Preview (inline) */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-4 h-4 text-primary" />
                            <p className={tokens.label.tiny}>Live Preview</p>
                          </div>
                          <p className={cn(tokens.body.muted, 'mb-3')}>How your colors look on the schedule.</p>
                          <CalendarColorPreview colorMap={colorMap} />
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}
          </TabsContent>

          {/* ============ TAB 2: ADD-ONS ============ */}
          <TabsContent value="addons" className="space-y-4">
            {resolvedOrgId && (
              <>
                <ServiceAddonsLibrary organizationId={resolvedOrgId} categories={localOrder} />
                <ServiceAddonAssignmentsCard
                  organizationId={resolvedOrgId}
                  categories={localOrder}
                  servicesByCategory={servicesByCategory}
                />
              </>
            )}
          </TabsContent>

          {/* ============ TAB 3: STAFF ACCESS ============ */}
          <TabsContent value="staff" className="space-y-4">
            {resolvedOrgId && (
              <StaffServiceConfiguratorCard
                organizationId={resolvedOrgId}
                categories={localOrder}
                servicesByCategory={servicesByCategory}
              />
            )}
          </TabsContent>

          {/* ============ TAB 4: POLICIES ============ */}
          <TabsContent value="policies" className="space-y-4">
            <RedoPolicySettings />
          </TabsContent>
        </Tabs>

        {/* Unified Service Editor Dialog (create + edit) */}
        <ServiceEditorDialog
          open={editorDialogOpen}
          onOpenChange={setEditorDialogOpen}
          onSubmit={handleEditorSubmit}
          isPending={createService.isPending || updateService.isPending}
          categories={serviceCategories}
          initialData={editorService}
          mode={editorMode}
          presetCategory={editorPresetCategory}
        />

        {/* Wave 3: Bulk Edit Services Dialog */}
        <BulkEditServicesDialog
          open={bulkEditOpen}
          onOpenChange={setBulkEditOpen}
          selectedServices={selectedServices}
          categories={serviceCategories}
          organizationId={resolvedOrgId}
          onComplete={clearSelection}
        />

        <CategoryFormDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          onSubmit={categoryDialogMode === 'create' ? handleCreateCategory : handleRenameCategory}
          isPending={createCategory.isPending || renameCategory.isPending}
          initialName={editingCategory?.category_name}
          mode={categoryDialogMode}
          existingCategories={serviceCategories.map(c => c.category_name)}
        />

        {/* Archive category confirmation */}
        <AlertDialog open={!!archiveCategoryId} onOpenChange={(open) => { if (!open) { setArchiveCategoryId(null); setArchiveCategoryName(''); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive "{archiveCategoryName}"?</AlertDialogTitle>
              <AlertDialogDescription>
                {(servicesByCategory[archiveCategoryName]?.length || 0) > 0
                  ? `This category and its ${servicesByCategory[archiveCategoryName]?.length} services will be archived. You can restore them later.`
                  : 'This category will be archived. You can restore it later.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveCategory}>
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Permanently delete category confirmation (owner only) */}
        <AlertDialog open={!!deleteCategoryId} onOpenChange={(open) => { if (!open) setDeleteCategoryId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete "{deleteCategoryName}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this category. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Archive service confirmation */}
        <AlertDialog open={!!archiveServiceId} onOpenChange={(open) => { if (!open) { setArchiveServiceId(null); setArchiveServiceName(''); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive "{archiveServiceName}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This service will be archived and removed from your menu. You can restore it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveService}>
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Permanently delete service confirmation (owner only) */}
        <AlertDialog open={!!deleteServiceId} onOpenChange={(open) => { if (!open) { setDeleteServiceId(null); setDeleteServiceName(''); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete "{deleteServiceName}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this service. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteService} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
