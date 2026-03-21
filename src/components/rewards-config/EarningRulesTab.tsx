import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { usePointsRules, useUpdatePointsRule } from '@/hooks/usePoints';
import { toast } from 'sonner';
import type { PointsRule } from '@/services/pointsService';

const ACTION_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  training_complete: { 
    label: 'Training Completion', 
    description: 'Points for completing training modules' 
  },
  bell_ring: { 
    label: 'Ring the Bell', 
    description: 'Points for ringing the celebration bell' 
  },
  shift_swap_complete: { 
    label: 'Shift Swap', 
    description: 'Points for completing shift swaps' 
  },
  daily_checkin: { 
    label: 'Daily Check-in', 
    description: 'Points for daily check-ins' 
  },
  weekly_win: { 
    label: 'Weekly Win', 
    description: 'Points for submitting weekly wins' 
  },
  positive_review: { 
    label: 'Positive Review', 
    description: 'Points for receiving positive client reviews' 
  },
  retail_sale: { 
    label: 'Retail Sale', 
    description: 'Points for making retail sales' 
  },
  new_client: { 
    label: 'New Client', 
    description: 'Points for bringing in new clients' 
  },
  mentor_session: { 
    label: 'Mentor Session', 
    description: 'Points for completing mentor sessions' 
  },
  team_goal_hit: { 
    label: 'Team Goal', 
    description: 'Points when team goals are achieved' 
  },
};

interface RuleEditorProps {
  rule: PointsRule;
  onSave: (updates: Partial<PointsRule>) => Promise<void>;
  isSaving: boolean;
}

function RuleEditor({ rule, onSave, isSaving }: RuleEditorProps) {
  const [points, setPoints] = useState(rule.points_awarded);
  const [maxDaily, setMaxDaily] = useState(rule.max_daily ?? '');
  const [isActive, setIsActive] = useState(rule.is_active);
  
  const hasChanges = 
    points !== rule.points_awarded ||
    (maxDaily === '' ? null : Number(maxDaily)) !== rule.max_daily ||
    isActive !== rule.is_active;

  const actionInfo = ACTION_TYPE_LABELS[rule.action_type] || {
    label: rule.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: rule.description || '',
  };

  const handleSave = async () => {
    await onSave({
      points_awarded: points,
      max_daily: maxDaily === '' ? null : Number(maxDaily),
      is_active: isActive,
    });
  };

  return (
    <Card className={!isActive ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm">{actionInfo.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {points} pts
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {actionInfo.description}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20">
                <Label className="text-xs text-muted-foreground">Points</Label>
                <Input
                  type="number"
                  min={0}
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              
              <div className="w-20">
                <Label className="text-xs text-muted-foreground">Daily Cap</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxDaily}
                  onChange={(e) => setMaxDaily(e.target.value)}
                  placeholder="∞"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Label className="text-xs text-muted-foreground">Active</Label>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            {hasChanges && (
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1"
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Save
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EarningRulesTab() {
  const { data: rules = [], isLoading } = usePointsRules();
  const updateRule = useUpdatePointsRule();
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);

  const handleSaveRule = async (ruleId: string, updates: Partial<PointsRule>) => {
    setSavingRuleId(ruleId);
    try {
      await updateRule.mutateAsync({ ruleId, updates });
      toast.success('Rule updated');
    } catch (error) {
      toast.error('Failed to update rule');
    } finally {
      setSavingRuleId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Get all rules including inactive ones
  const allRules = rules;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="font-display text-lg">POINT EARNING RULES</CardTitle>
          </div>
          <CardDescription>
            Configure how team members earn points for different actions. 
            Set daily caps to prevent abuse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {allRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No earning rules configured. Contact support to set up point rules.
            </div>
          ) : (
            allRules.map((rule) => (
              <RuleEditor
                key={rule.id}
                rule={rule}
                onSave={(updates) => handleSaveRule(rule.id, updates)}
                isSaving={savingRuleId === rule.id}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Points Economy Tips</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• Keep point values relative to effort required</li>
                <li>• Use daily caps to prevent gaming the system</li>
                <li>• Balance earning rates with reward costs</li>
                <li>• Consider seasonal bonuses for special events</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
