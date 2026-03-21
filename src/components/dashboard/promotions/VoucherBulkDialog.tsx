import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreateBulkVouchers } from '@/hooks/useVouchers';

const formSchema = z.object({
  count: z.number().min(1).max(500),
  prefix: z.string().max(10).optional(),
  voucher_type: z.enum(['discount', 'free_service', 'credit', 'upgrade']),
  value: z.number().min(0).optional(),
  value_type: z.enum(['fixed', 'percentage']).default('fixed'),
  expires_at: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface VoucherBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function VoucherBulkDialog({
  open,
  onOpenChange,
  organizationId,
}: VoucherBulkDialogProps) {
  const createBulkVouchers = useCreateBulkVouchers();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      count: 10,
      prefix: '',
      voucher_type: 'discount',
      value: undefined,
      value_type: 'fixed',
      expires_at: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    await createBulkVouchers.mutateAsync({
      organizationId,
      count: values.count,
      prefix: values.prefix || '',
      voucherTemplate: {
        voucher_type: values.voucher_type,
        value: values.value || null,
        value_type: values.value_type,
        free_service_id: null,
        issued_to_client_id: null,
        issued_to_name: null,
        issued_to_email: null,
        valid_from: new Date().toISOString(),
        expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
        is_active: true,
        notes: `Bulk generated: ${values.count} vouchers`,
        issued_by: null,
        promotion_id: null,
      },
    });
    
    form.reset();
    onOpenChange(false);
  };

  const voucherType = form.watch('voucher_type');
  const showValueFields = ['discount', 'credit'].includes(voucherType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Generate Vouchers</DialogTitle>
          <DialogDescription>
            Create multiple vouchers at once for campaigns or giveaways
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Vouchers *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min={1}
                        max={500}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Max 500</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code Prefix</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="SPRING"
                        maxLength={10}
                        {...field}
                        className="uppercase"
                      />
                    </FormControl>
                    <FormDescription>e.g., SPRING-XXXXX</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>All vouchers will expire on this date</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBulkVouchers.isPending}>
                {createBulkVouchers.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate Vouchers
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
