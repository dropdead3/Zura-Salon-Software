import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, Move, Image as ImageIcon, Info, AlertTriangle, Maximize2, RefreshCw, ArrowLeft, ArrowRight, Eye, Save, Crosshair } from 'lucide-react';
import { DRILLDOWN_OVERLAY_CLASS } from '@/components/dashboard/drilldownDialogStyles';
import { StylistCardPreview } from '@/components/dashboard/StylistCardPreview';

export interface CardPreviewProps {
  name: string;
  displayName?: string;
  level: string;
  instagram?: string;
  tiktok?: string;
  preferredSocialHandle?: 'instagram' | 'tiktok';
  highlightedServices: string[];
  specialties: string[];
  bio?: string;
  isBooking?: boolean;
  locations?: { id: string; name: string }[];
}

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  imageFile: File | null;
  imageUrl?: string;
  /** Called with the resized blob and focal point coordinates (0-100) */
  onCropComplete: (blob: Blob, focalX: number, focalY: number) => void;
  aspectRatio?: number;
  maxOutputSize?: number;
  cardPreviewProps?: CardPreviewProps;
  /** Initial focal point from the database */
  initialFocalX?: number;
  initialFocalY?: number;
}

const MAX_RESIZE = 1200;

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  open,
  onClose,
  imageFile,
  imageUrl,
  onCropComplete,
  cardPreviewProps,
  initialFocalX = 50,
  initialFocalY = 50,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.5);
  const [rotation, setRotation] = useState(0);
  const [focalX, setFocalX] = useState(initialFocalX);
  const [focalY, setFocalY] = useState(initialFocalY);
  const [isDragging, setIsDragging] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);

  // Wizard state
  const isWizard = !!cardPreviewProps;
  const [step, setStep] = useState<'compose' | 'preview'>('compose');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const effectiveFile = localFile || imageFile;

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setLocalFile(null);
      setStep('compose');
      setPreviewBlob(null);
      setFocalX(initialFocalX);
      setFocalY(initialFocalY);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
    }
  }, [open]);

  // Cleanup preview URL when going back
  useEffect(() => {
    if (step === 'compose' && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
      setPreviewBlob(null);
    }
  }, [step]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Load image
  useEffect(() => {
    const src = effectiveFile ? URL.createObjectURL(effectiveFile) : imageUrl || '';
    if (!src) return;

    setImageSrc(src);

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);
      // Calculate min zoom so image fills the 3:4 frame
      const calculatedMinZoom = Math.max(0.1, 0.5);
      setMinZoom(calculatedMinZoom);
      setZoom(1);
      setRotation(0);
    };
    img.src = src;

    return () => {
      if (effectiveFile) URL.revokeObjectURL(src);
    };
  }, [effectiveFile, imageUrl]);

  const handleReplacePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalFile(file);
      setFocalX(50);
      setFocalY(50);
    }
    e.target.value = '';
  };

  // Handle focal point click/drag on the compose frame
  const handleFrameInteraction = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setFocalX(Math.round(x));
    setFocalY(Math.round(y));
  }, []);

  const handleFrameMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleFrameInteraction(e);
  }, [handleFrameInteraction]);

  const handleFrameMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handleFrameInteraction(e);
  }, [isDragging, handleFrameInteraction]);

  const handleFrameMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Generate resized blob (full image, no crop)
  const generateResizedBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!imageElement) { resolve(null); return; }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }

      // Calculate rotated dimensions
      const isRotated90 = rotation % 180 !== 0;
      const srcW = isRotated90 ? imageElement.height : imageElement.width;
      const srcH = isRotated90 ? imageElement.width : imageElement.height;

      // Scale to fit within MAX_RESIZE
      let outW = srcW;
      let outH = srcH;
      const longestSide = Math.max(outW, outH);
      if (longestSide > MAX_RESIZE) {
        const scale = MAX_RESIZE / longestSide;
        outW = Math.round(outW * scale);
        outH = Math.round(outH * scale);
      }

      canvas.width = outW;
      canvas.height = outH;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Apply rotation
      ctx.save();
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      const drawW = isRotated90 ? outH : outW;
      const drawH = isRotated90 ? outW : outH;
      ctx.drawImage(imageElement, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      canvas.toBlob(
        (blob) => resolve(blob),
        'image/webp',
        0.82
      );
    });
  }, [imageElement, rotation]);

  // Direct apply (non-wizard mode)
  const handleApply = useCallback(async () => {
    const blob = await generateResizedBlob();
    if (blob) {
      onCropComplete(blob, focalX, focalY);
      onClose();
    }
  }, [generateResizedBlob, onCropComplete, onClose, focalX, focalY]);

  // Wizard: go to preview step
  const handleNextToPreview = useCallback(async () => {
    const blob = await generateResizedBlob();
    if (blob) {
      setPreviewBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setStep('preview');
    }
  }, [generateResizedBlob]);

  // Wizard: final save from preview step
  const handleSaveFromPreview = useCallback(() => {
    if (previewBlob) {
      onCropComplete(previewBlob, focalX, focalY);
      onClose();
    }
  }, [previewBlob, onCropComplete, onClose, focalX, focalY]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, minZoom));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleResetFocal = () => {
    setFocalX(50);
    setFocalY(50);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden gap-0"
        overlayClassName={DRILLDOWN_OVERLAY_CLASS}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2.5 font-display text-base tracking-wide uppercase">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              {step === 'compose' ? (
                <ImageIcon className="h-4 w-4 text-primary" />
              ) : (
                <Eye className="h-4 w-4 text-primary" />
              )}
            </div>
            {step === 'compose' ? 'Compose Photo' : 'Card Preview'}
          </DialogTitle>
          {isWizard && (
            <div className="flex items-center gap-2 mt-3">
              <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'compose' ? 'bg-primary' : 'bg-primary/30'}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'preview' ? 'bg-primary' : 'bg-border'}`} />
            </div>
          )}
        </div>

        {step === 'compose' ? (
          <>
            {/* Instructions */}
            <div className="px-5 pt-4">
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="font-medium text-foreground">Photo composition</p>
                    <p>Click or drag within the frame to set the focal point. The full image is preserved — this controls how it appears on cards.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning banners */}
            {imageElement && (imageElement.width < 200 || imageElement.height < 200) && (
              <div className="px-5 pt-2">
                <div className="bg-warning/10 border border-warning/30 rounded-xl p-2.5 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning">
                    Image is small ({imageElement.width}×{imageElement.height}px). Use at least 200×200px for best quality.
                  </p>
                </div>
              </div>
            )}

            {effectiveFile && effectiveFile.size > 5 * 1024 * 1024 && (
              <div className="px-5 pt-2">
                <div className="bg-warning/10 border border-warning/30 rounded-xl p-2.5 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning">
                    Large file ({(effectiveFile.size / (1024 * 1024)).toFixed(1)}MB). Consider using an image under 5MB.
                  </p>
                </div>
              </div>
            )}

            {/* Compose Frame — 3:4 aspect ratio card preview */}
            <div className="bg-black/90 mx-5 mt-4 rounded-xl overflow-hidden relative shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]">
              <div ref={containerRef} className="flex justify-center py-4">
                <div
                  ref={frameRef}
                  className={`relative overflow-hidden rounded-lg ${isDragging ? 'cursor-crosshair' : 'cursor-crosshair'}`}
                  style={{ width: 210, height: 280 }}
                  onMouseDown={handleFrameMouseDown}
                  onMouseMove={handleFrameMouseMove}
                  onMouseUp={handleFrameMouseUp}
                  onMouseLeave={handleFrameMouseUp}
                >
                  {imageSrc && (
                    <img
                      src={imageSrc}
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{
                        objectPosition: `${focalX}% ${focalY}%`,
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transformOrigin: `${focalX}% ${focalY}%`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease',
                      }}
                      draggable={false}
                    />
                  )}
                  {/* Focal point indicator */}
                  <div
                    className="absolute w-6 h-6 pointer-events-none"
                    style={{
                      left: `${focalX}%`,
                      top: `${focalY}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <Crosshair className="w-6 h-6 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
                  </div>
                  {/* Border overlay */}
                  <div className="absolute inset-0 rounded-lg border-2 border-white/20 pointer-events-none" />
                </div>
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] text-white/50 flex items-center gap-1">
                <Crosshair className="h-2.5 w-2.5" />
                Click to set focal point
              </div>
            </div>

            {/* Controls */}
            <div className="mx-5 mt-3 mb-1 rounded-xl bg-muted/30 border border-border/30 p-4 space-y-4">
              {/* Focal point display + reset */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Focal Point</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{focalX}%, {focalY}%</span>
                  <button
                    type="button"
                    onClick={handleResetFocal}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Crosshair className="h-2.5 w-2.5" />
                    Center
                  </button>
                </div>
              </div>

              {/* Zoom control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Zoom</Label>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-7 w-7 rounded-full border border-border/50 bg-background flex items-center justify-center hover:bg-accent transition-colors"
                    onClick={handleZoomOut}
                  >
                    <ZoomOut className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <Slider
                    value={[zoom]}
                    min={minZoom}
                    max={3}
                    step={0.01}
                    onValueChange={([v]) => setZoom(v)}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    className="h-7 w-7 rounded-full border border-border/50 bg-background flex items-center justify-center hover:bg-accent transition-colors"
                    onClick={handleZoomIn}
                  >
                    <ZoomIn className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Rotation */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Rotation</Label>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-full border border-border/50 bg-background px-3 py-1.5"
                >
                  <RotateCw className="h-3 w-3" />
                  {rotation}°
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border/30 flex items-center gap-2">
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReplacePhoto}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mr-auto gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => replaceInputRef.current?.click()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Replace
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              {isWizard ? (
                <Button type="button" size="sm" onClick={handleNextToPreview} className="gap-1.5">
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={handleApply}>
                  Save Photo
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Preview Step */}
            <div className="px-5 pt-4">
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Eye className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Website card preview</p>
                    <p>This is how your photo will appear on the website homepage stylist card.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Preview */}
            <div className="px-5 pt-4 pb-2 flex justify-center">
              {cardPreviewProps && (
                <StylistCardPreview
                  name={cardPreviewProps.name}
                  displayName={cardPreviewProps.displayName}
                  level={cardPreviewProps.level}
                  photoUrl={previewUrl}
                  photoFocalX={focalX}
                  photoFocalY={focalY}
                  instagram={cardPreviewProps.instagram}
                  tiktok={cardPreviewProps.tiktok}
                  preferredSocialHandle={cardPreviewProps.preferredSocialHandle}
                  highlightedServices={cardPreviewProps.highlightedServices}
                  specialties={cardPreviewProps.specialties}
                  bio={cardPreviewProps.bio}
                  isBooking={cardPreviewProps.isBooking}
                  locations={cardPreviewProps.locations}
                />
              )}
            </div>

            {/* Footer - Preview Step */}
            <div className="px-5 py-4 border-t border-border/30 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mr-auto gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setStep('compose')}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Compose
              </Button>
              <Button type="button" size="sm" onClick={handleSaveFromPreview} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Save Photo
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
