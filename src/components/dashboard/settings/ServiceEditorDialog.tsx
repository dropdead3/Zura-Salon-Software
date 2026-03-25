import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, SubTabsList, SubTabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { tokens } from '@/lib/design-tokens';
import type { Service } from '@/hooks/useServicesData';
import type { ServiceCategoryColor } from '@/hooks/useServiceCategoryColors';
import { LevelPricingContent } from './LevelPricingContent';
import { StylistOverridesContent } from './StylistOverridesContent';
import { LocationPricingContent } from './LocationPricingContent';
import { SeasonalAdjustmentsContent } from './SeasonalAdjustmentsContent';

interface ServiceEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (service: Partial<Service>) => void;
  isPending: boolean;
  categories: ServiceCategoryColor[];
  initialData?: Service | null;
  mode: 'create' | 'edit';
  presetCategory?: string;
}

export function ServiceEditorDialog({
  open, onOpenChange, onSubmit, isPending, categories, initialData, mode, presetCategory,
}: ServiceEditorDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');
  const [requiresQualification, setRequiresQualification] = useState(false);
  const [allowSameDayBooking, setAllowSameDayBooking] = useState(true);
  const [bookableOnline, setBookableOnline] = useState(true);
  const [leadTimeDays, setLeadTimeDays] = useState('0');
  const [finishingTime, setFinishingTime] = useState('0');
  const [contentCreationTime, setContentCreationTime] = useState('0');
  const [requiresDeposit, setRequiresDeposit] = useState(false);
  const [depositType, setDepositType] = useState('percentage');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositAmountFlat, setDepositAmountFlat] = useState('');
  const [processingTime, setProcessingTime] = useState('0');
  const [requiresNewClientConsultation, setRequiresNewClientConsultation] = useState(false);
  const [containerTypes, setContainerTypes] = useState<('bowl' | 'bottle')[]>(['bowl']);

  useEffect(() => {
    if (open) {
      setActiveTab('details');
      if (initialData) {
        setName(initialData.name);
        setCategory(initialData.category || '');
        setDuration(String(initialData.duration_minutes || 60));
        setPrice(initialData.price != null ? String(initialData.price) : '');
        setCost(initialData.cost != null ? String(initialData.cost) : '');
        setDescription(initialData.description || '');
        setRequiresQualification(initialData.requires_qualification ?? false);
        setAllowSameDayBooking(initialData.allow_same_day_booking ?? true);
        setBookableOnline((initialData as any).bookable_online ?? true);
        setLeadTimeDays(String(initialData.lead_time_days || 0));
        setFinishingTime(String(initialData.finishing_time_minutes || 0));
        setContentCreationTime(String(initialData.content_creation_time_minutes || 0));
        setProcessingTime(String(initialData.processing_time_minutes || 0));
        setRequiresNewClientConsultation(initialData.requires_new_client_consultation ?? false);
        setContainerTypes((initialData as any).container_types || ['bowl']);
        setRequiresDeposit(initialData.requires_deposit ?? false);
        setDepositType(initialData.deposit_type ?? 'percentage');
        setDepositAmount(initialData.deposit_amount != null ? String(initialData.deposit_amount) : '');
        setDepositAmountFlat(initialData.deposit_amount_flat != null ? String(initialData.deposit_amount_flat) : '');
      } else {
        setName('');
        setCategory(presetCategory || categories[0]?.category_name || '');
        setDuration('60');
        setPrice('');
        setCost('');
        setDescription('');
        setRequiresQualification(false);
        setAllowSameDayBooking(true);
        setBookableOnline(true);
        setLeadTimeDays('0');
        setFinishingTime('0');
        setContentCreationTime('0');
        setProcessingTime('0');
        setRequiresNewClientConsultation(false);
        setContainerTypes(['bowl']);
        setRequiresDeposit(false);
        setDepositType('percentage');
        setDepositAmount('');
        setDepositAmountFlat('');
      }
    }
  }, [open, initialData, categories, presetCategory]);

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...(initialData?.id ? { id: initialData.id } : {}),
      name: name.trim(),
      category: category || null,
      duration_minutes: parseInt(duration) || 60,
      price: price ? parseFloat(price) : null,
      cost: cost ? parseFloat(cost) : null,
      description: description.trim() || null,
      requires_qualification: requiresQualification,
      allow_same_day_booking: allowSameDayBooking,
      bookable_online: bookableOnline,
      lead_time_days: parseInt(leadTimeDays) || 0,
      finishing_time_minutes: parseInt(finishingTime) || 0,
      content_creation_time_minutes: parseInt(contentCreationTime) || 0,
      processing_time_minutes: parseInt(processingTime) || 0,
      requires_new_client_consultation: requiresNewClientConsultation,
      requires_deposit: requiresDeposit,
      deposit_type: depositType,
      deposit_amount: depositAmount ? parseFloat(depositAmount) : null,
      deposit_amount_flat: depositAmountFlat ? parseFloat(depositAmountFlat) : null,
      container_types: containerTypes,
    } as Partial<Service>);
  };

  const isCreateMode = mode === 'create';
  const serviceId = initialData?.id || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isCreateMode ? 'Add Service' : `Edit ${initialData?.name || 'Service'}`}
          </DialogTitle>
          <DialogDescription>
            {isCreateMode
              ? 'Create a new service for your menu.'
              : 'Update service details, level pricing, and stylist overrides.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <SubTabsList>
            <SubTabsTrigger value="details">Details</SubTabsTrigger>
            <SubTabsTrigger value="levels" disabled={isCreateMode}>
              Level Pricing
            </SubTabsTrigger>
            <SubTabsTrigger value="overrides" disabled={isCreateMode}>
              Stylist Overrides
            </SubTabsTrigger>
            <SubTabsTrigger value="locations" disabled={isCreateMode}>
              Location Pricing
            </SubTabsTrigger>
            <SubTabsTrigger value="seasonal" disabled={isCreateMode}>
              Seasonal
            </SubTabsTrigger>
          </SubTabsList>

          <div className="flex-1 overflow-y-auto mt-4 p-1">
            <TabsContent value="details" className="mt-0 p-px">
              <form id="service-details-form" onSubmit={handleDetailsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service-name">Name *</Label>
                  <Input id="service-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Balayage, Men's Cut" autoFocus />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.category_name}>{c.category_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service-duration" className="flex items-center gap-1.5">Duration (min) * <MetricInfoTooltip description="Total chair time including processing. Used for scheduling and calendar blocking." /></Label>
                    <Input id="service-duration" type="number" min="5" step="5" value={duration} onChange={e => setDuration(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-price">Price ($)</Label>
                    <Input id="service-price" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-cost">Cost ($)</Label>
                    <Input id="service-cost" type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="Optional" />
                  </div>
                </div>

                {/* Time breakdown fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="finishing-time">Finishing (min)</Label>
                    <Input id="finishing-time" type="number" min="0" step="5" value={finishingTime} onChange={e => setFinishingTime(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content-creation-time">Content (min)</Label>
                    <Input id="content-creation-time" type="number" min="0" step="5" value={contentCreationTime} onChange={e => setContentCreationTime(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="processing-time">Processing (min)</Label>
                    <Input id="processing-time" type="number" min="0" step="5" value={processingTime} onChange={e => setProcessingTime(e.target.value)} placeholder="0" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-description">Description</Label>
                  <Textarea id="service-description" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional description" />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={tokens.body.emphasis}>Requires Qualification</p>
                      <p className={tokens.body.muted}>Only qualified stylists can book this service</p>
                    </div>
                    <Switch checked={requiresQualification} onCheckedChange={setRequiresQualification} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className={tokens.body.emphasis}>Bookable Online</p>
                      <p className={tokens.body.muted}>Show on website and allow online booking</p>
                    </div>
                    <Switch checked={bookableOnline} onCheckedChange={setBookableOnline} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className={tokens.body.emphasis}>Same-Day Booking</p>
                      <p className={tokens.body.muted}>Allow clients to book this service same day</p>
                    </div>
                    <Switch checked={allowSameDayBooking} onCheckedChange={setAllowSameDayBooking} />
                  </div>

                  {!allowSameDayBooking && (
                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                      <Label htmlFor="lead-time">Lead Time (days)</Label>
                      <Input id="lead-time" type="number" min="1" value={leadTimeDays} onChange={e => setLeadTimeDays(e.target.value)} />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className={tokens.body.emphasis}>Requires New-Client Consultation</p>
                      <p className={tokens.body.muted}>New clients must complete a consultation before booking</p>
                    </div>
                    <Switch checked={requiresNewClientConsultation} onCheckedChange={setRequiresNewClientConsultation} />
                  </div>

                  {/* Container Types */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="mb-2">
                      <p className={tokens.body.emphasis}>Backroom Container Types</p>
                      <p className={tokens.body.muted}>Used by Zura Backroom to track supply usage for this service's formulations. Select both if the service uses bowls and bottles.</p>
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={containerTypes.includes('bowl')}
                          onCheckedChange={(checked) => {
                            if (checked) setContainerTypes(prev => prev.includes('bowl') ? prev : [...prev, 'bowl']);
                            else setContainerTypes(prev => prev.filter(t => t !== 'bowl').length > 0 ? prev.filter(t => t !== 'bowl') : prev);
                          }}
                        />
                        <span className="text-sm">Bowl</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={containerTypes.includes('bottle')}
                          onCheckedChange={(checked) => {
                            if (checked) setContainerTypes(prev => prev.includes('bottle') ? prev : [...prev, 'bottle']);
                            else setContainerTypes(prev => prev.filter(t => t !== 'bottle').length > 0 ? prev.filter(t => t !== 'bottle') : prev);
                          }}
                        />
                        <span className="text-sm">Bottle</span>
                      </label>
                    </div>
                  </div>

                  {/* Deposit Configuration */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={tokens.body.emphasis}>Requires Deposit</p>
                        <p className={tokens.body.muted}>Collect a deposit or prepayment before confirming this service</p>
                      </div>
                      <Switch checked={requiresDeposit} onCheckedChange={setRequiresDeposit} />
                    </div>

                    {requiresDeposit && (
                      <div className="mt-3 pl-4 border-l-2 border-muted space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Deposit Type</Label>
                          <Select value={depositType} onValueChange={setDepositType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage of Service Price</SelectItem>
                              <SelectItem value="flat">Flat Amount</SelectItem>
                              <SelectItem value="full_prepay">Full Prepayment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {depositType !== 'full_prepay' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {depositType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step={depositType === 'percentage' ? '1' : '0.01'}
                                value={depositAmount}
                                onChange={e => setDepositAmount(e.target.value)}
                                placeholder={depositType === 'percentage' ? 'e.g. 25' : 'e.g. 50'}
                              />
                            </div>
                            {depositType === 'percentage' && (
                              <div className="space-y-1">
                                <Label className="text-xs">Minimum ($)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={depositAmountFlat}
                                  onChange={e => setDepositAmountFlat(e.target.value)}
                                  placeholder="Optional"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="levels" className="mt-0">
              {serviceId && (
                <LevelPricingContent
                  serviceId={serviceId}
                  basePrice={initialData?.price ?? null}
                />
              )}
            </TabsContent>

            <TabsContent value="overrides" className="mt-0">
              {serviceId && (
                <StylistOverridesContent
                  serviceId={serviceId}
                  basePrice={initialData?.price ?? null}
                />
              )}
            </TabsContent>

            <TabsContent value="locations" className="mt-0 p-px">
              {serviceId && (
                <LocationPricingContent
                  serviceId={serviceId}
                  basePrice={initialData?.price ?? null}
                />
              )}
            </TabsContent>

            <TabsContent value="seasonal" className="mt-0 p-px">
              {serviceId && (
                <SeasonalAdjustmentsContent
                  serviceId={serviceId}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>

        {activeTab === 'details' && (
          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="service-details-form" disabled={!name.trim() || isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isCreateMode ? 'Create Service' : 'Save Changes'}
            </Button>
          </DialogFooter>
        )}

        {activeTab !== 'details' && (
          <DialogFooter className="pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
