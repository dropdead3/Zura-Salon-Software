import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useProducts } from '@/hooks/useProducts';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, AlertTriangle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

function useToggleProductOnline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, available_online }: { id: string; available_online: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ available_online, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, available_online }) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previousProducts = queryClient.getQueriesData({ queryKey: ['products'] });
      queryClient.setQueriesData({ queryKey: ['products'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((p: any) => p.id === id ? { ...p, available_online } : p);
      });
      return { previousProducts };
    },
    onError: (_err, _vars, context) => {
      context?.previousProducts?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('Failed to update product availability');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

function useBulkSetOnline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, available_online }: { ids: string[]; available_online: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ available_online, updated_at: new Date().toISOString() } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${vars.ids.length} product(s) ${vars.available_online ? 'made available' : 'removed from'} online store`);
    },
    onError: () => {
      toast.error('Failed to update products');
    },
  });
}

function useProductBrands() {
  const { data: products } = useProducts();
  return useMemo(() => {
    if (!products) return [];
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
    return brands.sort() as string[];
  }, [products]);
}

export function OnlineStoreProductsTable() {
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  const { data: products, isLoading } = useProducts();
  const brands = useProductBrands();
  const toggleOnline = useToggleProductOnline();
  const bulkSet = useBulkSetOnline();
  const { formatCurrency } = useFormatCurrency();

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (brandFilter !== 'all' && p.brand !== brandFilter) return false;
      if (availabilityFilter === 'online' && !(p as any).available_online) return false;
      if (availabilityFilter === 'not_online' && (p as any).available_online) return false;
      return true;
    });
  }, [products, search, brandFilter, availabilityFilter]);

  const allIds = filtered.map(p => p.id);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map(b => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="not_online">Not Online</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size={tokens.button.card}
          disabled={bulkSet.isPending || allIds.length === 0}
          onClick={() => bulkSet.mutate({ ids: allIds, available_online: true })}
        >
          Make all available
        </Button>
        <Button
          variant="outline"
          size={tokens.button.card}
          disabled={bulkSet.isPending || allIds.length === 0}
          onClick={() => bulkSet.mutate({ ids: allIds, available_online: false })}
        >
          Make all unavailable
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Product</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Inventory</TableHead>
              <TableHead className="text-center">Available Online</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading products…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8" />
                    <p className="text-sm">No products found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => {
                const isOnline = (product as any).available_online;
                        const isLowStock = product.reorder_level != null &&
                          product.quantity_on_hand != null &&
                  product.quantity_on_hand <= product.reorder_level;

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.brand || '—'}</TableCell>
                    <TableCell className="text-right">
                      {product.retail_price != null ? formatCurrency(product.retail_price) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        {isLowStock && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        <span className={cn(isLowStock && 'text-amber-600 font-medium')}>
                          {product.quantity_on_hand ?? 0}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <div className="inline-flex rounded-full border border-border overflow-hidden">
                          <button
                            className={cn(
                              'px-3 py-1 text-xs font-medium transition-colors',
                              !isOnline
                                ? 'bg-muted text-foreground'
                                : 'text-muted-foreground hover:bg-muted/50'
                            )}
                            onClick={() => {
                              if (isOnline) toggleOnline.mutate({ id: product.id, available_online: false });
                            }}
                          >
                            No
                          </button>
                          <button
                            className={cn(
                              'px-3 py-1 text-xs font-medium transition-colors',
                              isOnline
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted/50'
                            )}
                            onClick={() => {
                              if (!isOnline) toggleOnline.mutate({ id: product.id, available_online: true });
                            }}
                          >
                            Yes
                          </button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} Product{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
