import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  AlertTriangle,
  Loader2,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStylistLevelsSimple } from '@/hooks/useStylistLevels';
import { EditorCard } from './EditorCard';
import { ServiceCommunicationFlowEditor } from '@/components/dashboard/ServiceCommunicationFlowEditor';
import { useAllServiceCommunicationFlows } from '@/hooks/useServiceCommunicationFlows';
import {

  useNativeServicesForWebsite,
  useToggleServicePopular,
  useToggleBookableOnline,
  useUpdateServiceDescription,
  type NativeServiceCategory,
  type NativeServiceItem,
} from '@/hooks/useNativeServicesForWebsite';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

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

export function ServicesContent() {
  const { dashPath } = useOrgDashboardPath();
  const { data: stylistLevels } = useStylistLevelsSimple();
  const { data: allFlows } = useAllServiceCommunicationFlows();
  const { categories: nativeCategories, levels, isLoading, hasLevelPrices, error } = useNativeServicesForWebsite();
  const togglePopular = useToggleServicePopular();
  const toggleBookableOnline = useToggleBookableOnline();
  const updateDescription = useUpdateServiceDescription();

  // Map native categories to local shape
  const mappedCategories: LocalCategory[] = useMemo(() =>
    nativeCategories.map(cat => ({
      ...cat,
      category: cat.categoryName,
      isAddOn: false,
    }))
  , [nativeCategories]);

  const [serviceCategories, setServiceCategories] = useState<LocalCategory[]>([]);

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

  // Services with active communication flows
  const servicesWithFlows = new Set(
    allFlows?.filter(f => f.is_active).map(f => f.service_id) || []
  );

  const totalServices = serviceCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const popularServices = serviceCategories.reduce(
    (sum, cat) => sum + cat.items.filter(item => item.isPopular).length, 
    0
  );
  const onlineServices = serviceCategories.reduce(
    (sum, cat) => sum + cat.items.filter(item => item.bookableOnline).length,
    0
  );

  const handleToggleBookableOnline = (categoryIndex: number, itemIndex: number) => {
    const item = serviceCategories[categoryIndex]?.items[itemIndex];
    if (item) {
      toggleBookableOnline.mutate({ serviceId: item.id, bookableOnline: !item.bookableOnline });
    }
  };

  const handleTogglePopular = (categoryIndex: number, itemIndex: number) => {
    const item = serviceCategories[categoryIndex]?.items[itemIndex];
    if (item) {
      togglePopular.mutate({ serviceId: item.id, isPopular: !item.isPopular });
    }
  };

  const handleUpdateService = () => {
    if (!editingService) return;
    // Save website description to DB
    const original = serviceCategories[editingService.categoryIndex]?.items[editingService.itemIndex];
    if (original && editingService.item.websiteDescription !== original.websiteDescription) {
      updateDescription.mutate({
        serviceId: editingService.item.id,
        description: editingService.item.websiteDescription || '',
      });
    }
    // Update local state
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
      updated[index] = { ...updated[index], category: editingCategoryName.trim(), categoryName: editingCategoryName.trim() };
      return updated;
    });
    setEditingCategoryIndex(null);
    setEditingCategoryName('');
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
    if (category.includes('Cut') || category.includes('Styling') || category.includes('Haircut')) return Scissors;
    if (category.includes('Color') || category.includes('Blonding') || category.includes('Vivid') || category.includes('Balayage') || category.includes('Highlight')) return Palette;
    if (category.includes('Extension')) return Layers;
    return Sparkles;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading services...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load services. Please try again.
      </div>
    );
  }

  return (
    <EditorCard
      title="Services Manager"
      icon={Scissors}
      description="Manage services, pricing, and website display settings"
    >
      {/* Info notice */}
      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/60 border border-border">
        <Settings2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Services and categories are managed in{' '}
          <Link to={dashPath('/admin/services')} className="underline font-medium text-foreground hover:text-primary">
            Services Settings
          </Link>
          . Use this editor to control website display, descriptions, and popular badges.
        </p>
      </div>

      {/* Data health warning */}
      {!hasLevelPrices && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Level-based pricing has not been configured yet. Services are showing base prices only.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Scissors className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-medium">{totalServices}</p>
              <p className="text-xs text-muted-foreground truncate">Total Services</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-medium">{serviceCategories.length}</p>
              <p className="text-xs text-muted-foreground truncate">Categories</p>
            </div>
          </CardContent>
        </Card>
        <Link to={dashPath('/admin/stylist-levels')}>
          <Card className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-primary/30 h-full">
            <CardContent className="p-2.5 flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Settings2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-medium">{(stylistLevels || []).length}</p>
                <p className="text-xs text-muted-foreground truncate">Stylist Levels</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Star className="w-4 h-4 text-amber-600 fill-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-medium">{popularServices}</p>
              <p className="text-xs text-muted-foreground truncate">Popular</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-sky-100 dark:bg-sky-900/30">
              <Globe className="w-4 h-4 text-sky-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-medium">{onlineServices}</p>
              <p className="text-xs text-muted-foreground truncate">Online</p>
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
        {filteredCategories.map((category) => {
          const CategoryIcon = getCategoryIcon(category.category);
          const originalCategoryIndex = serviceCategories.findIndex(c => c.category === category.category);
          const isEditing = editingCategoryIndex === originalCategoryIndex;
          const isDragging = draggedCategoryIndex === originalCategoryIndex;
          const isDragOver = dragOverCategoryIndex === originalCategoryIndex;
          
          return (
            <AccordionItem 
              key={category.id} 
              value={category.id}
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
              <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-muted/50 [&>svg]:shrink-0">
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
                        <h3 className="font-sans font-medium text-sm">{category.categoryName}</h3>
                        <p className="text-xs text-muted-foreground font-sans font-normal">
                          {category.items.length} services
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0">
                <div className="divide-y border-t">
                  {category.items.map((item, itemIndex) => {
                    const originalItemIndex = serviceCategories[originalCategoryIndex]?.items.findIndex(
                      i => i.id === item.id
                    ) ?? itemIndex;
                    
                    return (
                      <div 
                        key={item.id}
                        className={cn(
                          "px-4 py-3 space-y-2 hover:bg-muted/30 transition-colors",
                          !item.bookableOnline && "opacity-50"
                        )}
                      >
                        {/* Row 1: Name + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          {item.isPopular && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              Popular
                            </Badge>
                          )}
                          {!item.bookableOnline && (
                            <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                              Hidden from website
                            </Badge>
                          )}
                          {item.websiteDescription && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Globe className="w-3 h-3" />
                              Web Copy
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        
                        {/* Row 2: Price range */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Starts at:</span>
                          <Badge variant="secondary" className="font-mono">
                            ${getLowestPrice(item)}
                          </Badge>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          <Badge variant="secondary" className="font-mono">
                            ${getHighestPrice(item)}
                          </Badge>
                        </div>

                        {/* Row 3: Action controls */}
                        <div className="flex items-center gap-3 flex-wrap pt-1 border-t">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`online-${item.id}`} className="text-xs text-muted-foreground">
                              Online
                            </Label>
                            <Switch
                              id={`online-${item.id}`}
                              checked={item.bookableOnline}
                              onCheckedChange={() => handleToggleBookableOnline(originalCategoryIndex, originalItemIndex)}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Label htmlFor={`popular-${item.id}`} className="text-xs text-muted-foreground">
                              Popular
                            </Label>
                            <Switch
                              id={`popular-${item.id}`}
                              checked={item.isPopular}
                              onCheckedChange={() => handleTogglePopular(originalCategoryIndex, originalItemIndex)}
                            />
                          </div>

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
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingService({ 
                                  categoryIndex: originalCategoryIndex, 
                                  itemIndex: originalItemIndex, 
                                  item: { ...item } 
                                })}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>Edit Service</DialogTitle>
                                <DialogDescription>
                                  Update service details, pricing, and website display
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="max-h-[calc(80vh-8rem)]">
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

                                  {/* Website Description - NEW */}
                                  <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                                    <Label className="flex items-center gap-2">
                                      <Globe className="w-4 h-4 text-primary" />
                                      Website Description
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      Marketing copy shown on the public website. If empty, the operational description above will be used.
                                    </p>
                                    <Textarea 
                                      value={editingService.item.websiteDescription || ''}
                                      onChange={(e) => setEditingService(prev => 
                                        prev ? { ...prev, item: { ...prev.item, websiteDescription: e.target.value } } : null
                                      )}
                                      rows={3}
                                      placeholder="e.g. Transform your look with our signature balayage technique..."
                                    />
                                  </div>

                                  <div className="space-y-3">
                                    <Label>Pricing by Level</Label>
                                    {/* eslint-disable-next-line no-restricted-syntax -- uniform per-level price input grid; each cell is short (label + small price input) so multi-col reads cleanly. Doctrine: mem://style/container-aware-responsiveness. */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                      {levels.map((level) => (
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

                                  {/* Booking Settings */}
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
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    );
                  })}
                  {category.items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No services in this category yet
                    </p>
                  )}
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
            <strong className="text-foreground">Website Description:</strong> Set custom marketing copy per service for the public site.
          </p>
          <p>
            <strong className="text-foreground">Note:</strong> Popular toggles and website descriptions save to the database automatically. Category reordering and renaming are session-only.
          </p>
        </CardContent>
      </Card>

      {/* Communication Flow Editor Dialog */}
      {configureFlowsServiceName && (
        <ServiceCommunicationFlowEditor
          open={!!configureFlowsServiceName}
          onOpenChange={(open) => !open && setConfigureFlowsServiceName(null)}
          serviceName={configureFlowsServiceName}
        />
      )}
    </EditorCard>
  );
}
