/**
 * Export stock movements as CSV for audit compliance.
 */
import { supabase } from '@/integrations/supabase/client';

export async function exportStockMovementsCsv(organizationId: string, productId?: string) {
  let query = supabase
    .from('stock_movements')
    .select('*, products:product_id(name, sku, brand)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const headers = ['Date', 'Product', 'SKU', 'Brand', 'Change', 'After', 'Reason', 'Notes', 'Movement ID'];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const rows = (data || []).map((m: any) => {
    const prod = m.products;
    return [
      new Date(m.created_at).toISOString(),
      escape(prod?.name ?? ''),
      escape(prod?.sku ?? ''),
      escape(prod?.brand ?? ''),
      m.quantity_change > 0 ? `+${m.quantity_change}` : String(m.quantity_change),
      m.quantity_after,
      escape(m.reason),
      escape(m.notes ?? ''),
      m.id,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
