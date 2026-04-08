import { useState, useMemo, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Save,
  Loader2,
  Clock,
  Mail,
  FileText,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCreateScheduledReport, useUpdateScheduledReport, type ScheduledReport } from '@/hooks/useScheduledReports';
import { REPORT_CATALOG, REPORT_CATEGORIES, filterReportsByTier, getReportTier } from '@/config/reportCatalog';
import { useActiveLocations } from '@/hooks/useLocations';
import { toast } from 'sonner';

interface ScheduleReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editReport?: ScheduledReport | null;
}

interface StaffOption {
  userId: string;
  name: string;
  email: string;
}

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly (1st)' },
  { value: 'first_of_month', label: '1st of Month' },
  { value: 'last_of_month', label: 'End of Month' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Dublin',
  'Australia/Sydney',
];

export function ScheduleReportForm({ open, onOpenChange, editReport }: ScheduleReportFormProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: locations } = useActiveLocations();
  const tier = useMemo(() => getReportTier(locations?.length || 1), [locations]);
  const createReport = useCreateScheduledReport();
  const updateReport = useUpdateScheduledReport();

  // Form state
  const [name, setName] = useState('');
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [frequency, setFrequency] = useState('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [timeUtc, setTimeUtc] = useState('09:00');
  const [timezone, setTimezone] = useState('America/New_York');
  const [format, setFormat] = useState('pdf');
  const [recipients, setRecipients] = useState<{ email: string; userId?: string; name?: string }[]>([]);
  const [externalEmail, setExternalEmail] = useState('');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Load staff for recipient picker
  useEffect(() => {
    if (!open || !orgId) return;
    setLoadingStaff(true);
    supabase
      .from('employee_profiles')
      .select('user_id, full_name, email')
      .eq('is_active', true)
      .eq('organization_id', orgId)
      .then(({ data }) => {
        setStaffOptions((data || []).map(p => ({
          userId: p.user_id,
          name: p.full_name || p.email || 'Unknown',
          email: p.email || '',
        })));
        setLoadingStaff(false);
      });
  }, [open, orgId]);

  // Populate form when editing
  useEffect(() => {
    if (editReport) {
      setName(editReport.name);
      setSelectedReportIds(new Set(editReport.filters?.report_ids || []));
      setFrequency(editReport.schedule_type);
      setDayOfWeek(editReport.schedule_config?.dayOfWeek ?? 1);
      setTimeUtc(editReport.schedule_config?.timeUtc ?? '09:00');
      setTimezone(editReport.schedule_config?.timezone ?? 'America/New_York');
      setFormat(editReport.format || 'pdf');
      setRecipients(editReport.recipients || []);
    } else {
      setName('');
      setSelectedReportIds(new Set());
      setFrequency('weekly');
      setDayOfWeek(1);
      setTimeUtc('09:00');
      setTimezone('America/New_York');
      setFormat('pdf');
      setRecipients([]);
    }
  }, [editReport, open]);

  // Auto-generate name
  useEffect(() => {
    if (editReport) return;
    if (selectedReportIds.size === 0) { setName(''); return; }
    if (selectedReportIds.size === 1) {
      const report = REPORT_CATALOG.find(r => r.id === Array.from(selectedReportIds)[0]);
      setName(`${report?.name || 'Report'} — ${FREQUENCIES.find(f => f.value === frequency)?.label || frequency}`);
    } else {
      setName(`${selectedReportIds.size} Reports — ${FREQUENCIES.find(f => f.value === frequency)?.label || frequency}`);
    }
  }, [selectedReportIds, frequency, editReport]);

  const toggleReportId = (id: string) => {
    setSelectedReportIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addRecipientFromStaff = (staff: StaffOption) => {
    if (recipients.some(r => r.userId === staff.userId)) return;
    setRecipients(prev => [...prev, { email: staff.email, userId: staff.userId, name: staff.name }]);
  };

  const addExternalRecipient = () => {
    const email = externalEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Enter a valid email'); return; }
    if (recipients.some(r => r.email === email)) { toast.error('Already added'); return; }
    setRecipients(prev => [...prev, { email, name: email }]);
    setExternalEmail('');
  };

  const removeRecipient = (index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const groupedReports = useMemo(() => {
    const filtered = filterReportsByTier(REPORT_CATALOG, tier);
    const map = new Map<string, typeof REPORT_CATALOG>();
    for (const r of filtered) {
      const list = map.get(r.category) || [];
      list.push(r);
      map.set(r.category, list);
    }
    return map;
  }, []);

  const isSaving = createReport.isPending || updateReport.isPending;

  const handleSave = async () => {
    if (selectedReportIds.size === 0) { toast.error('Select at least one report'); return; }
    if (recipients.length === 0) { toast.error('Add at least one recipient'); return; }
    if (!name.trim()) { toast.error('Enter a schedule name'); return; }

    const payload = {
      name: name.trim(),
      schedule_type: frequency,
      schedule_config: {
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
        timeUtc,
        timezone,
      },
      recipients,
      format,
      filters: { report_ids: Array.from(selectedReportIds) },
    };

    if (editReport) {
      updateReport.mutate({ id: editReport.id, ...payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createReport.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <PremiumFloatingPanel
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="520px"
      showCloseButton
      side="right"
    >
      <div className="p-5 pb-3 border-b border-border/40">
        <h2 className="font-display text-sm tracking-wide uppercase">
          {editReport ? 'Edit Schedule' : 'New Report Schedule'}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Automatically deliver reports to your team on a recurring basis
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6">
          {/* Schedule Name */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Schedule Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekly Sales Pack" />
          </div>

          {/* Report Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Reports
              <Badge variant="secondary" className="ml-auto text-[10px]">{selectedReportIds.size} selected</Badge>
            </Label>
            <div className="border rounded-lg p-3 space-y-3 max-h-[200px] overflow-y-auto">
              {Array.from(groupedReports.entries()).map(([cat, reports]) => (
                <div key={cat}>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{cat}</p>
                  <div className="space-y-0.5">
                    {reports.map(r => (
                      <label key={r.id} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-muted/30 rounded px-1">
                        <Checkbox checked={selectedReportIds.has(r.id)} onCheckedChange={() => toggleReportId(r.id)} />
                        <span className="text-xs">{r.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Frequency */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Frequency
            </Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {frequency === 'weekly' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Day of Week</Label>
              <Select value={String(dayOfWeek)} onValueChange={v => setDayOfWeek(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Time (UTC)</Label>
              <Input type="time" value={timeUtc} onChange={e => setTimeUtc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Recipients */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" /> Recipients
              <Badge variant="secondary" className="ml-auto text-[10px]">{recipients.length}</Badge>
            </Label>

            {/* Active staff list */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Team members</p>
              <div className="border rounded-lg p-2 max-h-[120px] overflow-y-auto space-y-0.5">
                {loadingStaff ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Loading...</p>
                ) : staffOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No active staff</p>
                ) : staffOptions.map(s => {
                  const added = recipients.some(r => r.userId === s.userId);
                  return (
                    <button
                      key={s.userId}
                      className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-muted/50 text-xs disabled:opacity-50"
                      onClick={() => addRecipientFromStaff(s)}
                      disabled={added}
                    >
                      <Users className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{s.name}</span>
                      <span className="text-muted-foreground truncate ml-auto">{s.email}</span>
                      {added && <Badge variant="outline" className="text-[9px] shrink-0">Added</Badge>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* External email */}
            <div className="flex gap-2">
              <Input
                placeholder="External email..."
                value={externalEmail}
                onChange={e => setExternalEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addExternalRecipient()}
                className="text-xs"
              />
              <Button variant="outline" size="sm" onClick={addExternalRecipient}>Add</Button>
            </div>

            {/* Current recipients */}
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recipients.map((r, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    <span className="text-xs">{r.name || r.email}</span>
                    <button onClick={() => removeRecipient(i)} className="hover:text-destructive ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Format */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Output Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF (Merged)</SelectItem>
                <SelectItem value="pdf-separate">PDF (Separate per Report)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/40 flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {editReport ? 'Save Changes' : 'Create Schedule'}
        </Button>
      </div>
    </PremiumFloatingPanel>
  );
}
