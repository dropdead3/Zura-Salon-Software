import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Building2, MapPin, Phone, Upload, X, Sun, Moon, AlertCircle, Sparkles } from 'lucide-react';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { TeamLoginUrlCard } from './TeamLoginUrlCard';
import { isStructurallyEqual } from '@/lib/stableStringify';

const ALLOWED_TYPES = ['image/svg+xml', 'image/png'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function BusinessSettingsContent() {
  const { data: settings, isLoading } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();

  const lightLogoInputRef = useRef<HTMLInputElement>(null);
  const darkLogoInputRef = useRef<HTMLInputElement>(null);
  const lightIconInputRef = useRef<HTMLInputElement>(null);
  const darkIconInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState({
    business_name: '',
    legal_name: '',
    logo_light_url: '',
    logo_dark_url: '',
    icon_light_url: '',
    icon_dark_url: '',
    mailing_address: '',
    city: '',
    state: '',
    zip: '',
    ein: '',
    phone: '',
    email: '',
    website: '',
    default_tax_rate: '',
    instagram_url: '',
    facebook_url: '',
    tiktok_url: '',
    twitter_url: '',
    youtube_url: '',
    linkedin_url: '',
  });

  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingDark, setUploadingDark] = useState(false);
  const [uploadingLightIcon, setUploadingLightIcon] = useState(false);
  const [uploadingDarkIcon, setUploadingDarkIcon] = useState(false);

  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);

  useEffect(() => {
    if (settings) {
      const snapshot = {
        business_name: settings.business_name || '',
        legal_name: settings.legal_name || '',
        logo_light_url: settings.logo_light_url || '',
        logo_dark_url: settings.logo_dark_url || '',
        icon_light_url: settings.icon_light_url || '',
        icon_dark_url: settings.icon_dark_url || '',
        mailing_address: settings.mailing_address || '',
        city: settings.city || '',
        state: settings.state || '',
        zip: settings.zip || '',
        ein: settings.ein || '',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
        default_tax_rate: settings.default_tax_rate != null ? (settings.default_tax_rate * 100).toString() : '',
        instagram_url: settings.instagram_url || '',
        facebook_url: settings.facebook_url || '',
        tiktok_url: settings.tiktok_url || '',
        twitter_url: settings.twitter_url || '',
        youtube_url: settings.youtube_url || '',
        linkedin_url: settings.linkedin_url || '',
      };
      setFormData(snapshot);
      setInitialFormData(snapshot);
    }
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!initialFormData) return false;
    return !isStructurallyEqual(formData, initialFormData);
  }, [formData, initialFormData]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return 'Only SVG and PNG files are allowed';
    if (file.size > MAX_FILE_SIZE) return 'File size must be under 2MB';
    return null;
  };

  const trimTransparentPadding = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (file.type !== 'image/png') { resolve(file); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imageData;
        let top = height, left = width, right = 0, bottom = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const a = data[idx + 3];
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            if (a > 10 && !(r > 240 && g > 240 && b > 240 && a > 240)) {
              if (y < top) top = y;
              if (y > bottom) bottom = y;
              if (x < left) left = x;
              if (x > right) right = x;
            }
          }
        }
        if (top > bottom || left > right) { resolve(file); return; }
        const pad = 4;
        top = Math.max(0, top - pad);
        left = Math.max(0, left - pad);
        bottom = Math.min(height - 1, bottom + pad);
        right = Math.min(width - 1, right + pad);
        const trimW = right - left + 1;
        const trimH = bottom - top + 1;
        const trimCanvas = document.createElement('canvas');
        trimCanvas.width = trimW;
        trimCanvas.height = trimH;
        const trimCtx = trimCanvas.getContext('2d');
        if (!trimCtx) { resolve(file); return; }
        trimCtx.drawImage(img, left, top, trimW, trimH, 0, 0, trimW, trimH);
        trimCanvas.toBlob((blob) => {
          if (blob) resolve(blob); else resolve(file);
        }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  const uploadLogo = async (file: File, type: 'light' | 'dark') => {
    const error = validateFile(file);
    if (error) { toast.error(error); return; }
    const setUploading = type === 'light' ? setUploadingLight : setUploadingDark;
    setUploading(true);
    try {
      const processedBlob = await trimTransparentPadding(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${type}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('business-logos').upload(fileName, processedBlob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, [type === 'light' ? 'logo_light_url' : 'logo_dark_url']: publicUrl }));
      toast.success(`${type === 'light' ? 'Light' : 'Dark'} mode logo uploaded`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const uploadIcon = async (file: File, type: 'light' | 'dark') => {
    const error = validateFile(file);
    if (error) { toast.error(error); return; }
    const setUploading = type === 'light' ? setUploadingLightIcon : setUploadingDarkIcon;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `icon-${type}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('business-logos').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, [type === 'light' ? 'icon_light_url' : 'icon_dark_url']: publicUrl }));
      toast.success(`${type === 'light' ? 'Light' : 'Dark'} mode icon uploaded`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload icon');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'light' | 'dark') => {
    const file = e.target.files?.[0];
    if (file) uploadLogo(file, type);
    e.target.value = '';
  };

  const handleIconFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'light' | 'dark') => {
    const file = e.target.files?.[0];
    if (file) uploadIcon(file, type);
    e.target.value = '';
  };

  const removeLogo = (type: 'light' | 'dark') => {
    setFormData(prev => ({ ...prev, [type === 'light' ? 'logo_light_url' : 'logo_dark_url']: '' }));
  };

  const removeIcon = (type: 'light' | 'dark') => {
    setFormData(prev => ({ ...prev, [type === 'light' ? 'icon_light_url' : 'icon_dark_url']: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const taxRateValue = formData.default_tax_rate ? parseFloat(formData.default_tax_rate) / 100 : null;
    const { default_tax_rate, ...rest } = formData;
    await updateSettings.mutateAsync({ ...rest, default_tax_rate: taxRateValue });
    setInitialFormData(formData);
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const LogoUploadCard = ({ type, url, uploading, inputRef }: { type: 'light' | 'dark'; url: string; uploading: boolean; inputRef: React.RefObject<HTMLInputElement> }) => {
    const isLight = type === 'light';
    const Icon = isLight ? Sun : Moon;
    const bgClass = isLight ? 'bg-white border-border' : 'bg-zinc-900 border-zinc-700';
    const textClass = isLight ? 'text-zinc-900' : 'text-white';
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><Icon className="w-4 h-4" />{isLight ? 'Light Mode Logo' : 'Dark Mode Logo'}</Label>
        <div
          className={cn('relative border-2 border-dashed rounded-lg p-4 transition-colors min-h-[120px] flex items-center justify-center', bgClass, !url && 'hover:border-primary/50 cursor-pointer')}
          onClick={() => !url && !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2"><Loader2 className={cn('w-8 h-8 animate-spin', textClass)} /><span className={cn('text-sm', textClass)}>Uploading...</span></div>
          ) : url ? (
            <div className="relative w-full flex items-center justify-center">
              <img src={url} alt={`${type} mode logo`} className="max-h-[100px] max-w-full object-contain" />
              <button type="button" onClick={(e) => { e.stopPropagation(); removeLogo(type); }} className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <div className={cn('flex flex-col items-center gap-1 text-center', textClass)}>
              <Upload className="w-8 h-8 opacity-50" />
              <span className="text-sm opacity-70">Click to upload</span>
              <span className="text-xs opacity-50">SVG or PNG · Horizontal/wordmark preferred</span>
              <span className="text-xs opacity-40 mt-1">{isLight ? 'Use a dark/black logo' : 'Use a white/light logo'}</span>
              <span className="text-xs opacity-30 mt-0.5">PNGs are auto-trimmed to remove excess padding</span>
            </div>
          )}
        </div>
        <input ref={inputRef} type="file" accept=".svg,.png,image/svg+xml,image/png" className="hidden" onChange={(e) => handleFileChange(e, type)} />
      </div>
    );
  };

  const IconUploadCard = ({ type, url, uploading, inputRef }: { type: 'light' | 'dark'; url: string; uploading: boolean; inputRef: React.RefObject<HTMLInputElement> }) => {
    const isLight = type === 'light';
    const Icon = isLight ? Sun : Moon;
    const bgClass = isLight ? 'bg-white border-border' : 'bg-zinc-900 border-zinc-700';
    const textClass = isLight ? 'text-zinc-900' : 'text-white';
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><Icon className="w-4 h-4" />{isLight ? 'Light Mode Icon' : 'Dark Mode Icon'}</Label>
        <div
          className={cn('relative border-2 border-dashed rounded-lg p-4 transition-colors min-h-[100px] flex items-center justify-center', bgClass, !url && 'hover:border-primary/50 cursor-pointer')}
          onClick={() => !url && !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2"><Loader2 className={cn('w-6 h-6 animate-spin', textClass)} /><span className={cn('text-xs', textClass)}>Uploading...</span></div>
          ) : url ? (
            <div className="relative w-full flex items-center justify-center">
              <img src={url} alt={`${type} mode icon`} className="max-h-[60px] max-w-full object-contain" />
              <button type="button" onClick={(e) => { e.stopPropagation(); removeIcon(type); }} className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <div className={cn('flex flex-col items-center gap-1 text-center', textClass)}>
              <Upload className="w-6 h-6 opacity-50" />
              <span className="text-xs opacity-70">Click to upload</span>
              <span className="text-xs opacity-50">SVG or PNG</span>
              <span className="text-xs opacity-40">{isLight ? 'Dark/black icon' : 'White/light icon'}</span>
            </div>
          )}
        </div>
        <input ref={inputRef} type="file" accept=".svg,.png,image/svg+xml,image/png" className="hidden" onChange={(e) => handleIconFileChange(e, type)} />
      </div>
    );
  };

  const bothLogosUploaded = formData.logo_light_url && formData.logo_dark_url;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <PageExplainer pageId="business-identity" className="mb-4" />
      <Tabs defaultValue="identity" className="w-full">
        <TabsList>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="brand">Brand Assets</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">BUSINESS IDENTITY</CardTitle>
              <CardDescription>Your business name, legal entity, and tax configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name (DBA)</Label>
                  <Input id="business_name" value={formData.business_name} onChange={(e) => handleChange('business_name', e.target.value)} placeholder="Your Business Name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Legal Name</Label>
                  <Input id="legal_name" value={formData.legal_name} onChange={(e) => handleChange('legal_name', e.target.value)} placeholder="Your Legal Entity Name LLC" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN</Label>
                  <Input id="ein" value={formData.ein} onChange={(e) => handleChange('ein', e.target.value)} placeholder="XX-XXXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
                  <Input id="default_tax_rate" type="number" step="0.01" min="0" max="100" value={formData.default_tax_rate} onChange={(e) => handleChange('default_tax_rate', e.target.value)} placeholder="8.00" />
                  <p className="text-xs text-muted-foreground">Applied to all locations unless overridden</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">BRAND LOGOS</CardTitle>
              <CardDescription>Upload light and dark mode logos for your brand.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!bothLogosUploaded && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">Both light and dark mode logos are required for the dashboard to display correctly across themes.</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LogoUploadCard type="light" url={formData.logo_light_url} uploading={uploadingLight} inputRef={lightLogoInputRef} />
                <LogoUploadCard type="dark" url={formData.logo_dark_url} uploading={uploadingDark} inputRef={darkLogoInputRef} />
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <Sparkles className="w-4 h-4" />
                  Secondary Icons
                </div>
                <p className="text-xs text-muted-foreground mb-4">Optional icons for use in program assets, invoices, email signatures, and other branded materials.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <IconUploadCard type="light" url={formData.icon_light_url} uploading={uploadingLightIcon} inputRef={lightIconInputRef} />
                  <IconUploadCard type="dark" url={formData.icon_dark_url} uploading={uploadingDarkIcon} inputRef={darkIconInputRef} />
                </div>
              </div>
            </CardContent>
          </Card>

          <TeamLoginUrlCard />
        </TabsContent>

        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">MAILING ADDRESS</CardTitle>
              <CardDescription>Your business mailing address for invoices and correspondence.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mailing_address">Street Address</Label>
                <Textarea id="mailing_address" value={formData.mailing_address} onChange={(e) => handleChange('mailing_address', e.target.value)} placeholder="123 Main Street, Suite 100" rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="Phoenix" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={formData.state} onChange={(e) => handleChange('state', e.target.value)} placeholder="AZ" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input id="zip" value={formData.zip} onChange={(e) => handleChange('zip', e.target.value)} placeholder="85001" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">CONTACT INFORMATION</CardTitle>
              <CardDescription>Phone, email, and website used across invoices and communications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="(555) 123-4567" type="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="hello@example.com" type="email" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="https://www.example.com" type="url" />
              </div>

              {/* Social Links */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-display tracking-wide uppercase mb-3">Social Links</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram_url">Instagram</Label>
                    <Input id="instagram_url" value={formData.instagram_url} onChange={(e) => handleChange('instagram_url', e.target.value)} placeholder="https://instagram.com/yourbrand" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook_url">Facebook</Label>
                    <Input id="facebook_url" value={formData.facebook_url} onChange={(e) => handleChange('facebook_url', e.target.value)} placeholder="https://facebook.com/yourbrand" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiktok_url">TikTok</Label>
                    <Input id="tiktok_url" value={formData.tiktok_url} onChange={(e) => handleChange('tiktok_url', e.target.value)} placeholder="https://tiktok.com/@yourbrand" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter_url">X / Twitter</Label>
                    <Input id="twitter_url" value={formData.twitter_url} onChange={(e) => handleChange('twitter_url', e.target.value)} placeholder="https://x.com/yourbrand" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube_url">YouTube</Label>
                    <Input id="youtube_url" value={formData.youtube_url} onChange={(e) => handleChange('youtube_url', e.target.value)} placeholder="https://youtube.com/@yourbrand" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn</Label>
                    <Input id="linkedin_url" value={formData.linkedin_url} onChange={(e) => handleChange('linkedin_url', e.target.value)} placeholder="https://linkedin.com/company/yourbrand" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">These appear on receipts and your public website. Locations can override with their own links.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticky save footer */}
      <div
        className={cn(
          'sticky bottom-0 z-10 flex justify-end gap-3 border-t border-border bg-background/80 backdrop-blur-xl px-6 py-4 mt-6 rounded-b-xl transition-all duration-200',
          isDirty ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        )}
      >
        <Button type="button" variant="outline" onClick={() => { if (initialFormData) setFormData(initialFormData); }}>
          Reset
        </Button>
        <Button type="submit" disabled={updateSettings.isPending}>
          {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
