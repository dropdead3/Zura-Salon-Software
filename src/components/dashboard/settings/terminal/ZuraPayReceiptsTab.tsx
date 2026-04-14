import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { Loader2, Receipt, Eye, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useReceiptConfig, useUpdateReceiptConfig, DEFAULT_RECEIPT_CONFIG } from '@/hooks/useReceiptConfig';
import type { ReceiptConfig } from '@/hooks/useReceiptConfig';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useWebsiteSocialLinksSettings } from '@/hooks/useWebsiteSettings';
import { useReviewThresholdSettings } from '@/hooks/useReviewThreshold';
import { useRedoPolicySettings } from '@/hooks/useRedoPolicySettings';
import { supabase } from '@/integrations/supabase/client';
import { buildReceiptHtml } from '@/components/dashboard/transactions/ReceiptPrintView';
import type { ReceiptData } from '@/components/dashboard/transactions/receiptData';

interface ReceiptPreviewProps {
  config: ReceiptConfig;
  businessName: string;
  logoUrl: string | null;
  iconUrl: string | null;
  address: string;
  phone: string | null;
  website: string | null;
  socials: { instagram?: string; facebook?: string; tiktok?: string };
  reviewUrls: { google?: string; yelp?: string; facebook?: string };
  redoPolicyFallback?: string;
}

