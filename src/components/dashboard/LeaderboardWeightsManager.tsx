import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Save, RotateCcw, Info } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isStructurallyEqual } from '@/lib/stableStringify';

interface WeightConfig {
  id: string;
  new_clients_weight: number;
  retention_weight: number;
  retail_weight: number;
  extensions_weight: number;
}

const DEFAULT_WEIGHTS = {
  new_clients_weight: 0.30,
  retention_weight: 0.25,
  retail_weight: 0.20,
  extensions_weight: 0.25,
};

export function LeaderboardWeightsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [initialWeights, setInitialWeights] = useState(DEFAULT_WEIGHTS);

  useEffect(() => {
    fetchWeights();
  }, []);

  const fetchWeights = async () => {
    const { data, error } = await supabase
      .from('leaderboard_weights')
      .select('*')
      .limit(1)
      .single();

    if (!error && data) {
      const config: WeightConfig = data as WeightConfig;
      setConfigId(config.id);
      const loadedWeights = {
        new_clients_weight: Number(config.new_clients_weight),
        retention_weight: Number(config.retention_weight),
        retail_weight: Number(config.retail_weight),
        extensions_weight: Number(config.extensions_weight),
      };
      setWeights(loadedWeights);
      setInitialWeights(loadedWeights);
    }
    setLoading(false);
  };

  const totalWeight = 
    weights.new_clients_weight + 
    weights.retention_weight + 
    weights.retail_weight + 
    weights.extensions_weight;

  const isValid = Math.abs(totalWeight - 1) < 0.01; // Allow small floating point errors
  const hasChanges = !isStructurallyEqual(weights, initialWeights);

  const handleSave = async () => {
    if (!isValid) {
      toast({
        variant: 'destructive',
        title: 'Invalid Weights',
        description: 'Weights must add up to 100%.',
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('leaderboard_weights')
      .update({
        ...weights,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      })
      .eq('id', configId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      setInitialWeights(weights);
      toast({
        title: 'Weights Updated',
        description: 'Leaderboard scoring algorithm has been updated.',
      });
    }

    setSaving(false);
  };

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  const updateWeight = (key: keyof typeof weights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <DashboardLoader size="md" className="py-8" />;
  }

  const weightItems = [
    { key: 'new_clients_weight' as const, label: 'New Clients', description: 'Weight for new client acquisition' },
    { key: 'retention_weight' as const, label: 'Retention', description: 'Weight for client return rate' },
    { key: 'retail_weight' as const, label: 'Retail Sales', description: 'Weight for product sales' },
    { key: 'extensions_weight' as const, label: 'Extensions', description: 'Weight for extension services' },
  ];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground font-sans">
          <p>
            Configure the weights used to calculate the Overall Score on the leaderboard.
            Each metric contributes to the final score based on its weight percentage.
          </p>
          <p className="mt-2 font-medium">
            Weights must add up to exactly 100%.
          </p>
        </div>
      </div>

      {/* Weight Sliders */}
      <div className="space-y-6">
        {weightItems.map(({ key, label, description }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <span className="font-display text-lg tabular-nums">
                {Math.round(weights[key] * 100)}%
              </span>
            </div>
            <Slider
              value={[weights[key] * 100]}
              onValueChange={([v]) => updateWeight(key, v / 100)}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        ))}
      </div>

      {/* Total Display */}
      <Card className={`p-4 ${isValid ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
        <div className="flex items-center justify-between">
          <span className="font-sans font-medium">Total Weight</span>
          <span className={`font-display text-2xl ${isValid ? 'text-primary' : 'text-destructive'}`}>
            {Math.round(totalWeight * 100)}%
          </span>
        </div>
        {!isValid && (
          <p className="text-xs text-destructive mt-2">
            Weights must equal 100%. Adjust the sliders above.
          </p>
        )}
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleReset}
          className="font-display text-xs"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          RESET TO DEFAULTS
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isValid || saving || !hasChanges}
          className="font-display text-xs ml-auto"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          SAVE WEIGHTS
        </Button>
      </div>
    </div>
  );
}
