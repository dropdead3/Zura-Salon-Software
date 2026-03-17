import { useState } from 'react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Trash2, Clock, ArrowDown, ArrowUp, Mail, Loader2, Pencil, MailCheck,
  ChevronDown, ChevronUp, Sparkles, AlertCircle, Bell, MapPin, Send, Eye,
  CheckCircle2, XCircle, Timer, Merge, Activity,
} from 'lucide-react';
import {
  useServiceEmailFlows,
  useServiceEmailFlowSteps,
  useCreateServiceEmailFlow,
  useUpdateServiceEmailFlow,
  useDeleteServiceEmailFlow,
  useCreateFlowStep,
  useUpdateFlowStep,
  useDeleteFlowStep,
  useAppointmentRemindersConfig,
  useUpsertReminderConfig,
  useStepOverrides,
  useUpsertStepOverride,
  useDeleteStepOverride,
  useReminderOverrides,
  useUpsertReminderOverride,
  useServiceEmailQueue,
  useTestSendFlowStep,
  type ServiceEmailFlow,
  type ServiceEmailFlowStep,
  type AppointmentReminderConfig,
  type ServiceEmailQueueItem,
} from '@/hooks/useServiceEmailFlows';
import { useServices } from '@/hooks/useBookingSystem';
import { useActiveLocations } from '@/hooks/useLocations';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const SERVICE_CATEGORIES = ['Blonding', 'Color', 'Extensions', 'Extras', 'Haircut', 'Consultation', 'Styling'];

const TIMING_PRESETS = [
  { label: '2 hours', value: 2 },
  { label: '24 hours (1 day)', value: 24 },
  { label: '48 hours (2 days)', value: 48 },
  { label: '72 hours (3 days)', value: 72 },
  { label: '168 hours (1 week)', value: 168 },
  { label: '336 hours (2 weeks)', value: 336 },
  { label: '504 hours (3 weeks)', value: 504 },
  { label: '1008 hours (6 weeks)', value: 1008 },
];

const TEMPLATE_VARIABLES = [
  { key: '{{first_name}}', desc: "Client's first name" },
  { key: '{{client_name}}', desc: "Client's full name" },
  { key: '{{service_name}}', desc: 'Service name' },
  { key: '{{stylist_name}}', desc: "Stylist's name" },
  { key: '{{appointment_date}}', desc: 'Appointment date' },
  { key: '{{appointment_time}}', desc: 'Appointment time' },
  { key: '{{location_name}}', desc: 'Location name' },
];

