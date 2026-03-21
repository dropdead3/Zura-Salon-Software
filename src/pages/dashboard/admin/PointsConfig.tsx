import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  Gift,
  CheckSquare,
  Loader2,
  Plus,
} from 'lucide-react';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { RedemptionQueue } from '@/components/points/RedemptionQueue';
import {
  usePointsRules,
  useRewardsCatalog,
  useUpdatePointsRule,
  useCreateReward,
  useUpdateReward,
} from '@/hooks/usePoints';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PointsConfig() {
  const [activeTab, setActiveTab] = useState('rules');
  const [showNewRewardDialog, setShowNewRewardDialog] = useState(false);
  const { formatNumber } = useFormatNumber();

  const { data: rules = [], isLoading: rulesLoading } = usePointsRules();
  const { data: rewards = [], isLoading: rewardsLoading } = useRewardsCatalog(false);
  const updateRule = useUpdatePointsRule();
  const createReward = useCreateReward();
  const updateReward = useUpdateReward();

  const [newReward, setNewReward] = useState({
    name: '',
    description: '',
    points_cost: 100,
    category: 'merchandise',
    quantity_available: null as number | null,
    image_url: '',
    is_active: true,
  });

  const handleCreateReward = async () => {
    await createReward.mutateAsync(newReward);
    setShowNewRewardDialog(false);
    setNewReward({
      name: '',
      description: '',
      points_cost: 100,
      category: 'merchandise',
      quantity_available: null,
      image_url: '',
      is_active: true,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <DashboardPageHeader
          title="Points & Rewards"
          description="Configure point rules, manage rewards, and approve redemptions"
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="rules" className="gap-2">
              <Settings className="w-4 h-4" />
              Point Rules
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-2">
              <Gift className="w-4 h-4" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2">
              <CheckSquare className="w-4 h-4" />
              Approvals
            </TabsTrigger>
          </TabsList>

          {/* Point Rules Tab */}
          <TabsContent value="rules" className="mt-6">
            {rulesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <Card key={rule.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium capitalize">
                          {rule.action_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {rule.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`points-${rule.id}`} className="text-sm">
                            Points:
                          </Label>
                          <Input
                            id={`points-${rule.id}`}
                            type="number"
                            className="w-20"
                            value={rule.points_awarded}
                            onChange={(e) =>
                              updateRule.mutate({
                                ruleId: rule.id,
                                updates: { points_awarded: Number(e.target.value) },
                              })
                            }
                          />
                        </div>
                        {rule.max_daily !== null && (
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`daily-${rule.id}`}
                              className="text-sm whitespace-nowrap"
                            >
                              Daily cap:
                            </Label>
                            <Input
                              id={`daily-${rule.id}`}
                              type="number"
                              className="w-16"
                              value={rule.max_daily || ''}
                              onChange={(e) =>
                                updateRule.mutate({
                                  ruleId: rule.id,
                                  updates: { max_daily: Number(e.target.value) || null },
                                })
                              }
                            />
                          </div>
                        )}
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) =>
                            updateRule.mutate({
                              ruleId: rule.id,
                              updates: { is_active: checked },
                            })
                          }
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="mt-6">
            <div className="flex justify-end mb-4">
              <Dialog open={showNewRewardDialog} onOpenChange={setShowNewRewardDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Reward
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Reward</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={newReward.name}
                        onChange={(e) =>
                          setNewReward((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="e.g., Extra Break Time"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newReward.description}
                        onChange={(e) =>
                          setNewReward((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="What does this reward include?"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Points Cost</Label>
                        <Input
                          type="number"
                          value={newReward.points_cost}
                          onChange={(e) =>
                            setNewReward((prev) => ({
                              ...prev,
                              points_cost: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={newReward.category}
                          onValueChange={(value) =>
                            setNewReward((prev) => ({ ...prev, category: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="time_off">Time Off</SelectItem>
                            <SelectItem value="merchandise">Merchandise</SelectItem>
                            <SelectItem value="experience">Experience</SelectItem>
                            <SelectItem value="recognition">Recognition</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity (leave empty for unlimited)</Label>
                      <Input
                        type="number"
                        value={newReward.quantity_available || ''}
                        onChange={(e) =>
                          setNewReward((prev) => ({
                            ...prev,
                            quantity_available: e.target.value
                              ? Number(e.target.value)
                              : null,
                          }))
                        }
                        placeholder="Unlimited"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleCreateReward}
                      disabled={!newReward.name || createReward.isPending}
                    >
                      {createReward.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Create Reward'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {rewardsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rewards.length === 0 ? (
              <Card className="p-12 text-center">
                <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No rewards yet. Create your first reward!
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {rewards.map((reward) => (
                  <Card key={reward.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{reward.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(reward.points_cost)} pts •{' '}
                          {reward.quantity_available !== null
                            ? `${reward.quantity_available} available`
                            : 'Unlimited'}
                        </p>
                      </div>
                      <Switch
                        checked={reward.is_active}
                        onCheckedChange={(checked) =>
                          updateReward.mutate({
                            rewardId: reward.id,
                            updates: { is_active: checked },
                          })
                        }
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="mt-6">
            <RedemptionQueue />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
