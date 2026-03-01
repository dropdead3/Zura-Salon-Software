import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStaffDocuments } from '@/hooks/useStaffDocuments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Plus, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { differenceInDays, parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';

const DOCUMENT_TYPES = [
  { value: 'cosmetology_license', label: 'Cosmetology License' },
  { value: 'continuing_education', label: 'Continuing Education' },
  { value: 'health_certificate', label: 'Health Certificate' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

function getDocumentStatus(expirationDate: string | null) {
  if (!expirationDate) return { status: 'valid', label: 'Valid', variant: 'default' as const };
  const days = differenceInDays(parseISO(expirationDate), new Date());
  if (days < 0) return { status: 'expired', label: 'Expired', variant: 'destructive' as const };
  if (days <= 30) return { status: 'expiring_soon', label: `Expires in ${days}d`, variant: 'secondary' as const };
  return { status: 'valid', label: 'Valid', variant: 'default' as const };
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'expired') return <XCircle className="w-4 h-4 text-destructive" />;
  if (status === 'expiring_soon') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <CheckCircle className="w-4 h-4 text-emerald-500" />;
}

export default function DocumentTracker() {
  const { formatDate } = useFormatDate();
  const { documents, createDocument } = useStaffDocuments();
  const { effectiveOrganization: organization } = useOrganizationContext();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    document_type: 'cosmetology_license',
    document_name: '',
    license_number: '',
    issued_date: '',
    expiration_date: '',
    notes: '',
    user_id: '',
  });

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
    if (!form.document_name || !form.user_id) return;
    createDocument.mutate({
      document_type: form.document_type,
      document_name: form.document_name,
      license_number: form.license_number || null,
      issued_date: form.issued_date || null,
      expiration_date: form.expiration_date || null,
      notes: form.notes || null,
      user_id: form.user_id,
    });
    setOpen(false);
    setForm({ document_type: 'cosmetology_license', document_name: '', license_number: '', issued_date: '', expiration_date: '', notes: '', user_id: '' });
  };

  const docs = documents.data || [];
  const expiredCount = docs.filter(d => getDocumentStatus(d.expiration_date).status === 'expired').length;
  const expiringCount = docs.filter(d => getDocumentStatus(d.expiration_date).status === 'expiring_soon').length;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Document & License Tracker"
          description="Track licenses, certifications, and compliance documents"
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Document</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Team Member</Label>
                  <Select value={form.user_id} onValueChange={v => setForm(f => ({ ...f, user_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent>
                      {teamMembers?.map(m => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.display_name || m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Document Type</Label>
                  <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Document Name</Label>
                  <Input value={form.document_name} onChange={e => setForm(f => ({ ...f, document_name: e.target.value }))} placeholder="e.g. State Cosmetology License" />
                </div>
                <div>
                  <Label>License Number</Label>
                  <Input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} autoCapitalize="none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Issued Date</Label>
                    <Input type="date" value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Expiration Date</Label>
                    <Input type="date" value={form.expiration_date} onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <Button onClick={handleSubmit} disabled={createDocument.isPending} className="w-full">
                  {createDocument.isPending ? 'Adding...' : 'Add Document'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          }
        />

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-medium">{docs.length}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-medium">{expiringCount}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-2xl font-medium">{expiredCount}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader><CardTitle>All Documents</CardTitle></CardHeader>
          <CardContent>
            {docs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No documents tracked yet. Add one to get started.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>License #</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map(doc => {
                    const docStatus = getDocumentStatus(doc.expiration_date);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell><StatusIcon status={docStatus.status} /></TableCell>
                        <TableCell className="font-medium">{doc.document_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{doc.license_number || '—'}</TableCell>
                        <TableCell>
                          {doc.expiration_date ? (
                            <Badge variant={docStatus.variant}>{docStatus.label} · {formatDate(parseISO(doc.expiration_date), 'MMM d, yyyy')}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{doc.notes || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
