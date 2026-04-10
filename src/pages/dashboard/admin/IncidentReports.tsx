import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIncidentReports } from '@/hooks/useIncidentReports';
import { useStaffStrikes } from '@/hooks/useStaffStrikes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Plus, ShieldAlert, AlertTriangle, Clock } from 'lucide-react';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { StaffStrikesTabContent } from '@/components/dashboard/StaffStrikesTabContent';

const INCIDENT_TYPES = [
  { value: 'workplace_injury', label: 'Workplace Injury' },
  { value: 'equipment_damage', label: 'Equipment Damage' },
  { value: 'client_complaint', label: 'Client Complaint' },
  { value: 'safety_hazard', label: 'Safety Hazard' },
  { value: 'chemical_exposure', label: 'Chemical Exposure' },
  { value: 'slip_fall', label: 'Slip / Fall' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/10 text-amber-600' },
  { value: 'high', label: 'High', color: 'bg-orange-500/10 text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500/10 text-red-600' },
];

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Open', variant: 'destructive' },
  investigating: { label: 'Investigating', variant: 'secondary' },
  resolved: { label: 'Resolved', variant: 'default' },
  closed: { label: 'Closed', variant: 'outline' },
};

export default function IncidentReports() {
  const { formatDate } = useFormatDate();
  const { incidents, createIncident, updateIncident } = useIncidentReports();
  const { effectiveOrganization: organization } = useOrganizationContext();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'incidents';
  const defaultUserId = searchParams.get('userId') || undefined;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    incident_type: 'other',
    incident_date: new Date().toISOString().split('T')[0],
    description: '',
    severity: 'low',
    witnesses: '',
    corrective_action: '',
    involved_user_id: '',
  });

  // Get active strike count for badge
  const { data: strikes = [] } = useStaffStrikes();
  const activeStrikeCount = strikes.filter((s) => !s.is_resolved).length;

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members-select', organization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name')
        .eq('organization_id', organization!.id)
        .eq('is_active', true)
        .order('display_name');
      return data || [];
    },
    enabled: !!organization?.id,
  });

  const handleSubmit = () => {
    if (!form.description) return;
    createIncident.mutate({
      incident_type: form.incident_type,
      incident_date: form.incident_date,
      description: form.description,
      severity: form.severity,
      witnesses: form.witnesses || null,
      corrective_action: form.corrective_action || null,
      involved_user_id: form.involved_user_id || null,
    });
    setOpen(false);
    setForm({ incident_type: 'other', incident_date: new Date().toISOString().split('T')[0], description: '', severity: 'low', witnesses: '', corrective_action: '', involved_user_id: '' });
  };

  const incidentList = incidents.data || [];
  const openCount = incidentList.filter(i => i.status === 'open').length;
  const investigatingCount = incidentList.filter(i => i.status === 'investigating').length;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Incidents & Accountability"
          description="Document incidents and track accountability measures"
          actions={<PageExplainer pageId="incident-reports" />}
        />

        <Tabs defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="strikes" className="gap-2">
              Staff Strikes
              {activeStrikeCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {activeStrikeCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incidents">
            <div className="space-y-6">
              {/* Incident Actions */}
              <div className="flex justify-end">
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2" />Report Incident</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Incident Type</Label>
                          <Select value={form.incident_type} onValueChange={v => setForm(f => ({ ...f, incident_type: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {INCIDENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Severity</Label>
                          <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div><Label>Date</Label><Input type="date" value={form.incident_date} onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))} /></div>
                      <div>
                        <Label>Involved Person (optional)</Label>
                        <Select value={form.involved_user_id} onValueChange={v => setForm(f => ({ ...f, involved_user_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                          <SelectContent>
                            {teamMembers?.map(m => (
                              <SelectItem key={m.user_id} value={m.user_id}>{m.display_name || m.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the incident..." /></div>
                      <div><Label>Witnesses</Label><Input value={form.witnesses} onChange={e => setForm(f => ({ ...f, witnesses: e.target.value }))} placeholder="Names of witnesses" /></div>
                      <div><Label>Corrective Action Taken</Label><Textarea value={form.corrective_action} onChange={e => setForm(f => ({ ...f, corrective_action: e.target.value }))} /></div>
                      <Button onClick={handleSubmit} disabled={createIncident.isPending} className="w-full">
                        {createIncident.isPending ? 'Submitting...' : 'Submit Report'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardContent className="p-4 flex items-center gap-3"><ShieldAlert className="w-8 h-8 text-primary" /><div><p className="text-2xl font-medium">{incidentList.length}</p><p className="text-sm text-muted-foreground">Total Incidents</p></div></CardContent></Card>
                <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="w-8 h-8 text-destructive" /><div><p className="text-2xl font-medium">{openCount}</p><p className="text-sm text-muted-foreground">Open</p></div></CardContent></Card>
                <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="w-8 h-8 text-amber-500" /><div><p className="text-2xl font-medium">{investigatingCount}</p><p className="text-sm text-muted-foreground">Investigating</p></div></CardContent></Card>
              </div>

              {/* Incident Table */}
              <Card>
                <CardHeader><CardTitle>Incident Log</CardTitle></CardHeader>
                <CardContent>
                  {incidentList.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No incidents reported.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incidentList.map(incident => {
                          const statusCfg = STATUS_MAP[incident.status] || STATUS_MAP.open;
                          const sevCfg = SEVERITIES.find(s => s.value === incident.severity);
                          return (
                            <TableRow key={incident.id}>
                              <TableCell><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></TableCell>
                              <TableCell>{INCIDENT_TYPES.find(t => t.value === incident.incident_type)?.label || incident.incident_type}</TableCell>
                              <TableCell><Badge variant="outline" className={sevCfg?.color}>{sevCfg?.label || incident.severity}</Badge></TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(parseISO(incident.incident_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell className="max-w-[250px] truncate">{incident.description}</TableCell>
                              <TableCell>
                                {incident.status === 'open' && (
                                  <Button size={tokens.button.inline} variant="outline" onClick={() => updateIncident.mutate({ id: incident.id, status: 'investigating' })}>Investigate</Button>
                                )}
                                {incident.status === 'investigating' && (
                                  <Button size={tokens.button.inline} variant="outline" onClick={() => updateIncident.mutate({ id: incident.id, status: 'resolved', resolved_at: new Date().toISOString() })}>Resolve</Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="strikes">
            <StaffStrikesTabContent defaultUserId={defaultUserId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
