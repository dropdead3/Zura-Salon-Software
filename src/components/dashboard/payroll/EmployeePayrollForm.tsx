import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  useEmployeePayrollSettings, 
  EmployeePayrollSettings,
  PayType 
} from '@/hooks/useEmployeePayrollSettings';

const formSchema = z.object({
  employee_id: z.string().min(1, 'Please select an employee'),
  pay_type: z.enum(['hourly', 'salary', 'commission', 'hourly_plus_commission', 'salary_plus_commission']),
  hourly_rate: z.coerce.number().min(0).optional().nullable(),
  salary_amount: z.coerce.number().min(0).optional().nullable(),
  commission_enabled: z.boolean().default(false),
  is_payroll_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface EmployeePayrollFormProps {
  existingSettings?: EmployeePayrollSettings;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EmployeePayrollForm({ 
  existingSettings, 
  onSuccess, 
  onCancel 
}: EmployeePayrollFormProps) {
  const { 
    employeesWithoutSettings, 
    upsertSettings, 
    isUpserting 
  } = useEmployeePayrollSettings();

  const isEditing = !!existingSettings;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: existingSettings?.employee_id || '',
      pay_type: (existingSettings?.pay_type as PayType) || 'hourly',
      hourly_rate: existingSettings?.hourly_rate || null,
      salary_amount: existingSettings?.salary_amount || null,
      commission_enabled: existingSettings?.commission_enabled || false,
      is_payroll_active: existingSettings?.is_payroll_active ?? true,
    },
  });

  const payType = form.watch('pay_type');
  const showHourlyRate = payType === 'hourly' || payType === 'hourly_plus_commission';
  const showSalary = payType === 'salary' || payType === 'salary_plus_commission';
  const showCommissionToggle = !['hourly_plus_commission', 'salary_plus_commission', 'commission'].includes(payType);

  const onSubmit = (values: FormValues) => {
    upsertSettings({
      employee_id: values.employee_id,
      pay_type: values.pay_type,
      hourly_rate: showHourlyRate ? values.hourly_rate : null,
      salary_amount: showSalary ? values.salary_amount : null,
      commission_enabled: values.commission_enabled || payType.includes('commission'),
      is_payroll_active: values.is_payroll_active,
    }, {
      onSuccess: () => {
        form.reset();
        onSuccess();
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Employee Select (only for new) */}
        {!isEditing && (
          <FormField
            control={form.control}
            name="employee_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employeesWithoutSettings.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        All employees are already in payroll
                      </div>
                    ) : (
                      employeesWithoutSettings.map((emp) => (
                        <SelectItem key={emp.user_id} value={emp.user_id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={emp.photo_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {emp.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{formatDisplayName(emp.full_name || '', emp.display_name)}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Pay Type */}
        <FormField
          control={form.control}
          name="pay_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pay Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="commission">Commission Only</SelectItem>
                  <SelectItem value="hourly_plus_commission">Hourly + Commission</SelectItem>
                  <SelectItem value="salary_plus_commission">Salary + Commission</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hourly Rate */}
        {showHourlyRate && (
          <FormField
            control={form.control}
            name="hourly_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hourly Rate</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-7"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </div>
                </FormControl>
                <FormDescription>Per hour rate before taxes</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Salary Amount */}
        {showSalary && (
          <FormField
            control={form.control}
            name="salary_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual Salary</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      step="100"
                      min="0"
                      placeholder="0"
                      className="pl-7"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </div>
                </FormControl>
                <FormDescription>Annual salary before taxes</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Commission Toggle (if not already commission type) */}
        {showCommissionToggle && (
          <FormField
            control={form.control}
            name="commission_enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Enable Commission</FormLabel>
                  <FormDescription>
                    Add commission earnings on top of base pay
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {/* Payroll Active Toggle */}
        <FormField
          control={form.control}
          name="is_payroll_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Include in Payroll</FormLabel>
                <FormDescription>
                  Active employees are included in payroll runs
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isUpserting}>
            {isUpserting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              isEditing ? 'Save Changes' : 'Add Employee'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
