import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, ArrowRight, Package, Truck, Wrench, DollarSign, Monitor, Sparkles, CheckCircle2, Search, Layers, Plus, X, Lock } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpsertTrackingComponent } from '@/hooks/backroom/useServiceTrackingComponents';
import { useUpsertAllowancePolicy } from '@/hooks/billing/useServiceAllowancePolicies';
import { useCreateBackroomStation } from '@/hooks/backroom/useBackroomStations';
import { useUpsertBackroomSetting } from '@/hooks/backroom/useBackroomSettings';
import { useBatchUpsertSupplier } from '@/hooks/useProductSuppliers';
import { useLocations } from '@/hooks/useLocations';
import { toast } from 'sonner';

const STEP_COUNT = 6;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

const springTransition = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

// ─── Product type ──────────────────────────────────────────────────────────────
interface ProductRow {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  is_backroom_tracked: boolean;
  cost_price: number | null;
  cost_per_gram: number | null;
  depletion_method: string | null;
}

// ─── Service type ──────────────────────────────────────────────────────────────
interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  is_backroom_tracked: boolean;
}

export function BackroomSetupWizard({ onComplete, onCancel }: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // ─── Step 1: Product selection state ────────────────────────────────────────
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [productCosts, setProductCosts] = useState<Record<string, string>>({});

  // ─── Step 2: Supplier state ─────────────────────────────────────────────────
  const [supplierName, setSupplierName] = useState('');
  const [supplierContactName, setSupplierContactName] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierWebsite, setSupplierWebsite] = useState('');
  const [supplierReorderMethod, setSupplierReorderMethod] = useState('');
  const [supplierReorderOther, setSupplierReorderOther] = useState('');
  const [supplierLeadTime, setSupplierLeadTime] = useState('');
  const [supplierMoq, setSupplierMoq] = useState('1');
  const [supplierProductIds, setSupplierProductIds] = useState<Set<string>>(new Set());
  const [supplierAssignMode, setSupplierAssignMode] = useState<'brand' | 'product'>('brand');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierSecondaryName, setSupplierSecondaryName] = useState('');
  const [supplierSecondaryEmail, setSupplierSecondaryEmail] = useState('');
  const [supplierSecondaryPhone, setSupplierSecondaryPhone] = useState('');

  // ─── Step 3: Service mapping state ──────────────────────────────────────────
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [serviceProductMap, setServiceProductMap] = useState<Record<string, string>>({});

  // ─── Step 4: Allowances state ───────────────────────────────────────────────
  const [allowances, setAllowances] = useState<Record<string, { qty: string; unit: string; rate: string }>>({});

  // ─── Step 5: Station state ──────────────────────────────────────────────────
  const [stationName, setStationName] = useState('');
  const [stationLocationId, setStationLocationId] = useState('');

  // ─── Data queries ───────────────────────────────────────────────────────────
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['wizard-products', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, category, is_backroom_tracked, cost_price, cost_per_gram, depletion_method')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('category')
        .order('name');
      if (error) throw error;
      return (data || []) as ProductRow[];
    },
    enabled: !!orgId,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['wizard-services', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category, is_backroom_tracked')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('category')
        .order('name');
      if (error) throw error;
      return (data || []) as ServiceRow[];
    },
    enabled: !!orgId,
  });

  const { data: locations = [] } = useLocations(orgId);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const bulkUpdateProducts = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const costVal = productCosts[id] ? parseFloat(productCosts[id]) : undefined;
        const { error } = await supabase
          .from('products')
          .update({
            is_backroom_tracked: true,
            ...(costVal ? { cost_per_gram: costVal } : {}),
          })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wizard-products'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
    },
  });

  const bulkUpdateServices = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase
          .from('services')
          .update({ is_backroom_tracked: true })
          .eq('id', id);
        if (error) throw error;
      }
    },
  });

  const upsertComponent = useUpsertTrackingComponent();
  const upsertAllowance = useUpsertAllowancePolicy();
  const createStation = useCreateBackroomStation();
  const upsertSetting = useUpsertBackroomSetting();
  const batchUpsertSupplier = useBatchUpsertSupplier();

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const goNext = async () => {
    // Save step data before advancing
    if (step === 1 && selectedProductIds.size > 0) {
      await bulkUpdateProducts.mutateAsync(Array.from(selectedProductIds));
    }

    if (step === 2 && supplierName.trim() && supplierProductIds.size > 0 && orgId) {
      await batchUpsertSupplier.mutateAsync({
        product_ids: Array.from(supplierProductIds),
        organization_id: orgId,
        supplier_name: supplierName.trim(),
        contact_name: supplierContactName || null,
        supplier_email: supplierEmail || null,
        supplier_phone: supplierPhone || null,
        supplier_website: supplierWebsite || null,
        lead_time_days: supplierLeadTime ? parseInt(supplierLeadTime) : null,
        moq: supplierMoq ? parseInt(supplierMoq) : 1,
        secondary_contact_name: supplierSecondaryName || null,
        secondary_contact_email: supplierSecondaryEmail || null,
        secondary_contact_phone: supplierSecondaryPhone || null,
      });
    }

    if (step === 3 && selectedServiceIds.size > 0) {
      await bulkUpdateServices.mutateAsync(Array.from(selectedServiceIds));
      for (const svcId of Array.from(selectedServiceIds)) {
        const prodId = serviceProductMap[svcId];
        if (prodId && orgId) {
          await upsertComponent.mutateAsync({
            organization_id: orgId,
            service_id: svcId,
            product_id: prodId,
          });
        }
      }
    }

    if (step === 4 && orgId) {
      for (const svcId of Object.keys(allowances)) {
        const a = allowances[svcId];
        if (a.qty && a.rate) {
          await upsertAllowance.mutateAsync({
            organization_id: orgId,
            service_id: svcId,
            included_allowance_qty: parseFloat(a.qty),
            allowance_unit: a.unit || 'g',
            overage_rate: parseFloat(a.rate),
          });
        }
      }
    }

    if (step === 5 && stationName && stationLocationId && orgId) {
      await createStation.mutateAsync({
        organization_id: orgId,
        location_id: stationLocationId,
        station_name: stationName,
      });
    }

    if (step === STEP_COUNT - 1) {
      // Complete wizard
      if (orgId) {
        await upsertSetting.mutateAsync({
          organization_id: orgId,
          setting_key: 'setup_wizard_completed',
          setting_value: { completed: true, completed_at: new Date().toISOString() },
        });
      }
      toast.success('Backroom setup complete!');
      onComplete();
      return;
    }

    setDirection(1);
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const isSaving =
    bulkUpdateProducts.isPending ||
    batchUpsertSupplier.isPending ||
    bulkUpdateServices.isPending ||
    upsertComponent.isPending ||
    upsertAllowance.isPending ||
    createStation.isPending ||
    upsertSetting.isPending;

  // ─── Product categories ─────────────────────────────────────────────────────
  const productCategories = useMemo(() => {
    const cats = new Map<string, ProductRow[]>();
    for (const p of products) {
      const cat = p.category || 'Uncategorized';
      if (!cats.has(cat)) cats.set(cat, []);
      cats.get(cat)!.push(p);
    }
    return cats;
  }, [products]);

  // ─── Selected products for services step ────────────────────────────────────
  const selectedProducts = useMemo(
    () => products.filter((p) => selectedProductIds.has(p.id) || p.is_backroom_tracked),
    [products, selectedProductIds]
  );

  // ─── Services eligible for allowances ───────────────────────────────────────
  const trackedServiceIds = useMemo(
    () => new Set([...Array.from(selectedServiceIds), ...services.filter((s) => s.is_backroom_tracked).map((s) => s.id)]),
    [selectedServiceIds, services]
  );

  // ─── Supplier brand grouping ─────────────────────────────────────────────────
  const supplierBrands = useMemo(() => {
    const tracked = products.filter((p) => selectedProductIds.has(p.id) || p.is_backroom_tracked);
    const map = new Map<string, ProductRow[]>();
    for (const p of tracked) {
      const brand = p.brand || 'Uncategorized';
      if (!map.has(brand)) map.set(brand, []);
      map.get(brand)!.push(p);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([brand, prods]) => ({ brand, products: prods }));
  }, [products, selectedProductIds]);

  const supplierFilteredProducts = useMemo(() => {
    const tracked = products.filter((p) => selectedProductIds.has(p.id) || p.is_backroom_tracked);
    if (!supplierSearch) return tracked;
    const q = supplierSearch.toLowerCase();
    return tracked.filter(p => p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q));
  }, [products, selectedProductIds, supplierSearch]);

  const supplierBrandCounts = useMemo(() => {
    const map = new Map<string, { total: number; selected: number }>();
    for (const b of supplierBrands) {
      map.set(b.brand, {
        total: b.products.length,
        selected: b.products.filter(p => supplierProductIds.has(p.id)).length,
      });
    }
    return map;
  }, [supplierBrands, supplierProductIds]);

  const progressPct = Math.round(((step + 1) / STEP_COUNT) * 100);

  const stepLabels = ['Welcome', 'Products', 'Suppliers', 'Services', 'Allowances', 'Station'];

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <p className={tokens.body.emphasis}>
            Step {step + 1} of {STEP_COUNT}: {stepLabels[step]}
          </p>
          <Button variant="ghost" size="sm" onClick={onCancel} className="font-sans text-muted-foreground">
            Exit Wizard
          </Button>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={springTransition}
        >
          {step === 0 && <WelcomeStep />}
          {step === 1 && (
            <ProductsStep
              products={products}
              categories={productCategories}
              isLoading={productsLoading}
              selectedIds={selectedProductIds}
              onToggle={(id) => {
                setSelectedProductIds((prev) => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
              onToggleCategory={(cat, ids) => {
                setSelectedProductIds((prev) => {
                  const next = new Set(prev);
                  const allSelected = ids.every((id) => next.has(id));
                  ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
                  return next;
                });
              }}
              costs={productCosts}
              onCostChange={(id, val) => setProductCosts((prev) => ({ ...prev, [id]: val }))}
            />
          )}
          {step === 2 && (
            <SuppliersStep
              supplierName={supplierName}
              onNameChange={setSupplierName}
              supplierContactName={supplierContactName}
              onContactNameChange={setSupplierContactName}
              supplierEmail={supplierEmail}
              onEmailChange={setSupplierEmail}
              supplierPhone={supplierPhone}
              onPhoneChange={setSupplierPhone}
              supplierWebsite={supplierWebsite}
              onWebsiteChange={setSupplierWebsite}
              reorderMethod={supplierReorderMethod}
              onReorderMethodChange={setSupplierReorderMethod}
              reorderOther={supplierReorderOther}
              onReorderOtherChange={setSupplierReorderOther}
              leadTimeDays={supplierLeadTime}
              onLeadTimeChange={setSupplierLeadTime}
              moq={supplierMoq}
              onMoqChange={setSupplierMoq}
              assignMode={supplierAssignMode}
              onAssignModeChange={setSupplierAssignMode}
              brands={supplierBrands}
              filteredProducts={supplierFilteredProducts}
              selectedIds={supplierProductIds}
              onToggleProduct={(id) => {
                setSupplierProductIds(prev => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
              onToggleBrand={(prods) => {
                setSupplierProductIds(prev => {
                  const next = new Set(prev);
                  const allSelected = prods.every(p => next.has(p.id));
                  prods.forEach(p => allSelected ? next.delete(p.id) : next.add(p.id));
                  return next;
                });
              }}
              brandCounts={supplierBrandCounts}
              search={supplierSearch}
              onSearchChange={setSupplierSearch}
              secondaryName={supplierSecondaryName}
              onSecondaryNameChange={setSupplierSecondaryName}
              secondaryEmail={supplierSecondaryEmail}
              onSecondaryEmailChange={setSupplierSecondaryEmail}
              secondaryPhone={supplierSecondaryPhone}
              onSecondaryPhoneChange={setSupplierSecondaryPhone}
            />
          )}
          {step === 3 && (
            <ServicesStep
              services={services}
              isLoading={servicesLoading}
              selectedIds={selectedServiceIds}
              onToggle={(id) => {
                setSelectedServiceIds((prev) => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
              trackedProducts={selectedProducts}
              productMap={serviceProductMap}
              onProductMap={(svcId, prodId) =>
                setServiceProductMap((prev) => ({ ...prev, [svcId]: prodId }))
              }
            />
          )}
          {step === 4 && (
            <AllowancesStep
              services={services.filter((s) => trackedServiceIds.has(s.id))}
              allowances={allowances}
              onChange={(svcId, field, value) =>
                setAllowances((prev) => ({
                  ...prev,
                  [svcId]: { ...prev[svcId], [field]: value, unit: prev[svcId]?.unit || 'g' },
                }))
              }
            />
          )}
          {step === 5 && (
            <StationStep
              stationName={stationName}
              onNameChange={setStationName}
              locationId={stationLocationId}
              onLocationChange={setStationLocationId}
              locations={locations}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={goBack} disabled={step === 0 || isSaving} className="font-sans">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <div className="flex gap-2">
          {step > 0 && step < STEP_COUNT - 1 && (
            <Button
              variant="ghost"
              onClick={() => { setDirection(1); setStep((s) => s + 1); }}
              disabled={isSaving}
              className="font-sans text-muted-foreground"
            >
              Skip
            </Button>
          )}
          <Button onClick={goNext} disabled={isSaving} className="font-sans">
            {isSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {step === STEP_COUNT - 1 ? 'Complete Setup' : 'Next'}
            {step < STEP_COUNT - 1 && <ArrowRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────
function WelcomeStep() {
  const features = [
    { icon: Package, label: 'Track products used per service' },
    { icon: Truck, label: 'Link suppliers for procurement' },
    { icon: Wrench, label: 'Map services to supply components' },
    { icon: DollarSign, label: 'Set allowances and overage billing' },
    { icon: Monitor, label: 'Configure mixing stations' },
  ];

  return (
    <Card className={tokens.card.wrapper}>
      <CardContent className="py-10 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className={cn(tokens.heading.page, 'mb-2')}>Set Up Backroom</h2>
          <p className={cn(tokens.body.muted, 'max-w-md mx-auto')}>
            This wizard will guide you through configuring products, services, allowances, and mixing stations
            so Zura Backroom can start tracking usage and protecting your margins.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <p className={tokens.body.default}>{f.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 2: Suppliers ────────────────────────────────────────────────────────
function SuppliersStep({
  supplierName, onNameChange,
  supplierContactName, onContactNameChange,
  supplierEmail, onEmailChange,
  supplierPhone, onPhoneChange,
  supplierWebsite, onWebsiteChange,
  reorderMethod, onReorderMethodChange,
  reorderOther, onReorderOtherChange,
  leadTimeDays, onLeadTimeChange,
  moq, onMoqChange,
  assignMode, onAssignModeChange,
  brands, filteredProducts, selectedIds,
  onToggleProduct, onToggleBrand, brandCounts,
  search, onSearchChange,
  secondaryName, onSecondaryNameChange,
  secondaryEmail, onSecondaryEmailChange,
  secondaryPhone, onSecondaryPhoneChange,
}: {
  supplierName: string; onNameChange: (v: string) => void;
  supplierContactName: string; onContactNameChange: (v: string) => void;
  supplierEmail: string; onEmailChange: (v: string) => void;
  supplierPhone: string; onPhoneChange: (v: string) => void;
  supplierWebsite: string; onWebsiteChange: (v: string) => void;
  reorderMethod: string; onReorderMethodChange: (v: string) => void;
  reorderOther: string; onReorderOtherChange: (v: string) => void;
  leadTimeDays: string; onLeadTimeChange: (v: string) => void;
  moq: string; onMoqChange: (v: string) => void;
  assignMode: 'brand' | 'product'; onAssignModeChange: (m: 'brand' | 'product') => void;
  brands: { brand: string; products: ProductRow[] }[];
  filteredProducts: ProductRow[];
  selectedIds: Set<string>;
  onToggleProduct: (id: string) => void;
  onToggleBrand: (prods: ProductRow[]) => void;
  brandCounts: Map<string, { total: number; selected: number }>;
  search: string; onSearchChange: (s: string) => void;
  secondaryName: string; onSecondaryNameChange: (v: string) => void;
  secondaryEmail: string; onSecondaryEmailChange: (v: string) => void;
  secondaryPhone: string; onSecondaryPhoneChange: (v: string) => void;
}) {
  const [showSecondaryContact, setShowSecondaryContact] = useState(
    !!(secondaryName || secondaryEmail || secondaryPhone)
  );
  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <CardTitle className={tokens.card.title}>Set Up Supplier</CardTitle>
        <CardDescription className={tokens.body.muted}>
          Add your primary supplier and link them to tracked products. You can add more suppliers later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[55vh] overflow-y-auto">
        {/* Supplier contact info */}
        <div className="space-y-1.5">
          <Label className={tokens.label.default}>
            Supplier or Distributor <span className="text-destructive">*</span>
          </Label>
          <Input
            value={supplierName}
            onChange={e => onNameChange(e.target.value)}
            placeholder="e.g. Goldwell Distribution"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={tokens.label.default}>Contact Name</Label>
          <Input
            value={supplierContactName}
            onChange={e => onContactNameChange(e.target.value)}
            placeholder="e.g. Jane Smith"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className={tokens.label.default}>Email</Label>
            <Input type="email" value={supplierEmail} onChange={e => onEmailChange(e.target.value)} placeholder="orders@supplier.com" />
          </div>
          <div className="space-y-1.5">
            <Label className={tokens.label.default}>Phone</Label>
            <Input value={supplierPhone} onChange={e => onPhoneChange(e.target.value)} placeholder="(555) 123-4567" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className={tokens.label.default}>Website</Label>
          <Input value={supplierWebsite} onChange={e => onWebsiteChange(e.target.value)} placeholder="https://supplier.com" />
        </div>

        {/* Secondary Contact */}
        <div className="border-t border-border/60 pt-3 mt-1">
          {!(showSecondaryContact || secondaryName || secondaryEmail || secondaryPhone) ? (
            <Button type="button" variant="ghost" size="sm" className="font-sans text-sm text-foreground/70 hover:text-foreground border border-dashed border-foreground/25 hover:border-foreground/50 hover:bg-foreground/10 px-3 py-1.5 rounded-md" onClick={() => setShowSecondaryContact(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add another contact
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className={cn(tokens.body.emphasis, 'text-foreground text-sm')}>Secondary Contact</p>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={() => { setShowSecondaryContact(false); onSecondaryNameChange(''); onSecondaryEmailChange(''); onSecondaryPhoneChange(''); }}>
                  <X className="w-3.5 h-3.5 mr-1" /> Remove
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className={tokens.label.default}>Name</Label>
                <Input value={secondaryName} onChange={e => onSecondaryNameChange(e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={tokens.label.default}>Email</Label>
                  <Input type="email" value={secondaryEmail} onChange={e => onSecondaryEmailChange(e.target.value)} placeholder="backup@supplier.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className={tokens.label.default}>Phone</Label>
                  <Input value={secondaryPhone} onChange={e => onSecondaryPhoneChange(e.target.value)} placeholder="(555) 987-6543" autoCapitalize="off" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className={tokens.label.default}>Reorder Method</Label>
            <Select value={reorderMethod} onValueChange={v => { onReorderMethodChange(v); if (v !== 'other') onReorderOtherChange(''); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                 <SelectItem value="portal">Supplier Website</SelectItem>
                 <SelectItem value="auto_reorder" disabled className="opacity-50"><Lock className="w-3.5 h-3.5 mr-1.5 inline-block" />Auto-Reorder (Coming Soon)</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input value={reorderOther} onChange={e => onReorderOtherChange(e.target.value)} placeholder="Specify method..." className={cn("mt-1.5", reorderMethod !== 'other' && "hidden")} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label className={tokens.label.default}>Lead Time (days)</Label>
              <MetricInfoTooltip description="Average number of days between placing an order with this supplier and receiving the delivery. Used to calculate reorder points and safety stock." />
            </div>
            <Input type="number" value={leadTimeDays} onChange={e => onLeadTimeChange(e.target.value)} placeholder="5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label className={tokens.label.default}>MOQ</Label>
              <MetricInfoTooltip description="Minimum Order Quantity — the smallest number of units this supplier will accept per order. Purchase orders are automatically rounded up to meet this threshold." />
            </div>
            <Input type="number" value={moq} onChange={e => onMoqChange(e.target.value)} placeholder="1" />
          </div>
        </div>

        {/* Product assignment */}
        <div className="border-t border-border/60 pt-4 mt-4 space-y-3">
          <p className={cn(tokens.body.emphasis, 'text-foreground')}>Link Products to This Supplier</p>
          <div className="flex gap-1 p-0.5 bg-muted rounded-full w-fit">
            <button
              onClick={() => onAssignModeChange('brand')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-colors',
                assignMode === 'brand' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              By Brand
            </button>
            <button
              onClick={() => onAssignModeChange('product')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-colors',
                assignMode === 'product' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Package className="w-3.5 h-3.5" />
              By Product
            </button>
          </div>

          <p className={cn(tokens.body.muted, 'text-xs')}>
            {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
            {assignMode === 'brand' && ' • Check a brand to assign all its products'}
          </p>

          {assignMode === 'product' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Search products..." className="pl-9" />
            </div>
          )}

          <ScrollArea className="h-[200px] border border-border/60 rounded-lg">
            <div className="p-2 space-y-0.5">
              {assignMode === 'brand' ? (
                brands.length === 0 ? (
                  <p className={cn(tokens.body.muted, 'text-center py-8')}>No tracked products yet. Go back and select products first.</p>
                ) : (
                  brands.map(({ brand, products: prods }) => {
                    const counts = brandCounts.get(brand);
                    const allSelected = counts ? counts.selected === counts.total : false;
                    const someSelected = counts ? counts.selected > 0 && !allSelected : false;
                    return (
                      <label key={brand} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <Checkbox checked={allSelected ? true : someSelected ? 'indeterminate' : false} onCheckedChange={() => onToggleBrand(prods)} />
                        <span className={cn(tokens.body.default, 'truncate flex-1')}>{brand}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {counts?.selected || 0}/{counts?.total || 0}
                        </Badge>
                      </label>
                    );
                  })
                )
              ) : (
                filteredProducts.length === 0 ? (
                  <p className={cn(tokens.body.muted, 'text-center py-8')}>No matching products</p>
                ) : (
                  filteredProducts.map(p => (
                    <label key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => onToggleProduct(p.id)} />
                      <div className="min-w-0 flex-1">
                        <span className={cn(tokens.body.default, 'truncate block')}>{p.name}</span>
                        {p.brand && <span className="text-xs text-muted-foreground">{p.brand}</span>}
                      </div>
                    </label>
                  ))
                )
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 1: Products ─────────────────────────────────────────────────────────
function ProductsStep({
  products,
  categories,
  isLoading,
  selectedIds,
  onToggle,
  onToggleCategory,
  costs,
  onCostChange,
}: {
  products: ProductRow[];
  categories: Map<string, ProductRow[]>;
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleCategory: (cat: string, ids: string[]) => void;
  costs: Record<string, string>;
  onCostChange: (id: string, val: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <CardTitle className={tokens.card.title}>Select Products to Track</CardTitle>
        <CardDescription className={tokens.body.muted}>
          Choose which products should be tracked in the backroom. You can set a cost per gram for accurate usage tracking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[50vh] overflow-y-auto">
        {products.length === 0 && (
          <div className={tokens.empty.container}>
            <Package className={tokens.empty.icon} />
            <p className={tokens.empty.description}>No products found. Add products first.</p>
          </div>
        )}
        {Array.from(categories.entries()).map(([cat, prods]) => {
          const catIds = prods.map((p) => p.id);
          const allSelected = catIds.every((id) => selectedIds.has(id));
          return (
            <div key={cat} className="space-y-1">
              <button
                onClick={() => onToggleCategory(cat, catIds)}
                className="flex items-center gap-2 py-1.5 w-full text-left"
              >
                <Checkbox checked={allSelected} />
                <span className={tokens.label.default}>{cat}</span>
                <Badge variant="outline" className="ml-auto text-xs">{prods.length}</Badge>
              </button>
              <div className="ml-6 space-y-1">
                {prods.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-1">
                    <Checkbox
                      checked={selectedIds.has(p.id) || p.is_backroom_tracked}
                      onCheckedChange={() => onToggle(p.id)}
                      disabled={p.is_backroom_tracked}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn(tokens.body.default, 'truncate')}>{p.name}</p>
                      {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                    </div>
                    {(selectedIds.has(p.id) || p.is_backroom_tracked) && (
                      <Input
                        type="number"
                        placeholder="Cost/g"
                        className="w-24 h-8 text-xs"
                        value={costs[p.id] ?? (p.cost_per_gram?.toString() || '')}
                        onChange={(e) => onCostChange(p.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Step 2: Services ─────────────────────────────────────────────────────────
function ServicesStep({
  services,
  isLoading,
  selectedIds,
  onToggle,
  trackedProducts,
  productMap,
  onProductMap,
}: {
  services: ServiceRow[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  trackedProducts: ProductRow[];
  productMap: Record<string, string>;
  onProductMap: (svcId: string, prodId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <CardTitle className={tokens.card.title}>Map Services to Products</CardTitle>
        <CardDescription className={tokens.body.muted}>
          Select which services use backroom products, then map their primary product component.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[50vh] overflow-y-auto">
        {services.length === 0 && (
          <div className={tokens.empty.container}>
            <Wrench className={tokens.empty.icon} />
            <p className={tokens.empty.description}>No services found.</p>
          </div>
        )}
        {services.map((s) => {
          const isSelected = selectedIds.has(s.id) || s.is_backroom_tracked;
          return (
            <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(s.id)}
                disabled={s.is_backroom_tracked}
              />
              <div className="flex-1 min-w-0">
                <p className={cn(tokens.body.default, 'truncate')}>{s.name}</p>
                {s.category && <p className="text-xs text-muted-foreground">{s.category}</p>}
              </div>
              {isSelected && trackedProducts.length > 0 && (
                <Select value={productMap[s.id] || ''} onValueChange={(v) => onProductMap(s.id, v)}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="Map product" />
                  </SelectTrigger>
                  <SelectContent>
                    {trackedProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Step 3: Allowances ───────────────────────────────────────────────────────
function AllowancesStep({
  services,
  allowances,
  onChange,
}: {
  services: ServiceRow[];
  allowances: Record<string, { qty: string; unit: string; rate: string }>;
  onChange: (svcId: string, field: string, value: string) => void;
}) {
  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <CardTitle className={tokens.card.title}>Set Allowances</CardTitle>
        <CardDescription className={tokens.body.muted}>
          Define how much product is included per service before overage charges apply.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[50vh] overflow-y-auto">
        {services.length === 0 && (
          <div className={tokens.empty.container}>
            <DollarSign className={tokens.empty.icon} />
            <p className={tokens.empty.description}>No tracked services yet. Go back and select services first.</p>
          </div>
        )}
        {services.map((s) => {
          const a = allowances[s.id] || { qty: '', unit: 'g', rate: '' };
          return (
            <div key={s.id} className="rounded-lg border border-border/60 p-3 space-y-2">
              <p className={tokens.body.emphasis}>{s.name}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Included Qty</label>
                  <Input
                    type="number"
                    placeholder="180"
                    className="h-8 text-xs mt-1"
                    value={a.qty}
                    onChange={(e) => onChange(s.id, 'qty', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Unit</label>
                  <Select value={a.unit} onValueChange={(v) => onChange(s.id, 'unit', v)}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="ml">Milliliters (ml)</SelectItem>
                      <SelectItem value="oz">Ounces (oz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Overage Rate</label>
                  <Input
                    type="number"
                    placeholder="0.40"
                    step="0.01"
                    className="h-8 text-xs mt-1"
                    value={a.rate}
                    onChange={(e) => onChange(s.id, 'rate', e.target.value)}
                  />
                </div>
              </div>
              {a.qty && a.rate && (
                <p className="text-xs text-muted-foreground">
                  Includes {a.qty}{a.unit} before overage at ${parseFloat(a.rate || '0').toFixed(2)}/{a.unit}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Step 4: Station ──────────────────────────────────────────────────────────
function StationStep({
  stationName,
  onNameChange,
  locationId,
  onLocationChange,
  locations,
}: {
  stationName: string;
  onNameChange: (v: string) => void;
  locationId: string;
  onLocationChange: (v: string) => void;
  locations: Array<{ id: string; name: string }>;
}) {
  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <CardTitle className={tokens.card.title}>Configure Your First Station</CardTitle>
        <CardDescription className={tokens.body.muted}>
          Set up a mixing station where products are dispensed. You can add more stations later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className={tokens.label.default}>Station Name</label>
          <Input
            placeholder="e.g. Station 1, Color Bar"
            className="mt-1"
            value={stationName}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div>
          <label className={tokens.label.default}>Location</label>
          {locations.length > 0 ? (
            <Select value={locationId} onValueChange={onLocationChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className={cn(tokens.body.muted, 'mt-1')}>No locations found. You can skip this step.</p>
          )}
        </div>
        <div className="rounded-lg bg-muted/50 p-4 mt-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className={tokens.body.emphasis}>Almost done!</p>
              <p className={tokens.body.muted}>
                After completing setup, you can add more stations, configure alert rules, and fine-tune permissions
                from the Backroom Settings page.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
