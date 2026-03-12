import type { Product } from '@/hooks/useProducts';
import { Package, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MovementBadge } from '@/components/ui/MovementBadge';
import type { MovementRating } from '@/lib/productMovementRating';

interface ProductCardProps {
  product: Product;
  continueSelling?: boolean;
  onClick?: (product: Product) => void;
  /** Movement rating for this product (positive-only shown on shop) */
  movementRating?: MovementRating | null;
}

export function ProductCard({ product, continueSelling = false, onClick, movementRating }: ProductCardProps) {
  const inStock = product.quantity_on_hand != null && product.quantity_on_hand > 0;
  const lowStock = product.quantity_on_hand != null && product.reorder_level != null && product.quantity_on_hand <= product.reorder_level && product.quantity_on_hand > 0;
  const showOutOfStock = !inStock && !continueSelling;

  return (
    <button
      onClick={() => onClick?.(product)}
      className="group text-left rounded-2xl border border-border/50 bg-card overflow-hidden transition-all hover:shadow-lg hover:border-border hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {/* Product image */}
      <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden relative">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <Package className="w-12 h-12 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
        )}
        {movementRating && ['best_seller', 'popular'].includes(movementRating.tier) && (
          <div className="absolute top-2 left-2">
            <MovementBadge rating={movementRating} positiveOnly compact />
          </div>
        )}
        {(product as any).clearance_status === 'discounted' && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-[10px] bg-red-500 text-white border-0">
              On Sale{(product as any).clearance_discount_pct ? ` ${(product as any).clearance_discount_pct}% off` : ''}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        {product.brand && (
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{product.brand}</p>
        )}
        <h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground">{product.name}</h3>

        <div className="flex items-center justify-between pt-1">
          <p className="text-base font-medium text-foreground">
            ${(product.retail_price ?? 0).toFixed(2)}
          </p>
          {showOutOfStock ? (
            <Badge variant="secondary" className="text-[10px] bg-destructive/10 text-destructive border-0">
              Out of stock
            </Badge>
          ) : lowStock ? (
            <Badge variant="secondary" className="text-[10px] bg-yellow-500/10 text-yellow-700 border-0">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Low stock
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
}
