import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Pencil, AlertTriangle, Check, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Product, useUpdateProduct } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

export function ProductTable({ products, isLoading, onEdit }: ProductTableProps) {
  const { formatCurrency } = useFormatCurrency();
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const updateProduct = useUpdateProduct();

  const handleSaveSku = async (productId: string) => {
    await updateProduct.mutateAsync({ 
      id: productId, 
      updates: { sku: tempValue || null } 
    });
    setEditingSku(null);
    setTempValue('');
  };

  const handleSaveBarcode = async (productId: string) => {
    await updateProduct.mutateAsync({ 
      id: productId, 
      updates: { barcode: tempValue || null } 
    });
    setEditingBarcode(null);
    setTempValue('');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No products found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const isLowStock = product.reorder_level && 
              product.quantity_on_hand !== null && 
              product.quantity_on_hand < product.reorder_level;

            return (
              <TableRow key={product.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    {product.brand && (
                      <p className="text-xs text-muted-foreground">{product.brand}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {editingSku === product.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value.toUpperCase())}
                        className="h-8 w-28"
                        autoCapitalize="none"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveSku(product.id)}>
                        <Check className="h-4 w-4 text-success-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingSku(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingSku(product.id);
                        setTempValue(product.sku || '');
                      }}
                      className="text-left hover:underline"
                    >
                      {product.sku || (
                        <span className="text-muted-foreground text-xs">+ Add SKU</span>
                      )}
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  {editingBarcode === product.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="h-8 w-32"
                        autoCapitalize="none"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveBarcode(product.id)}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingBarcode(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingBarcode(product.id);
                        setTempValue(product.barcode || '');
                      }}
                      className="text-left hover:underline font-mono text-xs"
                    >
                      {product.barcode || (
                        <span className="text-muted-foreground">+ Add Barcode</span>
                      )}
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  {product.category ? (
                    <Badge variant="secondary">{product.category}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {product.retail_price 
                    ? formatCurrency(product.retail_price) 
                    : '—')}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-medium",
                    isLowStock && "text-amber-600"
                  )}>
                    {product.quantity_on_hand ?? '—')}
                    {isLowStock && <AlertTriangle className="inline ml-1 h-4 w-4" />}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(product.id)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Product
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
