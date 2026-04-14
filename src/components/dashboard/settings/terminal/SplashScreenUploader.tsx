import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  Layers,
  Clock,
  Monitor,
} from 'lucide-react';
import {
  useUploadSplashScreen,
  useRemoveSplashScreen,
  usePushSplashToAllLocations,
  resolveAllTerminalLocations,
} from '@/hooks/useTerminalSplashScreen';
import { useTerminalSplashScreen } from '@/hooks/useTerminalSplashScreen';
import { useLocations } from '@/hooks/useLocations';
import { useColorTheme } from '@/hooks/useColorTheme';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { upsertSplashOrigin, deleteSplashOrigin } from '@/hooks/useTerminalSplashMetadata';
import { useAllLocationTerminalStatus } from '@/hooks/useAllLocationTerminalStatus';
import { toast } from 'sonner';
import { generateDefaultSplash } from '@/lib/generate-terminal-splash';

const TARGET_W = 1080;
const TARGET_H = 1920;
const MAX_FILE_SIZE_JPG_PNG = 2 * 1024 * 1024;
const MAX_FILE_SIZE_GIF = 4 * 1024 * 1024;

interface SplashScreenUploaderProps {
  businessName: string;
  orgLogoUrl?: string | null;
}

export function SplashScreenUploader({ businessName, orgLogoUrl }: SplashScreenUploaderProps) {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: locations = [] } = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  const locationIds = useMemo(() => locations.map(l => l.id), [locations]);

  // Bulk status for all locations
  const { data: allStatus = {}, isLoading: loadingAllStatus } = useAllLocationTerminalStatus(locationIds, orgId);

  const selectedStatus = selectedLocationId ? allStatus[selectedLocationId] : null;
  const terminalLocationId = selectedStatus?.terminalLocationId ?? undefined;
  const hasTerminalLocation = !!terminalLocationId;

  // Splash screen for the selected location (for preview URL)
  const { data: splashStatus, isLoading: loadingSplash } = useTerminalSplashScreen(
    selectedLocationId || null,
    terminalLocationId,
  );

  const uploadMutation = useUploadSplashScreen();
  const removeMutation = useRemoveSplashScreen();
  const pushAllMutation = usePushSplashToAllLocations();

  const isDefaultLuxury = selectedStatus?.splashOrigin === 'default_luxury';
  const hasSplash = selectedStatus?.hasSplash ?? false;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ base64: string; mime: 'image/jpeg' | 'image/png' | 'image/gif'; fromDefault?: boolean } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [generatingFromLogo, setGeneratingFromLogo] = useState(false);
  const [pushProgress, setPushProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported file type', { description: 'Only JPG, PNG, and GIF are supported.' });
      return;
    }
    const maxSize = file.type === 'image/gif' ? MAX_FILE_SIZE_GIF : MAX_FILE_SIZE_JPG_PNG;
    if (file.size > maxSize) {
      const limitMB = Math.round(maxSize / (1024 * 1024));
      toast.error('File too large', { description: `Image must be under ${limitMB}MB.` });
      return;
    }

    if (file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        setPreviewUrl(dataUrl);
        setPendingFile({ base64, mime: 'image/gif' });
      };
      reader.readAsDataURL(file);
      return;
    }

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
    const wasDefault = pendingFile.fromDefault ?? false;
    uploadMutation.mutate({
      locationId: selectedLocationId,
      terminalLocationId,
      imageBase64: pendingFile.base64,
      imageMimeType: pendingFile.mime,
    }, {
      onSuccess: async () => {
        setPreviewUrl(null);
        setPendingFile(null);
        if (orgId) {
          try {
            await upsertSplashOrigin(orgId, selectedLocationId, terminalLocationId, wasDefault ? 'default_luxury' : 'custom');
            queryClient.invalidateQueries({ queryKey: ['terminal-splash-metadata'] });
            queryClient.invalidateQueries({ queryKey: ['all-location-terminal-status'] });
          } catch { /* non-critical */ }
        }
      },
    });
  };

  const handleRemove = () => {
    if (!selectedLocationId || !terminalLocationId) return;
    removeMutation.mutate({ locationId: selectedLocationId, terminalLocationId }, {
      onSuccess: async () => {
        if (orgId) {
          try {
            await deleteSplashOrigin(orgId, selectedLocationId, terminalLocationId);
            queryClient.invalidateQueries({ queryKey: ['terminal-splash-metadata'] });
            queryClient.invalidateQueries({ queryKey: ['all-location-terminal-status'] });
          } catch { /* non-critical */ }
        }
      },
    });
  };

  const handlePushToAll = useCallback(async () => {
    if (!pendingFile) return;
    setPushProgress('Resolving locations...');
    try {
      const allLocIds = locations.map(l => l.id);
      const pairs = await resolveAllTerminalLocations(allLocIds);
      if (pairs.length === 0) {
        setPushProgress(null);
        toast.error('No terminal locations found across any location');
        return;
      }
      setPushProgress(`Pushing 0/${pairs.length}...`);
      await pushAllMutation.mutateAsync({
        pairs,
        imageBase64: pendingFile.base64,
        imageMimeType: pendingFile.mime,
        onProgress: (done, total) => setPushProgress(`Pushing ${done}/${total}...`),
      });
      setPreviewUrl(null);
      setPendingFile(null);
      queryClient.invalidateQueries({ queryKey: ['all-location-terminal-status'] });
    } catch {
      // error handled by mutation
    } finally {
      setPushProgress(null);
    }
  }, [pendingFile, locations, pushAllMutation, queryClient]);

  const { colorTheme } = useColorTheme();

  const handleGenerateFromLogo = useCallback(async () => {
    if (!orgLogoUrl) return;
    setGeneratingFromLogo(true);
    try {
      const { base64, dataUrl } = await generateDefaultSplash(orgLogoUrl, businessName, colorTheme);
      setPreviewUrl(dataUrl);
      setPendingFile({ base64, mime: 'image/jpeg', fromDefault: true });
    } catch (err) {
      console.error('Failed to generate splash from logo:', err);
      toast.error('Failed to generate splash screen', { description: 'Could not process logo image.' });
    } finally {
      setGeneratingFromLogo(false);
    }
  }, [orgLogoUrl, businessName, colorTheme]);

  const isUploading = uploadMutation.isPending;
  const isRemoving = removeMutation.isPending;

  // Count locations with active splash
  const activeCount = Object.values(allStatus).filter(s => s.hasSplash).length;
  const terminalCount = Object.values(allStatus).filter(s => !!s.terminalLocationId).length;

  const handleSelectLocation = (locId: string) => {
    if (locId === selectedLocationId) return;
    setSelectedLocationId(locId);
    setPreviewUrl(null);
    setPendingFile(null);
  };

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
          {terminalCount > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {activeCount}/{terminalCount} Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location status list */}
        {loadingAllStatus ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : (
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {locations.map((loc) => {
              const status = allStatus[loc.id];
              const hasTerminal = !!status?.terminalLocationId;
              const isSelected = selectedLocationId === loc.id;
              const splashActive = status?.hasSplash ?? false;
              const origin = status?.splashOrigin;

              return (
                <button
                  key={loc.id}
                  type="button"
                  disabled={!hasTerminal}
                  onClick={() => handleSelectLocation(loc.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors text-sm',
                    hasTerminal
                      ? isSelected
                        ? 'bg-primary/5 border-l-2 border-l-primary'
                        : 'hover:bg-muted/40 border-l-2 border-l-transparent'
                      : 'opacity-50 cursor-not-allowed border-l-2 border-l-transparent',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Monitor className={cn('w-3.5 h-3.5 shrink-0', hasTerminal ? 'text-muted-foreground' : 'text-muted-foreground/40')} />
                    <span className={cn('font-sans text-sm truncate', !hasTerminal && 'text-muted-foreground/60')}>
                      {loc.name}
                    </span>
                  </div>
                  <div className="shrink-0 ml-2">
                    {!hasTerminal ? (
                      <span className="text-[10px] text-muted-foreground/50 font-sans whitespace-nowrap">
                        No terminal registered
                      </span>
                    ) : splashActive && origin === 'default_luxury' ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3" />
                        Default Luxury
                      </span>
                    ) : splashActive && origin === 'custom' ? (
                      <span className="flex items-center gap-1 text-[10px] text-blue-500 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3" />
                        Custom Splash
                      </span>
                    ) : splashActive ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                        No Splash
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected location editor */}
        {selectedLocationId && hasTerminalLocation && (
          <>
            {loadingSplash ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className={tokens.loading.spinner} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                {/* Dropzone / Preview */}
                <div
                  className={cn(
                    'relative w-[280px] h-[498px] rounded-xl border-2 border-dashed transition-colors shrink-0 overflow-hidden cursor-pointer',
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
                    splashStatus?.splash_url ? (
                      <img
                        src={splashStatus.splash_url}
                        alt="Active splash screen"
                        className="w-full h-full object-cover"
                        onError={() => {
                          queryClient.invalidateQueries({ queryKey: ['terminal-splash-screen'] });
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/20">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        <span className="text-[10px] text-muted-foreground text-center px-2">Custom splash screen active on reader</span>
                      </div>
                    )
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

                {/* Action buttons */}
                <div className="flex flex-col items-center gap-1.5">
                  {pendingFile && (
                    <>
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
                      {locations.length >= 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePushToAll}
                          disabled={!!pushProgress}
                          className="text-xs"
                        >
                          {pushProgress ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Layers className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {pushProgress || 'Push to All Locations'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setPreviewUrl(null); setPendingFile(null); }}
                        className="text-xs"
                      >
                        Clear
                      </Button>
                    </>
                  )}

                  {orgLogoUrl && !pendingFile && (
                    hasSplash && isDefaultLuxury ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-xs opacity-60"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                        Currently using Default Luxury Splash
                      </Button>
                    ) : (
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
                        Use Default Luxury Splash
                      </Button>
                    )
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
                </div>

                {/* Help text */}
                <div className="text-center space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">
                    Recommended: 1080×1920px portrait JPG or PNG under 2MB.
                  </p>
                  <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs rounded-md px-2.5 py-1 w-fit">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Readers auto-update within ~10 minutes of upload.</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {selectedLocationId && !hasTerminalLocation && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/30 border">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>No terminal location mapped for this location. Create one in the Fleet tab first.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