function ReceiptPreview({ config, businessName, logoUrl, iconUrl, address, phone, website, socials, reviewUrls, redoPolicyFallback }: ReceiptPreviewProps) {
  const logoSizeClass = config.logo_size === 'sm' ? 'max-h-8 max-w-[50%]' : config.logo_size === 'lg' ? 'max-h-16 max-w-[90%]' : 'max-h-12 max-w-[70%]';
  const iconHeightClass = config.footer_icon_size === 'lg' ? 'h-8' : config.footer_icon_size === 'md' ? 'h-6' : 'h-4';

  const activeReviewPlatforms = [
    reviewUrls.google && 'Google',
    reviewUrls.yelp && 'Yelp',
    reviewUrls.facebook && 'Facebook',
  ].filter(Boolean) as string[];

  const activeSocials = [
    socials.instagram && `@${socials.instagram.replace(/^@/, '')}`,
    socials.facebook && `fb/${socials.facebook}`,
    socials.tiktok && `@${socials.tiktok.replace(/^@/, '')}`,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-xl border border-gray-200 bg-white text-black p-6 max-w-[320px] mx-auto font-sans text-sm">
      {/* Header */}
      <div className="pb-4 mb-4" style={{ borderBottom: '1px solid #e5e5e5', textAlign: config.logo_position === 'center' ? 'center' : 'left' }}>
        {config.show_logo && logoUrl ? (
          <img src={logoUrl} alt={businessName} className={`${logoSizeClass} w-auto h-auto object-contain mb-2`} style={{ margin: config.logo_position === 'center' ? '0 auto 8px' : '0 0 8px' }} />
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
          <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
            <th className="text-left pb-1 text-gray-500" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Item</th>
            <th className="text-center pb-1 text-gray-500" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Qty</th>
            <th className="text-right pb-1 text-gray-500" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Amount</th>
          </tr>
        </thead>
        <tbody style={{ borderBottom: '1px solid #e5e5e5' }}>
          <tr><td className="py-1">Balayage</td><td className="text-center py-1">1</td><td className="text-right py-1">$185.00</td></tr>
          <tr><td className="py-1">Olaplex Treatment</td><td className="text-center py-1">1</td><td className="text-right py-1">$45.00</td></tr>
        </tbody>
      </table>

      {/* Color Room Charges (sample) */}
      <div className="mt-3 pt-2" style={{ borderTop: '1px solid #e5e5e5' }}>
        <p className="text-gray-500 mb-1" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color Room Charges</p>
        <table className="w-full text-xs">
          <tbody>
            <tr><td className="py-0.5">Overage — 2 oz</td><td className="text-right py-0.5">$6.00</td></tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="space-y-1 text-xs mt-3">
        <div className="flex justify-between"><span>Subtotal</span><span>$230.00</span></div>
        <div className="flex justify-between"><span>Tax</span><span>$18.40</span></div>
        <div className="flex justify-between"><span>Color Room</span><span>$6.00</span></div>
        <div className="flex justify-between font-medium text-sm pt-2 mt-1" style={{ borderTop: '1px solid #e5e5e5' }}>
          <span>Total</span><span>$254.40</span>
        </div>
      </div>

      {/* Footer Messages */}
      <div className="text-center mt-4 text-xs text-gray-400 space-y-1">
        {config.custom_message && <p>{config.custom_message}</p>}
        {config.footer_text && <p>{config.footer_text}</p>}
      </div>

      {/* Satisfaction Note */}
      {config.show_satisfaction_note && config.satisfaction_text && (
        <p className="text-center text-[10px] text-gray-400 mt-3">{config.satisfaction_text}</p>
      )}

      {/* Policies */}
      {(config.show_redo_policy || config.show_refund_policy) && (
        <div className="mt-3 pt-2 space-y-1" style={{ borderTop: '1px solid #e5e5e5' }}>
          {config.show_redo_policy && (config.redo_policy_text || redoPolicyFallback) && (
            <p className="text-[10px] text-gray-400 text-center">{config.redo_policy_text || redoPolicyFallback}</p>
          )}
          {config.show_refund_policy && config.refund_policy_text && (
            <p className="text-[10px] text-gray-400 text-center">{config.refund_policy_text}</p>
          )}
        </div>
      )}

      {/* Review Prompt */}
      {config.show_review_prompt && config.review_prompt_text && (
         <div className="mt-3 pt-2 text-center" style={{ borderTop: '1px solid #e5e5e5' }}>
           <p className="text-[10px] text-gray-500 font-medium">{config.review_prompt_text}</p>
           {activeReviewPlatforms.length > 0 && (
             <p className="text-[10px] text-gray-600 mt-0.5">{activeReviewPlatforms.join(' · ')}</p>
          )}
        </div>
      )}

      {/* Socials & Website */}
      {(config.show_socials && activeSocials.length > 0) || (config.show_website && website) ? (
        <div className="mt-3 pt-2 text-center space-y-0.5" style={{ borderTop: '1px solid #e5e5e5' }}>
          {config.show_socials && activeSocials.length > 0 && (
            <p className="text-[10px] text-gray-400">{activeSocials.join(' · ')}</p>
          )}
          {config.show_website && website && (
            <p className="text-[10px] text-gray-400">{website}</p>
          )}
        </div>
      ) : null}

      {/* Footer Icon */}
      {config.show_footer_icon && iconUrl && (
        <div className="mt-3 flex justify-center">
          <img src={iconUrl} alt="" className={`${iconHeightClass} object-contain opacity-40`} />
        </div>
      )}
    </div>
  );
}

function SettingToggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="font-sans text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function ZuraPayReceiptsTab() {
  const { data: config, isLoading } = useReceiptConfig();
  const updateConfig = useUpdateReceiptConfig();
  const { data: business } = useBusinessSettings();
  const { data: socialLinks } = useWebsiteSocialLinksSettings();
  const { data: reviewSettings } = useReviewThresholdSettings();
  const { data: redoPolicy } = useRedoPolicySettings();

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

  // Use logo_light_url first (dark-colored logo for white receipt background)
  const logoUrl = business?.logo_light_url || business?.logo_dark_url || null;
  const iconUrl = business?.icon_light_url || business?.icon_dark_url || null;
  const addressParts = [business?.mailing_address, business?.city, business?.state, business?.zip].filter(Boolean);
  const address = addressParts.join(', ');

  const socials = {
    instagram: socialLinks?.instagram || '',
    facebook: socialLinks?.facebook || '',
    tiktok: socialLinks?.tiktok || '',
  };

  const reviewUrls = {
    google: reviewSettings?.googleReviewUrl || '',
    yelp: reviewSettings?.yelpReviewUrl || '',
    facebook: reviewSettings?.facebookReviewUrl || '',
  };

  // Auto-generate redo policy text placeholder
  const redoPolicyPlaceholder = redoPolicy
    ? `Redos accepted within ${redoPolicy.redo_window_days} days of service.`
    : 'Redos accepted within 14 days of service.';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
          {/* === Header Section === */}
          <p className="text-xs text-muted-foreground font-display tracking-wide uppercase">Header</p>

          <SettingToggle label="Show Logo" description="Display your salon logo at the top of receipts." checked={local.show_logo} onChange={(v) => update({ show_logo: v })} />

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
              <Label className="font-sans text-sm font-medium mt-3 block">Logo Size</Label>
              <Select value={local.logo_size || 'md'} onValueChange={(v) => update({ logo_size: v as 'sm' | 'md' | 'lg' })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
              {!logoUrl && (
                <p className="text-xs text-amber-500">No logo uploaded yet. Add one in Business Settings.</p>
              )}
            </div>
          )}

          <SettingToggle label="Show Address" description="Include salon address on the receipt header." checked={local.show_address} onChange={(v) => update({ show_address: v })} />
          <SettingToggle label="Show Phone" description="Include salon phone number on the receipt header." checked={local.show_phone} onChange={(v) => update({ show_phone: v })} />

          {/* === Transaction Section === */}
          <p className="text-xs text-muted-foreground font-display tracking-wide uppercase pt-2">Transaction Details</p>

          <SettingToggle label="Show Stylist" description="Display the stylist's name on the receipt." checked={local.show_stylist} onChange={(v) => update({ show_stylist: v })} />
          <SettingToggle label="Show Payment Method" description="Display how the client paid (Card, Cash, etc)." checked={local.show_payment_method} onChange={(v) => update({ show_payment_method: v })} />

          {/* === Footer Content Section === */}
          <p className="text-xs text-muted-foreground font-display tracking-wide uppercase pt-2">Footer Content</p>

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

          <SettingToggle label="Satisfaction Note" description="Let clients know how to reach you if they're not happy." checked={local.show_satisfaction_note} onChange={(v) => update({ show_satisfaction_note: v })} />
          {local.show_satisfaction_note && (
            <div className="pl-1">
              <Input
                value={local.satisfaction_text}
                onChange={(e) => update({ satisfaction_text: e.target.value })}
                placeholder="Not satisfied? Contact us and we'll make it right."
                maxLength={150}
                autoCapitalize="off"
              />
            </div>
          )}

          {/* === Policies === */}
          <p className="text-xs text-muted-foreground font-display tracking-wide uppercase pt-2">Policies</p>

          <SettingToggle label="Redo Policy" description="Display your redo policy on receipts." checked={local.show_redo_policy} onChange={(v) => update({ show_redo_policy: v })} />
          {local.show_redo_policy && (
            <div className="pl-1">
              <Textarea
                value={local.redo_policy_text}
                onChange={(e) => update({ redo_policy_text: e.target.value })}
                placeholder={redoPolicyPlaceholder}
                className="min-h-[60px] text-xs"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank to use auto-generated text from your redo settings.</p>
            </div>
          )}

          <SettingToggle label="Refund Policy" description="Display your refund policy on receipts." checked={local.show_refund_policy} onChange={(v) => update({ show_refund_policy: v })} />
          {local.show_refund_policy && (
            <div className="pl-1">
              <Textarea
                value={local.refund_policy_text}
                onChange={(e) => update({ refund_policy_text: e.target.value })}
                placeholder="All sales are final. Contact us within 48 hours with any concerns."
                className="min-h-[60px] text-xs"
                maxLength={200}
              />
            </div>
          )}

          {/* === Review & Socials === */}
          <p className="text-xs text-muted-foreground font-display tracking-wide uppercase pt-2">Reviews & Socials</p>

          <SettingToggle label="Review Prompt" description="Prompt happy clients to leave a review." checked={local.show_review_prompt} onChange={(v) => update({ show_review_prompt: v })} />
          {local.show_review_prompt && (
            <div className="pl-1 space-y-1.5">
              <Input
                value={local.review_prompt_text}
                onChange={(e) => update({ review_prompt_text: e.target.value })}
                placeholder="Loved your visit? Leave us a review!"
                maxLength={120}
                autoCapitalize="off"
              />
              {!reviewUrls.google && !reviewUrls.yelp && !reviewUrls.facebook && (
                <p className="text-xs text-amber-500">No review URLs configured yet. Add them in Review Settings.</p>
              )}
            </div>
          )}

          <SettingToggle label="Show Social Links" description="Display your social media handles on receipts." checked={local.show_socials} onChange={(v) => update({ show_socials: v })} />
          {local.show_socials && !socials.instagram && !socials.facebook && !socials.tiktok && (
            <p className="pl-1 text-xs text-amber-500">No social links configured. Add them in Website Settings.</p>
          )}

          <SettingToggle label="Show Website" description="Display your website URL on receipts." checked={local.show_website} onChange={(v) => update({ show_website: v })} />

          {/* === Branding === */}
          <p className="text-xs text-muted-foreground font-display tracking-wide uppercase pt-2">Branding</p>

          <SettingToggle label="Footer Icon" description="Display a small icon logo at the bottom of the receipt." checked={local.show_footer_icon} onChange={(v) => update({ show_footer_icon: v })} />
          {local.show_footer_icon && (
            <div className="pl-1 space-y-1.5">
              <Label className="font-sans text-sm font-medium">Icon Size</Label>
              <Select value={local.footer_icon_size || 'sm'} onValueChange={(v) => update({ footer_icon_size: v as 'sm' | 'md' | 'lg' })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
              {!iconUrl && (
                <p className="text-xs text-amber-500">No icon uploaded yet. Add one in Business Settings.</p>
              )}
            </div>
          )}

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
      <div className="lg:sticky lg:top-6 self-start">
        <Card className="rounded-xl border-border bg-card/80 backdrop-blur-xl max-w-[360px] mx-auto">
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
              iconUrl={iconUrl}
              address={address}
              phone={business?.phone || null}
              website={business?.website || null}
              socials={socials}
              reviewUrls={reviewUrls}
              redoPolicyFallback={redoPolicyPlaceholder}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
