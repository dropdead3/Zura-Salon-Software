import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generatePurchaseOrderPdf } from '@/lib/generatePurchaseOrderPdf';

interface BatchPOItem {
  organization_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string | null;
  supplier_name?: string;
  supplier_email?: string;
  quantity: number;
  unit_cost?: number;
  notes?: string;
}

interface BatchReorderResult {
  created: number;
  sent: number;
  errors: string[];
}

export function useBatchCreatePurchaseOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      items,
      sendEmails,
      orgName,
      logoDataUrl,
    }: {
      items: BatchPOItem[];
      sendEmails: boolean;
      orgName?: string;
      logoDataUrl?: string | null;
    }): Promise<BatchReorderResult> => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const result: BatchReorderResult = { created: 0, sent: 0, errors: [] };

      // Group items by supplier email for consolidated emails
      const bySupplierEmail = new Map<string, string[]>();

      for (const item of items) {
        const totalCost = item.unit_cost ? item.unit_cost * item.quantity : undefined;

        const { data, error } = await supabase
          .from('purchase_orders')
          .insert({
            organization_id: item.organization_id,
            product_id: item.product_id,
            supplier_name: item.supplier_name,
            supplier_email: item.supplier_email,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            total_cost: totalCost,
            status: 'draft',
            notes: item.notes,
            created_by: userId,
          })
          .select('id')
          .single();

        if (error) {
          result.errors.push(`Failed to create PO for product: ${error.message}`);
          continue;
        }

        result.created++;

        if (sendEmails && item.supplier_email && data) {
          const email = item.supplier_email;
          const list = bySupplierEmail.get(email) || [];
          list.push(data.id);
          bySupplierEmail.set(email, list);
        }
      }

      // Send consolidated emails per supplier with PDF attachments
      if (sendEmails) {
        // Group items by supplier for PDF generation
        const itemsBySupplier = new Map<string, BatchPOItem[]>();
        for (const item of items) {
          if (!item.supplier_email) continue;
          const list = itemsBySupplier.get(item.supplier_email) || [];
          list.push(item);
          itemsBySupplier.set(item.supplier_email, list);
        }

        // Generate PDF attachments per supplier
        const attachments: Record<string, { filename: string; content: string }[]> = {};
        if (orgName) {
          for (const [email, supplierItems] of itemsBySupplier) {
            try {
              const supplierName = supplierItems[0].supplier_name || 'Supplier';
              const pdfResult = generatePurchaseOrderPdf({
                orgName,
                supplierName,
                supplierEmail: email,
                lines: supplierItems.map(item => ({
                  productName: item.product_name || 'Product',
                  sku: item.product_sku,
                  quantity: item.quantity,
                  unitCost: item.unit_cost,
                  totalCost: item.unit_cost ? item.unit_cost * item.quantity : undefined,
                })),
                logoDataUrl,
              });
              attachments[email] = [{ filename: pdfResult.fileName, content: pdfResult.base64 }];
            } catch (e) {
              console.warn('Failed to generate PO PDF for', email, e);
            }
          }
        }

        for (const [, poIds] of bySupplierEmail) {
          const { error: sendErr } = await supabase.functions.invoke('send-reorder-email', {
            body: { purchase_order_ids: poIds, attachments },
          });
          if (sendErr) {
            result.errors.push(`Email send failed: ${sendErr.message}`);
          } else {
            result.sent += poIds.length;
          }
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const msg = result.sent > 0
        ? `${result.created} PO(s) created, ${result.sent} sent to suppliers`
        : `${result.created} purchase order(s) saved as drafts`;
      toast.success(msg);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} error(s) occurred`);
      }
    },
    onError: (error) => {
      toast.error('Batch reorder failed: ' + error.message);
    },
  });
}
