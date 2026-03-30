import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useCreateServiceDiscount,
  useUpdateServiceDiscount,
  type ServiceDiscount,
} from '@/hooks/useServiceDiscounts';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.coerce.number().positive('Must be greater than 0'),
  applies_to: z.string().default('all_services'),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface ServiceDiscountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string;
  discount?: ServiceDiscount | null;
}

export function ServiceDiscountFormDialog({
  open,
  onOpenChange,
  organizationId,
  discount,
}: ServiceDiscountFormDialogProps) {
  const isEditing = !!discount;
  const createMutation = useCreateServiceDiscount(organizationId);
  const updateMutation = useUpdateServiceDiscount();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      discount_type: 'percentage',
      discount_value: 0,
      applies_to: 'all_services',
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (discount) {
        form.reset({
          name: discount.name,
          discount_type: discount.discount_type,
          discount_value: discount.discount_value,
          applies_to: discount.applies_to,
          is_active: discount.is_active,
        });
      } else {
        form.reset({
          name: '',
          discount_type: 'percentage',
          discount_value: 0,
          applies_to: 'all_services',
          is_active: true,
        });
      }
    }
  }, [open, discount, form]);

  const onSubmit = (values: FormValues) => {
    if (isEditing) {
      updateMutation.mutate(
        { id: discount!.id, updates: values },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(
        { name: values.name, discount_type: values.discount_type, discount_value: values.discount_value, applies_to: values.applies_to, is_active: values.is_active },
        { onSuccess: () => onOpenChange(false) }
      );
    }
    }
  };

  const discountType = form.watch('discount_type');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Discount' : 'Create Discount'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Discount Name</Label>
            <Input
              id="name"
              placeholder="e.g. Model Rate, Employee Discount"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={discountType}
                onValueChange={(v) => form.setValue('discount_type', v as 'percentage' | 'fixed')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_value">
                {discountType === 'percentage' ? 'Percentage' : 'Amount'}
              </Label>
              <div className="relative">
                <Input
                  id="discount_value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={discountType === 'percentage' ? '50' : '25.00'}
                  {...form.register('discount_value')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {discountType === 'percentage' ? '%' : '$'}
                </span>
              </div>
              {form.formState.errors.discount_value && (
                <p className="text-xs text-destructive">{form.formState.errors.discount_value.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Applies To</Label>
            <Select
              value={form.watch('applies_to')}
              onValueChange={(v) => form.setValue('applies_to', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_services">All Services</SelectItem>
                <SelectItem value="specific_services">Specific Services</SelectItem>
                <SelectItem value="specific_categories">Specific Categories</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active</Label>
            <Switch
              id="is_active"
              checked={form.watch('is_active')}
              onCheckedChange={(v) => form.setValue('is_active', v)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? 'Save Changes' : 'Create Discount'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
