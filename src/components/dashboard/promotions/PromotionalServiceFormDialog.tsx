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
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
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
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useCreatePromotionalService } from '@/hooks/usePromotionalServices';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';

const formSchema = z.object({
  original_service_id: z.string().min(1, 'Select a service'),
  promotional_name: z.string().min(1, 'Name is required'),
  promotional_price: z.number().min(0, 'Price must be positive'),
  expires_at: z.string().min(1, 'Expiration date is required'),
  auto_deactivate: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface PromotionalServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function PromotionalServiceFormDialog({
  open,
  onOpenChange,
  organizationId,
}: PromotionalServiceFormDialogProps) {
  const { formatCurrency } = useFormatCurrency();
  const createPromoService = useCreatePromotionalService();

  // Fetch services for the dropdown
  const { data: services } = useQuery({
    queryKey: ['services', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, category')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .is('is_promotional', null) // Exclude existing promo services
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      original_service_id: '',
      promotional_name: '',
      promotional_price: 0,
      expires_at: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      auto_deactivate: true,
    },
  });

  const selectedServiceId = form.watch('original_service_id');
  const selectedService = services?.find(s => s.id === selectedServiceId);

  const onSubmit = async (values: FormValues) => {
    await createPromoService.mutateAsync({
      organizationId,
      originalServiceId: values.original_service_id,
      promotionalName: values.promotional_name,
      promotionalPrice: values.promotional_price,
      expiresAt: new Date(values.expires_at).toISOString(),
      autoDeactivate: values.auto_deactivate,
    });
    
    form.reset();
    onOpenChange(false);
  };

  // Auto-fill promotional name when service is selected
  const handleServiceChange = (serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    if (service) {
      form.setValue('promotional_name', `${service.name} - Special`);
      form.setValue('promotional_price', Number(service.price) * 0.8); // 20% off by default
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Promotional Service</DialogTitle>
          <DialogDescription>
            Create a temporary discounted version of an existing service
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="original_service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Service *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleServiceChange(value);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services?.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - {formatCurrency(service.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedService && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p>
                  <span className="text-muted-foreground">Original Price:</span>{' '}
                  <span className="font-medium">{formatCurrency(selectedService.price)}</span>
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="promotional_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promotional Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Spring Balayage Special" {...field} />
                  </FormControl>
                  <FormDescription>
                    How this service will appear in booking
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="promotional_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promotional Price *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min={0}
                      step={0.01}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  {selectedService && field.value > 0 && (
                    <FormDescription>
                      {Math.round((1 - field.value / Number(selectedService.price)) * 100)}% discount
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    Service will be hidden from booking after this date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auto_deactivate"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Auto-Deactivate</FormLabel>
                    <FormDescription>
                      Automatically hide when expired
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPromoService.isPending}>
                {createPromoService.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Service
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
