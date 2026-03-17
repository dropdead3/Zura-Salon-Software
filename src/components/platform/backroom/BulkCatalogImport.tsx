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
import { Loader2, Database, CheckCircle2, XCircle, AlertTriangle, Sparkles, Eye, ChevronDown, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface BrandTarget {
  brand: string;
  is_professional: boolean;
}

/** Brand product pages for Firecrawl verification */
const BRAND_VERIFY_URLS: Record<string, string> = {
  'Arctic Fox': 'https://arcticfoxhaircolor.com/collections/hair-color',
  'Manic Panic': 'https://www.manicpanic.com/collections/semi-permanent-hair-color',
  'Good Dye Young': 'https://www.gooddyeyoung.com/collections/semi-permanent-color',
  'Crazy Color': 'https://www.crazycolor.co.uk/shop/',
  'Lime Crime Unicorn Hair': 'https://www.limecrime.com/collections/unicorn-hair',
  'oVertone': 'https://overtone.co/collections/all',
  'Punky Colour': 'https://www.punky.com/collections/all',
  'Lunar Tides': 'https://lunartideshaircolor.com/collections/all',
  'Adore': 'https://www.creativeimagesinc.com/adore-semi-permanent-hair-color/',
  'Splat': 'https://www.splathaircolor.com/shop',
  'Pulp Riot': 'https://www.pulpriothair.com/collections/all',
  'Pravana': 'https://www.pravana.com/products/color',
  'Aveda': 'https://www.aveda.com/hair-color',
  'Davines': 'https://us.davines.com/collections/color',
  'Kenra Professional': 'https://kenraprofessional.com/collections/color',
};

const PROFESSIONAL_BRANDS: BrandTarget[] = [
  // --- Permanent / Demi Color Lines ---
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
  // New professional color lines
  { brand: 'Goldwell Topchic', is_professional: true },
  { brand: 'Goldwell Colorance', is_professional: true },
  { brand: 'Goldwell Nectaya', is_professional: true },
  { brand: 'Schwarzkopf Igora Royal', is_professional: true },
  { brand: 'Schwarzkopf Igora Vibrance', is_professional: true },
  { brand: 'Schwarzkopf BlondMe', is_professional: true },
  { brand: 'Joico LumiShine', is_professional: true },
  { brand: 'Joico Vero K-PAK Color', is_professional: true },
  { brand: 'Joico Color Intensity', is_professional: true },
  { brand: 'Matrix SoColor', is_professional: true },
  { brand: 'Matrix Color Sync', is_professional: true },
  { brand: 'Matrix COLORGRAPHICS', is_professional: true },
  { brand: "L'Oréal Majirel", is_professional: true },
  { brand: "L'Oréal INOA", is_professional: true },
  { brand: "L'Oréal Dia Light", is_professional: true },
  { brand: "L'Oréal Dia Richesse", is_professional: true },
  { brand: "L'Oréal Majirel Cool Cover", is_professional: true },
  { brand: 'Wella Illumina Color', is_professional: true },
  { brand: 'Wella Color Touch', is_professional: true },
  { brand: 'Wella Shinefinity', is_professional: true },
  { brand: 'Redken Shades EQ', is_professional: true },
  { brand: 'Redken Color Fusion', is_professional: true },
  { brand: 'Redken Color Gels Lacquers', is_professional: true },
  { brand: 'Paul Mitchell The Color', is_professional: true },
  { brand: 'Paul Mitchell Pop XG', is_professional: true },
  { brand: 'Paul Mitchell The Demi', is_professional: true },
  { brand: 'TIGI Creative Color', is_professional: true },
  { brand: 'Schwarzkopf TBSH', is_professional: true },
  { brand: 'Schwarzkopf Essensity', is_professional: true },
  { brand: 'Amika', is_professional: true },
  { brand: 'Kevin Murphy Color.Me', is_professional: true },
  { brand: 'Surface Hair Color', is_professional: true },
  { brand: 'Tocco Magico', is_professional: true },
  { brand: 'Herbaceuticals', is_professional: true },
  { brand: 'Natulique', is_professional: true },
  { brand: 'Evo Fabuloso Pro', is_professional: true },
  { brand: 'ChromaSilk (Pravana)', is_professional: true },
  { brand: 'ENJOY Hair Color', is_professional: true },
  // --- Lighteners & Developers ---
  { brand: 'Schwarzkopf BlondMe Lighteners', is_professional: true },
  { brand: 'Wella Blondor', is_professional: true },
  { brand: 'Wella Koleston Developers', is_professional: true },
  { brand: "L'Oréal Blond Studio", is_professional: true },
  { brand: "L'Oréal Oxydant Crème", is_professional: true },
  { brand: 'Matrix Light Master', is_professional: true },
  { brand: 'Matrix Cream Developer', is_professional: true },
  { brand: 'Joico Blonde Life Lightener', is_professional: true },
  { brand: 'Redken Flash Lift', is_professional: true },
  { brand: 'Redken Pro-Oxide Developers', is_professional: true },
  { brand: 'Goldwell Silk Lift', is_professional: true },
  { brand: 'Goldwell System Developer', is_professional: true },
  { brand: 'Paul Mitchell Blonde', is_professional: true },
  { brand: 'Kenra Simply Blonde', is_professional: true },
  { brand: 'Schwarzkopf Igora Vario Blond', is_professional: true },
  { brand: 'Guy Tang Big9 Lightener', is_professional: true },
  { brand: 'Framar Developers', is_professional: true },
  { brand: 'Oligo Blacklight Lightener', is_professional: true },
  { brand: 'Pulp Riot Blondtastic', is_professional: true },
  // --- Bond Builders & Treatments ---
  { brand: 'Olaplex', is_professional: true },
  { brand: 'K18', is_professional: true },
  { brand: 'Redken Acidic Bonding Concentrate', is_professional: true },
  { brand: 'Brazilian Blowout', is_professional: true },
  { brand: 'Schwarzkopf Fibre Clinix', is_professional: true },
  { brand: 'Wella Wellaplex', is_professional: true },
  { brand: 'Joico Defy Damage', is_professional: true },
  { brand: 'Matrix Bond Ultim8', is_professional: true },
  { brand: "L'Oréal Smartbond", is_professional: true },
  { brand: 'Goldwell BondPro+', is_professional: true },
  { brand: 'Paul Mitchell MitchBond Rx', is_professional: true },
  { brand: 'Uberliss Bond Sustainer', is_professional: true },
  { brand: 'Malibu C Treatments', is_professional: true },
  { brand: 'Moroccanoil Treatments', is_professional: true },
  { brand: 'Virtue Labs', is_professional: true },
  { brand: 'Biolage Strength Recovery', is_professional: true },
  { brand: 'R+Co BLEU', is_professional: true },
  { brand: 'Living Proof', is_professional: true },
  { brand: 'Bumble and bumble', is_professional: true },
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
  // New consumer/DTC brands
  { brand: 'Madison Reed', is_professional: false },
  { brand: 'Herbatint', is_professional: false },
  { brand: 'Henna Color Lab', is_professional: false },
  { brand: 'Rit DyeMore', is_professional: false },
  { brand: "Garnier Nutrisse", is_professional: false },
  { brand: "L'Oréal Paris Féria", is_professional: false },
  { brand: "L'Oréal Paris Excellence", is_professional: false },
  { brand: 'Revlon ColorSilk', is_professional: false },
  { brand: 'Clairol Nice N Easy', is_professional: false },
  { brand: 'Clairol Natural Instincts', is_professional: false },
  { brand: 'John Frieda Precision Foam', is_professional: false },
  { brand: 'Schwarzkopf Got2b', is_professional: false },
  { brand: 'Schwarzkopf Keratin Color', is_professional: false },
  { brand: 'Naturtint', is_professional: false },
  { brand: 'Bigen', is_professional: false },
  { brand: 'Mofajang Hair Wax', is_professional: false },
  { brand: 'Paradyes', is_professional: false },
  { brand: 'Kérastase Blond Absolu', is_professional: false },
  { brand: 'Josh Wood Colour', is_professional: false },
  { brand: 'eSalon', is_professional: false },
  { brand: 'Color&Co by L\'Oréal', is_professional: false },
  { brand: 'Biolage ColorBalm', is_professional: false },
  { brand: 'Christophe Robin Shade Variations', is_professional: false },
  { brand: 'Maria Nila Colour Refresh', is_professional: false },
  { brand: 'Moroccanoil Color Depositing Mask', is_professional: false },
];

const ALL_BRANDS = [...PROFESSIONAL_BRANDS, ...CONSUMER_BRANDS];

interface ProductEntry {
  name: string;
  category: string;
  product_line: string;
  swatch_hex?: string;
}

interface VerificationResult {
  verified: boolean;
  warnings: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface BrandResult {
  brand: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  products_generated?: number;
  products_inserted?: number;
  products_skipped?: number;
  products?: ProductEntry[];
  verification?: VerificationResult | null;
  error?: string;
}

type Phase = 'select' | 'review' | 'importing' | 'done';

interface BulkCatalogImportProps {
  existingBrands: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkCatalogImport({ existingBrands, open, onOpenChange }: BulkCatalogImportProps) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('select');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BrandResult[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [showPro, setShowPro] = useState(true);
  const [showConsumer, setShowConsumer] = useState(true);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  const existingSet = useMemo(() => new Set(existingBrands.map(b => b.toLowerCase())), [existingBrands]);

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

  const selectAll = () => setSelectedBrands(new Set(filteredBrands.map(b => b.brand)));
  const deselectAll = () => setSelectedBrands(new Set());

  const toggleExpand = (brand: string) => {
    setExpandedBrands(prev => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand); else next.add(brand);
      return next;
    });
  };

  const completedCount = results.filter(r => r.status !== 'pending' && r.status !== 'running').length;
  const progress = results.length > 0 ? (completedCount / results.length) * 100 : 0;
  const totalInserted = results.reduce((s, r) => s + (r.products_inserted || 0), 0);
  const totalGenerated = results.reduce((s, r) => s + (r.products_generated || 0), 0);

  const handleReset = () => {
    setPhase('select');
    setResults([]);
    setExpandedBrands(new Set());
  };

  // Phase 1: Generate — call generate-color-catalog per brand individually (avoids edge-fn timeout)
  const handleGenerate = async () => {
    const brandsToProcess = filteredBrands.filter(b => selectedBrands.has(b.brand));
    if (brandsToProcess.length === 0) {
      toast.error('Select at least one brand');
      return;
    }

    setIsRunning(true);
    setPhase('review');
    const initialResults: BrandResult[] = brandsToProcess.map(b => ({ brand: b.brand, status: 'pending' }));
    setResults(initialResults);

    // Process one brand at a time — each call is ~30-60s, well within edge-fn timeout
    for (const brandTarget of brandsToProcess) {
      setResults(prev => prev.map(r =>
        r.brand === brandTarget.brand ? { ...r, status: 'running' as const } : r
      ));

      try {
        const { data, error } = await supabase.functions.invoke('generate-color-catalog', {
          body: {
            brand: brandTarget.brand,
            is_professional: brandTarget.is_professional,
            verify_url: BRAND_VERIFY_URLS[brandTarget.brand] || undefined,
          },
        });

        if (error) throw error;

        if (data?.success && data?.products) {
          setResults(prev => prev.map(r =>
            r.brand === brandTarget.brand
              ? {
                  ...r,
                  status: 'success' as const,
                  products_generated: data.product_count || data.products.length,
                  products: data.products,
                  verification: data.verification || null,
                }
              : r
          ));
        } else {
          setResults(prev => prev.map(r =>
            r.brand === brandTarget.brand
              ? { ...r, status: 'error' as const, error: data?.error || 'No products returned' }
              : r
          ));
        }
      } catch (err: any) {
        setResults(prev => prev.map(r =>
          r.brand === brandTarget.brand
            ? { ...r, status: 'error' as const, error: err.message || 'Failed to fetch' }
            : r
        ));
      }
    }
    setIsRunning(false);
  };

  // Phase 2: Confirm & Import — send pre-generated products to bulk-catalog-import (insert-only, fast)
  const handleConfirmImport = async () => {
    const brandsToImport = results.filter(r => r.status === 'success' && r.products && r.products.length > 0);

    if (brandsToImport.length === 0) {
      toast.error('No brands with generated products to import');
      return;
    }

    setIsRunning(true);
    setPhase('importing');

    // Mark importing brands as running
    setResults(prev => prev.map(r =>
      brandsToImport.some(b => b.brand === r.brand)
        ? { ...r, status: 'running' as const, products_inserted: 0 }
        : r
    ));

    // Build the payload: pre-generated products grouped by brand
    const payload = brandsToImport.map(r => {
      const target = ALL_BRANDS.find(b => b.brand === r.brand);
      return {
        brand: r.brand,
        is_professional: target?.is_professional ?? true,
        products: r.products!,
      };
    });

    try {
      const { data, error } = await supabase.functions.invoke('bulk-catalog-import', {
        body: { brand_products: payload },
      });

      if (error) throw error;

      if (data?.results) {
        setResults(prev => prev.map(r => {
          const match = data.results.find((dr: any) => dr.brand === r.brand);
          if (match) {
            return {
              ...r,
              status: match.status as BrandResult['status'],
              products_inserted: match.products_inserted,
              products_skipped: match.products_skipped,
            };
          }
          return r;
        }));
      }
    } catch (err: any) {
      setResults(prev => prev.map(r =>
        brandsToImport.some(b => b.brand === r.brand) && r.status === 'running'
          ? { ...r, status: 'error' as const, error: err.message }
          : r
      ));
    }

    setIsRunning(false);
    setPhase('done');
    queryClient.invalidateQueries({ queryKey: ['supply-library-brand-summaries'] });
    queryClient.invalidateQueries({ queryKey: ['supply-library-brands'] });
    queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
    toast.success('Bulk catalog import complete');
  };

  const renderVerificationBadge = (v: VerificationResult | null | undefined) => {
    if (!v) return null;
    return (
      <div className="flex items-center gap-1">
        {v.verified ? (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span className={cn(
          'font-sans text-xs',
          v.confidence === 'high' ? 'text-emerald-400' :
          v.confidence === 'medium' ? 'text-amber-400' : 'text-red-400'
        )}>
          {v.confidence}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            {phase === 'select' && 'Build Full Color Catalog'}
            {phase === 'review' && (isRunning ? 'Generating Preview...' : 'Review Generated Products')}
            {phase === 'importing' && 'Importing to Library...'}
            {phase === 'done' && 'Import Complete'}
          </DialogTitle>
          <DialogDescription>
            {phase === 'select' && `AI-powered catalog generation for ${availableBrands.length} brands not yet in your library.`}
            {phase === 'review' && !isRunning && 'Review the AI-generated products below before committing to the database.'}
            {phase === 'review' && isRunning && 'Generating product catalogs with AI verification...'}
            {phase === 'importing' && 'Writing products to the library...'}
            {phase === 'done' && `Successfully added ${totalInserted} products across ${results.filter(r => r.products_inserted && r.products_inserted > 0).length} brands.`}
          </DialogDescription>
        </DialogHeader>

        {/* Phase: Select */}
        {phase === 'select' && (
          <>
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
                <PlatformButton size="sm" variant="ghost" onClick={selectAll}>Select All</PlatformButton>
                <PlatformButton size="sm" variant="ghost" onClick={deselectAll}>Clear</PlatformButton>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
              <div className="space-y-1 pr-4">
                {filteredBrands.map(b => (
                  <div
                    key={b.brand}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                      selectedBrands.has(b.brand)
                        ? 'bg-violet-500/10 border border-violet-500/30'
                        : 'hover:bg-[hsl(var(--platform-muted)/0.5)] border border-transparent',
                    )}
                    onClick={() => toggleBrand(b.brand)}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                      selectedBrands.has(b.brand)
                        ? 'bg-violet-500 border-violet-500'
                        : 'border-[hsl(var(--platform-border))]'
                    )}>
                      {selectedBrands.has(b.brand) && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-sans text-sm text-[hsl(var(--platform-foreground))] flex-1">{b.brand}</span>
                    {!b.is_professional && <PlatformBadge variant="default" size="sm">Consumer</PlatformBadge>}
                    {BRAND_VERIFY_URLS[b.brand] && (
                      <span title="Web verification available">
                        <ShieldCheck className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted))]" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2">
              <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                {selectedBrands.size} brand{selectedBrands.size !== 1 ? 's' : ''} selected
              </span>
              <PlatformButton onClick={handleGenerate} disabled={selectedBrands.size === 0}>
                <Eye className="w-4 h-4 mr-1" /> Generate & Review
              </PlatformButton>
            </div>
          </>
        )}

        {/* Phase: Review (dry-run results) */}
        {(phase === 'review' || phase === 'importing' || phase === 'done') && (
          <>
            {results.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-sans text-[hsl(var(--platform-foreground-muted))]">
                  <span>{completedCount} / {results.length} brands processed</span>
                  <span>{totalGenerated} products generated</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
              <div className="space-y-1 pr-4">
                {results.map(r => (
                  <Collapsible key={r.brand} open={expandedBrands.has(r.brand)} onOpenChange={() => toggleExpand(r.brand)}>
                    <div className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      r.status === 'error' ? 'bg-red-500/5 border border-red-500/20' :
                      r.status === 'success' && phase === 'done' ? 'bg-emerald-500/5 border border-emerald-500/20' :
                      'border border-transparent'
                    )}>
                      {r.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-violet-400 shrink-0" />}
                      {r.status === 'pending' && <div className="w-4 h-4 rounded-full border border-[hsl(var(--platform-border))] shrink-0" />}
                      {r.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {r.status === 'error' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      {r.status === 'skipped' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}

                      <span className="font-sans text-sm text-[hsl(var(--platform-foreground))] flex-1">{r.brand}</span>

                      {renderVerificationBadge(r.verification)}

                      {r.products_generated != null && (
                        <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                          {r.products_generated} products
                        </span>
                      )}

                      {r.products_inserted != null && r.products_inserted > 0 && phase === 'done' && (
                        <span className="font-sans text-xs text-emerald-400">+{r.products_inserted} added</span>
                      )}

                      {r.status === 'error' && (
                        <span className="font-sans text-xs text-red-400 max-w-[120px] truncate" title={r.error}>
                          {r.error}
                        </span>
                      )}

                      {r.products && r.products.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <button className="p-1 hover:bg-[hsl(var(--platform-bg-hover))] rounded">
                            {expandedBrands.has(r.brand) ? (
                              <ChevronDown className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
                            )}
                          </button>
                        </CollapsibleTrigger>
                      )}
                    </div>

                    {r.products && r.products.length > 0 && (
                      <CollapsibleContent>
                        <div className="ml-7 pl-4 border-l border-[hsl(var(--platform-border)/0.3)] space-y-0.5 py-1 mb-2">
                          {/* Verification warnings */}
                          {r.verification?.warnings && r.verification.warnings.length > 0 && (
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 mb-2">
                              <p className="font-sans text-xs font-medium text-amber-400 mb-1">Verification Warnings</p>
                              {r.verification.warnings.map((w, i) => (
                                <p key={i} className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">• {w}</p>
                              ))}
                            </div>
                          )}

                          {/* Category summary */}
                          {(() => {
                            const cats = r.products!.reduce((acc, p) => {
                              acc[p.category] = (acc[p.category] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);
                            return (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {Object.entries(cats).map(([cat, count]) => (
                                  <PlatformBadge key={cat} variant="outline" size="sm">
                                    {cat}: {count}
                                  </PlatformBadge>
                                ))}
                              </div>
                            );
                          })()}

                          {/* Sample product names (first 10) */}
                          {r.products!.slice(0, 10).map((p, i) => (
                            <div key={i} className="flex items-center gap-2">
                              {p.swatch_hex && (
                                <div
                                  className="w-3 h-3 rounded-full border border-[hsl(var(--platform-border)/0.5)] shrink-0"
                                  style={{ backgroundColor: p.swatch_hex }}
                                />
                              )}
                              <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] truncate">
                                {p.name}
                              </span>
                            </div>
                          ))}
                          {r.products!.length > 10 && (
                            <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))/0.6] italic">
                              ... and {r.products!.length - 10} more
                            </span>
                          )}
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2">
              {phase === 'review' && !isRunning && (
                <>
                  <PlatformButton variant="ghost" onClick={handleReset}>
                    Discard
                  </PlatformButton>
                  <PlatformButton onClick={handleConfirmImport} disabled={results.filter(r => r.status === 'success').length === 0}>
                    <Database className="w-4 h-4 mr-1" /> Confirm & Import ({results.filter(r => r.status === 'success').length} brands)
                  </PlatformButton>
                </>
              )}
              {phase === 'review' && isRunning && (
                <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] ml-auto flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                </span>
              )}
              {phase === 'importing' && (
                <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] ml-auto flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing to database...
                </span>
              )}
              {phase === 'done' && (
                <>
                  <span className="font-sans text-xs text-emerald-400">
                    {totalInserted} products added successfully
                  </span>
                  <PlatformButton variant="outline" onClick={() => onOpenChange(false)}>
                    Done
                  </PlatformButton>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
