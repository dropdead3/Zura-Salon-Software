import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Crown, Loader2, X, Sparkles } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { 
  useLoyaltyTiers, 
  useCreateLoyaltyTier, 
  useUpdateLoyaltyTier, 
  useDeleteLoyaltyTier,
  useInitializeDefaultTiers,
  LoyaltyTier 
} from '@/hooks/useLoyaltyTiers';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface LoyaltyTiersEditorProps {
  organizationId?: string;
}

export function LoyaltyTiersEditor({ organizationId }: LoyaltyTiersEditorProps) {
  const { data: tiers = [], isLoading } = useLoyaltyTiers(organizationId);
  const createTier = useCreateLoyaltyTier();
  const updateTier = useUpdateLoyaltyTier();
  const deleteTier = useDeleteLoyaltyTier();
  const initializeTiers = useInitializeDefaultTiers();

  const [editingPerk, setEditingPerk] = useState<{ tierId: string; index: number } | null>(null);
  const [newPerk, setNewPerk] = useState('');

  const handleAddTier = async () => {
    if (!organizationId) return;
    await createTier.mutateAsync({
      organization_id: organizationId,
      tier_name: 'New Tier',
      tier_key: `tier_${Date.now()}`,
      minimum_lifetime_points: 0,
      points_multiplier: 1.0,
      perks: [],
      sort_order: tiers.length,
      color: '#888888',
      icon: 'star',
    });
  };

  const handleUpdateTier = async (id: string, updates: Partial<LoyaltyTier>) => {
    await updateTier.mutateAsync({ id, updates });
  };

  const handleAddPerk = async (tier: LoyaltyTier) => {
    if (!newPerk.trim()) return;
    const updatedPerks = [...(tier.perks || []), newPerk.trim()];
    await handleUpdateTier(tier.id, { perks: updatedPerks });
    setNewPerk('');
  };

  const handleRemovePerk = async (tier: LoyaltyTier, perkIndex: number) => {
    const updatedPerks = tier.perks.filter((_, i) => i !== perkIndex);
    await handleUpdateTier(tier.id, { perks: updatedPerks });
  };

  const handleInitializeDefaults = async () => {
    if (!organizationId) return;
    await initializeTiers.mutateAsync(organizationId);
  };

  if (isLoading) {
    return <DashboardLoader size="md" className="py-12" />;
  }

  if (tiers.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Crown className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">No Reward Tiers</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Create reward tiers to incentivize client loyalty with exclusive perks and bonus point multipliers.
          </p>
          <div className="flex gap-3">
            <Button onClick={handleInitializeDefaults} disabled={initializeTiers.isPending}>
              {initializeTiers.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Create Default Tiers
            </Button>
            <Button variant="outline" onClick={handleAddTier}>
              <Plus className="h-4 w-4 mr-2" />
              Custom Tier
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Configure reward tiers for your loyalty program
        </p>
        <Button size={tokens.button.card} onClick={handleAddTier}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tier
        </Button>
      </div>

      <div className="space-y-4">
        {tiers.map((tier) => (
          <Card key={tier.id} className="overflow-hidden">
            <div 
              className="h-2" 
              style={{ backgroundColor: tier.color }}
            />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: tier.color + '20' }}
                  >
                    <Crown className="h-5 w-5" style={{ color: tier.color }} />
                  </div>
                  <div>
                    <Input
                      value={tier.tier_name}
                      onChange={(e) => handleUpdateTier(tier.id, { tier_name: e.target.value })}
                      className="h-8 font-medium border-none p-0 text-lg focus-visible:ring-0"
                    />
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteTier.mutateAsync(tier.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Min Lifetime Points</Label>
                  <Input
                    type="number"
                    value={tier.minimum_lifetime_points}
                    onChange={(e) => handleUpdateTier(tier.id, { 
                      minimum_lifetime_points: parseInt(e.target.value) || 0 
                    })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Points Multiplier</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={tier.points_multiplier}
                      onChange={(e) => handleUpdateTier(tier.id, { 
                        points_multiplier: parseFloat(e.target.value) || 1 
                      })}
                      className="h-9"
                    />
                    <span className="text-sm text-muted-foreground">×</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={tier.color}
                      onChange={(e) => handleUpdateTier(tier.id, { color: e.target.value })}
                      className="h-9 w-12 p-1 cursor-pointer"
                    />
                    <Input
                      value={tier.color}
                      onChange={(e) => handleUpdateTier(tier.id, { color: e.target.value })}
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Perks</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tier.perks?.map((perk, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {perk}
                      <button
                        onClick={() => handleRemovePerk(tier, index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <div className="flex gap-1">
                    <Input
                      placeholder="Add perk..."
                      value={editingPerk?.tierId === tier.id ? newPerk : ''}
                      onChange={(e) => {
                        setEditingPerk({ tierId: tier.id, index: -1 });
                        setNewPerk(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPerk(tier);
                        }
                      }}
                      className="h-7 w-40 text-xs"
                    />
                    <Button 
                      size={tokens.button.inline} 
                      variant="ghost" 
                      className="h-7 px-2"
                      onClick={() => handleAddPerk(tier)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
