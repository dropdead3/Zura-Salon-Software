import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ServiceAddon } from '@/hooks/useServiceAddons';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface ServiceAddonToastProps {
  visible: boolean;
  categoryName: string;
  suggestions: ServiceAddon[];
  onAdd: (addonId: string) => void;
  onDismiss: () => void;
}

export function ServiceAddonToast({
  visible,
  categoryName,
  suggestions,
  onAdd,
  onDismiss,
}: ServiceAddonToastProps) {
  const { formatCurrency } = useFormatCurrency();

  return (
    <AnimatePresence>
      {visible && suggestions.length > 0 && (
        <motion.div
          key="addon-toast"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="mx-3 mb-2 rounded-lg border border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-primary/10">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium text-primary uppercase tracking-wider">
                Frequently added with {categoryName}
              </span>
            </div>
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Suggestions */}
          <div className="p-2 space-y-1">
            {suggestions.map(addon => (
              <div
                key={addon.id}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{addon.name}</p>
                  {addon.description && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{addon.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {addon.duration_minutes && (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {addon.duration_minutes}m
                      </span>
                    )}
                    <span className={cn('text-[11px] text-muted-foreground')}>
                      {formatCurrency(addon.price)}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs shrink-0 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => onAdd(addon.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
