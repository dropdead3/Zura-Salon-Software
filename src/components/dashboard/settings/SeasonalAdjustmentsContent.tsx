import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, Plus, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { format, isPast, parseISO } from 'date-fns';
import { useLocations } from '@/hooks/useLocations';
import {
  useServiceSeasonalAdjustments,
  useCreateSeasonalAdjustment,
  useDeleteSeasonalAdjustment,
  useUpdateSeasonalAdjustment,
} from '@/hooks/useServiceSeasonalAdjustments';

interface SeasonalAdjustmentsContentProps {
  serviceId: string | null;
}

export function SeasonalAdjustmentsContent({ serviceId }: SeasonalAdjustmentsContentProps) {
  const { data: adjustments = [], isLoading } = useServiceSeasonalAdjustments(serviceId);
  const { data: locations = [] } = useLocations();
  const createAdj = useCreateSeasonalAdjustment();
  const deleteAdj = useDeleteSeasonalAdjustment();
  const updateAdj = useUpdateSeasonalAdjustment();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed'>('percentage');
  const [formValue, setFormValue] = useState('');
  const [formStartDate, setFormStartDate] = useState<Date | undefined>();
  const [formEndDate, setFormEndDate] = useState<Date | undefined>();
  const [formLocationId, setFormLocationId] = useState<string>('all');
  const [formActive, setFormActive] = useState(true);

  const resetForm = () => {
    setFormName('');
    setFormType('percentage');
    setFormValue('');
    setFormStartDate(undefined);
    setFormEndDate(undefined);
    setFormLocationId('all');
    setFormActive(true);
    setShowForm(false);
  };

  const handleCreate = () => {
    if (!serviceId || !formName.trim() || !formValue.trim() || !formStartDate || !formEndDate) return;
    createAdj.mutate(
      {
        service_id: serviceId,
        name: formName.trim(),
        adjustment_type: formType,
        adjustment_value: parseFloat(formValue),
        start_date: format(formStartDate, 'yyyy-MM-dd'),
        end_date: format(formEndDate, 'yyyy-MM-dd'),
        location_id: formLocationId === 'all' ? null : formLocationId,
        is_active: formActive,
      },
      { onSuccess: resetForm },
    );
  };

  const isExpired = (endDate: string) => isPast(parseISO(endDate));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const serviceAdjustments = adjustments.filter(a => a.service_id === serviceId || a.service_id === null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className={tokens.body.muted}>
          Apply percentage or fixed-amount modifiers during date ranges.
        </p>
        {!showForm && (
          <Button variant="outline" size={tokens.button.card} onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Holiday Premium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={v => setFormType(v as 'percentage' | 'fixed')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value *</Label>
              <Input
                type="number"
                step="0.01"
                value={formValue}
                onChange={e => setFormValue(e.target.value)}
                placeholder={formType === 'percentage' ? 'e.g. 10' : 'e.g. -5'}
                autoCapitalize="off"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formStartDate && 'text-muted-foreground')}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {formStartDate ? format(formStartDate, 'MMM d, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formStartDate} onSelect={setFormStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formEndDate && 'text-muted-foreground')}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {formEndDate ? format(formEndDate, 'MMM d, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formEndDate} onSelect={setFormEndDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Location Scope</Label>
              <Select value={formLocationId} onValueChange={setFormLocationId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <Switch checked={formActive} onCheckedChange={setFormActive} />
                <Label>Active</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size={tokens.button.inline} onClick={resetForm}>Cancel</Button>
            <Button
              size={tokens.button.inline}
              onClick={handleCreate}
              disabled={!formName.trim() || !formValue.trim() || !formStartDate || !formEndDate || createAdj.isPending}
            >
              {createAdj.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Existing adjustments */}
      <div className="space-y-2 max-h-[35vh] overflow-y-auto p-1">
        {serviceAdjustments.length === 0 && !showForm && (
          <p className={cn(tokens.body.muted, 'text-center py-4')}>No seasonal adjustments yet.</p>
        )}
        {serviceAdjustments.map(adj => {
          const expired = isExpired(adj.end_date);
          const locationName = adj.location_id
            ? locations.find(l => l.id === adj.location_id)?.name || adj.location_id
            : 'All Locations';
          const valueLabel = adj.adjustment_type === 'percentage'
            ? `${adj.adjustment_value > 0 ? '+' : ''}${adj.adjustment_value}%`
            : `${adj.adjustment_value > 0 ? '+' : ''}$${adj.adjustment_value}`;

          return (
            <div
              key={adj.id}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-lg border border-border transition-colors',
                expired && 'opacity-50',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(tokens.body.emphasis, 'truncate')}>{adj.name}</p>
                  {adj.service_id === null && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/50 text-accent-foreground shrink-0">
                      Global
                    </span>
                  )}
                  {expired && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/20 text-destructive shrink-0">
                      Expired
                    </span>
                  )}
                  {!adj.is_active && !expired && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      Paused
                    </span>
                  )}
                </div>
                <p className={tokens.body.muted}>
                  {valueLabel} · {format(parseISO(adj.start_date), 'MMM d')} – {format(parseISO(adj.end_date), 'MMM d, yyyy')} · {locationName}
                </p>
              </div>
              <Switch
                checked={adj.is_active}
                onCheckedChange={checked => updateAdj.mutate({ id: adj.id, is_active: checked })}
                disabled={expired}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => deleteAdj.mutate(adj.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
