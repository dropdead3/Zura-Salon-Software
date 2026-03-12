import type { Product } from '@/hooks/useProducts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, AlertTriangle, MessageCircle } from 'lucide-react';
import { usePublicOrg } from '@/contexts/PublicOrgContext';
import { MovementBadge } from '@/components/ui/MovementBadge';
import type { MovementRating } from '@/lib/productMovementRating';

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movementRating?: MovementRating | null;
}

export function ProductDetailModal({ product, open, onOpenChange, movementRating }: ProductDetailModalProps) {
  const { organization } = usePublicOrg();

  if (!product) return null;

  const inStock = product.quantity_on_hand != null && product.quantity_on_hand > 0;
  const lowStock = inStock && product.reorder_level != null && product.quantity_on_hand! <= product.reorder_level;

  const handleInquire = () => {
    const subject = encodeURIComponent(`Inquiry about ${product.name}`);
    const body = encodeURIComponent(`Hi, I'm interested in purchasing "${product.name}" ($${(product.retail_price ?? 0).toFixed(2)}). Is it available?`);
    const email = organization.primary_contact_email;
    if (email) {
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          {product.brand && (
            <DialogDescription className="text-xs uppercase tracking-wider">{product.brand}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Product image */}
          <div className="aspect-video rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Package className="w-16 h-16 text-muted-foreground/20" />
            )}
          </div>

          {/* Price & availability */}
          <div className="flex items-center justify-between">
            <p className="text-2xl font-medium text-foreground">${(product.retail_price ?? 0).toFixed(2)}</p>
            {!inStock ? (
              <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0">Out of stock</Badge>
            ) : lowStock ? (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 border-0">
                <AlertTriangle className="w-3 h-3 mr-1" />Low stock
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-0">In stock</Badge>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          {/* Category */}
          {product.category && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Category:</span>
              <Badge variant="outline" className="text-xs">{product.category}</Badge>
            </div>
          )}

          {/* CTA */}
          <Button 
            className="w-full" 
            onClick={handleInquire}
            disabled={!inStock}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {inStock ? 'Inquire to Purchase' : 'Out of Stock'}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            Contact the salon to complete your purchase. Online checkout coming soon.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