function formatTimingLabel(hours: number, type: 'before_appointment' | 'after_appointment'): string {
  const direction = type === 'before_appointment' ? 'before' : 'after';
  if (hours < 24) return `${hours}h ${direction}`;
  const days = Math.floor(hours / 24);
  const remaining = hours % 24;
  if (remaining === 0) {
    if (days === 7) return `1 week ${direction}`;
    if (days === 14) return `2 weeks ${direction}`;
    if (days === 21) return `3 weeks ${direction}`;
    if (days === 42) return `6 weeks ${direction}`;
    return `${days} day${days > 1 ? 's' : ''} ${direction}`;
  }
  return `${days}d ${remaining}h ${direction}`;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending: { icon: Timer, color: 'text-amber-500', label: 'Pending' },
  sent: { icon: CheckCircle2, color: 'text-green-500', label: 'Sent' },
  merged: { icon: Merge, color: 'text-blue-500', label: 'Merged' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', label: 'Cancelled' },
  skipped: { icon: XCircle, color: 'text-orange-500', label: 'Skipped' },
};

export function ServiceEmailFlowsManager() {
  const [activeTab, setActiveTab] = useState('flows');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium tracking-tight">Client Communication Flows</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure automated email sequences for services and appointment reminders.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="flows" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Service Flows
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Appointment Reminders
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Email Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flows" className="mt-4">
          <ServiceFlowsList />
        </TabsContent>

        <TabsContent value="reminders" className="mt-4">
          <AppointmentRemindersManager />
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <EmailQueueMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============= Service Flows List =============

function ServiceFlowsList() {
  const { data: flows, isLoading } = useServiceEmailFlows();
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (selectedFlowId) {
    return <FlowStepEditor flowId={selectedFlowId} onBack={() => setSelectedFlowId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define email sequences triggered by service bookings. Each flow can have multiple timed steps.
        </p>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size={tokens.button.card}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Flow
            </Button>
          </DialogTrigger>
          <CreateFlowDialog onClose={() => setShowCreateDialog(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <DashboardLoader className="py-12" />
      ) : !flows || flows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">No service flows configured</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first flow to start sending automated service-related emails to clients.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {groupFlowsByCategory(flows).map(([category, categoryFlows]) => (
            <div key={category}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {category || 'Uncategorized'}
              </p>
              {categoryFlows.map(flow => (
                <FlowCard
                  key={flow.id}
                  flow={flow}
                  onClick={() => setSelectedFlowId(flow.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupFlowsByCategory(flows: ServiceEmailFlow[]): [string, ServiceEmailFlow[]][] {
  const groups = new Map<string, ServiceEmailFlow[]>();
  for (const flow of flows) {
    const cat = flow.service?.category || flow.service_category || 'General';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(flow);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function FlowCard({ flow, onClick }: { flow: ServiceEmailFlow; onClick: () => void }) {
  const updateFlow = useUpdateServiceEmailFlow();
  const deleteFlow = useDeleteServiceEmailFlow();

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors mb-2"
      onClick={onClick}
    >
      <CardContent className="py-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-2 h-2 rounded-full shrink-0',
            flow.is_active ? 'bg-green-500' : 'bg-muted-foreground/30'
          )} />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{flow.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {flow.service?.name || `All ${flow.service_category} services`}
              {flow.description && ` · ${flow.description}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          <Switch
            checked={flow.is_active}
            onCheckedChange={(checked) => updateFlow.mutate({ id: flow.id, updates: { is_active: checked } })}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => deleteFlow.mutate(flow.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============= Create Flow Dialog =============

function CreateFlowDialog({ onClose }: { onClose: () => void }) {
  const { data: services } = useServices();
  const createFlow = useCreateServiceEmailFlow();
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'service' | 'category'>('category');
  const [serviceId, setServiceId] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  const handleCreate = () => {
    createFlow.mutate({
      name,
      service_id: scope === 'service' ? serviceId : null,
      service_category: scope === 'category' ? category : null,
    }, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Service Email Flow</DialogTitle>
        <DialogDescription>
          Create a communication flow for a specific service or an entire category.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>Flow Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Blonding Care Flow" />
        </div>

        <div className="space-y-2">
          <Label>Scope</Label>
          <Select value={scope} onValueChange={(v) => setScope(v as 'service' | 'category')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="category">All services in a category</SelectItem>
              <SelectItem value="service">Specific service</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scope === 'category' ? (
          <div className="space-y-2">
            <Label>Service Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {services?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.category})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} disabled={!name || createFlow.isPending}>
          {createFlow.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          Create Flow
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============= Flow Step Editor =============

function FlowStepEditor({ flowId, onBack }: { flowId: string; onBack: () => void }) {
  const { data: flows } = useServiceEmailFlows();
  const { data: steps, isLoading } = useServiceEmailFlowSteps(flowId);
  const createStep = useCreateFlowStep();
  const updateStep = useUpdateFlowStep();
  const deleteStep = useDeleteFlowStep();
  const [showAddStep, setShowAddStep] = useState(false);

  const flow = flows?.find(f => f.id === flowId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size={tokens.button.inline} onClick={onBack}>← Back</Button>
        <div>
          <h3 className="font-medium">{flow?.name || 'Flow'}</h3>
          <p className="text-xs text-muted-foreground">
            {flow?.service?.name || `All ${flow?.service_category} services`}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Email Steps</CardTitle>
              <CardDescription>Configure the timing and content for each communication step.</CardDescription>
            </div>
            <Button size={tokens.button.card} onClick={() => setShowAddStep(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <DashboardLoader className="py-8" size="md" />
          ) : !steps || steps.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No steps configured yet. Add your first communication step.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {steps.map((step, idx) => (
                <StepTimelineItem
                  key={step.id}
                  step={step}
                  isLast={idx === steps.length - 1}
                  onUpdate={(updates) => updateStep.mutate({ id: step.id, flowId, updates })}
                  onDelete={() => deleteStep.mutate({ id: step.id, flowId })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variable Reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Template Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map(v => (
              <Badge key={v.key} variant="outline" className="text-xs font-mono">
                {v.key}
                <span className="ml-1 font-sans text-muted-foreground">— {v.desc}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Step Dialog */}
      <AddStepDialog
        open={showAddStep}
        onOpenChange={setShowAddStep}
        flowId={flowId}
        nextOrder={(steps?.length || 0) + 1}
      />
    </div>
  );
}

function StepTimelineItem({
  step,
  isLast,
  onUpdate,
  onDelete,
}: {
  step: ServiceEmailFlowStep;
  isLast: boolean;
  onUpdate: (updates: Partial<ServiceEmailFlowStep>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editSubject, setEditSubject] = useState(step.subject);
  const [editBody, setEditBody] = useState(step.html_body);
  const [activeSubTab, setActiveSubTab] = useState('content');

  const timingLabel = formatTimingLabel(step.timing_value, step.timing_type);
  const icon = step.timing_type === 'before_appointment' ? ArrowUp : ArrowDown;
  const Icon = icon;

  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[15px] top-[40px] bottom-0 w-0.5 bg-border" />
      )}

      <div className="flex gap-3 pb-4">
        {/* Timeline dot */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 border-2',
          step.is_active
            ? 'bg-primary/10 border-primary text-primary'
            : 'bg-muted border-border text-muted-foreground'
        )}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs shrink-0">
                  {timingLabel}
                </Badge>
                <span className="text-sm font-medium truncate">{step.subject}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Switch
                checked={step.is_active}
                onCheckedChange={(checked) => onUpdate({ is_active: checked })}
                onClick={e => e.stopPropagation()}
              />
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {expanded && (
            <div className="mt-3 space-y-3 pl-1">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList className="h-8">
                  <TabsTrigger value="content" className="text-xs h-7">Content</TabsTrigger>
                  <TabsTrigger value="locations" className="text-xs h-7">
                    <MapPin className="w-3 h-3 mr-1" />
                    Location Overrides
                  </TabsTrigger>
                  <TabsTrigger value="test" className="text-xs h-7">
                    <Send className="w-3 h-3 mr-1" />
                    Test Send
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Subject Line</Label>
                    <Input
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Body (HTML)</Label>
                    <Textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      rows={6}
                      className="text-sm font-mono"
                      placeholder="<p>Hi {{first_name}},</p>"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size={tokens.button.inline}
                      onClick={() => onUpdate({ subject: editSubject, html_body: editBody })}
                      disabled={editSubject === step.subject && editBody === step.html_body}
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="destructive"
                      size={tokens.button.inline}
                      onClick={onDelete}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="locations" className="mt-3">
                  <StepLocationOverrides stepId={step.id} />
                </TabsContent>

                <TabsContent value="test" className="mt-3">
                  <TestSendPanel stepId={step.id} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= Location Overrides for Steps =============

function StepLocationOverrides({ stepId }: { stepId: string }) {
  const { data: locations } = useActiveLocations();
  const { data: overrides, isLoading } = useStepOverrides(stepId);
  const upsertOverride = useUpsertStepOverride();
  const deleteOverride = useDeleteStepOverride();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [overrideSubject, setOverrideSubject] = useState('');
  const [overrideBody, setOverrideBody] = useState('');

  const existingLocationIds = overrides?.map(o => o.location_id) || [];
  const availableLocations = locations?.filter(l => !existingLocationIds.includes(l.id)) || [];

  const handleAdd = () => {
    if (!selectedLocationId) return;
    upsertOverride.mutate({
      stepId,
      locationId: selectedLocationId,
      subject: overrideSubject || null,
      htmlBody: overrideBody || null,
    }, {
      onSuccess: () => {
        setSelectedLocationId('');
        setOverrideSubject('');
        setOverrideBody('');
      },
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Override subject or body for specific locations. Leave fields empty to use the default content.
      </p>

      {/* Existing overrides */}
      {overrides && overrides.length > 0 && (
        <div className="space-y-2">
          {overrides.map(override => {
            const loc = locations?.find(l => l.id === override.location_id);
            return (
              <Card key={override.id} className="border-dashed">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{loc?.name || override.location_id}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteOverride.mutate({ id: override.id, stepId })}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <LocationOverrideEditor
                    override={override}
                    onSave={(subject, htmlBody) => upsertOverride.mutate({
                      stepId,
                      locationId: override.location_id,
                      subject,
                      htmlBody,
                    })}
                    isSaving={upsertOverride.isPending}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add new override */}
      {availableLocations.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4 space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Add Location Override</span>
            </div>
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select location..." />
              </SelectTrigger>
              <SelectContent>
                {availableLocations.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedLocationId && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Override Subject (optional)</Label>
                  <Input value={overrideSubject} onChange={e => setOverrideSubject(e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Override Body (optional)</Label>
                  <Textarea value={overrideBody} onChange={e => setOverrideBody(e.target.value)} rows={4} className="text-sm font-mono" />
                </div>
                <Button size={tokens.button.inline} onClick={handleAdd} disabled={upsertOverride.isPending}>
                  {upsertOverride.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                  Save Override
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {availableLocations.length === 0 && (!overrides || overrides.length === 0) && (
        <p className="text-xs text-muted-foreground text-center py-4">No locations configured. Add locations first.</p>
      )}
    </div>
  );
}

function LocationOverrideEditor({
  override,
  onSave,
  isSaving,
}: {
  override: { subject: string | null; html_body: string | null };
  onSave: (subject: string | null, htmlBody: string | null) => void;
  isSaving: boolean;
}) {
  const [subject, setSubject] = useState(override.subject || '');
  const [body, setBody] = useState(override.html_body || '');

  const hasChanges = subject !== (override.subject || '') || body !== (override.html_body || '');

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs">Subject Override</Label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} className="text-sm" placeholder="(use default)" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Body Override</Label>
        <Textarea value={body} onChange={e => setBody(e.target.value)} rows={3} className="text-sm font-mono" placeholder="(use default)" />
      </div>
      {hasChanges && (
        <Button size={tokens.button.inline} onClick={() => onSave(subject || null, body || null)} disabled={isSaving}>
          {isSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          Update
        </Button>
      )}
    </div>
  );
}

// ============= Test Send Panel =============

function TestSendPanel({ stepId }: { stepId: string }) {
  const { user } = useAuth();
  const [testEmail, setTestEmail] = useState(user?.email || '');
  const testSend = useTestSendFlowStep();

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Send a test email with sample data to preview how this step looks in the inbox.
      </p>
      <div className="flex gap-2">
        <Input
          value={testEmail}
          onChange={e => setTestEmail(e.target.value)}
          placeholder="test@example.com"
          className="text-sm"
          type="email"
        />
        <Button
          size={tokens.button.inline}
          onClick={() => testSend.mutate({ stepId, testEmail })}
          disabled={!testEmail || testSend.isPending}
        >
          {testSend.isPending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-1.5" />
          )}
          Send Test
        </Button>
      </div>
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <p>Test emails use sample data (Jane Smith, Downtown Studio, etc.) and are prefixed with [TEST].</p>
      </div>
    </div>
  );
}

// ============= Email Queue Monitor =============

function EmailQueueMonitor() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: queueItems, isLoading } = useServiceEmailQueue({ status: statusFilter, limit: 50 });

  const counts = {
    all: queueItems?.length || 0,
    pending: queueItems?.filter(i => i.status === 'pending').length || 0,
    sent: queueItems?.filter(i => i.status === 'sent').length || 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Monitor queued and sent service communication emails. Refreshes every minute.
        </p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="merged">Merged</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <DashboardLoader className="py-8" size="md" />
      ) : !queueItems || queueItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MailCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">No emails in queue</p>
            <p className="text-sm text-muted-foreground mt-1">
              Emails will appear here when appointments are booked with active service flows.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {queueItems.map(item => (
            <QueueItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueItemRow({ item }: { item: ServiceEmailQueueItem }) {
  const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const appt = item.appointments as any;
  const step = item.service_email_flow_steps as any;

  return (
    <Card>
      <CardContent className="py-2.5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <StatusIcon className={cn('w-4 h-4 shrink-0', config.color)} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium truncate">{appt?.client_name || 'Unknown'}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground truncate">{appt?.service_name || 'Service'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{step?.subject || 'Email'}</span>
              {item.error_message && (
                <>
                  <span>·</span>
                  <span className="text-orange-500">{item.error_message}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-3">
          <Badge variant="outline" className="text-xs">
            {config.label}
          </Badge>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(item.scheduled_at), 'MMM d, h:mm a')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AddStepDialog({
  open,
  onOpenChange,
  flowId,
  nextOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string;
  nextOrder: number;
}) {
  const createStep = useCreateFlowStep();
  const [timingType, setTimingType] = useState<'before_appointment' | 'after_appointment'>('before_appointment');
  const [timingValue, setTimingValue] = useState(24);
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');

  const handleCreate = () => {
    createStep.mutate({
      flow_id: flowId,
      step_order: nextOrder,
      timing_type: timingType,
      timing_value: timingValue,
      subject,
      html_body: htmlBody,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setSubject('');
        setHtmlBody('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Communication Step</DialogTitle>
          <DialogDescription>
            Define when and what to send to the client relative to their appointment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Timing</Label>
              <Select value={timingType} onValueChange={(v) => setTimingType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="before_appointment">Before appointment</SelectItem>
                  <SelectItem value="after_appointment">After appointment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hours</Label>
              <Select value={String(timingValue)} onValueChange={(v) => setTimingValue(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMING_PRESETS.map(p => (
                    <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Subject Line</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Prep for your {{service_name}} appointment" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Email Body (HTML)</Label>
            <Textarea
              value={htmlBody}
              onChange={e => setHtmlBody(e.target.value)}
              rows={8}
              className="font-mono text-sm"
              placeholder={'<p>Hi {{first_name}},</p>\n<p>Your {{service_name}} appointment is coming up!</p>'}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map(v => (
              <Badge
                key={v.key}
                variant="outline"
                className="text-xs font-mono cursor-pointer hover:bg-accent"
                onClick={() => setHtmlBody(prev => prev + v.key)}
              >
                {v.key}
              </Badge>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!subject || createStep.isPending}>
            {createStep.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Add Step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Appointment Reminders Manager =============

function AppointmentRemindersManager() {
  const { data: configs, isLoading } = useAppointmentRemindersConfig();
  const upsertConfig = useUpsertReminderConfig();

  const reminderTypes = [
    { type: '24_hours', label: '24 Hours Before', description: 'Day-before reminder with appointment details and directions' },
    { type: '2_hours', label: '2 Hours Before', description: '"See you soon" reminder with parking and arrival info' },
    { type: '48_hours', label: '48 Hours Before', description: 'Two-day advance reminder for preparation' },
  ];

  const getConfig = (type: string) => configs?.find(c => c.reminder_type === type);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Appointment reminders are sent to all clients regardless of service. They consolidate all services for a visit into one email.
      </p>

      {isLoading ? (
        <DashboardLoader className="py-8" size="md" />
      ) : (
        <div className="space-y-3">
          {reminderTypes.map(rt => (
            <ReminderConfigCard
              key={rt.type}
              type={rt.type}
              label={rt.label}
              description={rt.description}
              config={getConfig(rt.type)}
              onSave={(updates) => upsertConfig.mutate({ reminder_type: rt.type, ...updates })}
              isSaving={upsertConfig.isPending}
            />
          ))}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Appointment reminders are <strong>transactional</strong> — they don't include unsubscribe links and aren't affected by marketing opt-outs.</p>
              <p>If no custom template is configured, a default reminder template will be used automatically.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReminderConfigCard({
  type,
  label,
  description,
  config,
  onSave,
  isSaving,
}: {
  type: string;
  label: string;
  description: string;
  config?: AppointmentReminderConfig;
  onSave: (updates: { is_active: boolean; subject: string; html_body: string }) => void;
  isSaving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isActive, setIsActive] = useState(config?.is_active ?? true);
  const [subject, setSubject] = useState(config?.subject || '');
  const [htmlBody, setHtmlBody] = useState(config?.html_body || '');
  const [showOverrides, setShowOverrides] = useState(false);

  const hasChanges = isActive !== (config?.is_active ?? true) ||
    subject !== (config?.subject || '') ||
    htmlBody !== (config?.html_body || '');

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <Bell className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 pt-3 border-t">
            <div className="space-y-1.5">
              <Label className="text-xs">Subject (leave empty for default)</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Reminder: Your appointment {{appointment_date}}" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email Body (HTML, leave empty for default)</Label>
              <Textarea
                value={htmlBody}
                onChange={e => setHtmlBody(e.target.value)}
                rows={6}
                className="font-mono text-sm"
                placeholder="<p>Hi {{first_name}},</p>"
              />
            </div>
            <div className="flex gap-2">
              {hasChanges && (
                <Button size={tokens.button.inline} onClick={() => onSave({ is_active: isActive, subject, html_body: htmlBody })} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  Save
                </Button>
              )}
              {config?.id && (
                <Button
                  variant="outline"
                  size={tokens.button.inline}
                  onClick={() => setShowOverrides(!showOverrides)}
                >
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  Location Overrides
                </Button>
              )}
            </div>

            {showOverrides && config?.id && (
              <ReminderLocationOverrides configId={config.id} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============= Reminder Location Overrides =============

function ReminderLocationOverrides({ configId }: { configId: string }) {
  const { data: locations } = useActiveLocations();
  const { data: overrides, isLoading } = useReminderOverrides(configId);
  const upsertOverride = useUpsertReminderOverride();
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [overrideSubject, setOverrideSubject] = useState('');
  const [overrideBody, setOverrideBody] = useState('');

  const existingLocationIds = overrides?.map(o => o.location_id) || [];
  const availableLocations = locations?.filter(l => !existingLocationIds.includes(l.id)) || [];

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  }

  return (
    <div className="space-y-3 pl-2 border-l-2 border-primary/20 ml-2">
      <p className="text-xs text-muted-foreground">
        Override reminder content for specific locations (e.g., different parking instructions).
      </p>

      {overrides && overrides.length > 0 && overrides.map(override => {
        const loc = locations?.find(l => l.id === override.location_id);
        return (
          <Card key={override.id} className="border-dashed">
            <CardContent className="py-2.5 px-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium">{loc?.name || override.location_id}</span>
              </div>
              <LocationOverrideEditor
                override={override}
                onSave={(subject, htmlBody) => upsertOverride.mutate({
                  configId,
                  locationId: override.location_id,
                  subject,
                  htmlBody,
                })}
                isSaving={upsertOverride.isPending}
              />
            </CardContent>
          </Card>
        );
      })}

      {availableLocations.length > 0 && (
        <div className="space-y-2">
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Add location override..." />
            </SelectTrigger>
            <SelectContent>
              {availableLocations.map(l => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedLocationId && (
            <div className="space-y-2">
              <Input
                value={overrideSubject}
                onChange={e => setOverrideSubject(e.target.value)}
                className="text-xs"
                placeholder="Override subject (optional)"
              />
              <Textarea
                value={overrideBody}
                onChange={e => setOverrideBody(e.target.value)}
                rows={3}
                className="text-xs font-mono"
                placeholder="Override body (optional)"
              />
              <Button
                size={tokens.button.inline}
                onClick={() => {
                  upsertOverride.mutate({
                    configId,
                    locationId: selectedLocationId,
                    subject: overrideSubject || null,
                    htmlBody: overrideBody || null,
                  }, {
                    onSuccess: () => {
                      setSelectedLocationId('');
                      setOverrideSubject('');
                      setOverrideBody('');
                    },
                  });
                }}
                disabled={upsertOverride.isPending}
              >
                {upsertOverride.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Save Override
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
