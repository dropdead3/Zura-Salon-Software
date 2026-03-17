import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { Dialog, PlatformDialogContent as DialogContent, DialogHeader, PlatformDialogTitle as DialogTitle, PlatformDialogDescription as DialogDescription } from '@/components/platform/ui/PlatformDialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Database, CheckCircle2, XCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BrandTarget {
  brand: string;
  is_professional: boolean;
}

const PROFESSIONAL_BRANDS: BrandTarget[] = [
  // New professional brands not commonly in libraries
  { brand: 'Aveda', is_professional: true },
  { brand: 'Davines', is_professional: true },
  { brand: 'Guy Tang #mydentity', is_professional: true },
  { brand: 'Keratin Complex', is_professional: true },
  { brand: 'Lanza', is_professional: true },
  { brand: 'Moroccanoil Color', is_professional: true },
  { brand: 'Revlon Professional', is_professional: true },
  { brand: 'Alfaparf Milano', is_professional: true },
  { brand: 'Oway', is_professional: true },
  { brand: 'Truss Professional', is_professional: true },
  { brand: 'Scruples', is_professional: true },
  { brand: 'Celeb Luxury', is_professional: true },
  { brand: 'ISO', is_professional: true },
  { brand: 'Difiaba', is_professional: true },
  { brand: 'Framesi', is_professional: true },
  { brand: 'Lakme', is_professional: true },
  { brand: 'Keune', is_professional: true },
  { brand: 'Elgon', is_professional: true },
  { brand: 'Oligo Professionnel', is_professional: true },
  { brand: 'Rusk', is_professional: true },
  { brand: 'Aloxxi', is_professional: true },
  { brand: 'Pravana', is_professional: true },
  { brand: 'Pulp Riot', is_professional: true },
  { brand: 'Kenra Professional', is_professional: true },
  { brand: 'Clairol Professional', is_professional: true },
  { brand: 'Farouk CHI', is_professional: true },
  { brand: 'Koleston Perfect (Wella)', is_professional: true },
  { brand: 'TIGI Copyright', is_professional: true },
  { brand: 'Kadus Professional', is_professional: true },
  { brand: 'Organic Colour Systems', is_professional: true },
  { brand: 'Eufora', is_professional: true },
  { brand: 'Kaaral', is_professional: true },
  { brand: 'Inebrya', is_professional: true },
  { brand: 'Bhave', is_professional: true },
];

const CONSUMER_BRANDS: BrandTarget[] = [
  { brand: 'Arctic Fox', is_professional: false },
  { brand: 'Manic Panic', is_professional: false },
  { brand: 'Good Dye Young', is_professional: false },
  { brand: 'Crazy Color', is_professional: false },
  { brand: 'Lime Crime Unicorn Hair', is_professional: false },
  { brand: 'oVertone', is_professional: false },
  { brand: 'Punky Colour', is_professional: false },
  { brand: 'Iroiro', is_professional: false },
  { brand: 'Adore', is_professional: false },
  { brand: 'Ion Color Brilliance', is_professional: false },
  { brand: 'Splat', is_professional: false },
  { brand: 'Lunar Tides', is_professional: false },
  { brand: 'Shrine', is_professional: false },
  { brand: 'Hally Hair', is_professional: false },
  { brand: 'Garnier Olia', is_professional: false },
  { brand: 'dpHUE', is_professional: false },
  { brand: 'Raw Demi-Glaze', is_professional: false },
  { brand: 'Directions by La Riche', is_professional: false },
  { brand: 'Sparks', is_professional: false },
  { brand: 'Special Effects', is_professional: false },
];

const ALL_BRANDS = [...PROFESSIONAL_BRANDS, ...CONSUMER_BRANDS];

interface BrandResult {
  brand: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  products_generated?: number;
  products_inserted?: number;
  products_skipped?: number;
  error?: string;
}

