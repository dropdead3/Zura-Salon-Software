import { useState, useMemo } from 'react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformCard } from '@/components/platform/ui/PlatformCard';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import { Slider } from '@/components/ui/slider';
import { PlatformTextarea as Textarea } from '@/components/platform/ui/PlatformTextarea';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  PlatformDialogDescription as DialogDescription,
  DialogFooter,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
} from '@/components/platform/ui/PlatformDialog';
import {
  AlertDialog,
  AlertDialogAction,
  PlatformAlertDialogCancel as AlertDialogCancel,
  PlatformAlertDialogContent as AlertDialogContent,
  PlatformAlertDialogDescription as AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  PlatformAlertDialogTitle as AlertDialogTitle,
} from '@/components/platform/ui/PlatformDialog';
import {
  Select,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
  SelectValue,
} from '@/components/platform/ui/PlatformSelect';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Flag,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Trash2,
  Pencil,
  Users,
  Shield,
  Percent,
  Loader2,
  FlaskConical,
  BarChart3,
  Layout,
  Settings,
  Zap,
} from 'lucide-react';
import {
  useFeatureFlags,
  useCreateFeatureFlag,
  useUpdateFeatureFlag,
  useDeleteFeatureFlag,
  useToggleFeatureFlag,
  FeatureFlag,
} from '@/hooks/useFeatureFlags';
import { useRoles } from '@/hooks/useRoles';
import { cn } from '@/lib/utils';
import { PageExplainer } from '@/components/ui/PageExplainer';

const CATEGORY_CONFIG: Record<string, { icon: typeof Flag; label: string; color: string }> = {
  ui: { icon: Layout, label: 'UI/UX', color: 'text-violet-400' },
  analytics: { icon: BarChart3, label: 'Analytics', color: 'text-blue-400' },
  experimental: { icon: FlaskConical, label: 'Experimental', color: 'text-amber-400' },
  performance: { icon: Zap, label: 'Performance', color: 'text-emerald-400' },
  general: { icon: Settings, label: 'General', color: 'text-slate-400' },
};

interface FlagFormData {
  flag_key: string;
  flag_name: string;
  description: string;
  category: string;
  is_enabled: boolean;
  enabled_for_roles: string[];
  percentage_rollout: number;
}

const defaultFormData: FlagFormData = {
  flag_key: '',
  flag_name: '',
  description: '',
  category: 'general',
  is_enabled: false,
  enabled_for_roles: [],
  percentage_rollout: 100,
};

