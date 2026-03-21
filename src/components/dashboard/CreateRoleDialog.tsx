import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, ChevronDown, Files } from 'lucide-react';
import { RoleColorPicker } from './RoleColorPicker';
import { RoleIconPicker } from './RoleIconPicker';
import { RoleTemplateSelector } from './RoleTemplateSelector';
import { Role, useCreateRole, useUpdateRole, ROLE_CATEGORIES } from '@/hooks/useRoles';
import { RoleTemplate, useCreateRoleFromTemplate } from '@/hooks/useRoleTemplates';
import { cn } from '@/lib/utils';

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRole?: Role | null;
}

export function CreateRoleDialog({ open, onOpenChange, editRole }: CreateRoleDialogProps) {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [icon, setIcon] = useState('User');
  const [category, setCategory] = useState('other');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplate | null>(null);
  const [templateSectionOpen, setTemplateSectionOpen] = useState(true);

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const createFromTemplate = useCreateRoleFromTemplate();
  const isEditing = !!editRole;
  const isPending = createRole.isPending || updateRole.isPending || createFromTemplate.isPending;

  // Populate form when editing
  useEffect(() => {
    if (editRole) {
      setName(editRole.name);
      setDisplayName(editRole.display_name);
      setDescription(editRole.description || '');
      setColor(editRole.color);
      setIcon(editRole.icon);
      setCategory(editRole.category || 'other');
      setSelectedTemplate(null);
      setTemplateSectionOpen(false);
    } else {
      resetForm();
    }
  }, [editRole, open]);

  // When template is selected, apply its settings
  useEffect(() => {
    if (selectedTemplate && !isEditing) {
      setDescription(selectedTemplate.description || '');
      setColor(selectedTemplate.color);
      setIcon(selectedTemplate.icon);
      setCategory(selectedTemplate.category);
    }
  }, [selectedTemplate, isEditing]);

  const resetForm = () => {
    setName('');
    setDisplayName('');
    setDescription('');
    setColor('blue');
    setIcon('User');
    setCategory('other');
    setErrors({});
    setSelectedTemplate(null);
    setTemplateSectionOpen(true);
  };

  // Auto-generate name from display name
  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!isEditing) {
      // Convert to snake_case for internal name
      const generatedName = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      setName(generatedName);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Internal name is required';
    } else if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      newErrors.name = 'Must start with letter, contain only lowercase letters, numbers, and underscores';
    }

    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (isEditing && editRole) {
      await updateRole.mutateAsync({
        id: editRole.id,
        data: {
          display_name: displayName,
          description: description || undefined,
          color,
          icon,
          category,
        },
      });
    } else if (selectedTemplate) {
      // Create role from template (includes permissions)
      await createFromTemplate.mutateAsync({
        template: selectedTemplate,
        roleName: name,
        displayName,
      });
    } else {
      // Create role without template
      await createRole.mutateAsync({
        name,
        display_name: displayName,
        description: description || undefined,
        color,
        icon,
        category,
      });
    }

    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Role' : 'Create New Role'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the role details. System roles can have their display properties changed but not their internal name.'
              : 'Define a new role for your team. Choose a template to start with pre-configured permissions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Selection - Only for new roles */}
          {!isEditing && (
            <Collapsible open={templateSectionOpen} onOpenChange={setTemplateSectionOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full justify-between p-3 h-auto border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Files className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {selectedTemplate ? `Template: ${selectedTemplate.display_name}` : 'Choose Template'}
                    </span>
                    {selectedTemplate && (
                      <span className="text-xs text-muted-foreground">
                        ({selectedTemplate.permission_ids?.length || 0} permissions)
                      </span>
                    )}
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    templateSectionOpen && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="border rounded-lg p-3 bg-muted/20 max-h-64 overflow-y-auto">
                  <RoleTemplateSelector
                    selectedTemplate={selectedTemplate}
                    onSelect={(template) => {
                      setSelectedTemplate(template);
                      if (template) {
                        setTemplateSectionOpen(false);
                      }
                    }}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              placeholder="e.g., Senior Stylist"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              className={errors.displayName ? 'border-destructive' : ''}
              disabled={isPending}
            />
            {errors.displayName && (
              <p className="text-xs text-destructive">{errors.displayName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Internal Name *</Label>
            <Input
              id="name"
              placeholder="e.g., senior_stylist"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'border-destructive' : ''}
              disabled={isEditing || isPending}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Used in code and database. Cannot be changed after creation.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What can people with this role do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {ROLE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Groups roles for easier management
            </p>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <RoleColorPicker value={color} onChange={setColor} />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <RoleIconPicker value={icon} onChange={setIcon} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Save Changes' : selectedTemplate ? 'Create with Template' : 'Create Role'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
