import { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { PlatformButton } from '../ui/PlatformButton';
import { PlatformInput } from '../ui/PlatformInput';
import { PlatformLabel } from '../ui/PlatformLabel';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
  DialogFooter,
} from '@/components/platform/ui/PlatformDialog';
import {
  useAdminKBCategories,
  useCreateKBCategory,
  useUpdateKBCategory,
  useDeleteKBCategory,
  KBCategory,
} from '@/hooks/useKnowledgeBase';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';

const ICON_OPTIONS = [
  'BookOpen', 'Rocket', 'CreditCard', 'Users', 'BarChart3', 
  'Plug', 'HelpCircle', 'Settings', 'Shield', 'Zap',
  'FileText', 'Calendar', 'Bell', 'Star', 'Heart',
];

function getIcon(iconName: string) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    BookOpen: LucideIcons.BookOpen,
    Rocket: LucideIcons.Rocket,
    CreditCard: LucideIcons.CreditCard,
    Users: LucideIcons.Users,
    BarChart3: LucideIcons.BarChart3,
    Plug: LucideIcons.Plug,
    HelpCircle: LucideIcons.HelpCircle,
    Settings: LucideIcons.Settings,
    Shield: LucideIcons.Shield,
    Zap: LucideIcons.Zap,
    FileText: LucideIcons.FileText,
    Calendar: LucideIcons.Calendar,
    Bell: LucideIcons.Bell,
    Star: LucideIcons.Star,
    Heart: LucideIcons.Heart,
  };
  return icons[iconName] || LucideIcons.BookOpen;
}

export function KBCategoryManager() {
  const { data: categories, isLoading } = useAdminKBCategories();
  const createCategory = useCreateKBCategory();
  const updateCategory = useUpdateKBCategory();
  const deleteCategory = useDeleteKBCategory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KBCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'BookOpen',
    is_active: true,
  });

  const handleOpenNew = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: 'BookOpen',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (category: KBCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon,
      is_active: category.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      await deleteCategory.mutateAsync(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    if (editingCategory) {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        ...formData,
        slug,
      });
    } else {
      await createCategory.mutateAsync({
        ...formData,
        slug,
        display_order: (categories?.length || 0) + 1,
      });
    }
    
    setIsDialogOpen(false);
  };

  const Icon = getIcon(formData.icon);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Categories</h3>
        <PlatformButton variant="outline" size="sm" onClick={handleOpenNew}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Category
        </PlatformButton>
      </div>

      {isLoading ? (
        <div className="text-slate-500 text-sm">Loading categories...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories?.map((category) => {
            const CategoryIcon = getIcon(category.icon);
            return (
              <div
                key={category.id}
                className={cn(
                  'group flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 transition-colors hover:border-violet-500/50',
                  !category.is_active && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-2 text-slate-500">
                  <GripVertical className="h-4 w-4 cursor-grab" />
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/20">
                  <CategoryIcon className="h-4 w-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-white truncate">
                    {category.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {category.article_count || 0} articles
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlatformButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                    className="h-7 w-7 p-0"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </PlatformButton>
                  <PlatformButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </PlatformButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'New Category'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <PlatformLabel>Name</PlatformLabel>
              <PlatformInput
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Getting Started"
                required
              />
            </div>

            <div className="space-y-2">
              <PlatformLabel>Slug (auto-generated if empty)</PlatformLabel>
              <PlatformInput
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="getting-started"
              />
            </div>

            <div className="space-y-2">
              <PlatformLabel>Description</PlatformLabel>
              <PlatformInput
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Essential guides for new users"
              />
            </div>

            <div className="space-y-2">
              <PlatformLabel>Icon</PlatformLabel>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {formData.icon}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((iconName) => {
                    const OptionIcon = getIcon(iconName);
                    return (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center gap-2">
                          <OptionIcon className="h-4 w-4" />
                          {iconName}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <PlatformLabel>Active</PlatformLabel>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <DialogFooter>
              <PlatformButton type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </PlatformButton>
              <PlatformButton type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                {editingCategory ? 'Update' : 'Create'}
              </PlatformButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
