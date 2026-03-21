import { useState } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBackroomSetting, useUpsertBackroomSetting } from '@/hooks/backroom/useBackroomSettings';
import { useInventoryAlertSettings, useUpsertInventoryAlertSettings } from '@/hooks/useInventoryAlertSettings';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Package, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

interface InventoryConfig {
  tracking_enabled: boolean;
  reorder_cycle_days: number;
  default_lead_time_days: number;
  forecast_participation: boolean;
  low_stock_threshold_pct: number;
  stockout_alerts_enabled: boolean;
}

const DEFAULT_CONFIG: InventoryConfig = {
  tracking_enabled: true,
  reorder_cycle_days: 30,
  default_lead_time_days: 7,
  forecast_participation: true,
  low_stock_threshold_pct: 20,
  stockout_alerts_enabled: true,
};

export function InventoryReplenishmentSection() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: setting, isLoading } = useBackroomSetting('inventory_config');
  const { data: alertSettings, isLoading: alertLoading } = useInventoryAlertSettings();
  const upsert = useUpsertBackroomSetting();
  const upsertAlerts = useUpsertInventoryAlertSettings();

  const [config, setConfig] = useState<InventoryConfig | null>(null);
  const current: InventoryConfig = config ?? { ...DEFAULT_CONFIG, ...(setting?.value as Partial<InventoryConfig> || {}) };

  const update = (key: keyof InventoryConfig, value: any) => { setConfig({ ...current, [key]: value }); };

  const handleSave = () => {
    if (!orgId) return;
    upsert.mutate({ organization_id: orgId, setting_key: 'inventory_config', setting_value: current as unknown as Record<string, unknown> }, { onSuccess: () => setConfig(null) });
  };

  if (isLoading || alertLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-6">
      <Infotainer id="backroom-inventory-guide" title="Inventory & Replenishment" description="Control how Zura monitors stock levels, triggers reorder alerts, and forecasts demand based on upcoming appointments." icon={<Package className="h-4 w-4 text-primary" />} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Inventory & Replenishment</CardTitle>
              <CardDescription>Configure inventory tracking, reordering, and replenishment policies.</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={handleSave} disabled={!config || upsert.isPending}>
            <Save className="w-4 h-4 mr-1.5" /> Save
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-card/80 p-4 flex items-center justify-between">
            <div>
              <p className={cn(tokens.body.emphasis, 'text-foreground')}>Inventory Tracking</p>
              <p className="text-sm text-muted-foreground">Enable automatic inventory tracking from backroom sessions</p>
            </div>
            <Switch checked={current.tracking_enabled} onCheckedChange={v => update('tracking_enabled', v)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/60 bg-card/80 p-4">
              <div className="flex items-center gap-1"><label className={tokens.label.default}>Reorder Cycle (days)</label><MetricInfoTooltip description="How often Zura checks if any products need reordering." /></div>
              <p className="text-sm text-muted-foreground mb-2">How often to evaluate inventory for reordering</p>
              <Input type="number" value={current.reorder_cycle_days} onChange={e => update('reorder_cycle_days', Number(e.target.value))} autoCapitalize="none" />
            </div>
            <div className="rounded-lg border border-border/60 bg-card/80 p-4">
              <div className="flex items-center gap-1"><label className={tokens.label.default}>Default Lead Time (days)</label><MetricInfoTooltip description="Expected days between placing an order and receiving delivery." /></div>
              <p className="text-sm text-muted-foreground mb-2">Expected delivery time from suppliers</p>
              <Input type="number" value={current.default_lead_time_days} onChange={e => update('default_lead_time_days', Number(e.target.value))} autoCapitalize="none" />
            </div>
            <div className="rounded-lg border border-border/60 bg-card/80 p-4">
              <label className={tokens.label.default}>Low Stock Threshold (%)</label>
              <p className="text-sm text-muted-foreground mb-2">Alert when stock falls below this percentage of par level</p>
              <Input type="number" min={0} max={100} value={current.low_stock_threshold_pct} onChange={e => update('low_stock_threshold_pct', Number(e.target.value))} autoCapitalize="none" />
            </div>
            <div className="rounded-lg border border-border/60 bg-card/80 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1"><p className={cn(tokens.body.emphasis, 'text-foreground')}>Forecast Participation</p><MetricInfoTooltip description="Uses upcoming appointment data to predict demand and adjust reorder quantities." /></div>
                <p className="text-sm text-muted-foreground">Include demand forecasting in reorder calculations</p>
              </div>
              <Switch checked={current.forecast_participation} onCheckedChange={v => update('forecast_participation', v)} />
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/80 p-4 flex items-center justify-between">
            <div>
              <p className={cn(tokens.body.emphasis, 'text-foreground')}>Stockout Alerts</p>
              <p className="text-sm text-muted-foreground">Receive alerts when products are completely out of stock</p>
            </div>
            <Switch checked={current.stockout_alerts_enabled} onCheckedChange={v => update('stockout_alerts_enabled', v)} />
          </div>
        </CardContent>
      </Card>

      {alertSettings && (
        <Card>
          <CardHeader>
            <CardTitle className={tokens.card.title}>Inventory Alert Configuration</CardTitle>
            <CardDescription>Summary of current inventory alert settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className={tokens.label.tiny}>Alerts Enabled</p>
                <p className={cn(tokens.body.emphasis, 'text-foreground')}>{alertSettings.enabled ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className={tokens.label.tiny}>Default Threshold</p>
                <p className={cn(tokens.body.emphasis, 'text-foreground')}>{alertSettings.default_threshold_pct}%</p>
              </div>
              <div>
                <p className={tokens.label.tiny}>Auto-Create PO</p>
                <p className={cn(tokens.body.emphasis, 'text-foreground')}>{alertSettings.auto_create_draft_po ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className={tokens.label.tiny}>Auto-Reorder</p>
                <p className={cn(tokens.body.emphasis, 'text-foreground')}>{alertSettings.auto_reorder_enabled ? alertSettings.auto_reorder_mode : 'Disabled'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
