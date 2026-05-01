import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Loader2, Building2, MapPin, Phone, Upload, X, Sun, Moon, AlertCircle, Sparkles } from 'lucide-react';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isStructurallyEqual } from '@/lib/stableStringify';

interface BusinessSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALLOWED_TYPES = ['image/svg+xml', 'image/png'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function BusinessSettingsDialog({ open, onOpenChange }: BusinessSettingsDialogProps) {
  const { data: settings, isLoading } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();

  const lightLogoInputRef = useRef<HTMLInputElement>(null);
  const darkLogoInputRef = useRef<HTMLInputElement>(null);
  const lightIconInputRef = useRef<HTMLInputElement>(null);
  const darkIconInputRef = useRef<HTMLInputElement>(null);

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
      };
      setFormData(snapshot);
      setInitialFormData(snapshot);
    }
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!initialFormData) return false;
    return !isStructurallyEqual(formData, initialFormData);
  }, [formData, initialFormData]);

  const forceClose = useCallback(() => {
    setFormData(initialFormData || formData);
    onOpenChange(false);
  }, [initialFormData, formData, onOpenChange]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      toast.warning('You have unsaved changes', {
        description: 'Your changes will be lost if you close without saving.',
        action: {
          label: 'Discard & Close',
          onClick: forceClose,
        },
        duration: 5000,
      });
      return;
    }
    onOpenChange(nextOpen);
  }, [isDirty, forceClose, onOpenChange]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only SVG and PNG files are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be under 2MB';
    }
    return null;
  };

  const trimTransparentPadding = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (file.type !== 'image/png') {
        resolve(file);
        return;
      }
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
        // Scan for non-transparent, non-near-white pixels
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const a = data[idx + 3];
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            // Consider pixel "content" if it's not transparent AND not near-white
            if (a > 10 && !(r > 240 && g > 240 && b > 240 && a > 240)) {
              if (y < top) top = y;
              if (y > bottom) bottom = y;
              if (x < left) left = x;
              if (x > right) right = x;
            }
          }
        }
        if (top > bottom || left > right) { resolve(file); return; }
        // Add small padding (4px each side)
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
    if (error) {
      toast.error(error);
      return;
    }

    const setUploading = type === 'light' ? setUploadingLight : setUploadingDark;
    setUploading(true);

    try {
      // Auto-trim transparent/white padding from PNGs
      const processedBlob = await trimTransparentPadding(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, processedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        [type === 'light' ? 'logo_light_url' : 'logo_dark_url']: publicUrl,
      }));

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
    if (error) {
      toast.error(error);
      return;
    }

    const setUploading = type === 'light' ? setUploadingLightIcon : setUploadingDarkIcon;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `icon-${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        [type === 'light' ? 'icon_light_url' : 'icon_dark_url']: publicUrl,
      }));

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
    if (file) {
      uploadLogo(file, type);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleIconFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'light' | 'dark') => {
    const file = e.target.files?.[0];
    if (file) {
      uploadIcon(file, type);
    }
    e.target.value = '';
  };

  const removeLogo = (type: 'light' | 'dark') => {
    setFormData(prev => ({
      ...prev,
      [type === 'light' ? 'logo_light_url' : 'logo_dark_url']: '',
    }));
  };

  const removeIcon = (type: 'light' | 'dark') => {
    setFormData(prev => ({
      ...prev,
      [type === 'light' ? 'icon_light_url' : 'icon_dark_url']: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Convert tax rate from percentage string to decimal number
    const taxRateValue = formData.default_tax_rate 
      ? parseFloat(formData.default_tax_rate) / 100 
      : null;
    
    const { default_tax_rate, ...rest } = formData;
    await updateSettings.mutateAsync({
      ...rest,
      default_tax_rate: taxRateValue,
    });
    setInitialFormData(formData);
    onOpenChange(false);
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const LogoUploadCard = ({ 
    type, 
    url, 
    uploading, 
    inputRef 
  }: { 
    type: 'light' | 'dark'; 
    url: string; 
    uploading: boolean;
    inputRef: React.RefObject<HTMLInputElement>;
  }) => {
    const isLight = type === 'light';
    const Icon = isLight ? Sun : Moon;
    const bgClass = isLight ? 'bg-white border-border' : 'bg-zinc-900 border-zinc-700';
    const textClass = isLight ? 'text-zinc-900' : 'text-white';

    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {isLight ? 'Light Mode Logo' : 'Dark Mode Logo'}
        </Label>
        <div 
          className={cn(
            "relative border-2 border-dashed rounded-lg p-4 transition-colors min-h-[120px] flex items-center justify-center",
            bgClass,
            !url && "hover:border-primary/50 cursor-pointer"
          )}
          onClick={() => !url && !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className={cn("w-8 h-8 animate-spin", textClass)} />
              <span className={cn("text-sm", textClass)}>Uploading...</span>
            </div>
          ) : url ? (
            <div className="relative w-full flex items-center justify-center">
              <img 
                src={url} 
                alt={`${type} mode logo`} 
                className="max-h-[100px] max-w-full object-contain"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeLogo(type);
                }}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className={cn("flex flex-col items-center gap-1 text-center", textClass)}>
              <Upload className="w-8 h-8 opacity-50" />
              <span className="text-sm opacity-70">Click to upload</span>
              <span className="text-xs opacity-50">SVG or PNG · Horizontal/wordmark preferred</span>
              <span className="text-xs opacity-40 mt-1">
                {isLight ? 'Use a dark/black logo' : 'Use a white/light logo'}
              </span>
              <span className="text-xs opacity-30 mt-0.5">
                PNGs are auto-trimmed to remove excess padding
              </span>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".svg,.png,image/svg+xml,image/png"
          className="hidden"
          onChange={(e) => handleFileChange(e, type)}
        />
      </div>
    );
  };

  const IconUploadCard = ({ 
    type, 
    url, 
    uploading, 
    inputRef 
  }: { 
    type: 'light' | 'dark'; 
    url: string; 
    uploading: boolean;
    inputRef: React.RefObject<HTMLInputElement>;
  }) => {
    const isLight = type === 'light';
    const Icon = isLight ? Sun : Moon;
    const bgClass = isLight ? 'bg-white border-border' : 'bg-zinc-900 border-zinc-700';
    const textClass = isLight ? 'text-zinc-900' : 'text-white';

    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {isLight ? 'Light Mode Icon' : 'Dark Mode Icon'}
        </Label>
        <div 
          className={cn(
            "relative border-2 border-dashed rounded-lg p-4 transition-colors min-h-[100px] flex items-center justify-center",
            bgClass,
            !url && "hover:border-primary/50 cursor-pointer"
          )}
          onClick={() => !url && !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className={cn("w-6 h-6 animate-spin", textClass)} />
              <span className={cn("text-xs", textClass)}>Uploading...</span>
            </div>
          ) : url ? (
            <div className="relative w-full flex items-center justify-center">
              <img 
                src={url} 
                alt={`${type} mode icon`} 
                className="max-h-[60px] max-w-full object-contain"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeIcon(type);
                }}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className={cn("flex flex-col items-center gap-1 text-center", textClass)}>
              <Upload className="w-6 h-6 opacity-50" />
              <span className="text-xs opacity-70">Click to upload</span>
              <span className="text-xs opacity-50">SVG or PNG</span>
              <span className="text-xs opacity-40">
                {isLight ? 'Dark/black icon' : 'White/light icon'}
              </span>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".svg,.png,image/svg+xml,image/png"
          className="hidden"
          onChange={(e) => handleIconFileChange(e, type)}
        />
      </div>
    );
  };


  const bothLogosUploaded = formData.logo_light_url && formData.logo_dark_url;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Building2 className="w-5 h-5" />
            Business Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your business details. These settings are used throughout the application.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2">

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="w-4 h-4" />
                Business Identity
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name (DBA)</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    placeholder="Your Business Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Legal Name</Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => handleChange('legal_name', e.target.value)}
                    placeholder="Your Legal Entity Name LLC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN</Label>
                  <Input
                    id="ein"
                    value={formData.ein}
                    onChange={(e) => handleChange('ein', e.target.value)}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
                  <Input
                    id="default_tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.default_tax_rate}
                    onChange={(e) => handleChange('default_tax_rate', e.target.value)}
                    placeholder="8.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Applied to all locations unless overridden
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Logos */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Upload className="w-4 h-4" />
                Brand Logos
              </div>

              {!bothLogosUploaded && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Both light and dark mode logos are required for the dashboard to display correctly across themes.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LogoUploadCard
                  type="light"
                  url={formData.logo_light_url}
                  uploading={uploadingLight}
                  inputRef={lightLogoInputRef}
                />
                <LogoUploadCard
                  type="dark"
                  url={formData.logo_dark_url}
                  uploading={uploadingDark}
                  inputRef={darkLogoInputRef}
                />
              </div>
            </div>


            {/* Secondary Icons */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="w-4 h-4" />
                Secondary Icons
              </div>
              
              <p className="text-xs text-muted-foreground">
                Optional icons for use in program assets, invoices, email signatures, and other branded materials.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <IconUploadCard
                  type="light"
                  url={formData.icon_light_url}
                  uploading={uploadingLightIcon}
                  inputRef={lightIconInputRef}
                />
                <IconUploadCard
                  type="dark"
                  url={formData.icon_dark_url}
                  uploading={uploadingDarkIcon}
                  inputRef={darkIconInputRef}
                />
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="w-4 h-4" />
                Mailing Address
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mailing_address">Street Address</Label>
                <Textarea
                  id="mailing_address"
                  value={formData.mailing_address}
                  onChange={(e) => handleChange('mailing_address', e.target.value)}
                  placeholder="123 Main Street, Suite 100"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Phoenix"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="AZ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => handleChange('zip', e.target.value)}
                    placeholder="85001"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="w-4 h-4" />
                Contact Information
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    type="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="hello@example.com"
                    type="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.example.com"
                  type="url"
                />
              </div>
            </div>

          </form>
        )}
        </div>

        {/* Sticky footer */}
        <div
          className={cn(
            'sticky bottom-0 z-10 flex justify-end gap-3 border-t border-border bg-background/80 backdrop-blur-xl px-6 py-4 transition-all duration-200',
            isDirty ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
          )}
        >
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={updateSettings.isPending}
            onClick={() => {
              const form = document.querySelector('[role="dialog"] form') as HTMLFormElement | null;
              form?.requestSubmit();
            }}
          >
            {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}