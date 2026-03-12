/**
 * QuickProductButtons — Large tap-target buttons for frequently used products.
 * Renders pinned products as large buttons above the search input.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useStaffPinnedProducts, type PinnedProduct } from '@/hooks/backroom/useStaffPinnedProducts';
import { Zap } from 'lucide-react';

interface QuickProductButtonsProps {
  onSelect: (product: PinnedProduct) => void;
}

export function QuickProductButtons({ onSelect }: QuickProductButtonsProps) {
  const { data: pinned = [] } = useStaffPinnedProducts();

  if (pinned.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-primary" />
        <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider">
          Quick Add
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {pinned.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              layout
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(product)}
                className="h-11 px-4 font-sans text-sm rounded-lg min-w-[80px] border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <div className="text-left">
                  <span className="block leading-tight">{product.product_name}</span>
                  {product.brand && (
                    <span className="block text-[10px] text-muted-foreground leading-tight">
                      {product.brand}
                    </span>
                  )}
                </div>
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
