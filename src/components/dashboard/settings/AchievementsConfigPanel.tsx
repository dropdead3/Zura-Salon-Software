import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2, Pencil, Trophy, Award, Target, Flame, Star, Zap, Crown, Medal } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  badge_color: string | null;
  category: string | null;
  requirement_type: string | null;
  requirement_value: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

// Badge color presets
const BADGE_COLORS = [
  '#EAB308', // Gold
  '#F59E0B', // Amber
  '#F97316', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
  '#D946EF', // Fuchsia
  '#A855F7', // Purple
  '#8B5CF6', // Violet
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#0EA5E9', // Sky
  '#14B8A6', // Teal
  '#10B981', // Emerald
  '#22C55E', // Green
  '#6B7280', // Gray
];

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  award: Award,
  target: Target,
  flame: Flame,
  star: Star,
  zap: Zap,
  crown: Crown,
  medal: Medal,
};

function getIconComponent(iconName: string | null) {
  if (!iconName) return Trophy;
  return ICON_MAP[iconName.toLowerCase()] || Trophy;
}

export function AchievementsConfigPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    badge_color: '',
    requirement_value: 0,
  });

  const { data: achievements, isLoading } = useQuery({
    queryKey: ['leaderboard-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard_achievements')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as unknown as Achievement[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('leaderboard_achievements')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard-achievements'] });
      toast({
        title: 'Achievement Updated',
        description: 'The achievement status has been updated.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Achievement> }) => {
      const { error } = await supabase
        .from('leaderboard_achievements')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard-achievements'] });
      setEditingAchievement(null);
      toast({
        title: 'Achievement Updated',
        description: 'The achievement has been saved.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setEditForm({
      name: achievement.name,
      description: achievement.description || '',
      badge_color: achievement.badge_color || '#EAB308',
      requirement_value: achievement.requirement_value || 0,
    });
  };

  const handleSaveEdit = () => {
    if (!editingAchievement) return;

    updateMutation.mutate({
      id: editingAchievement.id,
      updates: {
        name: editForm.name,
        description: editForm.description || null,
        badge_color: editForm.badge_color,
        requirement_value: editForm.requirement_value,
      },
    });
  };

  // Group achievements by category
  const groupedAchievements = achievements?.reduce((acc, achievement) => {
    const category = achievement.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  if (isLoading) {
    return <DashboardLoader size="md" className="py-12" />;
  }

  if (!achievements || achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">ACHIEVEMENT DEFINITIONS</CardTitle>
          <CardDescription>No achievements have been configured yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Achievements will appear here once they are added to the database.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">ACHIEVEMENT DEFINITIONS</CardTitle>
          <CardDescription>
            Manage which achievements can be earned and customize their appearance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedAchievements || {}).map(([category, categoryAchievements]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground font-display uppercase tracking-wider">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryAchievements.map((achievement) => {
                  const IconComponent = getIconComponent(achievement.icon);
                  const badgeColor = achievement.badge_color || '#EAB308';

                  return (
                    <div
                      key={achievement.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border transition-colors",
                        achievement.is_active 
                          ? "bg-muted/30" 
                          : "bg-muted/10 opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${badgeColor}20` }}
                        >
                          <IconComponent 
                            className="w-5 h-5" 
                            style={{ color: badgeColor }} 
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{achievement.name}</span>
                            {!achievement.is_active && (
                              <Badge variant="outline" className="text-[10px]">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {achievement.description || 'No description'}
                          </p>
                          {achievement.requirement_type && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Requirement: {achievement.requirement_type} ≥ {achievement.requirement_value}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size={tokens.button.inline}
                          onClick={() => handleEdit(achievement)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Switch
                          checked={achievement.is_active ?? true}
                          onCheckedChange={(checked) => 
                            toggleMutation.mutate({ id: achievement.id, is_active: checked })
                          }
                          disabled={toggleMutation.isPending}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingAchievement} onOpenChange={(open) => !open && setEditingAchievement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Achievement</DialogTitle>
            <DialogDescription>
              Customize the achievement's display name, description, and badge color.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Requirement Value</Label>
              <Input
                type="number"
                value={editForm.requirement_value}
                onChange={(e) => setEditForm({ ...editForm, requirement_value: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                The threshold value needed to earn this achievement
              </p>
            </div>

            <div className="space-y-2">
              <Label>Badge Color</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted transition-colors"
                  >
                    <div
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: editForm.badge_color }}
                    />
                    <span className="text-sm">{editForm.badge_color}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="grid grid-cols-5 gap-1.5">
                    {BADGE_COLORS.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all hover:scale-110",
                          editForm.badge_color === color && "ring-2 ring-offset-2 ring-primary"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditForm({ ...editForm, badge_color: color })}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAchievement(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
