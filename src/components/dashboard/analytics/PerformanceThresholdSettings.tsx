import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { usePerformanceThreshold, useUpdatePerformanceThreshold, PerformanceThreshold } from '@/hooks/usePerformanceThreshold';
import { Loader2, AlertTriangle } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

interface PerformanceThresholdSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PerformanceThresholdSettings({ open, onOpenChange }: PerformanceThresholdSettingsProps) {
  const { data: threshold, isLoading } = usePerformanceThreshold();
  const updateThreshold = useUpdatePerformanceThreshold();
  
  const [minimumRevenue, setMinimumRevenue] = useState(3000);
  const [evaluationPeriodDays, setEvaluationPeriodDays] = useState<30 | 60 | 90>(30);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  
  useEffect(() => {
    if (threshold) {
      setMinimumRevenue(threshold.minimumRevenue);
      setEvaluationPeriodDays(threshold.evaluationPeriodDays);
      setAlertsEnabled(threshold.alertsEnabled);
    }
  }, [threshold]);
  
  const handleSave = async () => {
    try {
      await updateThreshold.mutateAsync({
        minimumRevenue,
        evaluationPeriodDays,
        alertsEnabled,
      });
      toast.success('Performance threshold settings saved');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-chart-3" />
            Performance Threshold Settings
          </DialogTitle>
          <DialogDescription>
            Configure minimum revenue targets and alert thresholds for staff performance monitoring.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <DashboardLoader size="md" className="py-8" />
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="minimumRevenue">Minimum Revenue Target</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="minimumRevenue"
                  type="number"
                  value={minimumRevenue}
                  onChange={(e) => setMinimumRevenue(Number(e.target.value))}
                  className="pl-7"
                  min={0}
                  step={100}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Staff earning below this amount will be flagged as underperforming
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="evaluationPeriod">Evaluation Period</Label>
              <Select
                value={String(evaluationPeriodDays)}
                onValueChange={(v) => setEvaluationPeriodDays(Number(v) as 30 | 60 | 90)}
              >
                <SelectTrigger id="evaluationPeriod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Revenue is prorated based on days with actual sales data
              </p>
            </div>
            
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="alertsEnabled" className="cursor-pointer">
                  Enable Low Performance Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Highlight underperforming staff on the leaderboard
                </p>
              </div>
              <Switch
                id="alertsEnabled"
                checked={alertsEnabled}
                onCheckedChange={setAlertsEnabled}
              />
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateThreshold.isPending}
          >
            {updateThreshold.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
