import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, DollarSign, Calendar, Settings } from 'lucide-react';

const formSchema = z.object({
  contract_name: z.string().min(1, 'Contract name is required'),
  rent_amount: z.number().min(1, 'Rent amount is required'),
  rent_frequency: z.enum(['weekly', 'monthly']),
  due_day_of_month: z.number().min(1).max(28).optional(),
  due_day_of_week: z.number().min(0).max(6).optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  security_deposit: z.number().min(0).optional(),
  auto_renew: z.boolean().default(false),
  notice_period_days: z.number().min(0).default(30),
  includes_utilities: z.boolean().default(false),
  includes_wifi: z.boolean().default(false),
  includes_products: z.boolean().default(false),
  retail_commission_enabled: z.boolean().default(false),
  retail_commission_rate: z.number().min(0).max(100).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface IssueContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renterId: string;
  renterName: string;
  organizationId: string;
}

export function IssueContractDialog({
  open,
  onOpenChange,
  renterId,
  renterName,
  organizationId,
}: IssueContractDialogProps) {
  const [activeTab, setActiveTab] = useState('terms');
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contract_name: `Booth Rental Agreement - ${renterName}`,
      rent_amount: 0,
      rent_frequency: 'monthly',
      due_day_of_month: 1,
      due_day_of_week: 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      security_deposit: 0,
      auto_renew: false,
      notice_period_days: 30,
      includes_utilities: false,
      includes_wifi: false,
      includes_products: false,
      retail_commission_enabled: false,
      retail_commission_rate: 10,
    },
  });

  const rentFrequency = form.watch('rent_frequency');
  const retailCommissionEnabled = form.watch('retail_commission_enabled');

  const createContract = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase
        .from('booth_rental_contracts' as any)
        .insert({
          booth_renter_id: renterId,
          organization_id: organizationId,
          contract_name: values.contract_name,
          rent_amount: values.rent_amount,
          rent_frequency: values.rent_frequency,
          due_day_of_month: values.rent_frequency === 'monthly' ? values.due_day_of_month : null,
          due_day_of_week: values.rent_frequency === 'weekly' ? values.due_day_of_week : null,
          start_date: values.start_date,
          end_date: values.end_date || null,
          security_deposit: values.security_deposit || null,
          auto_renew: values.auto_renew,
          notice_period_days: values.notice_period_days,
          includes_utilities: values.includes_utilities,
          includes_wifi: values.includes_wifi,
          includes_products: values.includes_products,
          retail_commission_enabled: values.retail_commission_enabled,
          retail_commission_rate: values.retail_commission_enabled ? values.retail_commission_rate : null,
          status: 'draft',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renter-contracts', renterId] });
      toast.success('Contract created', {
        description: 'The contract has been saved as a draft.',
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to create contract', { description: error.message });
    },
  });

  const onSubmit = (values: FormValues) => {
    createContract.mutate(values);
  };

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Issue Contract
          </DialogTitle>
          <DialogDescription>
            Create a new booth rental contract for {renterName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="terms" className="gap-1.5">
                <DollarSign className="h-4 w-4" />
                Terms
              </TabsTrigger>
              <TabsTrigger value="dates" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                Dates
              </TabsTrigger>
              <TabsTrigger value="extras" className="gap-1.5">
                <Settings className="h-4 w-4" />
                Extras
              </TabsTrigger>
            </TabsList>

            {/* Terms Tab */}
            <TabsContent value="terms" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contract_name">Contract Name</Label>
                <Input
                  id="contract_name"
                  {...form.register('contract_name')}
                />
                {form.formState.errors.contract_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.contract_name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent_amount">Rent Amount ($)</Label>
                  <Input
                    id="rent_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register('rent_amount', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={rentFrequency}
                    onValueChange={(value) => form.setValue('rent_frequency', value as 'weekly' | 'monthly')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {rentFrequency === 'monthly' ? (
                <div className="space-y-2">
                  <Label>Due Day of Month</Label>
                  <Select
                    value={String(form.watch('due_day_of_month'))}
                    onValueChange={(value) => form.setValue('due_day_of_month', Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Due Day of Week</Label>
                  <Select
                    value={String(form.watch('due_day_of_week'))}
                    onValueChange={(value) => form.setValue('due_day_of_week', Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((day) => (
                        <SelectItem key={day.value} value={String(day.value)}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="security_deposit">Security Deposit ($)</Label>
                <Input
                  id="security_deposit"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('security_deposit', { valueAsNumber: true })}
                />
              </div>
            </TabsContent>

            {/* Dates Tab */}
            <TabsContent value="dates" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...form.register('start_date')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date (optional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    {...form.register('end_date')}
                  />
                </div>
              </div>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Renew</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically renew when contract ends
                      </p>
                    </div>
                    <Switch
                      checked={form.watch('auto_renew')}
                      onCheckedChange={(checked) => form.setValue('auto_renew', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notice_period_days">Notice Period (days)</Label>
                    <Input
                      id="notice_period_days"
                      type="number"
                      min="0"
                      {...form.register('notice_period_days', { valueAsNumber: true })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Extras Tab */}
            <TabsContent value="extras" className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <h4 className="text-sm font-medium">Included in Rent</h4>
                  
                  <div className="flex items-center justify-between">
                    <Label>Utilities</Label>
                    <Switch
                      checked={form.watch('includes_utilities')}
                      onCheckedChange={(checked) => form.setValue('includes_utilities', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>WiFi</Label>
                    <Switch
                      checked={form.watch('includes_wifi')}
                      onCheckedChange={(checked) => form.setValue('includes_wifi', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Products (backbar)</Label>
                    <Switch
                      checked={form.watch('includes_products')}
                      onCheckedChange={(checked) => form.setValue('includes_products', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Retail Commission</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable commission on retail sales
                      </p>
                    </div>
                    <Switch
                      checked={retailCommissionEnabled}
                      onCheckedChange={(checked) => form.setValue('retail_commission_enabled', checked)}
                    />
                  </div>

                  {retailCommissionEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="retail_commission_rate">Commission Rate (%)</Label>
                      <Input
                        id="retail_commission_rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        {...form.register('retail_commission_rate', { valueAsNumber: true })}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createContract.isPending}>
              {createContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Contract
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
