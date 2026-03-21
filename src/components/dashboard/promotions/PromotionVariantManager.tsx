import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { 
  usePromotionVariants, 
  useCreatePromotionVariant, 
  useUpdatePromotionVariant,
  useDeletePromotionVariant,
  useVariantABTestResults,
  PromotionVariant,
  CreateVariantData 
} from '@/hooks/usePromotionVariants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Plus, FlaskConical, Crown, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

interface PromotionVariantManagerProps {
  promotionId: string;
  promotionName: string;
}

export function PromotionVariantManager({ promotionId, promotionName }: PromotionVariantManagerProps) {
  const { formatCurrency } = useFormatCurrency();
  const { data: variants, isLoading } = usePromotionVariants(promotionId);
  const { data: testResults } = useVariantABTestResults(promotionId);
  const createVariant = useCreatePromotionVariant();
  const updateVariant = useUpdatePromotionVariant();
  const deleteVariant = useDeletePromotionVariant();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { register, handleSubmit, control, reset, watch } = useForm<CreateVariantData>({
    defaultValues: {
      promotion_id: promotionId,
      discount_type: 'percentage',
      is_control: false,
    },
  });

  const discountType = watch('discount_type');

  const onSubmit = async (data: CreateVariantData) => {
    await createVariant.mutateAsync(data);
    setIsCreateOpen(false);
    reset();
  };

  const handleSetControl = async (variantId: string) => {
    // First, unset any existing control
    const currentControl = variants?.find(v => v.is_control);
    if (currentControl) {
      await updateVariant.mutateAsync({ id: currentControl.id, is_control: false });
    }
    // Set new control
    await updateVariant.mutateAsync({ id: variantId, is_control: true });
  };

  const handleDelete = async (variantId: string) => {
    if (confirm('Are you sure you want to delete this variant?')) {
      await deleteVariant.mutateAsync(variantId);
    }
  };

  const controlVariant = variants?.find(v => v.is_control);
  const testVariants = variants?.filter(v => !v.is_control) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            A/B Testing
          </h3>
          <p className="text-sm text-muted-foreground">
            Test different variations of "{promotionName}"
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size={tokens.button.card}>
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Test Variant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Variant Name</Label>
                <Input {...register('variant_name', { required: true })} placeholder="e.g., Higher Discount" />
              </div>

              <div className="space-y-2">
                <Label>Variant Code (Optional)</Label>
                <Input {...register('variant_code')} placeholder="e.g., SUMMER25B" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Controller
                    name="discount_type"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || 'percentage'} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <div className="relative">
                    {discountType === 'fixed' && (
                      <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    )}
                    <Input
                      type="number"
                      step="0.01"
                      className={discountType === 'fixed' ? 'pl-7' : ''}
                      {...register('discount_value', { valueAsNumber: true })}
                      placeholder={discountType === 'percentage' ? '25' : '10.00'}
                    />
                    {discountType === 'percentage' && (
                      <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input {...register('description')} placeholder="What makes this variant different?" />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Set as Control</Label>
                  <p className="text-xs text-muted-foreground">
                    The baseline to compare against
                  </p>
                </div>
                <Controller
                  name="is_control"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createVariant.isPending}>
                  Create Variant
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* A/B Test Results Summary */}
      {testResults && (
        <Card className={testResults.is_significant ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Test Results</CardTitle>
            <CardDescription>
              {testResults.is_significant 
                ? `We have a winner with ${testResults.confidence_level}% confidence!`
                : 'Collecting data... More traffic needed for statistical significance.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Control</span>
                  {testResults.winner_id === testResults.control.id && (
                    <Crown className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="text-2xl font-medium">
                  {testResults.control.conversion_rate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {testResults.control.redemptions} / {testResults.control.views} views
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Challenger</span>
                  {testResults.winner_id === testResults.challenger.id && (
                    <Crown className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="text-2xl font-medium">
                  {testResults.challenger.conversion_rate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {testResults.challenger.redemptions} / {testResults.challenger.views} views
                </p>
              </div>
            </div>

            {testResults.lift_percentage !== 0 && (
              <div className={`text-sm ${testResults.lift_percentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Challenger is {testResults.lift_percentage > 0 ? '+' : ''}{testResults.lift_percentage.toFixed(1)}% 
                {testResults.lift_percentage > 0 ? ' better' : ' worse'} than control
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Variants List */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {variants?.map((variant) => (
            <Card key={variant.id} className={variant.is_control ? 'border-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{variant.variant_name}</span>
                      {variant.is_control && (
                        <Badge variant="secondary">Control</Badge>
                      )}
                      {variant.variant_code && (
                        <code className="text-xs bg-muted px-1 rounded">{variant.variant_code}</code>
                      )}
                    </div>
                    {variant.description && (
                      <p className="text-sm text-muted-foreground">{variant.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {variant.discount_type === 'percentage' 
                          ? `${variant.discount_value}% off`
                          : `${formatCurrency(variant.discount_value)} off`
                        }
                      </span>
                      <span>•</span>
                      <span>{variant.views} views</span>
                      <span>•</span>
                      <span>{variant.redemptions} redemptions</span>
                      <span>•</span>
                      <span>{(variant.conversion_rate || 0).toFixed(1)}% CVR</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!variant.is_control && (
                      <Button
                        size={tokens.button.inline}
                        variant="outline"
                        onClick={() => handleSetControl(variant.id)}
                      >
                        Set as Control
                      </Button>
                    )}
                    <Button
                      size={tokens.button.inline}
                      variant="ghost"
                      onClick={() => handleDelete(variant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Conversion Progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Conversion Rate</span>
                    <span>{(variant.conversion_rate || 0).toFixed(1)}%</span>
                  </div>
                  <Progress value={variant.conversion_rate || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))}

          {(!variants || variants.length === 0) && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FlaskConical className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No test variants yet</p>
                <Button size={tokens.button.card} variant="link" onClick={() => setIsCreateOpen(true)}>
                  Create your first variant
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
