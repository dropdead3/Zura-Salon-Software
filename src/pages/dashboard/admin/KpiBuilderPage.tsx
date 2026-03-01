import { useState } from 'react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Target, AlertTriangle, XCircle, Check, Pencil, Trash2 } from 'lucide-react';
import { KPI_TEMPLATES, KPI_CATEGORY_LABELS, type KpiTemplate } from '@/constants/kpiTemplates';
import { useKpiDefinitions, useCreateKpiDefinition, useUpdateKpiDefinition, useDeleteKpiDefinition, type KpiDefinition } from '@/hooks/useKpiDefinitions';

export default function KpiBuilderPage() {
  const { data: definitions, isLoading } = useKpiDefinitions();
  const createKpi = useCreateKpiDefinition();
  const updateKpi = useUpdateKpiDefinition();
  const deleteKpi = useDeleteKpiDefinition();

  const [selectedTemplate, setSelectedTemplate] = useState<KpiTemplate | null>(null);
  const [editingKpi, setEditingKpi] = useState<KpiDefinition | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Form state
  const [targetValue, setTargetValue] = useState('');
  const [warningThreshold, setWarningThreshold] = useState('');
  const [criticalThreshold, setCriticalThreshold] = useState('');

  const adoptedKeys = new Set((definitions || []).map(d => d.metric_key));
  const availableTemplates = KPI_TEMPLATES.filter(t => !adoptedKeys.has(t.key));

  const openAdopt = (template: KpiTemplate) => {
    setSelectedTemplate(template);
    setEditingKpi(null);
    setTargetValue(template.suggestedTarget?.toString() || '');
    setWarningThreshold(template.suggestedWarning?.toString() || '');
    setCriticalThreshold(template.suggestedCritical?.toString() || '');
    setFormOpen(true);
  };

  const openEdit = (kpi: KpiDefinition) => {
    setEditingKpi(kpi);
    setSelectedTemplate(null);
    setTargetValue(kpi.target_value.toString());
    setWarningThreshold(kpi.warning_threshold.toString());
    setCriticalThreshold(kpi.critical_threshold.toString());
    setFormOpen(true);
  };

  const handleSave = async () => {
    const target = parseFloat(targetValue);
    const warning = parseFloat(warningThreshold);
    const critical = parseFloat(criticalThreshold);

    if (isNaN(target) || isNaN(warning) || isNaN(critical)) return;

    if (editingKpi) {
      await updateKpi.mutateAsync({
        id: editingKpi.id,
        updates: { target_value: target, warning_threshold: warning, critical_threshold: critical },
      });
    } else if (selectedTemplate) {
      await createKpi.mutateAsync({
        metric_key: selectedTemplate.key,
        display_name: selectedTemplate.name,
        description: selectedTemplate.description,
        target_value: target,
        warning_threshold: warning,
        critical_threshold: critical,
        unit: selectedTemplate.unit,
        cadence: selectedTemplate.cadence,
      });
    }
    setFormOpen(false);
  };

  const grouped = (definitions || []).reduce<Record<string, KpiDefinition[]>>((acc, kpi) => {
    const template = KPI_TEMPLATES.find(t => t.key === kpi.metric_key);
    const cat = template?.category || 'revenue';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(kpi);
    return acc;
  }, {});

  return (
    <PlatformPageContainer>
      <PlatformPageHeader
        title="KPI Architecture"
        description="Define the metrics that matter, the thresholds that trigger alerts, and the cadence of review."
      />

      {/* Active KPIs */}
      {definitions && definitions.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-medium tracking-tight text-[hsl(var(--platform-foreground))]">
            Active KPIs
          </h2>
          {Object.entries(grouped).map(([category, kpis]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-medium text-[hsl(var(--platform-foreground-muted))] uppercase tracking-wider">
                {KPI_CATEGORY_LABELS[category] || category}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {kpis.map(kpi => (
                  <Card key={kpi.id} className="rounded-xl shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base font-medium">{kpi.display_name}</CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(kpi)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteKpi.mutate(kpi.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-xs">{kpi.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-3.5 w-3.5 text-green-500" />
                        <span>Target: {kpi.target_value}{kpi.unit === '%' ? '%' : ` ${kpi.unit}`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                        <span>Warning: {kpi.warning_threshold}{kpi.unit === '%' ? '%' : ` ${kpi.unit}`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                        <span>Critical: {kpi.critical_threshold}{kpi.unit === '%' ? '%' : ` ${kpi.unit}`}</span>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{kpi.cadence}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Templates */}
      {availableTemplates.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-medium tracking-tight text-[hsl(var(--platform-foreground))]">
            Available Templates
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableTemplates.map(template => (
              <Card
                key={template.key}
                className="rounded-2xl border-dashed cursor-pointer transition-colors hover:border-[hsl(var(--platform-accent))] hover:bg-[hsl(var(--platform-accent))]/5"
                onClick={() => openAdopt(template)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">{template.name}</CardTitle>
                  <CardDescription className="text-xs">{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs capitalize">{template.cadence}</Badge>
                    <Button variant="ghost" size={tokens.button.inline} className="gap-1 text-xs">
                      <Plus className="h-3 w-3" /> Adopt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--platform-foreground-muted))]" />
        </div>
      )}

      {/* Adopt / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingKpi ? `Edit ${editingKpi.display_name}` : `Adopt: ${selectedTemplate?.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Value ({selectedTemplate?.unit || editingKpi?.unit})</Label>
              <Input
                type="number"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                placeholder="e.g. 85"
              />
            </div>
            <div className="space-y-2">
              <Label>Warning Threshold</Label>
              <Input
                type="number"
                value={warningThreshold}
                onChange={e => setWarningThreshold(e.target.value)}
                placeholder="Triggers yellow alert"
              />
            </div>
            <div className="space-y-2">
              <Label>Critical Threshold</Label>
              <Input
                type="number"
                value={criticalThreshold}
                onChange={e => setCriticalThreshold(e.target.value)}
                placeholder="Triggers red alert"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createKpi.isPending || updateKpi.isPending}
            >
              {(createKpi.isPending || updateKpi.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingKpi ? 'Update' : 'Adopt KPI'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformPageContainer>
  );
}
