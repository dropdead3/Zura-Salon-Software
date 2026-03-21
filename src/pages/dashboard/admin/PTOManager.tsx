import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { usePTOPolicies, usePTOBalances } from '@/hooks/usePTOBalances';
import { Plus, Calendar, Settings } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';

const ACCRUAL_PERIODS = [
  { value: 'per_pay_period', label: 'Per Pay Period' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
];

export default function PTOManager() {
  const { policies, createPolicy, updatePolicy } = usePTOPolicies();
  const { balances } = usePTOBalances();
  const [policyOpen, setPolicyOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    accrual_rate: '',
    accrual_period: 'monthly',
    max_balance: '',
    carry_over_limit: '',
    is_default: false,
  });

  const handleCreatePolicy = () => {
    if (!form.name) return;
    createPolicy.mutate({
      name: form.name,
      accrual_rate: parseFloat(form.accrual_rate) || 0,
      accrual_period: form.accrual_period,
      max_balance: form.max_balance ? parseFloat(form.max_balance) : null,
      carry_over_limit: form.carry_over_limit ? parseFloat(form.carry_over_limit) : null,
      is_default: form.is_default,
    });
    setPolicyOpen(false);
    setForm({ name: '', accrual_rate: '', accrual_period: 'monthly', max_balance: '', carry_over_limit: '', is_default: false });
  };

  const policyList = policies.data || [];
  const balanceList = balances.data || [];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="PTO Manager"
          description="Manage PTO policies and employee balances"
        />

        <Tabs defaultValue="policies">
          <TabsList>
            <TabsTrigger value="policies"><Settings className="w-4 h-4 mr-2" />Policies</TabsTrigger>
            <TabsTrigger value="balances"><Calendar className="w-4 h-4 mr-2" />Balances</TabsTrigger>
          </TabsList>

          <TabsContent value="policies" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />New Policy</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create PTO Policy</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Policy Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard PTO" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Accrual Rate (hours)</Label><Input type="number" value={form.accrual_rate} onChange={e => setForm(f => ({ ...f, accrual_rate: e.target.value }))} /></div>
                      <div>
                        <Label>Accrual Period</Label>
                        <Select value={form.accrual_period} onValueChange={v => setForm(f => ({ ...f, accrual_period: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ACCRUAL_PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Max Balance (hours)</Label><Input type="number" value={form.max_balance} onChange={e => setForm(f => ({ ...f, max_balance: e.target.value }))} placeholder="No limit" /></div>
                      <div><Label>Carry-Over Limit (hours)</Label><Input type="number" value={form.carry_over_limit} onChange={e => setForm(f => ({ ...f, carry_over_limit: e.target.value }))} placeholder="No limit" /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
                      <Label>Default policy for new hires</Label>
                    </div>
                    <Button onClick={handleCreatePolicy} disabled={createPolicy.isPending} className="w-full">
                      {createPolicy.isPending ? 'Creating...' : 'Create Policy'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {policyList.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No PTO policies configured yet.</CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {policyList.map(policy => (
                  <Card key={policy.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{policy.name}</CardTitle>
                        <div className="flex gap-1.5">
                          {policy.is_default && <Badge variant="default">Default</Badge>}
                          <Badge variant={policy.is_active ? 'secondary' : 'outline'}>{policy.is_active ? 'Active' : 'Inactive'}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Accrual:</span> {policy.accrual_rate}h / {ACCRUAL_PERIODS.find(p => p.value === policy.accrual_period)?.label}</p>
                      <p><span className="text-muted-foreground">Max Balance:</span> {policy.max_balance ? `${policy.max_balance}h` : 'Unlimited'}</p>
                      <p><span className="text-muted-foreground">Carry-Over:</span> {policy.carry_over_limit ? `${policy.carry_over_limit}h` : 'Unlimited'}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="balances">
            <Card>
              <CardHeader><CardTitle>Employee Balances</CardTitle></CardHeader>
              <CardContent>
                {balanceList.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No balances tracked yet. Assign policies to employees to begin tracking.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Current Balance</TableHead>
                        <TableHead>Accrued YTD</TableHead>
                        <TableHead>Used YTD</TableHead>
                        <TableHead>Carried Over</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balanceList.map(bal => (
                        <TableRow key={bal.id}>
                          <TableCell className="font-medium">{bal.user_id.slice(0, 8)}...</TableCell>
                          <TableCell>{bal.current_balance}h</TableCell>
                          <TableCell>{bal.accrued_ytd}h</TableCell>
                          <TableCell>{bal.used_ytd}h</TableCell>
                          <TableCell>{bal.carried_over}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
