import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProducts, useUpdateProduct, useCreateProduct, Product } from '@/hooks/useProducts';

interface ProductEditDialogProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  description: string;
  retail_price: string;
  cost_price: string;
  quantity_on_hand: string;
  reorder_level: string;
  par_level: string;
}

export function ProductEditDialog({ productId, open, onOpenChange }: ProductEditDialogProps) {
  const { data: products = [] } = useProducts();
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  
  const product = productId ? products.find(p => p.id === productId) : null;
  const isEditing = !!productId;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      category: '',
      brand: '',
      description: '',
      retail_price: '',
      cost_price: '',
      quantity_on_hand: '',
      reorder_level: '',
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || '',
        brand: product.brand || '',
        description: product.description || '',
        retail_price: product.retail_price?.toString() || '',
        cost_price: product.cost_price?.toString() || '',
        quantity_on_hand: product.quantity_on_hand?.toString() || '',
        reorder_level: product.reorder_level?.toString() || '',
      });
    } else {
      reset({
        name: '',
        sku: '',
        barcode: '',
        category: '',
        brand: '',
        description: '',
        retail_price: '',
        cost_price: '',
        quantity_on_hand: '',
        reorder_level: '',
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: FormData) => {
    const updates: Partial<Product> = {
      name: data.name,
      sku: data.sku || null,
      barcode: data.barcode || null,
      category: data.category || null,
      brand: data.brand || null,
      description: data.description || null,
      retail_price: data.retail_price ? parseFloat(data.retail_price) : null,
      cost_price: data.cost_price ? parseFloat(data.cost_price) : null,
      quantity_on_hand: data.quantity_on_hand ? parseInt(data.quantity_on_hand) : null,
      reorder_level: data.reorder_level ? parseInt(data.reorder_level) : null,
    };

    try {
      if (isEditing && productId) {
        await updateProduct.mutateAsync({ id: productId, updates });
      } else {
        await createProduct.mutateAsync({ ...updates, is_active: true });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...register('name', { required: true })}
                placeholder="Product name"
              />
            </div>

            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                {...register('sku')}
                placeholder="SKU code"
                autoCapitalize="none"
              />
            </div>

            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                {...register('barcode')}
                placeholder="UPC/EAN"
                autoCapitalize="none"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                {...register('category')}
                placeholder="e.g., Shampoo"
              />
            </div>

            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                {...register('brand')}
                placeholder="e.g., Olaplex"
              />
            </div>

            <div>
              <Label htmlFor="retail_price">Retail Price</Label>
              <Input
                id="retail_price"
                type="number"
                step="0.01"
                {...register('retail_price')}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="cost_price">Cost Price</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                {...register('cost_price')}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="quantity_on_hand">Stock Quantity</Label>
              <Input
                id="quantity_on_hand"
                type="number"
                {...register('quantity_on_hand')}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="reorder_level">Reorder Level</Label>
              <Input
                id="reorder_level"
                type="number"
                {...register('reorder_level')}
                placeholder="Low stock alert"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Product description..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProduct.isPending || createProduct.isPending}>
              {isEditing ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
