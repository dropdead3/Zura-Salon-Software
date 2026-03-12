import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useProductSupplier, useUpsertSupplier, type ProductSupplier } from '@/hooks/useProductSuppliers';

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  organizationId: string;
}

export function SupplierDialog({ open, onOpenChange, productId, productName, organizationId }: SupplierDialogProps) {
  const { data: existing, isLoading } = useProductSupplier(open ? productId : undefined);
  const upsert = useUpsertSupplier();

  const [form, setForm] = useState({
    supplier_name: '',
    supplier_email: '',
    supplier_phone: '',
    supplier_website: '',
    reorder_method: 'email',
    reorder_notes: '',
    lead_time_days: '',
    account_number: '',
    moq: '',
  });

  useEffect(() => {
    if (existing) {
      setForm({
        supplier_name: existing.supplier_name || '',
        supplier_email: existing.supplier_email || '',
        supplier_phone: existing.supplier_phone || '',
        supplier_website: existing.supplier_website || '',
        reorder_method: existing.reorder_method || 'email',
        reorder_notes: existing.reorder_notes || '',
        lead_time_days: existing.lead_time_days?.toString() || '',
        account_number: existing.account_number || '',
        moq: (existing as any).moq?.toString() || '1',
      });
    } else if (!isLoading) {
      setForm({
        supplier_name: '',
        supplier_email: '',
        supplier_phone: '',
        supplier_website: '',
        reorder_method: 'email',
        reorder_notes: '',
        lead_time_days: '',
        account_number: '',
        moq: '1',
      });
    }
  }, [existing, isLoading]);

  const handleSave = () => {
    if (!form.supplier_name.trim()) return;
    upsert.mutate({
      id: existing?.id,
      product_id: productId,
      organization_id: organizationId,
      supplier_name: form.supplier_name.trim(),
      supplier_email: form.supplier_email || null,
      supplier_phone: form.supplier_phone || null,
      supplier_website: form.supplier_website || null,
      reorder_method: form.reorder_method || null,
      reorder_notes: form.reorder_notes || null,
      lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null,
      account_number: form.account_number || null,
      moq: form.moq ? parseInt(form.moq) : 1,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={tokens.heading.section}>Supplier for {productName}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Supplier Name *</Label>
              <Input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} placeholder="e.g. Beauty Supply Co." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.supplier_email} onChange={e => setForm(f => ({ ...f, supplier_email: e.target.value }))} placeholder="orders@supplier.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.supplier_phone} onChange={e => setForm(f => ({ ...f, supplier_phone: e.target.value }))} placeholder="+1 555-0123" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.supplier_website} onChange={e => setForm(f => ({ ...f, supplier_website: e.target.value }))} placeholder="https://supplier.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Reorder Method</Label>
                <Select value={form.reorder_method} onValueChange={v => setForm(f => ({ ...f, reorder_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="website">Website / Portal</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Lead Time (days)</Label>
                <Input type="number" min="0" value={form.lead_time_days} onChange={e => setForm(f => ({ ...f, lead_time_days: e.target.value }))} placeholder="7" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>MOQ</Label>
                <Input type="number" min="1" value={form.moq} onChange={e => setForm(f => ({ ...f, moq: e.target.value }))} placeholder="1" />
                <p className="text-[11px] text-muted-foreground">Minimum order quantity</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reorder Notes</Label>
              <Textarea value={form.reorder_notes} onChange={e => setForm(f => ({ ...f, reorder_notes: e.target.value }))} placeholder="Special instructions for reordering…" rows={2} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.supplier_name.trim() || upsert.isPending}>
            {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
            {existing ? 'Update' : 'Add'} Supplier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
