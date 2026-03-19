/**
 * SupplierAssignDialog — Assigns a supplier to all products within a brand.
 * Pre-fills from existing supplier data if any product in that brand has one.
 */

import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useBatchUpsertSupplier } from '@/hooks/useProductSuppliers';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type { BackroomInventoryRow } from '@/hooks/backroom/useBackroomInventoryTable';

interface SupplierAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: string;
  products: BackroomInventoryRow[];
}

interface SupplierForm {
  supplier_name: string;
  supplier_email: string;
  supplier_phone: string;
  supplier_website: string;
  account_number: string;
  lead_time_days: string;
  moq: string;
  secondary_contact_name: string;
  secondary_contact_email: string;
  secondary_contact_phone: string;
}

export function SupplierAssignDialog({ open, onOpenChange, brand, products }: SupplierAssignDialogProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const batchUpsert = useBatchUpsertSupplier();

  // Find existing supplier from any product in this brand
  const existingSupplier = products.find(p => p.supplier_name);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierForm>({
    defaultValues: {
      supplier_name: '',
      supplier_email: '',
      supplier_phone: '',
      supplier_website: '',
      account_number: '',
      lead_time_days: '',
      moq: '1',
      secondary_contact_name: '',
      secondary_contact_email: '',
      secondary_contact_phone: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        supplier_name: existingSupplier?.supplier_name || '',
        supplier_email: existingSupplier?.supplier_email || '',
        supplier_phone: '',
        supplier_website: '',
        account_number: '',
        lead_time_days: '',
        moq: '1',
      });
    }
  }, [open, existingSupplier?.supplier_name]);

  const onSubmit = (data: SupplierForm) => {
    if (!orgId) return;
    batchUpsert.mutate(
      {
        product_ids: products.map(p => p.id),
        organization_id: orgId,
        supplier_name: data.supplier_name,
        supplier_email: data.supplier_email || null,
        supplier_phone: data.supplier_phone || null,
        supplier_website: data.supplier_website || null,
        account_number: data.account_number || null,
        lead_time_days: data.lead_time_days ? parseInt(data.lead_time_days) : null,
        moq: data.moq ? parseInt(data.moq) : 1,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Set Supplier for {brand}</DialogTitle>
          <DialogDescription>
            Assign a supplier to all {products.length} product{products.length !== 1 ? 's' : ''} in this brand. This will be used for PO creation and reordering.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier_name">Supplier or Distributor *</Label>
            <Input
              id="supplier_name"
              {...register('supplier_name', { required: 'Supplier name is required' })}
              placeholder="e.g. Goldwell Distribution"
            />
            {errors.supplier_name && <p className="text-destructive text-xs">{errors.supplier_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="supplier_email">Email</Label>
              <Input id="supplier_email" type="email" {...register('supplier_email')} placeholder="orders@supplier.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_phone">Phone</Label>
              <Input id="supplier_phone" {...register('supplier_phone')} placeholder="(555) 123-4567" autoCapitalize="off" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier_website">Website</Label>
            <Input id="supplier_website" {...register('supplier_website')} placeholder="https://supplier.com" autoCapitalize="off" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="account_number">Account #</Label>
              <Input id="account_number" {...register('account_number')} placeholder="ACC-123" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_time_days">Lead Time (days)</Label>
              <Input id="lead_time_days" type="number" {...register('lead_time_days')} placeholder="5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moq">MOQ</Label>
              <Input id="moq" type="number" {...register('moq')} placeholder="1" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={batchUpsert.isPending}>
              {batchUpsert.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Supplier
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
