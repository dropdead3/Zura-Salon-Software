import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useHireEmployee, HireResult } from '@/hooks/useHireEmployee';
import { useRoles } from '@/hooks/useRoles';
import { usePayrollConnection } from '@/hooks/usePayrollConnection';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, Check, User, DollarSign, ClipboardList, FileSignature, Loader2, Copy, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

const STEPS = [
  { id: 'info', label: 'Basic Info', icon: User },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'onboarding', label: 'Onboarding', icon: ClipboardList },
  { id: 'legal', label: 'Legal & Docs', icon: FileSignature },
];

export function NewHireWizardContent() {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { effectiveOrganization: organization } = useOrganizationContext();
  const hireEmployee = useHireEmployee();
  const { data: roles } = useRoles();
  const { isConnected: payrollConnected, provider: connectedProvider } = usePayrollConnection();
  const { currency } = useFormatCurrency();

  const [step, setStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [hireResult, setHireResult] = useState<HireResult | null>(null);
  const [copied, setCopied] = useState(false);

  const applicantName = searchParams.get('name') || '';
  const applicantEmail = searchParams.get('email') || '';
  const applicantId = searchParams.get('applicantId') || '';

  const [form, setForm] = useState({
    fullName: applicantName,
    email: applicantEmail,
    role: 'team_member',
    locationId: '',
    startDate: new Date().toISOString().split('T')[0],
    title: '',
    payType: 'hourly',
    payRate: '',
    assignOnboardingTasks: true,
    generateOfferLetter: false,
    triggerPayrollProvider: false,
  });

  const { data: locations } = useQuery({
    queryKey: ['locations-select', organization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', organization!.id)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!organization?.id,
  });

  const configurableRoles = roles?.filter(r => 
    !['super_admin', 'platform_admin'].includes(r.name)
  ) || [];

  const updateField = (field: string, value: unknown) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const canProceed = () => {
    if (step === 0) return form.fullName && form.email && form.role;
    return true;
  };

  const handleSubmit = async () => {
    const result = await hireEmployee.mutateAsync({
      email: form.email,
      fullName: form.fullName,
      role: form.role,
      organizationId: organization?.id,
      locationId: form.locationId || undefined,
      startDate: form.startDate,
      payType: form.payType,
      payRate: form.payRate ? parseFloat(form.payRate) : undefined,
      title: form.title || undefined,
      assignOnboardingTasks: form.assignOnboardingTasks,
      generateOfferLetter: form.generateOfferLetter,
      triggerPayrollProvider: form.triggerPayrollProvider,
      payrollProvider: form.triggerPayrollProvider ? connectedProvider : null,
      applicantId: applicantId || undefined,
    });
    setHireResult(result);
    setShowResult(true);
  };

  const copyCredentials = () => {
    if (!hireResult) return;
    navigator.clipboard.writeText(`Email: ${hireResult.email}\nPassword: ${hireResult.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium w-full',
                  isActive && 'bg-primary text-primary-foreground',
                  isDone && 'bg-primary/10 text-primary cursor-pointer',
                  !isActive && !isDone && 'bg-muted text-muted-foreground'
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-border hidden sm:block" />}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <CardTitle className="text-lg mb-1">Basic Information</CardTitle>
                <CardDescription>Enter the new hire's details</CardDescription>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Full Name *</Label>
                  <Input value={form.fullName} onChange={e => updateField('fullName', e.target.value)} placeholder="Jane Smith" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="jane@salon.com" />
                </div>
                <div>
                  <Label>Role *</Label>
                  <Select value={form.role} onValueChange={v => updateField('role', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {configurableRoles.map(r => (
                        <SelectItem key={r.id} value={r.name}>
                          {r.display_name || r.name.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Job Title</Label>
                  <Input value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Stylist" />
                </div>
                <div>
                  <Label>Location</Label>
                  <Select value={form.locationId} onValueChange={v => updateField('locationId', v)}>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {locations?.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={e => updateField('startDate', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Compensation */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <CardTitle className="text-lg mb-1">Compensation</CardTitle>
                <CardDescription>Set pay type and rate</CardDescription>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Pay Type</Label>
                  <Select value={form.payType} onValueChange={v => updateField('payType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="salary">Salary</SelectItem>
                      <SelectItem value="commission">Commission Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{form.payType === 'salary' ? 'Annual Salary' : 'Hourly Rate')}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={form.payRate}
                      onChange={e => updateField('payRate', e.target.value)}
                      placeholder={form.payType === 'salary' ? '45000' : '18.00')}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Onboarding Config */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <CardTitle className="text-lg mb-1">Onboarding Configuration</CardTitle>
                <CardDescription>Configure what the new hire will see on their first login</CardDescription>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Auto-assign Onboarding Tasks</p>
                      <p className="text-xs text-muted-foreground">Tasks configured for the "{form.role}" role will be assigned automatically</p>
                    </div>
                  </div>
                  <Switch checked={form.assignOnboardingTasks} onCheckedChange={v => updateField('assignOnboardingTasks', v)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Legal & Docs */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <CardTitle className="text-lg mb-1">Legal & Documents</CardTitle>
                <CardDescription>Configure offer letter and tax document handling</CardDescription>
              </div>
              <div className="space-y-4">
                {/* Payroll Provider Integration */}
                <div className={cn(
                  "p-4 rounded-lg border",
                  payrollConnected ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className={cn("w-5 h-5", payrollConnected ? "text-success-foreground" : "text-warning-foreground")} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {payrollConnected
                              ? `${connectedProvider === 'gusto' ? 'Gusto' : connectedProvider === 'quickbooks' ? 'QuickBooks' : connectedProvider} Payroll`
                              : 'Payroll Provider')}
                          </p>
                          <Badge variant={payrollConnected ? "default" : "secondary"} className="text-[10px]">
                            {payrollConnected ? 'Connected' : 'Not Connected')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {payrollConnected && connectedProvider === 'gusto'
                            ? 'Offer letter, W-4, I-9, and direct deposit will be handled via Gusto'
                            : payrollConnected && connectedProvider === 'quickbooks'
                            ? 'Employee setup, tax forms, and direct deposit will be handled via QuickBooks Payroll'
                            : 'Connect a payroll provider in the Payroll Hub to automate tax documents and onboarding')}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={form.triggerPayrollProvider} 
                      onCheckedChange={v => updateField('triggerPayrollProvider', v)}
                      disabled={!payrollConnected}
                    />
                  </div>
                </div>

                {/* PandaDoc Offer Letter */}
                {(() => {
                  const gustoHandlesOfferLetter = form.triggerPayrollProvider && connectedProvider === 'gusto';
                  return (
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileSignature className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">PandaDoc Offer Letter</p>
                            <p className="text-xs text-muted-foreground">
                              Generate and send an offer letter for e-signature via PandaDoc
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={form.generateOfferLetter} 
                          onCheckedChange={v => updateField('generateOfferLetter', v)}
                          disabled={gustoHandlesOfferLetter}
                        />
                      </div>
                      {gustoHandlesOfferLetter && (
                        <p className="text-xs text-muted-foreground mt-2 ml-8">
                          Offer letter will be handled by Gusto instead
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Manual Notice */}
                {!payrollConnected && !form.generateOfferLetter && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Manual Process Required</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Without a payroll provider or PandaDoc, you'll need to handle offer letters and tax documents (W-4, I-9) manually. 
                          Use the Document Tracker to track completion.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {/* Navigation */}
        <Separator />
        <div className="flex items-center justify-between p-6">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Next<ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={hireEmployee.isPending || !canProceed()}>
              {hireEmployee.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Account...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" />Complete Hire</>
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Summary Sidebar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Hire Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {form.fullName && <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{form.fullName}</span></div>}
          {form.email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{form.email}</span></div>}
          {form.role && <div className="flex justify-between"><span className="text-muted-foreground">Role</span><Badge variant="secondary" className="capitalize text-[10px]">{form.role.replace(/_/g, ' ')}</Badge></div>}
          {form.startDate && <div className="flex justify-between"><span className="text-muted-foreground">Start Date</span><span>{form.startDate}</span></div>}
          {form.payRate && <div className="flex justify-between"><span className="text-muted-foreground">Pay</span><span>{currency}{form.payRate}{form.payType === 'hourly' ? '/hr' : form.payType === 'salary' ? '/yr' : '')}</span></div>}
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success-foreground" />
              Employee Hired Successfully
            </DialogTitle>
          </DialogHeader>
          {hireResult && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{hireResult.message}</p>

              {/* Credentials */}
              <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Login Credentials</p>
                  <Button variant="ghost" size={tokens.button.inline} onClick={copyCredentials}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Email:</span> {hireResult.email}</p>
                  <p><span className="text-muted-foreground">Password:</span> <code className="bg-background px-1.5 py-0.5 rounded text-xs">{hireResult.password}</code></p>
                </div>
                <p className="text-xs text-warning-foreground">⚠️ Share these credentials securely. They won't be shown again.</p>
              </div>

              {/* Status */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success-foreground" />
                  <span>{hireResult.assignedTaskCount} onboarding tasks assigned</span>
                </div>
                {hireResult.payrollStatus && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning-foreground" />
                    <span>{hireResult.payrollMessage}</span>
                  </div>
                )}
                {hireResult.offerLetterStatus && (
                  <div className="flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-primary" />
                    <span>{hireResult.offerLetterMessage}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => navigate(dashPath('/admin/payroll?tab=overview')} className="flex-1">
                  Back to Hiring & Payroll Hub
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowResult(false);
                  setStep(0);
                  setForm({
                    fullName: '', email: '', role: 'team_member', locationId: '', startDate: new Date().toISOString().split('T')[0],
                    title: '', payType: 'hourly', payRate: '', assignOnboardingTasks: true, generateOfferLetter: false, triggerPayrollProvider: false,
                  });
                }}>
                  Hire Another
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
