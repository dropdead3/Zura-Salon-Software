import { useState, useMemo, useRef, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
  DialogFooter,
  PlatformDialogDescription as DialogDescription,
} from '@/components/platform/ui/PlatformDialog';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import {
  PlatformTable as Table,
  PlatformTableHeader as TableHeader,
  PlatformTableBody as TableBody,
  PlatformTableHead as TableHead,
  PlatformTableRow as TableRow,
  PlatformTableCell as TableCell,
} from '@/components/platform/ui/PlatformTable';
import { PlatformTextarea } from '@/components/platform/ui/PlatformTextarea';
import {
  ChevronLeft, ChevronRight, Upload, Image as ImageIcon,
  Globe, FileSpreadsheet, CheckCircle2, Package, Loader2, X, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateSupplyBrand, uploadBrandLogo } from '@/hooks/platform/useSupplyLibraryBrandMeta';
import { useSupplyLibraryBrands } from '@/hooks/platform/useSupplyLibrary';
import { BrandWebsiteScraper } from './BrandWebsiteScraper';
import type { ScrapedProduct } from '@/hooks/platform/useBrandWebsiteScrape';
import { extractProductLine } from '@/lib/supply-line-parser';
import { PlatformCheckbox as Checkbox } from '@/components/platform/ui/PlatformCheckbox';

const CATEGORIES = ['color', 'lightener', 'developer', 'toner', 'semi-permanent', 'bond builder', 'treatment', 'additive'];
const CATEGORY_LABELS: Record<string, string> = {
  color: 'Color', lightener: 'Lightener', developer: 'Developer', toner: 'Toner',
  'semi-permanent': 'Semi-Permanent', 'bond builder': 'Bond Builder', treatment: 'Treatment',
  additive: 'Additive', styling: 'Styling', care: 'Care',
};

interface AddBrandWizardProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type WizardStep = 'details' | 'logo' | 'scrape' | 'import' | 'review';

interface CSVProduct {
  name: string;
  category: string;
  product_line: string;
  size_options: string[];
  default_depletion: string;
  default_unit: string;
  wholesale_price?: number;
  selected: boolean;
}

function parseCSVForWizard(text: string): CSVProduct[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Smart column mapping
  const findCol = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)));

  const nameIdx = findCol(['name', 'product', 'item']);
  const catIdx = findCol(['category', 'cat', 'type']);
  const depIdx = findCol(['depletion', 'tracking', 'method']);
  const unitIdx = findCol(['unit', 'measure']);
  const sizeIdx = findCol(['size', 'sizes', 'options']);
  const priceIdx = findCol(['wholesale', 'cost', 'price']);

  if (nameIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^['"]|['"]$/g, ''));
    const name = cols[nameIdx] || '';
    return {
      name,
      category: catIdx >= 0 ? cols[catIdx] || 'color' : 'color',
      product_line: extractProductLine(name) || '',
      size_options: sizeIdx >= 0 ? (cols[sizeIdx] || '').split(';').map((s) => s.trim()).filter(Boolean) : [],
      default_depletion: depIdx >= 0 ? cols[depIdx] || 'weighed' : 'weighed',
      default_unit: unitIdx >= 0 ? cols[unitIdx] || 'g' : 'g',
      wholesale_price: priceIdx >= 0 && cols[priceIdx] ? parseFloat(cols[priceIdx]) || undefined : undefined,
      selected: !!name,
    };
  }).filter((r) => r.name);
}

