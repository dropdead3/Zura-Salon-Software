import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Star, Loader2 } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useLoyaltySettings, useUpdateLoyaltySettings } from '@/hooks/useLoyaltySettings';

interface LoyaltyProgramConfiguratorProps {
  organizationId?: string;
}

interface FormData {
  is_enabled: boolean;
  program_name: string;
  points_per_dollar: number;
  service_multiplier: number;
  product_multiplier: number;
  points_to_dollar_ratio: number;
  minimum_redemption_points: number;
  points_expire: boolean;
  points_expiration_days: number;
}

export function LoyaltyProgramConfigurator({ organizationId }: LoyaltyProgramConfiguratorProps) {
  const { data: settings, isLoading } = useLoyaltySettings(organizationId);
  const updateSettings = useUpdateLoyaltySettings();

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      is_enabled: false,
      program_name: 'Rewards Program',
      points_per_dollar: 1,
      service_multiplier: 1,
      product_multiplier: 1,
      points_to_dollar_ratio: 0.01,
      minimum_redemption_points: 100,
      points_expire: false,
      points_expiration_days: 365,
    },
  });

  const isEnabled = watch('is_enabled');
  const pointsExpire = watch('points_expire');

  useEffect(() => {
    if (settings) {
      reset({
        is_enabled: settings.is_enabled,
        program_name: settings.program_name,
        points_per_dollar: settings.points_per_dollar,
        service_multiplier: settings.service_multiplier,
        product_multiplier: settings.product_multiplier,
        points_to_dollar_ratio: settings.points_to_dollar_ratio,
        minimum_redemption_points: settings.minimum_redemption_points,
        points_expire: settings.points_expire,
        points_expiration_days: settings.points_expiration_days,
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: FormData) => {
    if (!organizationId) return;
    await updateSettings.mutateAsync({ organizationId, settings: data });
  };

  if (isLoading) {
    return <DashboardLoader size="md" className="py-12" />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Enable/Disable Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Loyalty Program
              </CardTitle>
              <CardDescription>
                Enable points-based rewards for your clients
              </CardDescription>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => setValue('is_enabled', checked)}
            />
          </div>
        </CardHeader>
        {isEnabled && (
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="program_name">Program Name</Label>
                <Input
                  id="program_name"
                  {...register('program_name')}
                  placeholder="e.g., Salon Rewards"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {isEnabled && (
        <>
          {/* Points Earning */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Points Earning</CardTitle>
              <CardDescription>
                Configure how clients earn points
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">For every $</span>
                <Input
                  type="number"
                  step="0.01"
                  className="w-20"
                  {...register('points_per_dollar', { valueAsNumber: true })}
                />
                <span className="text-sm text-muted-foreground">spent, earn</span>
                <span className="font-medium">1 point</span>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Category Multipliers</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Bonus points for specific purchase types
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="service_multiplier" className="text-sm">Services</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="service_multiplier"
                        type="number"
                        step="0.1"
                        className="w-20"
                        {...register('service_multiplier', { valueAsNumber: true })}
                      />
                      <span className="text-sm text-muted-foreground">× points</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="product_multiplier" className="text-sm">Products</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="product_multiplier"
                        type="number"
                        step="0.1"
                        className="w-20"
                        {...register('product_multiplier', { valueAsNumber: true })}
                      />
                      <span className="text-sm text-muted-foreground">× points</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Points Redemption */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Points Redemption</CardTitle>
              <CardDescription>
                Set the value of points and minimum requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  type="number"
                  className="w-24"
                  defaultValue={100}
                  disabled
                />
                <span className="text-sm text-muted-foreground">points = $</span>
                <Input
                  type="number"
                  step="0.01"
                  className="w-20"
                  {...register('points_to_dollar_ratio', { 
                    valueAsNumber: true,
                    setValueAs: (v) => v * 100 // Store as ratio but display as dollars
                  })}
                  defaultValue={1}
                />
              </div>

              <div>
                <Label htmlFor="minimum_redemption_points">Minimum Points to Redeem</Label>
                <Input
                  id="minimum_redemption_points"
                  type="number"
                  className="w-32"
                  {...register('minimum_redemption_points', { valueAsNumber: true })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Points Expiration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Points Expiration</CardTitle>
                  <CardDescription>
                    Expire unused points after a period of inactivity
                  </CardDescription>
                </div>
                <Switch
                  checked={pointsExpire}
                  onCheckedChange={(checked) => setValue('points_expire', checked)}
                />
              </div>
            </CardHeader>
            {pointsExpire && (
              <CardContent>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Expire points after</span>
                  <Input
                    type="number"
                    className="w-24"
                    {...register('points_expiration_days', { valueAsNumber: true })}
                  />
                  <span className="text-sm text-muted-foreground">days of inactivity</span>
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </form>
  );
}