interface BulkCatalogImportProps {
  existingBrands: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkCatalogImport({ existingBrands, open, onOpenChange }: BulkCatalogImportProps) {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BrandResult[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [showPro, setShowPro] = useState(true);
  const [showConsumer, setShowConsumer] = useState(true);

  const existingSet = useMemo(() => new Set(existingBrands.map(b => b.toLowerCase())), [existingBrands]);

  // Filter out brands that already exist in the library
  const availableBrands = useMemo(() => {
    return ALL_BRANDS.filter(b => !existingSet.has(b.brand.toLowerCase()));
  }, [existingSet]);

  const filteredBrands = useMemo(() => {
    return availableBrands.filter(b => {
      if (b.is_professional && !showPro) return false;
      if (!b.is_professional && !showConsumer) return false;
      return true;
    });
  }, [availableBrands, showPro, showConsumer]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand); else next.add(brand);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedBrands(new Set(filteredBrands.map(b => b.brand)));
  };

  const deselectAll = () => {
    setSelectedBrands(new Set());
  };

  const completedCount = results.filter(r => r.status !== 'pending' && r.status !== 'running').length;
  const progress = results.length > 0 ? (completedCount / results.length) * 100 : 0;

  const handleRun = async () => {
    const brandsToProcess = filteredBrands.filter(b => selectedBrands.has(b.brand));
    if (brandsToProcess.length === 0) {
      toast.error('Select at least one brand');
      return;
    }

    setIsRunning(true);
    const initialResults: BrandResult[] = brandsToProcess.map(b => ({
      brand: b.brand,
      status: 'pending',
    }));
    setResults(initialResults);

    // Process in batches of 5 to avoid timeouts
    const BATCH_SIZE = 5;
    for (let i = 0; i < brandsToProcess.length; i += BATCH_SIZE) {
      const batch = brandsToProcess.slice(i, i + BATCH_SIZE);

      // Mark batch as running
      setResults(prev => prev.map(r =>
        batch.some(b => b.brand === r.brand) ? { ...r, status: 'running' as const } : r
      ));

      try {
        const { data, error } = await supabase.functions.invoke('bulk-catalog-import', {
          body: { brands: batch },
        });

        if (error) throw error;

        if (data?.results) {
          setResults(prev => prev.map(r => {
            const match = data.results.find((dr: any) => dr.brand === r.brand);
            if (match) {
              return {
                ...r,
                status: match.status as BrandResult['status'],
                products_generated: match.products_generated,
                products_inserted: match.products_inserted,
                products_skipped: match.products_skipped,
                error: match.error,
              };
            }
            return r;
          }));
        }
      } catch (err: any) {
        // Mark entire batch as error
        setResults(prev => prev.map(r =>
          batch.some(b => b.brand === r.brand) && r.status === 'running'
            ? { ...r, status: 'error' as const, error: err.message }
            : r
        ));
      }
    }

    setIsRunning(false);
    queryClient.invalidateQueries({ queryKey: ['supply-library-brand-summaries'] });
    queryClient.invalidateQueries({ queryKey: ['supply-library-brands'] });
    queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
    toast.success('Bulk catalog import complete');
  };

  const totalInserted = results.reduce((s, r) => s + (r.products_inserted || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            Build Full Color Catalog
          </DialogTitle>
          <DialogDescription>
            AI-powered catalog generation for {availableBrands.length} brands not yet in your library.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <PlatformButton
            size="sm"
            variant={showPro ? 'default' : 'outline'}
            onClick={() => setShowPro(!showPro)}
          >
            Professional ({availableBrands.filter(b => b.is_professional).length})
          </PlatformButton>
          <PlatformButton
            size="sm"
            variant={showConsumer ? 'default' : 'outline'}
            onClick={() => setShowConsumer(!showConsumer)}
          >
            Consumer ({availableBrands.filter(b => !b.is_professional).length})
          </PlatformButton>
          <div className="ml-auto flex gap-2">
            <PlatformButton size="sm" variant="ghost" onClick={selectAll} disabled={isRunning}>
              Select All
            </PlatformButton>
            <PlatformButton size="sm" variant="ghost" onClick={deselectAll} disabled={isRunning}>
              Clear
            </PlatformButton>
          </div>
        </div>

        {/* Brand list */}
        <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
          <div className="space-y-1 pr-4">
            {filteredBrands.map(b => {
              const result = results.find(r => r.brand === b.brand);
              return (
                <div
                  key={b.brand}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                    selectedBrands.has(b.brand)
                      ? 'bg-violet-500/10 border border-violet-500/30'
                      : 'hover:bg-[hsl(var(--platform-muted)/0.5)] border border-transparent',
                    isRunning && 'cursor-default'
                  )}
                  onClick={() => !isRunning && toggleBrand(b.brand)}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                    selectedBrands.has(b.brand)
                      ? 'bg-violet-500 border-violet-500'
                      : 'border-[hsl(var(--platform-border))]'
                  )}>
                    {selectedBrands.has(b.brand) && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                  </div>

                  <span className="font-sans text-sm text-[hsl(var(--platform-foreground))] flex-1">
                    {b.brand}
                  </span>

                  {!b.is_professional && (
                    <PlatformBadge variant="default" size="sm">Consumer</PlatformBadge>
                  )}

                  {/* Status indicator */}
                  {result?.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-violet-400" />}
                  {result?.status === 'success' && (
                    <span className="font-sans text-xs text-emerald-400">
                      +{result.products_inserted} products
                    </span>
                  )}
                  {result?.status === 'skipped' && (
                    <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                      Already complete
                    </span>
                  )}
                  {result?.status === 'error' && (
                    <span className="font-sans text-xs text-red-400" title={result.error}>
                      Error
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Progress bar */}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-sans text-[hsl(var(--platform-foreground-muted))]">
              <span>{completedCount} / {results.length} brands processed</span>
              <span>{totalInserted} products added</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Action */}
        <div className="flex items-center justify-between pt-2">
          <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
            {selectedBrands.size} brand{selectedBrands.size !== 1 ? 's' : ''} selected
          </span>
          <PlatformButton
            onClick={handleRun}
            disabled={isRunning || selectedBrands.size === 0}
          >
            {isRunning ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Generating...</>
            ) : (
              <><Database className="w-4 h-4 mr-1" /> Generate Catalog</>
            )}
          </PlatformButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