export function AddBrandWizard({ open, onOpenChange }: AddBrandWizardProps) {
  const createBrand = useCreateSupplyBrand();
  const { data: existingBrands = [] } = useSupplyLibraryBrands();

  // Step state
  const [step, setStep] = useState<WizardStep>('details');

  // Step 1: Brand details
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('color');

  // Step 2: Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2.5: Scrape
  const [scrapedProducts, setScrapedProducts] = useState<ScrapedProduct[]>([]);
  const [selectedScrapedProducts, setSelectedScrapedProducts] = useState<ScrapedProduct[]>([]);

  // Step 3: CSV Import
  const [csvProducts, setCsvProducts] = useState<CSVProduct[]>([]);
  const [importMode, setImportMode] = useState<'scrape' | 'csv' | 'both' | 'none'>('none');
  const csvFileRef = useRef<HTMLInputElement>(null);

  // Derived
  const isDuplicate = useMemo(
    () => existingBrands.some((b) => b.toLowerCase() === brandName.trim().toLowerCase()),
    [existingBrands, brandName]
  );

  const hasWebsite = websiteUrl.trim().length > 0;

  const steps: WizardStep[] = useMemo(() => {
    const s: WizardStep[] = ['details', 'logo'];
    if (hasWebsite) s.push('scrape');
    s.push('import', 'review');
    return s;
  }, [hasWebsite]);

  const currentStepIdx = steps.indexOf(step);
  const isFirstStep = currentStepIdx === 0;
  const isLastStep = currentStepIdx === steps.length - 1;

  const goNext = () => {
    if (currentStepIdx < steps.length - 1) setStep(steps[currentStepIdx + 1]);
  };
  const goBack = () => {
    if (currentStepIdx > 0) setStep(steps[currentStepIdx - 1]);
  };

  // Logo handlers
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      const url = await uploadBrandLogo(logoFile, brandName);
      if (url) {
        setUploadedLogoUrl(url);
        toast.success('Logo uploaded');
      } else {
        toast.error('Failed to upload logo');
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  // CSV handler
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSVForWizard(text);
      setCsvProducts(parsed);
      if (parsed.length > 0 && selectedScrapedProducts.length > 0) {
        setImportMode('both');
      } else if (parsed.length > 0) {
        setImportMode('csv');
      }
    };
    reader.readAsText(file);
  };

  // Compute final products for review
  const finalProducts = useMemo(() => {
    const products: Array<{ name: string; category: string; product_line: string; size_options: string[]; default_depletion: string; default_unit: string; wholesale_price?: number; source: 'scrape' | 'csv' }> = [];
    const seen = new Set<string>();

    // Add selected scraped products
    selectedScrapedProducts.forEach((p) => {
      const key = p.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        products.push({
          name: p.name,
          category: p.category,
          product_line: p.product_line || extractProductLine(p.name) || '',
          size_options: p.sizes || [],
          default_depletion: 'weighed',
          default_unit: 'g',
          source: 'scrape',
        });
      }
    });

    // Add selected CSV products
    csvProducts.filter((p) => p.selected).forEach((p) => {
      const key = p.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        products.push({
          name: p.name,
          category: p.category,
          product_line: p.product_line,
          size_options: p.size_options,
          default_depletion: p.default_depletion,
          default_unit: p.default_unit,
          wholesale_price: p.wholesale_price,
          source: 'csv',
        });
      }
    });

    return products;
  }, [selectedScrapedProducts, csvProducts]);

  // Submit
  const handleCreate = async () => {
    // Upload logo if not yet uploaded
    let logoUrl = uploadedLogoUrl;
    if (logoFile && !logoUrl) {
      setUploadingLogo(true);
      logoUrl = await uploadBrandLogo(logoFile, brandName);
      setUploadingLogo(false);
    }

    await createBrand.mutateAsync({
      name: brandName.trim(),
      description: description.trim() || undefined,
      website_url: websiteUrl.trim() || undefined,
      logo_url: logoUrl || undefined,
      country_of_origin: countryOfOrigin.trim() || undefined,
      default_category: defaultCategory,
      products: finalProducts.map((p) => ({
        name: p.name,
        category: p.category,
        product_line: p.product_line,
        size_options: p.size_options,
        default_depletion: p.default_depletion,
        default_unit: p.default_unit,
        wholesale_price: p.wholesale_price,
      })),
    });

    // Reset and close
    resetWizard();
    onOpenChange(false);
  };

  const resetWizard = () => {
    setStep('details');
    setBrandName('');
    setDescription('');
    setWebsiteUrl('');
    setCountryOfOrigin('');
    setDefaultCategory('color');
    setLogoFile(null);
    setLogoPreview(null);
    setUploadedLogoUrl(null);
    setScrapedProducts([]);
    setSelectedScrapedProducts([]);
    setCsvProducts([]);
    setImportMode('none');
  };

  const canProceed = () => {
    switch (step) {
      case 'details':
        return brandName.trim().length > 0 && !isDuplicate;
      case 'logo':
        return true; // optional
      case 'scrape':
        return true; // can skip
      case 'import':
        return true; // can skip
      case 'review':
        return true;
      default:
        return true;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetWizard(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide flex items-center gap-2">
            <Package className="w-4 h-4 text-violet-400" />
            Add Brand
          </DialogTitle>
          <DialogDescription className="font-sans text-xs">
            Step {currentStepIdx + 1} of {steps.length}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-1">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1.5 rounded-full flex-1 transition-colors',
                i <= currentStepIdx ? 'bg-violet-500' : 'bg-[hsl(var(--platform-bg-hover))]'
              )}
            />
          ))}
        </div>

        <div className="min-h-[300px]">
          {/* ─── Step 1: Brand Details ─── */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-sans text-xs">Brand Name *</Label>
                <PlatformInput
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Schwarzkopf Professional"
                  className="font-sans"
                />
                {isDuplicate && (
                  <p className="font-sans text-xs text-amber-400 flex items-center gap-1">
                    <span className="w-3 h-3">⚠</span> A brand with this name already exists
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="font-sans text-xs">Description</Label>
                <PlatformTextarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the brand and its product focus..."
                  rows={2}
                  className="font-sans text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-sans text-xs">
                  Website URL
                  {websiteUrl.trim() && (
                    <span className="text-violet-400 ml-1.5 font-normal">
                      — enables product auto-discovery
                    </span>
                  )}
                </Label>
                <PlatformInput
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://www.brand.com"
                  className="font-sans"
                  icon={<Globe className="w-3.5 h-3.5" />}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-sans text-xs">Country of Origin</Label>
                  <PlatformInput
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    placeholder="e.g. Germany"
                    className="font-sans"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-sans text-xs">Default Category</Label>
                  <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                    <SelectTrigger className="font-sans text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 2: Logo Upload ─── */}
          {step === 'logo' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoSelect}
              />

              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Brand logo preview"
                    className="w-28 h-28 rounded-xl object-contain border border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg-hover)/0.3)] p-2"
                  />
                  <button
                    onClick={() => { setLogoFile(null); setLogoPreview(null); setUploadedLogoUrl(null); }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[hsl(var(--platform-bg-elevated))] border border-[hsl(var(--platform-border))] flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-[hsl(var(--platform-foreground-muted))]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-xl border-2 border-dashed border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-hover)/0.2)] flex flex-col items-center justify-center gap-2 hover:border-violet-500/50 transition-colors"
                >
                  <ImageIcon className="w-6 h-6 text-[hsl(var(--platform-foreground-muted))]" />
                  <span className="font-sans text-[10px] text-[hsl(var(--platform-foreground-muted))]">Upload logo</span>
                </button>
              )}

              <p className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                Upload a brand logo (optional). PNG or SVG recommended.
              </p>

              {logoFile && !uploadedLogoUrl && (
                <PlatformButton size="sm" onClick={handleLogoUpload} loading={uploadingLogo}>
                  <Upload className="w-3.5 h-3.5 mr-1" /> Upload Now
                </PlatformButton>
              )}

              {uploadedLogoUrl && (
                <PlatformBadge variant="success" size="sm">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Uploaded
                </PlatformBadge>
              )}
            </div>
          )}

          {/* ─── Step 2.5: Website Scrape ─── */}
          {step === 'scrape' && (
            <BrandWebsiteScraper
              websiteUrl={websiteUrl}
              brandName={brandName}
              onProductsSelected={(products) => {
                setSelectedScrapedProducts(products);
                if (products.length > 0) setImportMode(csvProducts.length > 0 ? 'both' : 'scrape');
              }}
              scrapedProducts={scrapedProducts}
              setScrapedProducts={setScrapedProducts}
            />
          )}

          {/* ─── Step 3: Import Products (CSV) ─── */}
          {step === 'import' && (
            <div className="space-y-4">
              <input
                ref={csvFileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVUpload}
              />

              {selectedScrapedProducts.length > 0 && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-sans text-xs text-[hsl(var(--platform-foreground))]">
                    <span className="font-medium">{selectedScrapedProducts.length}</span> products discovered from website scan.
                    Upload a CSV below to add more or cross-reference.
                  </span>
                </div>
              )}

              {csvProducts.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <button
                    onClick={() => csvFileRef.current?.click()}
                    className="w-full max-w-sm h-32 rounded-xl border-2 border-dashed border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-hover)/0.2)] flex flex-col items-center justify-center gap-2 hover:border-violet-500/50 transition-colors"
                  >
                    <FileSpreadsheet className="w-8 h-8 text-[hsl(var(--platform-foreground-muted))]" />
                    <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                      Drop a CSV or click to upload
                    </span>
                    <span className="font-sans text-[10px] text-[hsl(var(--platform-foreground-muted))]">
                      Columns: name, category, depletion, unit, sizes, wholesale_price
                    </span>
                  </button>
                  <PlatformButton variant="ghost" size="sm" onClick={goNext}>
                    Skip — {selectedScrapedProducts.length > 0 ? 'use scraped products only' : 'add products later'}
                  </PlatformButton>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs text-[hsl(var(--platform-foreground))]">
                      <span className="font-medium">{csvProducts.length}</span> products parsed from CSV
                    </span>
                    <div className="flex items-center gap-2">
                      <PlatformButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const allSelected = csvProducts.every((p) => p.selected);
                          setCsvProducts(csvProducts.map((p) => ({ ...p, selected: !allSelected })));
                        }}
                      >
                        {csvProducts.every((p) => p.selected) ? 'Deselect All' : 'Select All'}
                      </PlatformButton>
                      <PlatformButton variant="ghost" size="sm" onClick={() => { setCsvProducts([]); csvFileRef.current && (csvFileRef.current.value = ''); }}>
                        Clear
                      </PlatformButton>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[hsl(var(--platform-border)/0.4)] max-h-[250px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[hsl(var(--platform-border)/0.3)]">
                          <TableHead className="w-10" />
                          <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Name</TableHead>
                          <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Category</TableHead>
                          <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Sizes</TableHead>
                          <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvProducts.map((p, i) => (
                          <TableRow
                            key={`csv-${i}`}
                            className={cn('cursor-pointer', p.selected && 'bg-violet-500/5')}
                            onClick={() => {
                              const updated = [...csvProducts];
                              updated[i] = { ...updated[i], selected: !updated[i].selected };
                              setCsvProducts(updated);
                            }}
                          >
                            <TableCell className="w-10">
                              <Checkbox checked={p.selected} />
                            </TableCell>
                            <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground))]">{p.name}</TableCell>
                            <TableCell>
                              <PlatformBadge variant="default" size="sm">
                                {CATEGORY_LABELS[p.category] || p.category}
                              </PlatformBadge>
                            </TableCell>
                            <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                              {p.size_options.join(', ') || '—'}
                            </TableCell>
                            <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                              {p.wholesale_price != null ? `$${p.wholesale_price.toFixed(2)}` : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Step 4: Review & Confirm ─── */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Brand summary card */}
              <div className="rounded-xl border border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg-hover)/0.2)] p-4 flex items-start gap-4">
                {(logoPreview || uploadedLogoUrl) ? (
                  <img
                    src={uploadedLogoUrl || logoPreview || ''}
                    alt={brandName}
                    className="w-14 h-14 rounded-lg object-contain border border-[hsl(var(--platform-border)/0.3)] bg-white/5 p-1 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-violet-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-display text-sm tracking-wide text-[hsl(var(--platform-foreground))]">
                    {brandName}
                  </h3>
                  {description && (
                    <p className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] line-clamp-2">
                      {description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {websiteUrl && (
                      <PlatformBadge variant="default" size="sm">
                        <Globe className="w-2.5 h-2.5 mr-1" /> {websiteUrl}
                      </PlatformBadge>
                    )}
                    {countryOfOrigin && (
                      <PlatformBadge variant="default" size="sm">
                        {countryOfOrigin}
                      </PlatformBadge>
                    )}
                    <PlatformBadge variant="default" size="sm">
                      {CATEGORY_LABELS[defaultCategory] || defaultCategory}
                    </PlatformBadge>
                  </div>
                </div>
              </div>

              {/* Product summary */}
              <div className="space-y-2">
                <h4 className="font-display text-xs tracking-wide text-[hsl(var(--platform-foreground))]">
                  Products to Import ({finalProducts.length})
                </h4>
                {finalProducts.length === 0 ? (
                  <p className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                    No products selected. You can add products to this brand later.
                  </p>
                ) : (
                  <>
                    {/* Category breakdown */}
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(
                        finalProducts.reduce<Record<string, number>>((acc, p) => {
                          acc[p.category] = (acc[p.category] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([cat, count]) => (
                        <PlatformBadge key={cat} variant="default" size="sm">
                          {count} {CATEGORY_LABELS[cat] || cat}
                        </PlatformBadge>
                      ))}
                    </div>

                    {/* Source breakdown */}
                    <div className="flex gap-2 text-[10px] font-sans text-[hsl(var(--platform-foreground-muted))]">
                      {finalProducts.filter((p) => p.source === 'scrape').length > 0 && (
                        <span>
                          <Sparkles className="w-3 h-3 inline mr-0.5 text-violet-400" />
                          {finalProducts.filter((p) => p.source === 'scrape').length} from website
                        </span>
                      )}
                      {finalProducts.filter((p) => p.source === 'csv').length > 0 && (
                        <span>
                          <FileSpreadsheet className="w-3 h-3 inline mr-0.5 text-emerald-400" />
                          {finalProducts.filter((p) => p.source === 'csv').length} from CSV
                        </span>
                      )}
                    </div>

                    {/* Scrollable product list */}
                    <div className="rounded-lg border border-[hsl(var(--platform-border)/0.4)] max-h-[200px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[hsl(var(--platform-border)/0.3)]">
                            <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Product</TableHead>
                            <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Category</TableHead>
                            <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {finalProducts.slice(0, 50).map((p, i) => (
                            <TableRow key={`${p.name}-${i}`}>
                              <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground))]">{p.name}</TableCell>
                              <TableCell>
                                <PlatformBadge variant="default" size="sm">
                                  {CATEGORY_LABELS[p.category] || p.category}
                                </PlatformBadge>
                              </TableCell>
                              <TableCell>
                                {p.source === 'scrape' ? (
                                  <Sparkles className="w-3 h-3 text-violet-400" />
                                ) : (
                                  <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {finalProducts.length > 50 && (
                        <p className="font-sans text-[10px] text-[hsl(var(--platform-foreground-muted))] text-center py-2">
                          +{finalProducts.length - 50} more products
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <DialogFooter className="flex items-center justify-between">
          <div>
            {!isFirstStep && (
              <PlatformButton variant="ghost" size="sm" onClick={goBack}>
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
              </PlatformButton>
            )}
          </div>
          <div className="flex items-center gap-2">
            <PlatformButton variant="outline" size="sm" onClick={() => { resetWizard(); onOpenChange(false); }}>
              Cancel
            </PlatformButton>
            {isLastStep ? (
              <PlatformButton
                size="sm"
                onClick={handleCreate}
                loading={createBrand.isPending || uploadingLogo}
                disabled={!canProceed()}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Create Brand{finalProducts.length > 0 ? ` + ${finalProducts.length} Products` : ''}
              </PlatformButton>
            ) : (
              <PlatformButton size="sm" onClick={goNext} disabled={!canProceed()}>
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </PlatformButton>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
