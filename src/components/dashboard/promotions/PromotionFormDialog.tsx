import { useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Wand2 } from 'lucide-react';
import { useCreatePromotion, useUpdatePromotion, type Promotion, type PromotionInsert } from '@/hooks/usePromotions';
import { generateVoucherCode } from '@/hooks/useVouchers';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  promo_code: z.string().optional(),
  promotion_type: z.enum([
    'percentage_discount',
    'fixed_discount',
    'bogo',
    'bundle',
    'new_client',
    'loyalty_bonus',
    'referral',
  ]),
  discount_value: z.number().min(0).optional(),
  discount_max_amount: z.number().min(0).optional(),
  minimum_purchase: z.number().min(0).default(0),
  applies_to: z.enum(['all', 'services', 'products', 'specific']).default('all'),
  usage_limit: z.number().min(1).optional().nullable(),
  usage_per_client: z.number().min(1).default(1),
  starts_at: z.string(),
  expires_at: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  target_audience: z.enum(['all', 'new_clients', 'existing_clients', 'loyalty_tier', 'specific_clients']).default('all'),
});

type FormValues = z.infer<typeof formSchema>;

interface PromotionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  promotion?: Promotion | null;
}

export function PromotionFormDialog({
  open,
  onOpenChange,
  organizationId,
  promotion,
}: PromotionFormDialogProps) {
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();
  const isEditing = !!promotion?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      promo_code: '',
      promotion_type: 'percentage_discount',
      discount_value: undefined,
      discount_max_amount: undefined,
      minimum_purchase: 0,
      applies_to: 'all',
      usage_limit: undefined,
      usage_per_client: 1,
      starts_at: new Date().toISOString().split('T')[0],
      expires_at: '',
      is_active: true,
      target_audience: 'all',
    },
  });

  useEffect(() => {
    if (promotion) {
      form.reset({
        name: promotion.name,
        description: promotion.description || '',
        promo_code: promotion.promo_code || '',
        promotion_type: promotion.promotion_type,
        discount_value: promotion.discount_value || undefined,
        discount_max_amount: promotion.discount_max_amount || undefined,
        minimum_purchase: promotion.minimum_purchase || 0,
        applies_to: promotion.applies_to,
        usage_limit: promotion.usage_limit || undefined,
        usage_per_client: promotion.usage_per_client || 1,
        starts_at: promotion.starts_at.split('T')[0],
        expires_at: promotion.expires_at?.split('T')[0] || '',
        is_active: promotion.is_active,
        target_audience: promotion.target_audience,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        promo_code: '',
        promotion_type: 'percentage_discount',
        discount_value: undefined,
        discount_max_amount: undefined,
        minimum_purchase: 0,
        applies_to: 'all',
        usage_limit: undefined,
        usage_per_client: 1,
        starts_at: new Date().toISOString().split('T')[0],
        expires_at: '',
        is_active: true,
        target_audience: 'all',
      });
    }
  }, [promotion, form]);

  const onSubmit = async (values: FormValues) => {
    const payload: PromotionInsert = {
      organization_id: organizationId,
      name: values.name,
      description: values.description || null,
      promo_code: values.promo_code?.toUpperCase() || null,
      promotion_type: values.promotion_type,
      discount_value: values.discount_value || null,
      discount_max_amount: values.discount_max_amount || null,
      minimum_purchase: values.minimum_purchase || 0,
      applies_to: values.applies_to,
      applicable_service_ids: null,
      applicable_category: null,
      excluded_service_ids: null,
      usage_limit: values.usage_limit || null,
      usage_per_client: values.usage_per_client || 1,
      starts_at: new Date(values.starts_at).toISOString(),
      expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
      is_active: values.is_active,
      target_audience: values.target_audience,
      target_loyalty_tiers: null,
      target_client_ids: null,
      created_by: null,
    };

    if (isEditing && promotion?.id) {
      await updatePromotion.mutateAsync({ id: promotion.id, ...payload });
    } else {
      await createPromotion.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const generateCode = () => {
    const code = generateVoucherCode();
    form.setValue('promo_code', code);
  };

  const promotionType = form.watch('promotion_type');
  const showDiscountFields = ['percentage_discount', 'fixed_discount'].includes(promotionType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Promotion' : 'Create Promotion'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promotion Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Spring Refresh Special" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="20% off all color services for the month of April"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Discount Type */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="promotion_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promotion Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage_discount">Percentage Discount</SelectItem>
                        <SelectItem value="fixed_discount">Fixed Amount Off</SelectItem>
                        <SelectItem value="bogo">Buy One Get One</SelectItem>
                        <SelectItem value="bundle">Bundle Deal</SelectItem>
                        <SelectItem value="new_client">New Client Special</SelectItem>
                        <SelectItem value="loyalty_bonus">Loyalty Bonus Points</SelectItem>
                        <SelectItem value="referral">Referral Reward</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showDiscountFields && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discount_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {promotionType === 'percentage_discount' ? 'Discount %' : 'Discount $'}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder={promotionType === 'percentage_discount' ? '20' : '25'}
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {promotionType === 'percentage_discount' && (
                    <FormField
                      control={form.control}
                      name="discount_max_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Discount $</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="50"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormDescription>Leave blank for no cap</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Promo Code & Validity */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="promo_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promo Code (Optional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          placeholder="SPRING20" 
                          {...field}
                          className="uppercase"
                        />
                      </FormControl>
                      <Button type="button" variant="outline" onClick={generateCode}>
                        <Wand2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormDescription>
                      Clients can enter this code at checkout
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="starts_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expires_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>Leave blank for no expiration</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Limits */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="usage_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Uses</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Unlimited"
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
                  name="usage_per_client"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Per Client</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minimum_purchase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Purchase $</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Targeting */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="applies_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applies To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Services & Products</SelectItem>
                          <SelectItem value="services">Services Only</SelectItem>
                          <SelectItem value="products">Products Only</SelectItem>
                          <SelectItem value="specific">Specific Items</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target_audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Clients</SelectItem>
                          <SelectItem value="new_clients">New Clients Only</SelectItem>
                          <SelectItem value="existing_clients">Existing Clients</SelectItem>
                          <SelectItem value="loyalty_tier">Loyalty Tier</SelectItem>
                          <SelectItem value="specific_clients">Specific Clients</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable this promotion immediately
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
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createPromotion.isPending || updatePromotion.isPending}
              >
                {(createPromotion.isPending || updatePromotion.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Save Changes' : 'Create Promotion'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
