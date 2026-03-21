import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff,
  Filter,
  LayoutGrid,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { 
  useDashboardVisibility, 
  useToggleDashboardVisibility, 
  useSyncVisibilityElements,
  useAddVisibilityElement,
  useDeleteVisibilityElement,
  useBulkUpdateVisibility,
  groupVisibilityByElement, 
  groupByCategory,
} from '@/hooks/useDashboardVisibility';
import { useRoles } from '@/hooks/useRoles';
import { getIconByName } from '@/lib/iconResolver';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export function CommandCenterContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newElement, setNewElement] = useState({ key: '', name: '', category: '' });
  const [elementToDelete, setElementToDelete] = useState<string | null>(null);
  const [confirmHideRole, setConfirmHideRole] = useState<string | null>(null);

  // Fetch data - dynamically from database
  const { data: visibilityData, isLoading: visibilityLoading, error: visibilityError } = useDashboardVisibility();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  
  // Mutations
  const toggleMutation = useToggleDashboardVisibility();
  const syncMutation = useSyncVisibilityElements();
  const addMutation = useAddVisibilityElement();
  const deleteMutation = useDeleteVisibilityElement();
  const bulkMutation = useBulkUpdateVisibility();
  const queryClient = useQueryClient();
  const hasSyncedRef = useRef(false);
  const { groupedElements, allElements, categories, stats } = useMemo(() => {
    if (!visibilityData) {
      return { groupedElements: {}, allElements: [], categories: [], stats: { total: 0, visible: 0, hidden: 0 } };
    }

    const elements = groupVisibilityByElement(visibilityData);
    const byCategory = groupByCategory(elements);
    const categoryList = Object.keys(byCategory).sort();

    // Calculate stats
    let visible = 0;
    let hidden = 0;
    visibilityData.forEach((item) => {
      if (item.is_visible) visible++;
      else hidden++;
    });

    return {
      groupedElements: byCategory,
      allElements: elements,
      categories: categoryList,
      stats: { total: visibilityData.length, visible, hidden },
    };
  }, [visibilityData]);

  // Filter elements based on search and category
  const filteredCategories = useMemo(() => {
    let filtered = { ...groupedElements };

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = { [categoryFilter]: groupedElements[categoryFilter] || [] };
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      Object.keys(filtered).forEach((category) => {
        filtered[category] = filtered[category].filter(
          (el) =>
            el.element_name.toLowerCase().includes(query) ||
            el.element_key.toLowerCase().includes(query)
        );
        if (filtered[category].length === 0) {
          delete filtered[category];
        }
      });
    }

    return filtered;
  }, [groupedElements, categoryFilter, searchQuery]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Expand all categories
  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(filteredCategories)));
  };

  // Collapse all categories
  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Handle toggle
  const handleToggle = (elementKey: string, elementName: string, elementCategory: string, role: AppRole, currentValue: boolean) => {
    toggleMutation.mutate({ elementKey, elementName, elementCategory, role, isVisible: !currentValue });
  };

  // Handle add element
  const handleAddElement = () => {
    if (!newElement.key || !newElement.name || !newElement.category) return;
    
    addMutation.mutate({
      elementKey: newElement.key,
      elementName: newElement.name,
      elementCategory: newElement.category,
    }, {
      onSuccess: () => {
        setNewElement({ key: '', name: '', category: '' });
        setShowAddDialog(false);
      },
    });
  };

  // Handle delete element
  const handleDeleteElement = (elementKey: string) => {
    deleteMutation.mutate(elementKey, {
      onSuccess: () => setElementToDelete(null),
    });
  };

  // Get unique element count (total elements that should exist for each role)
  const uniqueElementCount = allElements.length;

  // Get role visibility stats - now includes total possible elements
  const getRoleVisibilityStats = (roleName: string) => {
    const roleElements = allElements.filter(el => el.roles[roleName as AppRole] !== undefined);
    const visibleCount = roleElements.filter(el => el.roles[roleName as AppRole]).length;
    return { 
      visible: visibleCount, 
      total: roleElements.length,
      incomplete: roleElements.length < uniqueElementCount
    };
  };

  // Bulk toggle for a role - now handles missing entries
  const handleBulkToggle = async (roleName: string, setVisible: boolean) => {
    // Find elements that need updating (already have entries with different value)
    const updates = allElements
      .filter(el => el.roles[roleName as AppRole] !== undefined && el.roles[roleName as AppRole] !== setVisible)
      .map(el => ({
        elementKey: el.element_key,
        role: roleName as AppRole,
        isVisible: setVisible,
      }));
    
    // Find elements missing entries for this role
    const missingElements = allElements.filter(el => el.roles[roleName as AppRole] === undefined);
    
    // Create missing entries with the target visibility
    if (missingElements.length > 0) {
      const inserts = missingElements.map(el => ({
        element_key: el.element_key,
        element_name: el.element_name,
        element_category: el.element_category,
        role: roleName as AppRole,
        is_visible: setVisible,
      }));
      
      const { error } = await supabase
        .from('dashboard_element_visibility')
        .insert(inserts);
      
      if (error) {
        console.error('Failed to create missing entries:', error);
        toast.error('Failed to update visibility settings');
        setConfirmHideRole(null);
        return;
      }
    }
    
    // Perform updates for existing entries
    if (updates.length > 0) {
      bulkMutation.mutate(updates);
    } else if (missingElements.length > 0) {
      // Just refresh the data since we inserted but didn't need to update
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
      toast.success('Visibility settings updated');
    }
    
    setConfirmHideRole(null);
  };

  // Auto-sync missing entries on mount (runs once when data is ready)
  useEffect(() => {
    if (hasSyncedRef.current || visibilityLoading || rolesLoading || !visibilityData || roles.length === 0) {
      return;
    }

    // Check if any role has incomplete entries
    const hasIncompleteRoles = roles.some(role => {
      const roleElementCount = allElements.filter(
        el => el.roles[role.name as AppRole] !== undefined
      ).length;
      return roleElementCount < uniqueElementCount && uniqueElementCount > 0;
    });

    if (hasIncompleteRoles) {
      hasSyncedRef.current = true;
      syncMutation.mutate();
    } else {
      hasSyncedRef.current = true;
    }
  }, [visibilityLoading, rolesLoading, visibilityData, roles, allElements, uniqueElementCount, syncMutation]);

  const isLoading = visibilityLoading || rolesLoading;

  if (visibilityError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Visibility Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{visibilityError.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Visibility Console
              </CardTitle>
              <CardDescription>
                Control which dashboard elements are visible for each role
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {stats.total} entries
              </Badge>
              <Badge variant="secondary" className="font-mono">
                <Eye className="h-3 w-3 mr-1" />
                {stats.visible}
              </Badge>
              <Badge variant="secondary" className="font-mono text-muted-foreground">
                <EyeOff className="h-3 w-3 mr-1" />
                {stats.hidden}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search elements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size={tokens.button.card}
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Roles
              </Button>

              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size={tokens.button.card}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Element
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Element</DialogTitle>
                    <DialogDescription>
                      Register a new element for visibility control. It will be added for all active roles.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="element-key">Element Key</Label>
                      <Input
                        id="element-key"
                        placeholder="e.g., sales_chart"
                        value={newElement.key}
                        onChange={(e) => setNewElement((prev) => ({ ...prev, key: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Unique identifier used in code (snake_case)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="element-name">Display Name</Label>
                      <Input
                        id="element-name"
                        placeholder="e.g., Sales Chart"
                        value={newElement.name}
                        onChange={(e) => setNewElement((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="element-category">Category</Label>
                      <Select
                        value={newElement.category}
                        onValueChange={(value) => setNewElement((prev) => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select or type a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Or enter a new category..."
                        value={newElement.category}
                        onChange={(e) => setNewElement((prev) => ({ ...prev, category: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddElement}
                      disabled={!newElement.key || !newElement.name || !newElement.category || addMutation.isPending}
                    >
                      {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Element
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-2 mt-4">
            <Button variant="ghost" size={tokens.button.inline} onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="ghost" size={tokens.button.inline} onClick={collapseAll}>
              Collapse All
            </Button>
            <span className="text-sm text-muted-foreground ml-auto">
              {Object.keys(filteredCategories).length} categories,{' '}
              {Object.values(filteredCategories).reduce((acc, els) => acc + els.length, 0)} elements
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Role Quick Actions - Dynamically from database */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Actions by Role</CardTitle>
          <CardDescription>Show or hide all elements for a specific role</CardDescription>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {roles.map((role) => {
                const Icon = getIconByName(role.icon);
                const stats = getRoleVisibilityStats(role.name);
                const allVisible = stats.visible === stats.total && stats.total > 0;
                const noneVisible = stats.visible === 0;
                const percentage = stats.total > 0 ? Math.round((stats.visible / stats.total) * 100) : 0;
                
                return (
                  <div 
                    key={role.id} 
                    className="group relative bg-muted/30 hover:bg-muted/50 border border-border/50 rounded-xl p-4 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-background border"
                        style={{ borderColor: role.color }}
                      >
                        <Icon className="w-4 h-4" style={{ color: role.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-medium truncate">{role.display_name}</h3>
                          {stats.incomplete && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Missing entries - click Show/Hide to sync</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {stats.visible} of {uniqueElementCount} visible
                        </p>
                      </div>
                    </div>
                    
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: percentage === 100 ? 'hsl(var(--chart-2))' : percentage === 0 ? 'hsl(var(--muted-foreground) / 0.3)' : role.color
                        }}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size={tokens.button.inline}
                        variant={allVisible ? "secondary" : "outline"}
                        className={cn(
                          "flex-1 h-8 text-xs gap-1.5",
                          allVisible && "bg-chart-2/10 text-chart-2 border-chart-2/30 hover:bg-chart-2/20"
                        )}
                        onClick={() => handleBulkToggle(role.name, true)}
                        disabled={allVisible || bulkMutation.isPending}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show</span>
                      </Button>
                      <Button
                        size={tokens.button.inline}
                        variant={noneVisible ? "secondary" : "outline"}
                        className={cn(
                          "flex-1 h-8 text-xs gap-1.5",
                          noneVisible && "bg-muted text-muted-foreground"
                        )}
                        onClick={() => setConfirmHideRole(role.name)}
                        disabled={noneVisible || bulkMutation.isPending}
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visibility Matrix */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading visibility settings...
            </div>
          </CardContent>
        </Card>
      ) : Object.keys(filteredCategories).length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              {searchQuery || categoryFilter !== 'all' ? (
                <p>No elements match your filters.</p>
              ) : (
                <p>No visibility elements configured yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(filteredCategories).map(([category, elements]) => (
            <Card key={category}>
              <Collapsible
                open={expandedCategories.has(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {expandedCategories.has(category) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <CardTitle className="text-base">{category}</CardTitle>
                        <Badge variant="secondary" className="ml-2">
                          {elements.length} element{elements.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[250px]">Element</TableHead>
                            {roles.map((role) => {
                              const Icon = getIconByName(role.icon);
                              return (
                                <TableHead
                                  key={role.id}
                                  className="text-center w-[100px]"
                                  style={{ borderTop: `3px solid ${role.color}` }}
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <Icon className="h-4 w-4" style={{ color: role.color }} />
                                    <span className="text-xs font-normal truncate max-w-[80px]">
                                      {role.display_name}
                                    </span>
                                  </div>
                                </TableHead>
                              );
                            })}
                            <TableHead className="w-[60px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {elements.map((element) => (
                            <TableRow key={element.element_key}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{element.element_name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {element.element_key}
                                  </p>
                                </div>
                              </TableCell>
                              {roles.map((role) => {
                                const isVisible = element.roles[role.name as AppRole] ?? true;
                                const isToggling =
                                  toggleMutation.isPending &&
                                  toggleMutation.variables?.elementKey === element.element_key &&
                                  toggleMutation.variables?.role === role.name;
                                
                                return (
                                  <TableCell key={role.id} className="text-center">
                                    <div className="flex justify-center">
                                      <Switch
                                        checked={isVisible}
                                        onCheckedChange={() =>
                                          handleToggle(element.element_key, element.element_name, element.element_category, role.name as AppRole, isVisible)
                                        }
                                        disabled={isToggling}
                                        className={cn(
                                          isVisible ? 'bg-primary' : 'bg-muted',
                                          isToggling && 'opacity-50'
                                        )}
                                      />
                                    </div>
                                  </TableCell>
                                );
                              })}
                              <TableCell>
                                <Dialog
                                  open={elementToDelete === element.element_key}
                                  onOpenChange={(open) =>
                                    setElementToDelete(open ? element.element_key : null)
                                  }
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Delete Element</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to delete "{element.element_name}"? This will
                                        remove visibility settings for all roles.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <Button
                                        variant="outline"
                                        onClick={() => setElementToDelete(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleDeleteElement(element.element_key)}
                                        disabled={deleteMutation.isPending}
                                      >
                                        {deleteMutation.isPending && (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        )}
                                        Delete
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Bulk Hide */}
      <AlertDialog open={!!confirmHideRole} onOpenChange={() => setConfirmHideRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Hide All Dashboard Elements?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will hide all dashboard elements for the{' '}
              <strong>{confirmHideRole && roles.find(r => r.name === confirmHideRole)?.display_name}</strong> role.
              Users with this role won't see any of these elements on their dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmHideRole) {
                  handleBulkToggle(confirmHideRole, false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hide All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
