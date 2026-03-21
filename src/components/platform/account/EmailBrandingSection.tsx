import { useState, useEffect, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import { Save, Loader2, Upload, Mail, Paintbrush, Eye } from 'lucide-react';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PLATFORM_NAME } from '@/lib/brand';

interface EmailBrandingSectionProps {
  organizationId: string;
}

interface BrandingData {
  email_sender_name: string;
  email_reply_to: string;
  email_logo_url: string;
  email_accent_color: string;
  name: string;
  logo_url: string | null;
}

export function EmailBrandingSection({ organizationId }: EmailBrandingSectionProps) {
  const [branding, setBranding] = useState<BrandingData>({
    email_sender_name: '',
    email_reply_to: '',
    email_logo_url: '',
    email_accent_color: '#000000',
    name: '',
    logo_url: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('name, logo_url, email_sender_name, email_reply_to, email_logo_url, email_accent_color')
        .eq('id', organizationId)
        .single();

      if (!error && data) {
        setBranding({
          email_sender_name: (data as any).email_sender_name || '',
          email_reply_to: (data as any).email_reply_to || '',
          email_logo_url: (data as any).email_logo_url || '',
          email_accent_color: (data as any).email_accent_color || '#000000',
          name: data.name || '',
          logo_url: data.logo_url || null,
        });
      }
      setIsLoading(false);
    }
    load();
  }, [organizationId]);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        email_sender_name: branding.email_sender_name || null,
        email_reply_to: branding.email_reply_to || null,
        email_logo_url: branding.email_logo_url || null,
        email_accent_color: branding.email_accent_color || null,
      } as any)
      .eq('id', organizationId);

    if (error) {
      toast.error('Failed to save email branding settings');
      console.error(error);
    } else {
      toast.success('Email branding settings saved');
    }
    setIsSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setIsUploading(true);
    const ext = file.name.split('.').pop();
    const path = `email-logos/${organizationId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('business-logos')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error('Failed to upload logo');
      console.error(uploadError);
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('business-logos')
      .getPublicUrl(path);

    setBranding(prev => ({ ...prev, email_logo_url: urlData.publicUrl }));
    setIsUploading(false);
    toast.success('Logo uploaded');
  };

  const displayName = branding.email_sender_name || branding.name || 'Your Salon';
  const accentColor = branding.email_accent_color || '#000000';
  const logoUrl = branding.email_logo_url || branding.logo_url || null;

  if (isLoading) {
    return (
      <PlatformCard>
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Branding
          </PlatformCardTitle>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </PlatformCardContent>
      </PlatformCard>
    );
  }

  return (
    <PlatformCard>
      <PlatformCardHeader>
        <PlatformCardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Branding
        </PlatformCardTitle>
        <PlatformCardDescription>
          Customize how outbound emails appear to your team and clients
        </PlatformCardDescription>
      </PlatformCardHeader>
      <PlatformCardContent className="space-y-6">
        {/* Form fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email-sender-name">Sender Display Name</Label>
            <Input
              id="email-sender-name"
              placeholder={branding.name || 'e.g. Luxe Hair Studio'}
              value={branding.email_sender_name}
              onChange={e => setBranding(prev => ({ ...prev, email_sender_name: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Appears as the "from" name in recipients' inboxes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-reply-to">Reply-To Email</Label>
            <Input
              id="email-reply-to"
              type="email"
              placeholder="hello@yoursalon.com"
              value={branding.email_reply_to}
              onChange={e => setBranding(prev => ({ ...prev, email_reply_to: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Where replies are directed when someone replies to an email
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Email Logo</Label>
            <div className="flex items-center gap-3">
              {branding.email_logo_url ? (
                <img
                  src={branding.email_logo_url}
                  alt="Email logo"
                  className="h-10 max-w-[140px] object-contain rounded border border-border bg-muted p-1"
                />
              ) : (
                <div className="h-10 w-10 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground">
                  <Upload className="h-4 w-4" />
                </div>
              )}
              <PlatformButton
                variant="outline"
                size={tokens.button.card}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {branding.email_logo_url ? 'Replace' : 'Upload'}
              </PlatformButton>
              {branding.email_logo_url && (
                <PlatformButton
                  variant="ghost"
                  size={tokens.button.inline}
                  onClick={() => setBranding(prev => ({ ...prev, email_logo_url: '' }))}
                >
                  Remove
                </PlatformButton>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <p className="text-xs text-muted-foreground">
              Max 2MB. Displayed in the email header.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-accent-color" className="flex items-center gap-1.5">
              <Paintbrush className="h-3.5 w-3.5" />
              Accent Color
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="email-accent-color"
                value={branding.email_accent_color}
                onChange={e => setBranding(prev => ({ ...prev, email_accent_color: e.target.value }))}
                className="h-10 w-10 rounded border border-border cursor-pointer"
              />
              <Input
                value={branding.email_accent_color}
                onChange={e => setBranding(prev => ({ ...prev, email_accent_color: e.target.value }))}
                placeholder="#000000"
                className="max-w-[120px] font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used for the email header background and accent bar
            </p>
          </div>
        </div>

        {/* Preview toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <PlatformButton
            variant="outline"
            size={tokens.button.card}
            onClick={() => setShowPreview(!showPreview)}
            className="gap-1.5"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </PlatformButton>

          <PlatformButton
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </PlatformButton>
        </div>

        {/* Live preview */}
        {showPreview && (
          <div className="rounded-lg border border-border overflow-hidden bg-[#f4f4f5]">
            <div className="p-3 text-xs text-muted-foreground bg-muted/50 border-b border-border font-medium">
              Email Preview
            </div>
            <div style={{ maxWidth: 480, margin: '16px auto', padding: '0 12px' }}>
              {/* Header */}
              <div
                style={{
                  backgroundColor: accentColor,
                  padding: '20px 16px',
                  borderRadius: '10px 10px 0 0',
                  textAlign: 'center',
                }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={displayName}
                    style={{ maxHeight: 40, maxWidth: 160, margin: '0 auto' }}
                  />
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.025em' }}>
                    {displayName}
                  </span>
                )}
              </div>
              {/* Accent bar */}
              <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} />
              {/* Content placeholder */}
              <div style={{ backgroundColor: '#ffffff', padding: '24px 20px', borderLeft: '1px solid #e4e4e7', borderRight: '1px solid #e4e4e7' }}>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                  <div className="h-8 bg-muted rounded w-1/3 mt-4" />
                </div>
              </div>
              {/* Footer */}
              <div style={{ backgroundColor: '#fafafa', padding: '14px 20px', borderRadius: '0 0 10px 10px', border: '1px solid #e4e4e7', borderTop: 'none', textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: '#a1a1aa' }}>
                  Sent via <span style={{ textDecoration: 'underline' }}>{PLATFORM_NAME}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </PlatformCardContent>
    </PlatformCard>
  );
}
