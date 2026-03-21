import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Star, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { usePortfolioTransformations } from '@/hooks/useClientTransformations';

interface StylistPortfolioProps {
  stylistUserId?: string | null;
  className?: string;
}

const ALL_CATEGORIES = ['All', 'Blondes', 'Balayage', 'Color Corrections', 'Extensions', 'Vivids', 'Brunettes', 'Custom', 'Uncategorized'];

export function StylistPortfolio({ stylistUserId, className }: StylistPortfolioProps) {
  const { data: transformations = [], isLoading } = usePortfolioTransformations(stylistUserId);
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? transformations
    : activeCategory === 'Uncategorized'
      ? transformations.filter(t => !t.portfolio_category)
      : transformations.filter(t => t.portfolio_category === activeCategory);

  // Only show categories that have entries
  const categoriesWithEntries = ALL_CATEGORIES.filter(cat => {
    if (cat === 'All') return true;
    if (cat === 'Uncategorized') return transformations.some(t => !t.portfolio_category);
    return transformations.some(t => t.portfolio_category === cat);
  });

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-3 gap-3', className)}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (transformations.length === 0) {
    return (
      <div className={cn(tokens.empty.container, className)}>
        <Star className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No portfolio entries yet</h3>
        <p className={tokens.empty.description}>
          Mark transformations as "Portfolio Approved" from a client's timeline to build your portfolio.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {categoriesWithEntries.map(cat => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="text-xs h-7 px-3"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(tokens.card.inner, 'overflow-hidden')}
          >
            {/* After photo (primary portfolio image) */}
            <div className="aspect-square bg-muted overflow-hidden">
              {(t.after_url || t.before_url) ? (
                <img
                  src={t.after_url || t.before_url!}
                  alt={t.service_name || 'Transformation'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className={tokens.body.muted}>No photo</span>
                </div>
              )}
            </div>
            <div className="p-2 space-y-1">
              {t.service_name && (
                <span className={cn(tokens.body.emphasis, 'text-xs line-clamp-1')}>{t.service_name}</span>
              )}
              <div className="flex items-center justify-between">
                <span className={cn(tokens.body.muted, 'text-[10px]')}>
                  {t.taken_at ? format(new Date(t.taken_at + 'T00:00:00'), 'MMM d, yyyy') : ''}
                </span>
                {t.portfolio_category && (
                  <Badge variant="secondary" className="text-[9px] h-4">{t.portfolio_category}</Badge>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
