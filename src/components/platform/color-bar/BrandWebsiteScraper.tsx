import { useState, useMemo, useRef, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import {
  PlatformTable as Table,
  PlatformTableHeader as TableHeader,
  PlatformTableBody as TableBody,
  PlatformTableHead as TableHead,
  PlatformTableRow as TableRow,
  PlatformTableCell as TableCell,
} from '@/components/platform/ui/PlatformTable';
import { Loader2, Globe, Search, CheckCircle2, AlertTriangle, RotateCcw, Sparkles, Filter } from 'lucide-react';
import { ZuraLoader } from '@/components/ui/ZuraLoader';
import { useBrandWebsiteScrape, type ScrapedProduct } from '@/hooks/platform/useBrandWebsiteScrape';
import { PlatformCheckbox as Checkbox } from '@/components/platform/ui/PlatformCheckbox';

interface BrandWebsiteScraperProps {
  websiteUrl: string;
  brandName: string;
  onProductsSelected: (products: ScrapedProduct[]) => void;
  scrapedProducts: ScrapedProduct[];
  setScrapedProducts: (products: ScrapedProduct[]) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  color: 'Color',
  developer: 'Developer',
  lightener: 'Lightener',
  toner: 'Toner',
  'bond builder': 'Bond Builder',
  treatment: 'Treatment',
  additive: 'Additive',
  styling: 'Styling',
  care: 'Care',
};

export function BrandWebsiteScraper({
  websiteUrl,
  brandName,
  onProductsSelected,
  scrapedProducts,
  setScrapedProducts,
}: BrandWebsiteScraperProps) {
  const scrapeMutation = useBrandWebsiteScrape();
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'mapping' | 'scanning' | 'extracting' | 'done' | 'error'>('idle');
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [pagesScraped, setPagesScraped] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const handleScrape = useCallback(async () => {
    setScrapeStatus('mapping');
    setScrapeError(null);

    // Simulate progressive status updates
    const timer1 = setTimeout(() => setScrapeStatus('scanning'), 3000);
    const timer2 = setTimeout(() => setScrapeStatus('extracting'), 8000);

    try {
      const result = await scrapeMutation.mutateAsync({
        websiteUrl,
        brandName,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!result.success) {
        setScrapeStatus('error');
        setScrapeError(result.error || 'Scraping failed');
        return;
      }

      const withSelection = result.products.map((p) => ({
        ...p,
        selected: p.confidence !== 'low',
      }));

      setScrapedProducts(withSelection);
      setPagesScraped(result.pagesScraped);
      setScrapeStatus('done');
      onProductsSelected(withSelection.filter((p) => p.selected));
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setScrapeStatus('error');
      setScrapeError(err.message || 'Scraping failed');
    }
  }, [websiteUrl, brandName, scrapeMutation, onProductsSelected, setScrapedProducts]);

  const toggleProduct = (idx: number) => {
    const updated = [...scrapedProducts];
    updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
    setScrapedProducts(updated);
    onProductsSelected(updated.filter((p) => p.selected));
  };

  const toggleAllInCategory = (category: string) => {
    const allSelected = scrapedProducts
      .filter((p) => category === 'all' || p.category === category)
      .every((p) => p.selected);
    const updated = scrapedProducts.map((p) => {
      if (category === 'all' || p.category === category) {
        return { ...p, selected: !allSelected };
      }
      return p;
    });
    setScrapedProducts(updated);
    onProductsSelected(updated.filter((p) => p.selected));
  };

  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'all') return scrapedProducts;
    return scrapedProducts.filter((p) => p.category === categoryFilter);
  }, [scrapedProducts, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    scrapedProducts.forEach((p) => {
      cats.set(p.category, (cats.get(p.category) || 0) + 1);
    });
    return Array.from(cats.entries()).sort((a, b) => b[1] - a[1]);
  }, [scrapedProducts]);

  const selectedCount = scrapedProducts.filter((p) => p.selected).length;

  // Idle / Not yet scraped
  if (scrapeStatus === 'idle' && scrapedProducts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-14 h-14 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Globe className="w-7 h-7 text-violet-400" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="font-display text-sm tracking-wide text-[hsl(var(--platform-foreground))]">
            Scan Website for Products
          </h3>
          <p className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] max-w-sm">
            We'll scan <span className="font-medium text-[hsl(var(--platform-foreground))]">{websiteUrl}</span> to 
            discover {brandName}'s professional color and chemical product lines.
          </p>
          <p className="font-sans text-[10px] text-[hsl(var(--platform-foreground-muted))]">
            Estimated time: 15–30 seconds
          </p>
        </div>
        <PlatformButton onClick={handleScrape} size="sm">
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Scan Website
        </PlatformButton>
        <PlatformButton variant="ghost" size="sm" onClick={() => onProductsSelected([])}>
          Skip — I'll add products manually
        </PlatformButton>
      </div>
    );
  }

  // Scraping in progress
  if (['mapping', 'scanning', 'extracting'].includes(scrapeStatus)) {
    const steps = [
      { key: 'mapping', label: 'Discovering pages...' },
      { key: 'scanning', label: 'Scanning products...' },
      { key: 'extracting', label: 'Extracting data with AI...' },
    ];
    const currentIdx = steps.findIndex((s) => s.key === scrapeStatus);

    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <ZuraLoader size="xl" platformColors />
        <div className="space-y-3 w-full max-w-xs">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-center gap-3">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-sans',
                i < currentIdx
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : i === currentIdx
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted))]'
              )}>
                {i < currentIdx ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : i === currentIdx ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className={cn(
                'font-sans text-xs',
                i === currentIdx
                  ? 'text-[hsl(var(--platform-foreground))]'
                  : 'text-[hsl(var(--platform-foreground-muted))]'
              )}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (scrapeStatus === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="font-display text-sm tracking-wide text-[hsl(var(--platform-foreground))]">
            Scan Failed
          </h3>
          <p className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] max-w-sm">
            {scrapeError}
          </p>
        </div>
        <div className="flex gap-2">
          <PlatformButton variant="outline" size="sm" onClick={handleScrape}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry
          </PlatformButton>
          <PlatformButton variant="ghost" size="sm" onClick={() => onProductsSelected([])}>
            Skip — add manually
          </PlatformButton>
        </div>
      </div>
    );
  }

  // Done — show results
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="font-sans text-xs text-[hsl(var(--platform-foreground))]">
            Found <span className="font-medium">{scrapedProducts.length}</span> products from {pagesScraped} pages
          </span>
          <PlatformBadge variant="primary" size="sm">
            {selectedCount} selected
          </PlatformBadge>
        </div>
        <div className="flex items-center gap-1.5">
          <PlatformButton variant="ghost" size="sm" onClick={() => toggleAllInCategory(categoryFilter)}>
            {filteredProducts.every((p) => p.selected) ? 'Deselect All' : 'Select All'}
          </PlatformButton>
          <PlatformButton variant="ghost" size="sm" onClick={handleScrape}>
            <RotateCcw className="w-3 h-3 mr-1" /> Re-scan
          </PlatformButton>
        </div>
      </div>

      {/* Category quick filters */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'h-7 px-2.5 rounded-md font-sans text-[11px] transition-colors',
              categoryFilter === 'all'
                ? 'bg-violet-600/80 text-white'
                : 'bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]'
            )}
          >
            All ({scrapedProducts.length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'h-7 px-2.5 rounded-md font-sans text-[11px] transition-colors',
                categoryFilter === cat
                  ? 'bg-violet-600/80 text-white'
                  : 'bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]'
              )}
            >
              {CATEGORY_LABELS[cat] || cat} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Product table */}
      <div className="rounded-lg border border-[hsl(var(--platform-border)/0.4)] max-h-[320px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[hsl(var(--platform-border)/0.3)]">
              <TableHead className="w-10" />
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Product</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Category</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Product Line</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Sizes</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] w-20">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((p, idx) => {
              const realIdx = scrapedProducts.indexOf(p);
              return (
                <TableRow
                  key={`${p.name}-${idx}`}
                  className={cn(
                    'cursor-pointer',
                    p.selected && 'bg-violet-500/5'
                  )}
                  onClick={() => toggleProduct(realIdx)}
                >
                  <TableCell className="w-10">
                    <Checkbox
                      checked={p.selected}
                      onCheckedChange={() => toggleProduct(realIdx)}
                    />
                  </TableCell>
                  <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground))]">
                    {p.name}
                  </TableCell>
                  <TableCell>
                    <PlatformBadge variant="default" size="sm">
                      {CATEGORY_LABELS[p.category] || p.category}
                    </PlatformBadge>
                  </TableCell>
                  <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                    {p.product_line || '—'}
                  </TableCell>
                  <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                    {p.sizes?.join(', ') || '—'}
                  </TableCell>
                  <TableCell>
                    <PlatformBadge
                      variant={p.confidence === 'high' ? 'success' : p.confidence === 'medium' ? 'warning' : 'default'}
                      size="sm"
                    >
                      {p.confidence}
                    </PlatformBadge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
