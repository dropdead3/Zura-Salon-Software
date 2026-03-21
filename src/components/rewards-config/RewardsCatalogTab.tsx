import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Plus, ChevronDown, Search, Loader2, Package } from 'lucide-react';
import { useRewardsCatalog, useCreateReward, useUpdateReward } from '@/hooks/usePoints';
import { RewardConfigCard } from './RewardConfigCard';
import { RewardFormDialog } from './RewardFormDialog';
import { DEFAULT_REWARD_TEMPLATES, REWARD_CATEGORIES } from './DefaultRewardTemplates';
import type { Reward } from '@/services/pointsService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function RewardsCatalogTab() {
  const { data: rewards = [], isLoading, refetch } = useRewardsCatalog(false);
  const createReward = useCreateReward();
  const updateReward = useUpdateReward();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter rewards
  const filteredRewards = rewards.filter(reward => {
    const matchesSearch = !searchQuery || 
      reward.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reward.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || reward.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedRewards = REWARD_CATEGORIES.reduce((acc, category) => {
    const categoryRewards = filteredRewards.filter(r => r.category === category.value);
    if (categoryRewards.length > 0) {
      acc[category.value] = categoryRewards;
    }
    return acc;
  }, {} as Record<string, typeof filteredRewards>);

  // Also include rewards with no category
  const uncategorizedRewards = filteredRewards.filter(
    r => !r.category || !REWARD_CATEGORIES.some(c => c.value === r.category)
  );
  if (uncategorizedRewards.length > 0) {
    groupedRewards['uncategorized'] = uncategorizedRewards;
  }

  const handleAddFromTemplate = async (template: typeof DEFAULT_REWARD_TEMPLATES[0]) => {
    try {
      await createReward.mutateAsync({
        name: template.name,
        description: template.description,
        category: template.category,
        points_cost: template.points_cost,
        icon: template.icon,
        is_featured: template.is_featured || false,
        is_active: true,
        quantity_available: null,
        image_url: null,
      });
      toast.success(`Added "${template.name}" to catalog`);
    } catch (error) {
      toast.error('Failed to add reward from template');
    }
  };

  const handleAddAllTemplates = async () => {
    let added = 0;
    for (const template of DEFAULT_REWARD_TEMPLATES) {
      try {
        await createReward.mutateAsync({
          name: template.name,
          description: template.description,
          category: template.category,
          points_cost: template.points_cost,
          icon: template.icon,
          is_featured: template.is_featured || false,
          is_active: true,
          quantity_available: null,
          image_url: null,
        });
        added++;
      } catch (error) {
        console.error('Failed to add template:', template.name);
      }
    }
    toast.success(`Added ${added} rewards from templates`);
  };

  const handleEdit = (reward: Reward) => {
    setSelectedReward(reward);
    setFormOpen(true);
  };

  const handleDuplicate = async (reward: Reward) => {
    try {
      await createReward.mutateAsync({
        name: `${reward.name} (Copy)`,
        description: reward.description,
        category: reward.category,
        points_cost: reward.points_cost,
        icon: (reward as any).icon || 'gift',
        is_featured: false,
        is_active: false,
        quantity_available: reward.quantity_available,
        image_url: reward.image_url,
      });
      toast.success('Reward duplicated');
    } catch (error) {
      toast.error('Failed to duplicate reward');
    }
  };

  const handleDelete = (reward: Reward) => {
    setRewardToDelete(reward);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!rewardToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('rewards_catalog')
        .delete()
        .eq('id', rewardToDelete.id);

      if (error) throw error;
      
      toast.success('Reward deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete reward');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setRewardToDelete(null);
    }
  };

  const handleToggleActive = async (reward: Reward, isActive: boolean) => {
    try {
      await updateReward.mutateAsync({
        rewardId: reward.id,
        updates: { is_active: isActive },
      });
    } catch (error) {
      toast.error('Failed to update reward');
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (selectedReward) {
        await updateReward.mutateAsync({
          rewardId: selectedReward.id,
          updates: data,
        });
        toast.success('Reward updated');
      } else {
        await createReward.mutateAsync(data);
        toast.success('Reward created');
      }
      setFormOpen(false);
      setSelectedReward(null);
    } catch (error) {
      toast.error(selectedReward ? 'Failed to update reward' : 'Failed to create reward');
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedReward(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Reward
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              Use Template
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
            <DropdownMenuItem onClick={handleAddAllTemplates}>
              <Package className="w-4 h-4 mr-2" />
              Add All Templates
            </DropdownMenuItem>
            <div className="h-px bg-border my-1" />
            {REWARD_CATEGORIES.map((category) => (
              <div key={category.value}>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase">
                  {category.label}
                </div>
                {DEFAULT_REWARD_TEMPLATES
                  .filter(t => t.category === category.value)
                  .map((template) => (
                    <DropdownMenuItem 
                      key={template.name}
                      onClick={() => handleAddFromTemplate(template)}
                    >
                      <span className="truncate">{template.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {template.points_cost} pts
                      </span>
                    </DropdownMenuItem>
                  ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {categoryFilter 
                ? REWARD_CATEGORIES.find(c => c.value === categoryFilter)?.label 
                : 'All Categories'}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setCategoryFilter(null)}>
              All Categories
            </DropdownMenuItem>
            {REWARD_CATEGORIES.map((category) => (
              <DropdownMenuItem 
                key={category.value}
                onClick={() => setCategoryFilter(category.value)}
              >
                {category.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rewards..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredRewards.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display text-lg mb-2">NO REWARDS YET</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create your first reward or use templates to get started quickly.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Reward
            </Button>
            <Button variant="outline" onClick={handleAddAllTemplates}>
              Use All Templates
            </Button>
          </div>
        </div>
      )}

      {/* Grouped Rewards */}
      {Object.entries(groupedRewards).map(([categoryValue, categoryRewards]) => {
        const category = REWARD_CATEGORIES.find(c => c.value === categoryValue);
        
        return (
          <div key={categoryValue} className="space-y-3">
            <h3 
              className="font-display text-xs uppercase tracking-wider pb-2 border-b"
              style={{ color: category?.color }}
            >
              {category?.label || 'Other'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categoryRewards.map((reward) => (
                <RewardConfigCard
                  key={reward.id}
                  reward={reward as Reward & { icon?: string; is_featured?: boolean }}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Form Dialog */}
      <RewardFormDialog
        open={formOpen}
        onOpenChange={handleCloseForm}
        reward={selectedReward as any}
        onSubmit={handleFormSubmit}
        isLoading={createReward.isPending || updateReward.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reward</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{rewardToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