function FlagRow({
  flag,
  onEdit,
  onDelete,
  onToggle,
}: {
  flag: FeatureFlag;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-slate-200">{flag.flag_name}</span>
          {flag.percentage_rollout < 100 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-500/50 text-violet-400">
              <Percent className="w-2.5 h-2.5 mr-0.5" />
              {flag.percentage_rollout}%
            </Badge>
          )}
          {flag.enabled_for_roles.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/50 text-blue-400">
              <Shield className="w-2.5 h-2.5 mr-0.5" />
              {flag.enabled_for_roles.length} roles
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 font-mono">{flag.flag_key}</p>
        {flag.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{flag.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3 ml-4">
        <PlatformButton variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
          <Pencil className="w-4 h-4" />
        </PlatformButton>
        <PlatformButton variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-red-400 hover:text-red-300">
          <Trash2 className="w-4 h-4" />
        </PlatformButton>
        <Switch
          checked={flag.is_enabled}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
}

export default function PlatformFeatureFlags() {
  const { data: flags = [], isLoading } = useFeatureFlags();
  const { data: roles = [] } = useRoles();
  const createFlag = useCreateFeatureFlag();
  const updateFlag = useUpdateFeatureFlag();
  const deleteFlag = useDeleteFeatureFlag();
  const toggleFlag = useToggleFeatureFlag();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [deletingFlag, setDeletingFlag] = useState<FeatureFlag | null>(null);
  const [formData, setFormData] = useState<FlagFormData>(defaultFormData);

  // Group flags by category
  const groupedFlags = useMemo(() => {
    const filtered = flags.filter(flag => {
      const matchesSearch = 
        flag.flag_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.flag_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (flag.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || flag.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return filtered.reduce((acc, flag) => {
      const category = flag.category || 'general';
      if (!acc[category]) acc[category] = [];
      acc[category].push(flag);
      return acc;
    }, {} as Record<string, FeatureFlag[]>);
  }, [flags, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const cats = [...new Set(flags.map(f => f.category || 'general'))];
    return cats.sort();
  }, [flags]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleCreate = () => {
    setFormData(defaultFormData);
    setEditingFlag(null);
    setShowCreateDialog(true);
  };

  const handleEdit = (flag: FeatureFlag) => {
    setFormData({
      flag_key: flag.flag_key,
      flag_name: flag.flag_name,
      description: flag.description || '',
      category: flag.category,
      is_enabled: flag.is_enabled,
      enabled_for_roles: flag.enabled_for_roles,
      percentage_rollout: flag.percentage_rollout,
    });
    setEditingFlag(flag);
    setShowCreateDialog(true);
  };

  const handleSubmit = async () => {
    if (editingFlag) {
      await updateFlag.mutateAsync({
        id: editingFlag.id,
        updates: formData,
      });
    } else {
      await createFlag.mutateAsync({
        ...formData,
        enabled_for_users: [],
      });
    }
    setShowCreateDialog(false);
    setEditingFlag(null);
    setFormData(defaultFormData);
  };

  const handleDelete = async () => {
    if (deletingFlag) {
      await deleteFlag.mutateAsync(deletingFlag.id);
      setDeletingFlag(null);
    }
  };

  const getCategoryConfig = (category: string) => {
    return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
  };

  // Stats
  const enabledCount = flags.filter(f => f.is_enabled).length;
  const experimentalCount = flags.filter(f => f.category === 'experimental').length;

  return (
    <PlatformPageContainer>
      <PlatformPageHeader
        title="Feature Flags"
        description="Control feature rollouts and experiments across all organizations"
        actions={
          <PlatformButton onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
        <PageExplainer pageId="platform-feature-flags" />
            New Flag
          </PlatformButton>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 mb-8">
        <PlatformCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Flag className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-medium text-slate-100">{flags.length}</p>
              <p className="text-xs text-slate-500">Total Flags</p>
            </div>
          </div>
        </PlatformCard>
        <PlatformCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-medium text-slate-100">{enabledCount}</p>
              <p className="text-xs text-slate-500">Enabled</p>
            </div>
          </div>
        </PlatformCard>
        <PlatformCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <FlaskConical className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-medium text-slate-100">{experimentalCount}</p>
              <p className="text-xs text-slate-500">Experimental</p>
            </div>
          </div>
        </PlatformCard>
        <PlatformCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-medium text-slate-100">{categories.length}</p>
              <p className="text-xs text-slate-500">Categories</p>
            </div>
          </div>
        </PlatformCard>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <PlatformInput
            placeholder="Search flags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-slate-200">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => {
              const config = getCategoryConfig(cat);
              return (
                <SelectItem key={cat} value={cat}>
                  {config.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Flags List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : Object.keys(groupedFlags).length === 0 ? (
        <PlatformCard className="p-12 text-center">
          <Flag className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">
            {searchQuery ? 'No flags match your search' : 'No feature flags yet'}
          </p>
          {!searchQuery && (
            <PlatformButton onClick={handleCreate} variant="outline" className="mt-4">
              Create your first flag
            </PlatformButton>
          )}
        </PlatformCard>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedFlags).map(([category, categoryFlags]) => {
            const config = getCategoryConfig(category);
            const CategoryIcon = config.icon;
            const isExpanded = expandedCategories.includes(category);

            return (
              <Collapsible
                key={category}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <PlatformCard>
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <CategoryIcon className={cn("w-5 h-5", config.color)} />
                      <span className="font-medium text-sm text-slate-200">
                        {config.label}
                      </span>
                      <Badge variant="secondary" className="text-xs bg-slate-700/50 text-slate-300">
                        {categoryFlags.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-slate-700/50 divide-y divide-slate-700/50">
                      {categoryFlags.map(flag => (
                        <FlagRow
                          key={flag.id}
                          flag={flag}
                          onEdit={() => handleEdit(flag)}
                          onDelete={() => setDeletingFlag(flag)}
                          onToggle={(enabled) => toggleFlag.mutate({ id: flag.id, is_enabled: enabled })}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </PlatformCard>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingFlag ? 'Edit Feature Flag' : 'Create Feature Flag'}
            </DialogTitle>
            <DialogDescription>
              {editingFlag
                ? 'Update the feature flag settings'
                : 'Create a new feature flag to control feature rollouts'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flag_key">Flag Key</Label>
              <Input
                id="flag_key"
                placeholder="my_new_feature"
                value={formData.flag_key}
                onChange={(e) => setFormData(prev => ({ ...prev, flag_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                disabled={!!editingFlag}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier used in code. Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flag_name">Display Name</Label>
              <Input
                id="flag_name"
                placeholder="My New Feature"
                value={formData.flag_name}
                onChange={(e) => setFormData(prev => ({ ...prev, flag_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this feature do?"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Percentage Rollout</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[formData.percentage_rollout]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, percentage_rollout: value }))}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {formData.percentage_rollout}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, only this percentage of users will see the feature.
              </p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="is_enabled">Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Turn this feature on globally
                </p>
              </div>
              <Switch
                id="is_enabled"
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <PlatformButton variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </PlatformButton>
            <PlatformButton
              onClick={handleSubmit}
              disabled={!formData.flag_key || !formData.flag_name || createFlag.isPending || updateFlag.isPending}
            >
              {createFlag.isPending || updateFlag.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingFlag ? 'Save Changes' : 'Create Flag'}
            </PlatformButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFlag} onOpenChange={() => setDeletingFlag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Flag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the flag "{deletingFlag?.flag_name}"? 
              This action cannot be undone and may affect functionality for users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFlag.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete Flag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PlatformPageContainer>
  );
}
