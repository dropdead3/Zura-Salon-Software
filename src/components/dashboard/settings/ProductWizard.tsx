import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, Check, X, Loader2, Sparkles, ImagePlus, Link2, Package,
} from 'lucide-react';
import { useCreateProduct, useProductCategories, useProductBrandsList, type Product } from '@/hooks/useProducts';
import { useActiveLocations } from '@/hooks/useLocations';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { supabase } from '@/integrations/supabase/client';
import { optimizeImage } from '@/lib/image-utils';
import { toast } from 'sonner';

const PRODUCT_TYPES = ['Products', 'Extensions', 'Merch'] as const;
const STEPS = ['Basics', 'Pricing & SKU', 'Description', 'Inventory', 'Review'] as const;

interface WizardForm {
  name: string;
  brand: string;
  category: string;
  product_type: string;
  image_url: string;
  retail_price: string;
  cost_price: string;
  sku: string;
  barcode: string;
  description: string;
  brand_url: string;
  quantity_on_hand: string;
  reorder_level: string;
  location_id: string;
  available_online: boolean;
}

const initialForm: WizardForm = {
  name: '', brand: '', category: '', product_type: 'Products', image_url: '',
  retail_price: '', cost_price: '', sku: '', barcode: '',
  description: '', brand_url: '',
  quantity_on_hand: '', reorder_level: '', location_id: '',
  available_online: false,
};

