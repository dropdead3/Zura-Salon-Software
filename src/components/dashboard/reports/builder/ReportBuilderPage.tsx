import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Save, Play, BarChart3, LineChart, PieChart, Table2, Plus, X } from 'lucide-react';
import { 
  AVAILABLE_METRICS, 
  AVAILABLE_DIMENSIONS, 
  getMetricCategories,
  type ReportConfig,
  type MetricDefinition,
  type DimensionDefinition,
} from '@/lib/reportMetrics';
import { useCreateReportTemplate } from '@/hooks/useCustomReportTemplates';
import { ReportPreview } from './ReportPreview';

interface ReportBuilderPageProps {
  onClose?: () => void;
  initialConfig?: ReportConfig;
  templateId?: string;
}

const VISUALIZATIONS = [
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'bar_chart', label: 'Bar Chart', icon: BarChart3 },
  { id: 'line_chart', label: 'Line Chart', icon: LineChart },
  { id: 'pie_chart', label: 'Pie Chart', icon: PieChart },
];

export function ReportBuilderPage({ onClose, initialConfig, templateId }: ReportBuilderPageProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const [selectedMetrics, setSelectedMetrics] = useState<ReportConfig['metrics']>(
    initialConfig?.metrics || []
  );
  const [selectedDimensions, setSelectedDimensions] = useState<ReportConfig['dimensions']>(
    initialConfig?.dimensions || []
  );
  const [visualization, setVisualization] = useState<ReportConfig['visualization']>(
    initialConfig?.visualization || 'table'
  );
  const [dateRange, setDateRange] = useState<'inherit' | 'custom'>(
    initialConfig?.dateRange || 'inherit'
  );

  const createTemplate = useCreateReportTemplate();
  const categories = getMetricCategories();

  const config: ReportConfig = useMemo(() => ({
    metrics: selectedMetrics,
    dimensions: selectedDimensions,
    filters: [],
    visualization,
    dateRange,
  }), [selectedMetrics, selectedDimensions, visualization, dateRange]);

  const handleMetricToggle = (metric: MetricDefinition, aggregation: string) => {
    const existing = selectedMetrics.find(m => m.id === metric.id);
    if (existing) {
      setSelectedMetrics(prev => prev.filter(m => m.id !== metric.id));
    } else {
      setSelectedMetrics(prev => [...prev, { 
        id: metric.id, 
        aggregation: aggregation as any,
        label: metric.label,
      }]);
    }
  };

  const handleDimensionToggle = (dimension: DimensionDefinition) => {
    const existing = selectedDimensions.find(d => d.id === dimension.id);
    if (existing) {
      setSelectedDimensions(prev => prev.filter(d => d.id !== dimension.id));
    } else {
      setSelectedDimensions(prev => [...prev, { id: dimension.id }]);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    createTemplate.mutate({
      name,
      description,
      config,
      is_shared: false,
    }, {
      onSuccess: () => onClose?.(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onClose && (
            <Button variant="ghost" size={tokens.button.card} onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-xl font-medium">Report Builder</h1>
            <p className="text-sm text-muted-foreground">Create custom reports with your selected metrics</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={selectedMetrics.length === 0}>
            <Play className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || selectedMetrics.length === 0 || createTemplate.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Name */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Weekly Revenue by Location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What does this report show?"
                />
              </div>
            </CardContent>
          </Card>

          {/* Metrics Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Select Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={categories[0]}>
                <TabsList className="mb-4">
                  {categories.map(cat => (
                    <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                  ))}
                </TabsList>
                {categories.map(cat => (
                  <TabsContent key={cat} value={cat}>
                    <div className="grid gap-3">
                      {AVAILABLE_METRICS.filter(m => m.category === cat).map(metric => {
                        const isSelected = selectedMetrics.some(m => m.id === metric.id);
                        return (
                          <div
                            key={metric.id}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleMetricToggle(metric, metric.aggregations[0])}
                              />
                              <div>
                                <p className="font-medium text-sm">{metric.label}</p>
                                <p className="text-xs text-muted-foreground">{metric.description}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <Select
                                value={selectedMetrics.find(m => m.id === metric.id)?.aggregation || metric.aggregations[0]}
                                onValueChange={(value) => {
                                  setSelectedMetrics(prev => prev.map(m => 
                                    m.id === metric.id ? { ...m, aggregation: value as any } : m
                                  ));
                                }}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {metric.aggregations.map(agg => (
                                    <SelectItem key={agg} value={agg}>
                                      {agg.toUpperCase()}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Dimensions Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Group By (Dimensions)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {AVAILABLE_DIMENSIONS.map(dimension => {
                  const isSelected = selectedDimensions.some(d => d.id === dimension.id);
                  return (
                    <div
                      key={dimension.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleDimensionToggle(dimension)}
                    >
                      <Checkbox checked={isSelected} />
                      <div>
                        <p className="font-medium text-sm">{dimension.label}</p>
                        <p className="text-xs text-muted-foreground">{dimension.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Visualization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {VISUALIZATIONS.map(viz => {
                  const Icon = viz.icon;
                  return (
                    <Button
                      key={viz.id}
                      variant={visualization === viz.id ? 'default' : 'outline'}
                      size={tokens.button.inline}
                      onClick={() => setVisualization(viz.id as any)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {viz.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Selected Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMetrics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No metrics selected</p>
              ) : (
                <div className="space-y-2">
                  {selectedMetrics.map(metric => (
                    <div key={metric.id} className="flex items-center justify-between text-sm">
                      <span>{metric.label || metric.id}</span>
                      <Button
                        variant="ghost"
                        size={tokens.button.inline}
                        className="h-6 w-6 p-0"
                        onClick={() => setSelectedMetrics(prev => prev.filter(m => m.id !== metric.id))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <ReportPreview config={config} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
