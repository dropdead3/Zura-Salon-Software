import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { 
  Scissors, 
  Plus, 
  Pencil, 
  Trash2, 
  DollarSign,
  Star,
  Sparkles,
  ChevronRight,
  Search,
  Palette,
  Layers,
  Settings2,
  GripVertical,
  Check,
  X,
  Mail,
  Clock,
  CalendarX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNativeServicesForWebsite, useToggleServicePopular, type NativeServiceCategory, type NativeServiceItem } from '@/hooks/useNativeServicesForWebsite';
import { StylistLevelsEditor } from '@/components/dashboard/StylistLevelsEditor';
import { useStylistLevelsSimple } from '@/hooks/useStylistLevels';
import { ServiceCommunicationFlowEditor } from '@/components/dashboard/ServiceCommunicationFlowEditor';
import { useAllServiceCommunicationFlows } from '@/hooks/useServiceCommunicationFlows';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Local type extending native with backward-compat aliases
interface LocalCategory {
  id: string;
  categoryName: string;
  category: string;
  description: string | null;
  colorHex: string;
  textColorHex: string;
  displayOrder: number;
  isAddOn: boolean;
  items: NativeServiceItem[];
}

export default function ServicesManager() {
  const { data: stylistLevels } = useStylistLevelsSimple();
  const { data: allFlows } = useAllServiceCommunicationFlows();
  const { categories: nativeCategories, levels, isLoading: servicesLoading } = useNativeServicesForWebsite();
  const togglePopularMutation = useToggleServicePopular();

  // Map native categories to local shape with backward-compat aliases
  const mappedCategories: LocalCategory[] = useMemo(() =>
    nativeCategories.map(cat => ({
      ...cat,
      category: cat.categoryName,
      isAddOn: false,
    }))
  , [nativeCategories]);

  const [serviceCategories, setServiceCategories] = useState<LocalCategory[]>([]);

  // Sync from DB when data loads/changes
  useEffect(() => {
    if (mappedCategories.length > 0) {
      setServiceCategories(mappedCategories);
    }
  }, [mappedCategories]);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingService, setEditingService] = useState<{ categoryIndex: number; itemIndex: number; item: NativeServiceItem } | null>(null);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
  const [dragOverCategoryIndex, setDragOverCategoryIndex] = useState<number | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIsAddOn, setNewCategoryIsAddOn] = useState(false);
  const [deletingCategoryIndex, setDeletingCategoryIndex] = useState<number | null>(null);
  const [configureFlowsServiceName, setConfigureFlowsServiceName] = useState<string | null>(null);

  // Price helpers
  const getLowestPrice = (item: NativeServiceItem) => {
    if (levels.length === 0) return item.basePrice;
    return item.levelPrices[levels[0].id] ?? item.basePrice;
  };
  const getHighestPrice = (item: NativeServiceItem) => {
    if (levels.length === 0) return item.basePrice;
    return item.levelPrices[levels[levels.length - 1].id] ?? item.basePrice;
  };

  // Get set of service names that have active flows
  const servicesWithFlows = new Set(
    allFlows?.filter(f => f.is_active).map(f => {
      // We need to look up the service name - for now we'll track by service_id
      return f.service_id;
    }) || []
  );

  const totalServices = serviceCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const popularServices = serviceCategories.reduce(
    (sum, cat) => sum + cat.items.filter(item => item.isPopular).length, 
    0
  );

  const handleTogglePopular = (categoryIndex: number, itemIndex: number) => {
    const item = serviceCategories[categoryIndex]?.items[itemIndex];
    if (item) {
      togglePopularMutation.mutate({ serviceId: item.id, isPopular: !item.isPopular });
    }
  };

  const handleUpdateService = () => {
    if (!editingService) return;
    
    setServiceCategories(prev => {
      const updated = [...prev];
      updated[editingService.categoryIndex] = {
        ...updated[editingService.categoryIndex],
        items: updated[editingService.categoryIndex].items.map((item, idx) => 
          idx === editingService.itemIndex ? editingService.item : item
        ),
      };
      return updated;
    });
    setEditingService(null);
  };

  const handleRenameCategory = (index: number) => {
    if (!editingCategoryName.trim()) return;
    setServiceCategories(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], category: editingCategoryName.trim() };
      return updated;
    });
    setEditingCategoryIndex(null);
    setEditingCategoryName('');
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory: LocalCategory = {
      id: crypto.randomUUID(),
      categoryName: newCategoryName.trim(),
      category: newCategoryName.trim(),
      description: '',
      colorHex: '#6B7280',
      textColorHex: '#FFFFFF',
      displayOrder: serviceCategories.length,
      isAddOn: newCategoryIsAddOn,
      items: [],
    };
    setServiceCategories(prev => [...prev, newCategory]);
    setNewCategoryName('');
    setNewCategoryIsAddOn(false);
    setIsAddCategoryOpen(false);
  };

  const handleDeleteCategory = (index: number) => {
    setServiceCategories(prev => prev.filter((_, i) => i !== index));
    setDeletingCategoryIndex(null);
  };

  const handleCategoryDragStart = (e: React.DragEvent, index: number) => {
    setDraggedCategoryIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCategoryIndex !== null && draggedCategoryIndex !== index) {
      setDragOverCategoryIndex(index);
    }
  };

  const handleCategoryDragLeave = () => {
    setDragOverCategoryIndex(null);
  };

  const handleCategoryDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedCategoryIndex === null || draggedCategoryIndex === targetIndex) {
      setDraggedCategoryIndex(null);
      setDragOverCategoryIndex(null);
      return;
    }

    setServiceCategories(prev => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedCategoryIndex, 1);
      updated.splice(targetIndex, 0, draggedItem);
      return updated;
    });

    setDraggedCategoryIndex(null);
    setDragOverCategoryIndex(null);
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategoryIndex(null);
    setDragOverCategoryIndex(null);
  };

  const filteredCategories = searchQuery
    ? serviceCategories.map(category => ({
        ...category,
        items: category.items.filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(category => category.items.length > 0)
    : serviceCategories;

  const getCategoryIcon = (category: string) => {
    if (category.includes('Cut') || category.includes('Styling')) return Scissors;
    if (category.includes('Color') || category.includes('Balayage') || category.includes('Highlight')) return Palette;
    if (category.includes('Extension')) return Layers;
    return Sparkles;
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display flex items-center gap-2">
              <Scissors className="w-6 h-6" />
              Services Manager
            </h1>
            <p className="text-muted-foreground">
              Manage your salon services and pricing
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <StylistLevelsEditor
              trigger={
                <Button variant="outline" className="gap-2">
                  <Settings2 className="w-4 h-4" />
                  Manage Levels
                </Button>
              }
            />
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                  <DialogDescription>
                    Create a new service category
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Category Name</Label>
                    <Input 
                      placeholder="e.g. Bridal Services"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCategory();
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="add-on-toggle"
                      checked={newCategoryIsAddOn}
                      onCheckedChange={setNewCategoryIsAddOn}
                    />
                    <Label htmlFor="add-on-toggle" className="cursor-pointer">
                      This is an Add-On category
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                    Add Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Scissors className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-medium">{totalServices}</p>
                <p className="text-sm text-muted-foreground">Total Services</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-medium">{serviceCategories.length}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
            </CardContent>
          </Card>
          <Link to="/dashboard/admin/stylist-levels">
            <Card className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-primary/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <Settings2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{(stylistLevels || []).length}</p>
                  <p className="text-sm text-muted-foreground">Stylist Levels</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Star className="w-5 h-5 text-amber-600 fill-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-medium">{popularServices}</p>
                <p className="text-sm text-muted-foreground">Popular Services</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Service Categories */}
        <Accordion type="multiple" className="space-y-3">
          {filteredCategories.map((category, idx) => {
            const CategoryIcon = getCategoryIcon(category.category);
            const originalCategoryIndex = serviceCategories.findIndex(c => c.category === category.category);
            const isEditing = editingCategoryIndex === originalCategoryIndex;
            const isDragging = draggedCategoryIndex === originalCategoryIndex;
            const isDragOver = dragOverCategoryIndex === originalCategoryIndex;
            
            return (
              <AccordionItem 
                key={category.category} 
                value={category.category}
                className={cn(
                  "border rounded-lg overflow-hidden transition-all group",
                  isDragging && "opacity-50",
                  isDragOver && "ring-2 ring-primary ring-offset-2"
                )}
                draggable={!searchQuery}
                onDragStart={(e) => handleCategoryDragStart(e, originalCategoryIndex)}
                onDragOver={(e) => handleCategoryDragOver(e, originalCategoryIndex)}
                onDragLeave={handleCategoryDragLeave}
                onDrop={(e) => handleCategoryDrop(e, originalCategoryIndex)}
                onDragEnd={handleCategoryDragEnd}
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&>svg]:shrink-0">
                  <div className="flex items-center gap-3 flex-1">
                    {!searchQuery && (
                      <div 
                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                    <div className="p-2 rounded-lg bg-muted">
                      <CategoryIcon className="w-4 h-4 text-foreground" />
                    </div>
                    {isEditing ? (
                      <div 
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="h-8 w-48"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameCategory(originalCategoryIndex);
                            } else if (e.key === 'Escape') {
                              setEditingCategoryIndex(null);
                              setEditingCategoryName('');
                            }
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRenameCategory(originalCategoryIndex)}
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingCategoryIndex(null);
                            setEditingCategoryName('');
                          }}
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="text-left">
                          <h3 className="font-display font-medium uppercase tracking-wide">{category.category}</h3>
                          <p className="text-xs text-muted-foreground font-sans font-normal">
                            {category.items.length} services
                          </p>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategoryIndex(originalCategoryIndex);
                              setEditingCategoryName(category.category);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.category}"? 
                                  {category.items.length > 0 && (
                                    <span className="block mt-2 text-destructive font-medium">
                                      This will also delete {category.items.length} service{category.items.length > 1 ? 's' : ''} in this category.
                                    </span>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeleteCategory(originalCategoryIndex)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="divide-y border-t">
                    {category.items.map((item, itemIndex) => {
                      const originalItemIndex = serviceCategories[originalCategoryIndex]?.items.findIndex(
                        i => i.name === item.name
                      ) ?? itemIndex;
                      
                      return (
                        <div 
                          key={item.name}
                          className="px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              {item.isPopular && (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 gap-1">
                                  <Star className="w-3 h-3 fill-current" />
                                  Popular
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">Starts at:</span>
                              <Badge variant="secondary" className="font-mono">
                                ${getLowestPrice(item)}
                              </Badge>
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              <Badge variant="secondary" className="font-mono">
                                ${getHighestPrice(item)}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfigureFlowsServiceName(item.name);
                                    }}
                                  >
                                    <Mail className={cn(
                                      "w-4 h-4",
                                      servicesWithFlows.size > 0 && "text-primary"
                                    )} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Configure communication flows</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`popular-${item.name}`} className="text-xs text-muted-foreground">
                                Popular
                              </Label>
                              <Switch
                                id={`popular-${item.name}`}
                                checked={item.isPopular}
                                onCheckedChange={() => handleTogglePopular(originalCategoryIndex, originalItemIndex)}
                              />
                            </div>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingService({ 
                                    categoryIndex: originalCategoryIndex, 
                                    itemIndex: originalItemIndex, 
                                    item: { ...item } 
                                  })}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Edit Service</DialogTitle>
                                  <DialogDescription>
                                    Update service details and pricing
                                  </DialogDescription>
                                </DialogHeader>
                                {editingService && (
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Service Name</Label>
                                      <Input 
                                        value={editingService.item.name}
                                        onChange={(e) => setEditingService(prev => 
                                          prev ? { ...prev, item: { ...prev.item, name: e.target.value } } : null
                                        )}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Description</Label>
                                      <Textarea 
                                        value={editingService.item.description || ''}
                                        onChange={(e) => setEditingService(prev => 
                                          prev ? { ...prev, item: { ...prev.item, description: e.target.value } } : null
                                        )}
                                        rows={2}
                                      />
                                    </div>
                                    <div className="space-y-3">
                                      <Label>Pricing by Level</Label>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {levels.map((level, index) => (
                                          <div key={level.id} className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">
                                              {level.clientLabel} - {level.label}
                                            </Label>
                                            <div className="relative">
                                              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                              <Input 
                                                className="pl-7 font-mono"
                                                value={editingService.item.levelPrices[level.id]?.toString() || ''}
                                                onChange={(e) => {
                                                  const value = e.target.value;
                                                  setEditingService(prev => 
                                                    prev ? { 
                                                      ...prev, 
                                                      item: { 
                                                        ...prev.item, 
                                                        levelPrices: { 
                                                          ...prev.item.levelPrices, 
                                                          [level.id]: value ? parseFloat(value) : 0 
                                                        } 
                                                      } 
                                                    } : null
                                                  );
                                                }}
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Same-Day Booking Settings */}
                                    <div className="space-y-4 border-t pt-4 mt-4">
                                      <div className="flex items-center gap-2">
                                        <CalendarX className="w-4 h-4 text-muted-foreground" />
                                        <Label className="text-sm font-medium">Booking Settings</Label>
                                      </div>
                                      
                                      <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                          <Label>Allow Same-Day Booking</Label>
                                          <p className="text-xs text-muted-foreground">
                                            Enable for services that can be booked same-day
                                          </p>
                                        </div>
                                        <Switch 
                                          checked={(editingService.item as any).allowSameDayBooking !== false}
                                          onCheckedChange={(checked: boolean) => setEditingService(prev => 
                                            prev ? { ...prev, item: { ...prev.item, allowSameDayBooking: checked } } : null
                                          )}
                                        />
                                      </div>

                                      {(editingService.item as any).allowSameDayBooking === false && (
                                        <>
                                          <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                              <Clock className="w-4 h-4" />
                                              Lead Time Required (days)
                                            </Label>
                                            <Input 
                                              type="number" 
                                              min="1"
                                              value={(editingService.item as any).leadTimeDays || 1}
                                              onChange={(e) => setEditingService(prev => 
                                                prev ? { ...prev, item: { ...prev.item, leadTimeDays: parseInt(e.target.value) || 1 } } : null
                                              )}
                                              className="w-24"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                              Minimum days notice required to book this service
                                            </p>
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Restriction Reason</Label>
                                            <Textarea 
                                              placeholder="e.g., Extensions require 7-day custom order"
                                              value={(editingService.item as any).restrictionReason || ''}
                                              onChange={(e) => setEditingService(prev => 
                                                prev ? { ...prev, item: { ...prev.item, restrictionReason: e.target.value } } : null
                                              )}
                                              rows={2}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                              Shown to receptionists when this service cannot be booked same-day
                                            </p>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingService(null)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleUpdateService}>
                                    Save Changes
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 font-sans font-medium normal-case">
              <DollarSign className="w-4 h-4" />
              About Service Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">Stylist Levels:</strong> Prices vary by stylist experience level, from New Talent to Icon Artist.
            </p>
            <p>
              <strong className="text-foreground">Popular Flag:</strong> Toggle to feature services prominently on the website.
            </p>
            <p>
              <strong className="text-foreground">Note:</strong> Popular toggles save to the database automatically. Category reordering and renaming are session-only.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Communication Flow Editor Dialog */}
      {configureFlowsServiceName && (
        <ServiceCommunicationFlowEditor
          open={!!configureFlowsServiceName}
          onOpenChange={(open) => !open && setConfigureFlowsServiceName(null)}
          serviceName={configureFlowsServiceName}
        />
      )}
    </DashboardLayout>
  );
}