interface ProductWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductWizard({ open, onOpenChange }: ProductWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>({ ...initialForm });
  const [customBrand, setCustomBrand] = useState(false);
  const [customCategory, setCustomCategory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useProductCategories();
  const { data: brands } = useProductBrandsList();
  const { data: locations } = useActiveLocations();
  const createProduct = useCreateProduct();
  const { formatCurrency } = useFormatCurrency();

  const update = (patch: Partial<WizardForm>) => setForm(f => ({ ...f, ...patch }));

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(0);
      setForm({ ...initialForm });
      setCustomBrand(false);
      setCustomCategory(false);
    }, 200);
  };

  // ── Image upload ──
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }

    setUploading(true);
    try {
      const { blob } = await optimizeImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.82, format: 'webp', cropToSquare: true });
      const path = `${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/webp', upsert: true });
      if (error) { toast.error('Upload failed'); return; }
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      update({ image_url: publicUrl });
    } catch { toast.error('Failed to process image'); }
    finally { setUploading(false); }
  }, []);

  // ── AI description ──
  const handleGenerate = async () => {
    if (!form.name) { toast.error('Enter a product name first'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: { productName: form.name, brand: form.brand, url: form.brand_url || undefined, category: form.category || undefined },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.description) update({ description: data.description });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate description');
    } finally { setGenerating(false); }
  };

  // ── Save ──
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    setSaving(true);
    try {
      await createProduct.mutateAsync({
        name: form.name,
        brand: form.brand || null,
        category: form.category || null,
        product_type: form.product_type || 'Products',
        sku: form.sku || null,
        barcode: form.barcode || null,
        retail_price: form.retail_price ? parseFloat(form.retail_price) : null,
        cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
        quantity_on_hand: form.quantity_on_hand ? parseInt(form.quantity_on_hand) : null,
        reorder_level: form.reorder_level ? parseInt(form.reorder_level) : null,
        description: form.description || null,
        location_id: form.location_id || null,
        image_url: form.image_url || null,
        available_online: form.available_online,
      } as Partial<Product>);
      handleClose();
    } catch { /* toast handled by mutation */ }
    finally { setSaving(false); }
  };

  const canNext = step === 0 ? !!form.name.trim() : true;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-display tracking-wide">Add Product</DialogTitle>
          <div className="flex items-center gap-2 mt-3">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors',
                  i < step ? 'bg-primary text-primary-foreground' :
                  i === step ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'
                )}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={cn('text-xs hidden sm:inline', i === step ? 'text-foreground font-medium' : 'text-muted-foreground')}>{label}</span>
                {i < STEPS.length - 1 && <div className="w-4 h-px bg-border hidden sm:block" />}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1 mt-3" />
        </DialogHeader>

        {/* Step Content */}
        <div className="p-6 min-h-[280px]">
          {step === 0 && <StepBasics form={form} update={update} brands={brands} categories={categories} customBrand={customBrand} setCustomBrand={setCustomBrand} customCategory={customCategory} setCustomCategory={setCustomCategory} uploading={uploading} fileInputRef={fileInputRef} handleFileSelect={handleFileSelect} />}
          {step === 1 && <StepPricing form={form} update={update} />}
          {step === 2 && <StepDescription form={form} update={update} generating={generating} onGenerate={handleGenerate} />}
          {step === 3 && <StepInventory form={form} update={update} locations={locations} />}
          {step === 4 && <StepReview form={form} update={update} formatCurrency={formatCurrency} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-0 border-t mt-0 pt-4">
          <Button variant="ghost" size={tokens.button.card} onClick={() => step > 0 ? setStep(s => s - 1) : handleClose()} className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size={tokens.button.card} onClick={() => setStep(s => s + 1)} disabled={!canNext} className="gap-1.5">
              Next <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button size={tokens.button.card} onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Create Product
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Step Components ───

function StepBasics({ form, update, brands, categories, customBrand, setCustomBrand, customCategory, setCustomCategory, uploading, fileInputRef, handleFileSelect }: any) {
  return (
    <div className="space-y-4">
      {/* Image */}
      <div>
        <Label className="text-xs">Product Image</Label>
        <div className="mt-1.5 flex items-start gap-4">
          {form.image_url ? (
            <div className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted/30 shrink-0">
              <img src={form.image_url} alt="Product" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="secondary" size="icon" className="w-6 h-6" onClick={() => update({ image_url: '' })}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-20 h-20 shrink-0 rounded-lg border-2 border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center gap-1 hover:border-primary/40 transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ImagePlus className="w-4 h-4 text-muted-foreground" />}
              <span className="text-[10px] text-muted-foreground">{uploading ? 'Uploading' : 'Upload'}</span>
            </button>
          )}
          <div className="flex-1 space-y-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => update({ name: e.target.value })} placeholder="e.g. Olaplex No.3 Hair Perfector" className="h-9" autoFocus />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.product_type} onValueChange={v => update({ product_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Brand & Category */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Brand</Label>
          {customBrand ? (
            <div className="flex gap-1.5 mt-1">
              <Input value={form.brand} onChange={e => update({ brand: e.target.value })} placeholder="New brand" className="h-9" autoFocus />
              <Button type="button" variant="ghost" size="icon" className="w-9 h-9 shrink-0" onClick={() => { setCustomBrand(false); update({ brand: '' }); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Select value={form.brand || '__none__'} onValueChange={v => {
              if (v === '__other__') { setCustomBrand(true); update({ brand: '' }); }
              else if (v === '__none__') update({ brand: '' });
              else update({ brand: v });
            }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {brands?.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                <SelectItem value="__other__">Other…</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          {customCategory ? (
            <div className="flex gap-1.5 mt-1">
              <Input value={form.category} onChange={e => update({ category: e.target.value })} placeholder="New category" className="h-9" autoFocus />
              <Button type="button" variant="ghost" size="icon" className="w-9 h-9 shrink-0" onClick={() => { setCustomCategory(false); update({ category: '' }); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Select value={form.category || '__none__'} onValueChange={v => {
              if (v === '__other__') { setCustomCategory(true); update({ category: '' }); }
              else if (v === '__none__') update({ category: '' });
              else update({ category: v });
            }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {categories?.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                <SelectItem value="__other__">Other…</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}

function StepPricing({ form, update }: { form: WizardForm; update: (p: Partial<WizardForm>) => void }) {
  const margin = form.retail_price && form.cost_price
    ? (((parseFloat(form.retail_price) - parseFloat(form.cost_price)) / parseFloat(form.retail_price)) * 100)
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Retail Price</Label>
          <Input type="number" step="0.01" min="0" value={form.retail_price} onChange={e => update({ retail_price: e.target.value })} placeholder="0.00" className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Cost Price</Label>
          <Input type="number" step="0.01" min="0" value={form.cost_price} onChange={e => update({ cost_price: e.target.value })} placeholder="0.00" className="h-9" />
        </div>
      </div>

      {margin !== null && !isNaN(margin) && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/60">
          <span className="text-xs text-muted-foreground">Profit Margin:</span>
          <span className={cn('text-sm font-medium', margin >= 40 ? 'text-emerald-600 dark:text-emerald-400' : margin >= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive')}>
            {margin.toFixed(1)}%
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">SKU</Label>
          <Input value={form.sku} onChange={e => update({ sku: e.target.value })} placeholder="e.g. OLA-003" className="h-9 font-mono" />
        </div>
        <div>
          <Label className="text-xs">Barcode</Label>
          <Input value={form.barcode} onChange={e => update({ barcode: e.target.value })} placeholder="UPC / EAN" className="h-9 font-mono" />
        </div>
      </div>
    </div>
  );
}

function StepDescription({ form, update, generating, onGenerate }: { form: WizardForm; update: (p: Partial<WizardForm>) => void; generating: boolean; onGenerate: () => void }) {
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">AI Description Generator</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste a link to the product on the brand's website, or just click generate to create a description from the product name and brand.
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={form.brand_url}
              onChange={e => update({ brand_url: e.target.value })}
              placeholder="https://brand.com/product-page (optional)"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Button size={tokens.button.card} onClick={onGenerate} disabled={generating || !form.name} className="gap-1.5 shrink-0">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs">Product Description</Label>
        <Textarea
          value={form.description}
          onChange={e => update({ description: e.target.value })}
          placeholder="Describe what this product does and who it's for…"
          rows={4}
          className="mt-1 text-sm resize-none"
        />
        <p className="text-[10px] text-muted-foreground mt-1">Used for your online store listing.</p>
      </div>
    </div>
  );
}

function StepInventory({ form, update, locations }: { form: WizardForm; update: (p: Partial<WizardForm>) => void; locations: any[] | undefined }) {
  const showLocation = locations && locations.length > 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Quantity on Hand</Label>
          <Input type="number" min="0" value={form.quantity_on_hand} onChange={e => update({ quantity_on_hand: e.target.value })} placeholder="0" className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Reorder Level</Label>
          <Input type="number" min="0" value={form.reorder_level} onChange={e => update({ reorder_level: e.target.value })} placeholder="0" className="h-9" />
          <p className="text-[10px] text-muted-foreground mt-0.5">You'll be alerted when stock drops below this.</p>
        </div>
      </div>

      {showLocation && (
        <div>
          <Label className="text-xs">Location</Label>
          <Select value={form.location_id || '__none__'} onValueChange={v => update({ location_id: v === '__none__' ? '' : v })}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select location" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">All Locations</SelectItem>
              {locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function StepReview({ form, update, formatCurrency }: { form: WizardForm; update: (p: Partial<WizardForm>) => void; formatCurrency: (n: number) => string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="flex items-start gap-4 p-4">
          {form.image_url ? (
            <img src={form.image_url} alt={form.name} className="w-16 h-16 rounded-lg object-cover border border-border shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{form.name || 'Untitled Product'}</h3>
            <div className="flex items-center gap-2 mt-1">
              {form.brand && <span className="text-xs text-muted-foreground">{form.brand}</span>}
              {form.category && <Badge variant="secondary" className="text-[10px]">{form.category}</Badge>}
              <Badge variant="secondary" className="text-[10px]">{form.product_type}</Badge>
            </div>
          </div>
        </div>

        <div className="border-t border-border/60 px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Retail</span>
            <p className="font-medium"><BlurredAmount>{form.retail_price ? formatCurrency(parseFloat(form.retail_price)) : '—'}</BlurredAmount></p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Cost</span>
            <p className="font-medium text-muted-foreground"><BlurredAmount>{form.cost_price ? formatCurrency(parseFloat(form.cost_price)) : '—'}</BlurredAmount></p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">SKU</span>
            <p className="font-mono text-xs">{form.sku || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Stock</span>
            <p>{form.quantity_on_hand || '—'}{form.reorder_level ? ` (reorder at ${form.reorder_level})` : ''}</p>
          </div>
        </div>

        {form.description && (
          <div className="border-t border-border/60 px-4 py-3">
            <span className="text-xs text-muted-foreground">Description</span>
            <p className="text-sm mt-0.5">{form.description}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/60">
        <div>
          <Label className="text-sm font-medium">Available Online</Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">Publish this product to your online store immediately.</p>
        </div>
        <Switch checked={form.available_online} onCheckedChange={v => update({ available_online: v })} />
      </div>
    </div>
  );
}
