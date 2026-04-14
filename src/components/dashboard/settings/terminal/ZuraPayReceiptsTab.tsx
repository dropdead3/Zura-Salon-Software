import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { Loader2, Receipt, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useReceiptConfig, useUpdateReceiptConfig, DEFAULT_RECEIPT_CONFIG } from '@/hooks/useReceiptConfig';
import type { ReceiptConfig } from '@/hooks/useReceiptConfig';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

function ReceiptPreview({ config, businessName, logoUrl, address, phone }: {
  config: ReceiptConfig;
  businessName: string;
  logoUrl: string | null;
  address: string;
  phone: string | null;
}) {
  const accentColor = config.accent_color || '#e5e5e5';

  return (
    <div className="rounded-xl border border-gray-200 bg-white text-black p-6 max-w-[320px] mx-auto font-sans text-sm">
      {/* Header */}
      <div className="pb-4 mb-4" style={{ borderBottom: `1px solid ${accentColor}`, textAlign: config.logo_position === 'center' ? 'center' : 'left' }}>
        {config.show_logo && logoUrl ? (
          <img src={logoUrl} alt={businessName} className="h-10 object-contain mb-2" style={{ margin: config.logo_position === 'center' ? '0 auto 8px' : '0 0 8px' }} />
        ) : (
          <p className="font-display text-base tracking-wide" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{businessName}</p>
        )}
        {config.show_address && address && (
          <p className="text-xs text-gray-500">{address}</p>
        )}
        {config.show_phone && phone && (
          <p className="text-xs text-gray-500">{phone}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">April 13, 2026</p>
      </div>

      {/* Meta */}
        <div className="text-xs text-gray-500 space-y-0.5 mb-3">
        <p><span className="font-medium text-black">Client:</span> Jane Doe</p>
        {config.show_stylist && <p><span className="font-medium text-black">Stylist:</span> Sarah M.</p>}
        {config.show_payment_method && <p><span className="font-medium text-black">Payment:</span> Card</p>}
      </div>

      {/* Items */}
      <table className="w-full text-xs mb-3">
        <thead>
          <tr style={{ borderBottom: `1px solid ${accentColor}` }}>
             <th className="text-left pb-1 text-gray-500" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Item</th>
            <th className="text-center pb-1 text-gray-500" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Qty</th>
            <th className="text-right pb-1 text-gray-500" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Amount</th>
          </tr>
        </thead>
        <tbody style={{ borderBottom: `1px solid ${accentColor}` }}>
          <tr><td className="py-1">Balayage</td><td className="text-center py-1">1</td><td className="text-right py-1">$185.00</td></tr>
          <tr><td className="py-1">Olaplex Treatment</td><td className="text-center py-1">1</td><td className="text-right py-1">$45.00</td></tr>
        </tbody>
      </table>

      {/* Totals */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between"><span>Subtotal</span><span>$230.00</span></div>
        <div className="flex justify-between"><span>Tax</span><span>$18.40</span></div>
        <div className="flex justify-between font-medium text-sm pt-2 mt-1" style={{ borderTop: `1px solid ${accentColor}` }}>
          <span>Total</span><span>$248.40</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 text-xs text-gray-400 space-y-1">
        {config.custom_message && <p>{config.custom_message}</p>}
        {config.footer_text && <p>{config.footer_text}</p>}
      </div>
    </div>
  );
}

export function ZuraPayReceiptsTab() {
  const { data: config, isLoading } = useReceiptConfig();
  const updateConfig = useUpdateReceiptConfig();
  const { data: business } = useBusinessSettings();

  const [local, setLocal] = useState<ReceiptConfig>(DEFAULT_RECEIPT_CONFIG);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setLocal(config);
      setDirty(false);
    }
  }, [config]);

  const update = (patch: Partial<ReceiptConfig>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleSave = () => {
    updateConfig.mutate(
      { key: 'receipt_config', value: local },
      {
        onSuccess: () => {
          setDirty(false);
          toast.success('Receipt settings saved');
        },
        onError: (err) => toast.error('Failed to save', { description: (err as Error).message }),
      }
    );
  };

  const logoUrl = business?.logo_dark_url || business?.logo_light_url || null;
  const addressParts = [business?.mailing_address, business?.city, business?.state, business?.zip].filter(Boolean);
  const address = addressParts.join(', ');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Settings Panel */}
      <Card className="rounded-xl border-border bg-card/80 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Receipt className={tokens.card.icon} />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Receipt Branding</CardTitle>
            <CardDescription className="font-sans text-sm text-muted-foreground">
              Customize how receipts appear to your clients.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-sans text-sm font-medium">Show Logo</Label>
              <p className="text-xs text-muted-foreground">Display your salon logo at the top of receipts.</p>
            </div>
            <Switch checked={local.show_logo} onCheckedChange={(v) => update({ show_logo: v })} />
          </div>

          {local.show_logo && (
            <div className="space-y-1.5 pl-1">
              <Label className="font-sans text-sm font-medium">Logo Position</Label>
              <Select value={local.logo_position} onValueChange={(v) => update({ logo_position: v as 'center' | 'left' })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                </SelectContent>
              </Select>
              {!logoUrl && (
                <p className="text-xs text-amber-500">No logo uploaded yet. Add one in Business Settings.</p>
              )}
            </div>
          )}

          {/* Address & Phone */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-sans text-sm font-medium">Show Address</Label>
              <p className="text-xs text-muted-foreground">Include salon address on the receipt header.</p>
            </div>
            <Switch checked={local.show_address} onCheckedChange={(v) => update({ show_address: v })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-sans text-sm font-medium">Show Phone</Label>
              <p className="text-xs text-muted-foreground">Include salon phone number on the receipt header.</p>
            </div>
            <Switch checked={local.show_phone} onCheckedChange={(v) => update({ show_phone: v })} />
          </div>

          {/* Item detail toggles */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-sans text-sm font-medium">Show Stylist</Label>
              <p className="text-xs text-muted-foreground">Display the stylist's name on the receipt.</p>
            </div>
            <Switch checked={local.show_stylist} onCheckedChange={(v) => update({ show_stylist: v })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-sans text-sm font-medium">Show Payment Method</Label>
              <p className="text-xs text-muted-foreground">Display how the client paid (Card, Cash, etc).</p>
            </div>
            <Switch checked={local.show_payment_method} onCheckedChange={(v) => update({ show_payment_method: v })} />
          </div>

          {/* Custom message */}
          <div className="space-y-1.5">
            <Label className="font-sans text-sm font-medium">Custom Message</Label>
            <Input
              value={local.custom_message}
              onChange={(e) => update({ custom_message: e.target.value })}
              placeholder="Thank you for your visit!"
              maxLength={120}
              autoCapitalize="off"
            />
            <p className="text-xs text-muted-foreground">{local.custom_message.length}/120 characters</p>
          </div>

          {/* Footer text */}
          <div className="space-y-1.5">
            <Label className="font-sans text-sm font-medium">Footer Text</Label>
            <Input
              value={local.footer_text}
              onChange={(e) => update({ footer_text: e.target.value })}
              placeholder="e.g. your salon slogan"
              maxLength={120}
              autoCapitalize="off"
            />
          </div>

          {/* Accent color */}
          <div className="space-y-1.5">
            <Label className="font-sans text-sm font-medium">Accent Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={local.accent_color || '#e5e5e5'}
                onChange={(e) => update({ accent_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
              />
              <Input
                value={local.accent_color}
                onChange={(e) => update({ accent_color: e.target.value })}
                placeholder="#e5e5e5"
                className="w-32 font-mono text-xs"
                autoCapitalize="off"
              />
              {local.accent_color && (
                <Button variant="ghost" size="sm" className="font-sans" onClick={() => update({ accent_color: '' })}>
                  Reset
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Color used for divider lines on receipts.</p>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={!dirty || updateConfig.isPending} className="font-sans">
              {updateConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card className="rounded-xl border-border bg-card/80 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Eye className={tokens.card.icon} />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Live Preview</CardTitle>
            <CardDescription className="font-sans text-sm text-muted-foreground">
              See how your receipt will appear to clients.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ReceiptPreview
            config={local}
            businessName={business?.business_name || 'Your Salon'}
            logoUrl={logoUrl}
            address={address}
            phone={business?.phone || null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
