import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { cn } from '@/lib/utils';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTerminalLocations } from '@/hooks/useStripeTerminals';
import {
  useTerminalSplashScreen,
  useUploadSplashScreen,
  useRemoveSplashScreen,
} from '@/hooks/useTerminalSplashScreen';
import { useLocations } from '@/hooks/useLocations';
import { useColorTheme } from '@/hooks/useColorTheme';
import { getTerminalPalette } from '@/lib/terminal-splash-palettes';

const TARGET_W = 1080;
const TARGET_H = 1920;
const MAX_FILE_SIZE_JPG_PNG = 2 * 1024 * 1024;
const MAX_FILE_SIZE_GIF = 4 * 1024 * 1024;

interface SplashScreenUploaderProps {
  businessName: string;
  orgLogoUrl?: string | null;
}

export function SplashScreenUploader({ businessName, orgLogoUrl }: SplashScreenUploaderProps) {
  const { data: locations = [] } = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // Get terminal locations for the selected Zura location
  const { data: terminalLocations = [] } = useTerminalLocations(selectedLocationId || null);
  const firstTerminalLocation = terminalLocations[0];
  const terminalLocationId = firstTerminalLocation?.id;

  // Splash screen state
  const { data: splashStatus, isLoading: loadingSplash } = useTerminalSplashScreen(
    selectedLocationId || null,
    terminalLocationId
  );
  const uploadMutation = useUploadSplashScreen();
  const removeMutation = useRemoveSplashScreen();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ base64: string; mime: 'image/jpeg' | 'image/png' | 'image/gif' } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [generatingFromLogo, setGeneratingFromLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return;
    }
    // Validate size
    const maxSize = file.type === 'image/gif' ? MAX_FILE_SIZE_GIF : MAX_FILE_SIZE_JPG_PNG;
    if (file.size > maxSize) {
      return;
    }

    // Resize/crop to 1080x1920 using canvas
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Cover-fit: scale to fill, then center-crop
      const scale = Math.max(TARGET_W / img.width, TARGET_H / img.height);
      const sw = TARGET_W / scale;
      const sh = TARGET_H / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);

      const mimeOut = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeOut as string, 0.9);
      const base64 = dataUrl.split(',')[1];

      setPreviewUrl(dataUrl);
      setPendingFile({ base64, mime: mimeOut as 'image/jpeg' | 'image/png' });
    };
    img.src = url;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handleUpload = () => {
    if (!pendingFile || !selectedLocationId || !terminalLocationId) return;
    uploadMutation.mutate({
      locationId: selectedLocationId,
      terminalLocationId,
      imageBase64: pendingFile.base64,
      imageMimeType: pendingFile.mime,
    }, {
      onSuccess: () => {
        setPreviewUrl(null);
        setPendingFile(null);
      },
    });
  };

  const handleRemove = () => {
    if (!selectedLocationId || !terminalLocationId) return;
    removeMutation.mutate({ locationId: selectedLocationId, terminalLocationId });
  };

  const handleGenerateFromLogo = useCallback(async () => {
    if (!orgLogoUrl) return;
    setGeneratingFromLogo(true);

    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load logo'));
        img.src = orgLogoUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext('2d')!;

      // Dark gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, TARGET_H);
      grad.addColorStop(0, '#0f0f0f');
      grad.addColorStop(0.5, '#1a1a2e');
      grad.addColorStop(1, '#0f0f0f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, TARGET_W, TARGET_H);

      // Center logo — fit within 600x600
      const maxLogo = 500;
      const logoScale = Math.min(maxLogo / img.width, maxLogo / img.height);
      const lw = img.width * logoScale;
      const lh = img.height * logoScale;
      const lx = (TARGET_W - lw) / 2;
      const ly = (TARGET_H - lh) / 2 - 80;
      ctx.drawImage(img, lx, ly, lw, lh);

      // Business name below
      ctx.fillStyle = '#ffffff';
      ctx.font = '500 48px "Termina", sans-serif';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '4px';
      ctx.fillText(businessName.toUpperCase(), TARGET_W / 2, ly + lh + 80);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const base64 = dataUrl.split(',')[1];
      setPreviewUrl(dataUrl);
      setPendingFile({ base64, mime: 'image/jpeg' });
    } catch (err) {
      console.error('Failed to generate splash from logo:', err);
    } finally {
      setGeneratingFromLogo(false);
    }
  }, [orgLogoUrl, businessName]);

  const isUploading = uploadMutation.isPending;
  const isRemoving = removeMutation.isPending;
  const hasTerminalLocation = !!terminalLocationId;
  const hasSplash = splashStatus?.splash_screen_active === true;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <ImageIcon className={tokens.card.icon} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>SPLASH SCREEN</CardTitle>
                <MetricInfoTooltip description="Upload a branded idle screen (1080×1920) for your S710/S700 readers. The image displays when the reader is not in an active checkout. Changes propagate within ~10 minutes." />
              </div>
              <CardDescription>Customize the idle screen on your physical readers.</CardDescription>
            </div>
          </div>
          {hasSplash && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              ACTIVE
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location selector */}
        <div>
          <label className={cn(tokens.label.default, 'mb-1.5 block')}>Location</label>
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedLocationId && !hasTerminalLocation && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/30 border">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>No terminal location mapped for this location. Create one in the Fleet tab first.</span>
          </div>
        )}

        {hasTerminalLocation && (
          <>
            {/* Status */}
            {loadingSplash ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className={tokens.loading.spinner} />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Dropzone / Preview */}
                <div
                  className={cn(
                    'relative w-[180px] h-[320px] rounded-xl border-2 border-dashed transition-colors shrink-0 overflow-hidden cursor-pointer',
                    dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                    (previewUrl || hasSplash) && 'border-solid'
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Splash preview" className="w-full h-full object-cover" />
                  ) : hasSplash ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/20">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <span className="text-[10px] text-muted-foreground text-center px-2">Custom splash screen active on reader</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground text-center">
                        Drop image here or click to upload
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">
                        1080×1920 · JPG/PNG &lt; 2MB
                      </span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>

                {/* Actions */}
                <div className="flex-1 space-y-3">
                  {pendingFile && (
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className={tokens.button.card}
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload to Reader
                    </Button>
                  )}

                  {pendingFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setPreviewUrl(null); setPendingFile(null); }}
                      className="text-xs"
                    >
                      Clear
                    </Button>
                  )}

                  {orgLogoUrl && !pendingFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateFromLogo}
                      disabled={generatingFromLogo}
                      className="text-xs"
                    >
                      {generatingFromLogo ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Generate from Logo
                    </Button>
                  )}

                  {hasSplash && !pendingFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemove}
                      disabled={isRemoving}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      {isRemoving ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Remove Splash Screen
                    </Button>
                  )}

                  <div className="pt-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground">
                      Recommended: 1080×1920px portrait JPG or PNG under 2MB.
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Readers auto-update within ~10 minutes of upload.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
