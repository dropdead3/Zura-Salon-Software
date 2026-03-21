import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Plus, X, Printer, Download } from 'lucide-react';
import { useGiftCardSettings, useUpdateGiftCardSettings, GiftCardSettings } from '@/hooks/useGiftCardSettings';
import { GiftCardPreview } from './GiftCardPreview';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface GiftCardDesignEditorProps {
  organizationId?: string;
}

export function GiftCardDesignEditor({ organizationId }: GiftCardDesignEditorProps) {
  const { data: settings, isLoading } = useGiftCardSettings(organizationId);
  const updateSettings = useUpdateGiftCardSettings();

  const [localSettings, setLocalSettings] = useState<Partial<GiftCardSettings>>({});
  const [newAmount, setNewAmount] = useState('');

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!organizationId) return;
    await updateSettings.mutateAsync({ organizationId, settings: localSettings });
  };

  const handleAddAmount = () => {
    const amount = parseInt(newAmount);
    if (!amount || amount <= 0) return;
    
    const currentAmounts = localSettings.suggested_amounts || [25, 50, 100, 150, 200];
    if (!currentAmounts.includes(amount)) {
      setLocalSettings({
        ...localSettings,
        suggested_amounts: [...currentAmounts, amount].sort((a, b) => a - b),
      });
    }
    setNewAmount('');
  };

  const handleRemoveAmount = (amount: number) => {
    const currentAmounts = localSettings.suggested_amounts || [];
    setLocalSettings({
      ...localSettings,
      suggested_amounts: currentAmounts.filter(a => a !== amount),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>See how your gift card will look</CardDescription>
        </CardHeader>
        <CardContent>
          <GiftCardPreview 
            settings={localSettings as GiftCardSettings}
            amount={100}
            code="ABCD-1234-EFGH-5678"
          />
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size={tokens.button.card} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Preview
            </Button>
            <Button variant="outline" size={tokens.button.card} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Design Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Template Style</Label>
              <Select
                value={localSettings.print_template || 'elegant'}
                onValueChange={(value: 'elegant' | 'modern' | 'minimal') => 
                  setLocalSettings({ ...localSettings, print_template: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elegant">Elegant</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Background</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={localSettings.card_background_color || '#1a1a1a'}
                    onChange={(e) => setLocalSettings({ ...localSettings, card_background_color: e.target.value })}
                    className="h-9 w-12 p-1 cursor-pointer"
                  />
                  <Input
                    value={localSettings.card_background_color || '#1a1a1a'}
                    onChange={(e) => setLocalSettings({ ...localSettings, card_background_color: e.target.value })}
                    className="h-9 font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Text</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={localSettings.card_text_color || '#ffffff'}
                    onChange={(e) => setLocalSettings({ ...localSettings, card_text_color: e.target.value })}
                    className="h-9 w-12 p-1 cursor-pointer"
                  />
                  <Input
                    value={localSettings.card_text_color || '#ffffff'}
                    onChange={(e) => setLocalSettings({ ...localSettings, card_text_color: e.target.value })}
                    className="h-9 font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Accent</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={localSettings.card_accent_color || '#d4af37'}
                    onChange={(e) => setLocalSettings({ ...localSettings, card_accent_color: e.target.value })}
                    className="h-9 w-12 p-1 cursor-pointer"
                  />
                  <Input
                    value={localSettings.card_accent_color || '#d4af37'}
                    onChange={(e) => setLocalSettings({ ...localSettings, card_accent_color: e.target.value })}
                    className="h-9 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Print Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Include QR Code</Label>
                <p className="text-xs text-muted-foreground">Scannable code for balance lookup</p>
              </div>
              <Switch
                checked={localSettings.include_qr_code ?? true}
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, include_qr_code: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Include Terms</Label>
                <p className="text-xs text-muted-foreground">Show terms and conditions</p>
              </div>
              <Switch
                checked={localSettings.include_terms ?? true}
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, include_terms: checked })}
              />
            </div>

            {localSettings.include_terms && (
              <div>
                <Label>Terms Text</Label>
                <Textarea
                  value={localSettings.terms_text || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, terms_text: e.target.value })}
                  placeholder="Valid at all locations. No cash value."
                  rows={2}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suggested Amounts</CardTitle>
            <CardDescription>Quick-select amounts when creating gift cards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {(localSettings.suggested_amounts || [25, 50, 100, 150, 200]).map((amount) => (
                <Badge 
                  key={amount} 
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  ${amount}
                  <button
                    onClick={() => handleRemoveAmount(amount)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Add amount..."
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAmount()}
                className="w-32"
              />
              <Button size={tokens.button.inline} variant="outline" onClick={handleAddAmount}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Design
          </Button>
        </div>
      </div>
    </div>
  );
}
