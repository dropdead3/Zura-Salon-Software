import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Star, Link, Bell, Loader2 } from 'lucide-react';
import { useReviewThresholdSettings, useUpdateReviewThresholdSettings, ReviewThresholdSettings as ReviewSettings } from '@/hooks/useReviewThreshold';
import { toast } from 'sonner';

export function ReviewThresholdSettings() {
  const { data: settings, isLoading } = useReviewThresholdSettings();
  const updateSettings = useUpdateReviewThresholdSettings();
  
  const [formData, setFormData] = useState<ReviewSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!formData) return;
    
    try {
      await updateSettings.mutateAsync(formData);
      toast.success('Review settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading || !formData) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Review Gate Settings
        </CardTitle>
        <CardDescription>
          Configure thresholds for routing customers to public review platforms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Threshold Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Threshold Configuration
          </h4>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Minimum Overall Rating</Label>
              <Select
                value={String(formData.minimumOverallRating)}
                onValueChange={(v) => setFormData({ ...formData, minimumOverallRating: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {'★'.repeat(n)}{'☆'.repeat(5-n)} {n} star{n > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Show public review prompt if rating is at or above this
              </p>
            </div>

            <div className="space-y-2">
              <Label>Minimum NPS Score</Label>
              <Select
                value={String(formData.minimumNPSScore)}
                onValueChange={(v) => setFormData({ ...formData, minimumNPSScore: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 7, 8, 9, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} - {n >= 9 ? 'Promoter' : n >= 7 ? 'Passive' : 'Detractor'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Both to Pass</Label>
              <p className="text-xs text-muted-foreground">
                Customer must meet both rating AND NPS thresholds
              </p>
            </div>
            <Switch
              checked={formData.requireBothToPass}
              onCheckedChange={(v) => setFormData({ ...formData, requireBothToPass: v })}
            />
          </div>
        </div>

        {/* Review Platform Links */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Link className="h-4 w-4 text-blue-500" />
            Review Platform Links
          </h4>
          
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Google Reviews URL</Label>
              <Input
                placeholder="https://g.page/r/..."
                value={formData.googleReviewUrl}
                onChange={(e) => setFormData({ ...formData, googleReviewUrl: e.target.value })}
                autoCapitalize="none"
              />
            </div>

            <div className="space-y-2">
              <Label>Apple Maps URL</Label>
              <Input
                placeholder="https://maps.apple.com/..."
                value={formData.appleReviewUrl}
                onChange={(e) => setFormData({ ...formData, appleReviewUrl: e.target.value })}
                autoCapitalize="none"
              />
            </div>

            <div className="space-y-2">
              <Label>Yelp URL (Optional)</Label>
              <Input
                placeholder="https://www.yelp.com/writeareview/biz/..."
                value={formData.yelpReviewUrl}
                onChange={(e) => setFormData({ ...formData, yelpReviewUrl: e.target.value })}
                autoCapitalize="none"
              />
            </div>

            <div className="space-y-2">
              <Label>Facebook URL (Optional)</Label>
              <Input
                placeholder="https://www.facebook.com/..."
                value={formData.facebookReviewUrl}
                onChange={(e) => setFormData({ ...formData, facebookReviewUrl: e.target.value })}
                autoCapitalize="none"
              />
            </div>
          </div>
        </div>

        {/* Prompt Customization */}
        <div className="space-y-4">
          <h4 className="font-medium">Prompt Customization</h4>
          
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Review Prompt Title</Label>
              <Input
                value={formData.publicReviewPromptTitle}
                onChange={(e) => setFormData({ ...formData, publicReviewPromptTitle: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Review Prompt Message</Label>
              <Input
                value={formData.publicReviewPromptMessage}
                onChange={(e) => setFormData({ ...formData, publicReviewPromptMessage: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Low Score Alerts */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-red-500" />
            Low Score Alerts
          </h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Manager Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Alert managers when scores fall below threshold
              </p>
            </div>
            <Switch
              checked={formData.privateFollowUpEnabled}
              onCheckedChange={(v) => setFormData({ ...formData, privateFollowUpEnabled: v })}
            />
          </div>

          {formData.privateFollowUpEnabled && (
            <div className="space-y-2">
              <Label>Alert When Rating At or Below</Label>
              <Select
                value={String(formData.privateFollowUpThreshold)}
                onValueChange={(v) => setFormData({ ...formData, privateFollowUpThreshold: Number(v) })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {'★'.repeat(n)}{'☆'.repeat(5-n)} {n} star{n > 1 ? 's' : ''} or below
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={updateSettings.isPending}
          className="w-full"
        >
          {updateSettings.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
