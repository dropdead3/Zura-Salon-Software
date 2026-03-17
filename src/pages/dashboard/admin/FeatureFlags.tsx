import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/alert-dialog';
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

const CATEGORY_CONFIG: Record<string, { icon: typeof Flag; label: string; color: string }> = {
  ui: { icon: Layout, label: 'UI/UX', color: 'text-primary' },
  analytics: { icon: BarChart3, label: 'Analytics', color: 'text-accent-foreground' },
  experimental: { icon: FlaskConical, label: 'Experimental', color: 'text-secondary-foreground' },
  performance: { icon: Zap, label: 'Performance', color: 'text-primary' },
  general: { icon: Settings, label: 'General', color: 'text-muted-foreground' },
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

export default function FeatureFlags() {
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
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <DashboardPageHeader
          title="Feature Flags"
          description="Control feature rollouts and experiments"
          className="mb-8"
          actions={
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              New Flag
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Flag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display">{flags.length}</p>
                <p className="text-xs text-muted-foreground">Total Flags</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Zap className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display">{enabledCount}</p>
                <p className="text-xs text-muted-foreground">Enabled</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <FlaskConical className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display">{experimentalCount}</p>
                <p className="text-xs text-muted-foreground">Experimental</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display">{categories.length}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search flags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
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
          <DashboardLoader className="py-20" />
        ) : Object.keys(groupedFlags).length === 0 ? (
          <Card className="p-12 text-center">
            <Flag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground font-sans">
              {searchQuery ? 'No flags match your search' : 'No feature flags yet'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreate} variant="outline" className="mt-4">
                Create your first flag
              </Button>
            )}
          </Card>
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
                  <Card>
                    <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <CategoryIcon className={`w-5 h-5 ${config.color}`} />
                        <span className="font-display text-sm tracking-wide">
                          {config.label.toUpperCase()}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {categoryFlags.length}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t divide-y">
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
                  </Card>
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
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.flag_key || !formData.flag_name || createFlag.isPending || updateFlag.isPending}
              >
                {createFlag.isPending || updateFlag.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingFlag ? 'Save Changes' : 'Create Flag'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingFlag} onOpenChange={() => setDeletingFlag(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Feature Flag</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingFlag?.flag_name}"? This will remove the flag and may break functionality that depends on it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

interface FlagRowProps {
  flag: FeatureFlag;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
}

function FlagRow({ flag, onEdit, onDelete, onToggle }: FlagRowProps) {
  return (
    <div className="p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{flag.flag_name}</span>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {flag.flag_key}
          </code>
        </div>
        {flag.description && (
          <p className="text-sm text-muted-foreground truncate">
            {flag.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {flag.percentage_rollout < 100 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Percent className="w-3 h-3" />
              {flag.percentage_rollout}%
            </Badge>
          )}
          {flag.enabled_for_roles.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Shield className="w-3 h-3" />
              {flag.enabled_for_roles.length} roles
            </Badge>
          )}
          {flag.enabled_for_users.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Users className="w-3 h-3" />
              {flag.enabled_for_users.length} users
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={flag.is_enabled}
          onCheckedChange={onToggle}
        />
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
