import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Wand2 } from 'lucide-react';
import { useCreateVoucher, generateVoucherCode } from '@/hooks/useVouchers';

const formSchema = z.object({
  code: z.string().min(4, 'Code must be at least 4 characters'),
  voucher_type: z.enum(['discount', 'free_service', 'credit', 'upgrade']),
  value: z.number().min(0).optional(),
  value_type: z.enum(['fixed', 'percentage']).default('fixed'),
  issued_to_name: z.string().optional(),
  issued_to_email: z.string().email().optional().or(z.literal('')),
  expires_at: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface VoucherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function VoucherFormDialog({
  open,
  onOpenChange,
  organizationId,
}: VoucherFormDialogProps) {
  const createVoucher = useCreateVoucher();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: generateVoucherCode(),
      voucher_type: 'discount',
      value: undefined,
      value_type: 'fixed',
      issued_to_name: '',
      issued_to_email: '',
      expires_at: '',
      notes: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    await createVoucher.mutateAsync({
      organization_id: organizationId,
      code: values.code.toUpperCase(),
      voucher_type: values.voucher_type,
      value: values.value || null,
      value_type: values.value_type,
      free_service_id: null,
      issued_to_client_id: null,
      issued_to_name: values.issued_to_name || null,
      issued_to_email: values.issued_to_email || null,
      valid_from: new Date().toISOString(),
      expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
      is_active: true,
      notes: values.notes || null,
      issued_by: null,
      promotion_id: null,
    });
    
    form.reset({
      code: generateVoucherCode(),
      voucher_type: 'discount',
      value: undefined,
      value_type: 'fixed',
      issued_to_name: '',
      issued_to_email: '',
      expires_at: '',
      notes: '',
    });
    onOpenChange(false);
  };

  const generateCode = () => {
    form.setValue('code', generateVoucherCode());
  };

  const voucherType = form.watch('voucher_type');
  const showValueFields = ['discount', 'credit'].includes(voucherType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Voucher</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voucher Code *</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input 
                        placeholder="GIFT-XXXX" 
                        {...field}
                        className="uppercase font-mono"
                      />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={generateCode}>
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="voucher_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voucher Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="discount">Discount</SelectItem>
                      <SelectItem value="free_service">Free Service</SelectItem>
                      <SelectItem value="credit">Salon Credit</SelectItem>
                      <SelectItem value="upgrade">Service Upgrade</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showValueFields && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="25"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed ($)</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issued_to_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issued_to_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>Leave blank for no expiration</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Internal notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createVoucher.isPending}>
                {createVoucher.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Voucher
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
