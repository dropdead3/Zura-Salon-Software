import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { 
  useRoleTemplates, 
  useCreateRoleTemplate, 
  useUpdateRoleTemplate,
  useDeleteRoleTemplate,
  RoleTemplate,
  CreateTemplateData,
} from '@/hooks/useRoleTemplates';
import { usePermissionsByCategory } from '@/hooks/usePermissions';
import { RoleColorPicker, getRoleColorClasses } from './RoleColorPicker';
import { RoleIconPicker } from './RoleIconPicker';
import * as LucideIcons from 'lucide-react';
import { 
  Files, 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2,
  CircleDot,
  Sparkles,
  Shield,
  Loader2,
  LayoutDashboard,
  TrendingUp,
  Calendar,
  FileText,
  Users,
  Settings,
  Copy,
} from 'lucide-react';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard,
  Growth: TrendingUp,
  Scheduling: Calendar,
  Housekeeping: FileText,
  Management: Users,
  Administration: Settings,
};

const categoryOrder = ['Dashboard', 'Growth', 'Scheduling', 'Housekeeping', 'Management', 'Administration'];

const getIconComponent = (iconName: string | null): React.ComponentType<{ className?: string }> => {
  if (!iconName) return CircleDot;
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || CircleDot;
};

export function RoleTemplatesManager() {
  const [editDialog, setEditDialog] = useState<{ open: boolean; template?: RoleTemplate }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<RoleTemplate | null>(null);

  const { data: templates, isLoading } = useRoleTemplates();
  const { data: permissionsByCategory } = usePermissionsByCategory();
  const createTemplate = useCreateRoleTemplate();
  const updateTemplate = useUpdateRoleTemplate();
  const deleteTemplate = useDeleteRoleTemplate();

  const [formData, setFormData] = useState<CreateTemplateData>({
    name: '',
    display_name: '',
    description: '',
    color: 'blue',
    icon: 'User',
    category: 'other',
    permission_ids: [],
  });

  const openCreateDialog = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      color: 'blue',
      icon: 'User',
      category: 'other',
      permission_ids: [],
    });
    setEditDialog({ open: true });
  };

  const openEditDialog = (template: RoleTemplate) => {
    setFormData({
      name: template.name,
      display_name: template.display_name,
      description: template.description || '',
      color: template.color,
      icon: template.icon,
      category: template.category,
      permission_ids: template.permission_ids || [],
    });
    setEditDialog({ open: true, template });
  };

  const handleDisplayNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      display_name: value,
      name: editDialog.template ? prev.name : value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') + '_template',
    }));
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter(id => id !== permissionId)
        : [...prev.permission_ids, permissionId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editDialog.template) {
      await updateTemplate.mutateAsync({
        id: editDialog.template.id,
        data: formData,
      });
    } else {
      await createTemplate.mutateAsync(formData);
    }

    setEditDialog({ open: false });
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteTemplate.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const duplicateTemplate = (template: RoleTemplate) => {
    setFormData({
      name: template.name + '_copy',
      display_name: template.display_name + ' (Copy)',
      description: template.description || '',
      color: template.color,
      icon: template.icon,
      category: template.category,
      permission_ids: template.permission_ids || [],
    });
    setEditDialog({ open: true });
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const systemTemplates = templates?.filter(t => t.is_system) || [];
  const customTemplates = templates?.filter(t => !t.is_system) || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <Files className="w-5 h-5" />
              Role Templates
            </CardTitle>
              <CardDescription>
                Create and manage templates to quickly set up new roles with pre-configured permissions.
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog} className="gap-2 font-display text-xs">
              <Plus className="w-4 h-4" />
              NEW TEMPLATE
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Built-in Templates */}
          {systemTemplates.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Built-in Templates
              </h3>
              <div className="grid gap-3">
                {systemTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => openEditDialog(template)}
                    onDelete={() => setDeleteConfirm(template)}
                    onDuplicate={() => duplicateTemplate(template)}
                    permissionsByCategory={permissionsByCategory}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom Templates */}
          <div className="space-y-3">
            <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground">
              Custom Templates
            </h3>
            {customTemplates.length === 0 ? (
              <div className="text-center py-8 border rounded-lg border-dashed">
                <Files className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No custom templates yet</p>
                <Button variant="link" size={tokens.button.card} onClick={openCreateDialog} className="mt-2">
                  Create your first template
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {customTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => openEditDialog(template)}
                    onDelete={() => setDeleteConfirm(template)}
                    onDuplicate={() => duplicateTemplate(template)}
                    permissionsByCategory={permissionsByCategory}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open })}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialog.template ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.template
                ? 'Update the template settings and permissions.'
                : 'Define a new template with pre-configured permissions.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Name *</Label>
                <Input
                  placeholder="e.g., Senior Stylist"
                  value={formData.display_name}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Internal Name</Label>
                <Input
                  placeholder="e.g., senior_stylist_template"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!!editDialog.template || isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What is this template for?"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isPending}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <RoleColorPicker 
                  value={formData.color} 
                  onChange={(color) => setFormData(prev => ({ ...prev, color }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <RoleIconPicker 
                  value={formData.icon} 
                  onChange={(icon) => setFormData(prev => ({ ...prev, icon }))} 
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Template Permissions ({formData.permission_ids.length})
              </Label>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {categoryOrder.map(category => {
                  const permissions = permissionsByCategory?.[category];
                  if (!permissions) return null;

                  const CategoryIcon = categoryIcons[category] || Settings;
                  const selectedCount = permissions.filter(p => formData.permission_ids.includes(p.id)).length;

                  return (
                    <div key={category} className="border-b last:border-b-0">
                      <div className="bg-muted/30 px-3 py-2 flex items-center gap-2 sticky top-0">
                        <CategoryIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium text-xs">{category}</span>
                        <Badge variant="secondary" className="ml-auto text-[9px]">
                          {selectedCount}/{permissions.length}
                        </Badge>
                      </div>
                      <div className="divide-y">
                        {permissions.map(permission => {
                          const isSelected = formData.permission_ids.includes(permission.id);
                          return (
                            <div 
                              key={permission.id}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 transition-colors",
                                isSelected ? "bg-background" : "bg-muted/20"
                              )}
                            >
                              <div className={cn("flex-1", !isSelected && "opacity-50")}>
                                <p className="text-xs font-medium">{permission.display_name}</p>
                              </div>
                              <Switch
                                checked={isSelected}
                                onCheckedChange={() => togglePermission(permission.id)}
                                disabled={isPending}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialog({ open: false })}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !formData.display_name.trim()}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  editDialog.template ? 'Save Changes' : 'Create Template'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.display_name}</strong>?
              This action cannot be undone. Existing roles created from this template will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  permissionsByCategory,
}: {
  template: RoleTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  permissionsByCategory?: Record<string, any[]>;
}) {
  const Icon = getIconComponent(template.icon);
  const colorClasses = getRoleColorClasses(template.color);
  const permCount = template.permission_ids?.length || 0;

  // Get permission names for preview
  const allPerms = Object.values(permissionsByCategory || {}).flat();
  const permNames = allPerms
    .filter(p => template.permission_ids?.includes(p.id))
    .map(p => p.display_name)
    .slice(0, 4);

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-muted/20 transition-colors">
      <div 
        className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
          colorClasses.bg
        )}
      >
        <Icon className={cn("w-6 h-6", colorClasses.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium">{template.display_name}</h4>
          {template.is_system && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              Built-in
            </Badge>
          )}
        </div>
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
            {template.description}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] gap-1">
            <Shield className="w-3 h-3" />
            {permCount} permissions
          </Badge>
          {permNames.map((name, i) => (
            <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
              {name}
            </Badge>
          ))}
          {permCount > 4 && (
            <span className="text-[10px] text-muted-foreground">
              +{permCount - 4} more
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          {!template.is_system && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
