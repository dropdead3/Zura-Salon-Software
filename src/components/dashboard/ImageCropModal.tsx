import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { TogglePill } from '@/components/ui/toggle-pill';
import { ZoomIn, ZoomOut, RotateCw, Move, Crop, Info, AlertTriangle, Maximize2, RefreshCw, Circle, Square, ArrowLeft, ArrowRight, Eye, Save } from 'lucide-react';
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
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number;
  maxOutputSize?: number;
  cardPreviewProps?: CardPreviewProps;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  open,
  onClose,
  imageFile,
  imageUrl,
  onCropComplete,
  aspectRatio,
  maxOutputSize = 400,
  cardPreviewProps,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropShape, setCropShape] = useState<'circle' | 'square'>('circle');
  const [localFile, setLocalFile] = useState<File | null>(null);

  // Wizard state
  const isWizard = !!cardPreviewProps;
  const [step, setStep] = useState<'crop' | 'preview'>('crop');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Determine the effective file (prop or locally replaced)
  const effectiveFile = localFile || imageFile;

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setLocalFile(null);
      setStep('crop');
      setPreviewBlob(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
    }
  }, [open]);

  // Cleanup preview URL when going back to crop
  useEffect(() => {
    if (step === 'crop' && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
      setPreviewBlob(null);
    }
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Load image from file or URL
  useEffect(() => {
    const src = effectiveFile ? URL.createObjectURL(effectiveFile) : imageUrl || '';
    if (!src) return;

    setImageSrc(src);

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);

      const canvasSize = 280;
      const cropSize = canvasSize * 0.75;
      const longSide = Math.max(img.width, img.height);
      const fitZoom = canvasSize / longSide;
      const calculatedMinZoom = Math.max(0.01, fitZoom * 0.5);
      setMinZoom(calculatedMinZoom);

      const shortSide = Math.min(img.width, img.height);
      const initialZoom = Math.max(calculatedMinZoom, cropSize / shortSide);

      setZoom(Math.min(3, initialZoom));
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    };
    img.src = src;

    return () => {
      if (effectiveFile) URL.revokeObjectURL(src);
    };
  }, [effectiveFile, imageUrl]);

  // Handle replace photo file selection
  const handleReplacePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalFile(file);
    }
    e.target.value = '';
  };

  // Draw preview on canvas
  useEffect(() => {
    if (!canvasRef.current || !imageElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 280;
    canvas.width = size;
    canvas.height = size;

    const cropSize = size * 0.75;
    const cropX = (size - cropSize) / 2;
    const cropY = (size - cropSize) / 2;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, size, size);

    const drawImage = () => {
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      const imgWidth = imageElement.width * zoom;
      const imgHeight = imageElement.height * zoom;
      ctx.drawImage(
        imageElement,
        -imgWidth / 2 + position.x,
        -imgHeight / 2 + position.y,
        imgWidth,
        imgHeight
      );
      ctx.restore();
    };

    drawImage();
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    if (cropShape === 'circle') {
      ctx.arc(size / 2, size / 2, cropSize / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(cropX, cropY, cropSize, cropSize);
    }
    ctx.clip();
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, size, size);
    
    drawImage();
    ctx.restore();

    ctx.strokeStyle = 'hsl(32, 30%, 20%)';
    ctx.lineWidth = 2;
    
    if (cropShape === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, cropSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(cropX, cropY, cropSize, cropSize);
    }

  }, [imageElement, zoom, rotation, position, cropShape]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Generate cropped blob (reused for both direct apply and wizard next)
  const generateCroppedBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!imageElement) { resolve(null); return; }

      const outputCanvas = document.createElement('canvas');
      const outputSize = maxOutputSize;
      outputCanvas.width = outputSize;
      outputCanvas.height = outputSize;
      
      const ctx = outputCanvas.getContext('2d');
      if (!ctx) { resolve(null); return; }

      const previewSize = 280;
      const cropSize = previewSize * 0.75;

      const scaleFactor = outputSize / cropSize;

      ctx.save();
      
      if (cropShape === 'circle') {
        ctx.beginPath();
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        ctx.clip();
      }

      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      const scale = zoom * scaleFactor;
      const imgWidth = imageElement.width * scale;
      const imgHeight = imageElement.height * scale;

      ctx.drawImage(
        imageElement,
        -imgWidth / 2 + position.x * scaleFactor,
        -imgHeight / 2 + position.y * scaleFactor,
        imgWidth,
        imgHeight
      );

      ctx.restore();

      outputCanvas.toBlob(
        (blob) => resolve(blob),
        'image/webp',
        0.82
      );
    });
  }, [imageElement, zoom, rotation, position, cropShape, maxOutputSize]);

  // Direct apply (non-wizard mode)
  const handleCropComplete = useCallback(async () => {
    const blob = await generateCroppedBlob();
    if (blob) {
      onCropComplete(blob);
      onClose();
    }
  }, [generateCroppedBlob, onCropComplete, onClose]);

  // Wizard: go to preview step
  const handleNextToPreview = useCallback(async () => {
    const blob = await generateCroppedBlob();
    if (blob) {
      setPreviewBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setStep('preview');
    }
  }, [generateCroppedBlob]);

  // Wizard: final save from preview step
  const handleSaveFromPreview = useCallback(() => {
    if (previewBlob) {
      onCropComplete(previewBlob);
      onClose();
    }
  }, [previewBlob, onCropComplete, onClose]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, minZoom));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const handleFitToView = () => {
    if (!imageElement) return;
    const canvasSize = 280;
    const longSide = Math.max(imageElement.width, imageElement.height);
    const fitZoom = canvasSize / longSide;
    setZoom(Math.max(minZoom, Math.min(3, fitZoom)));
    setPosition({ x: 0, y: 0 });
  };

  const shapeOptions = [
    { value: 'circle', label: 'Circle', icon: <Circle className="h-3.5 w-3.5" /> },
    { value: 'square', label: 'Square', icon: <Square className="h-3.5 w-3.5" /> },
  ];

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
              {step === 'crop' ? (
                <Crop className="h-4 w-4 text-primary" />
              ) : (
                <Eye className="h-4 w-4 text-primary" />
              )}
            </div>
            {step === 'crop' ? 'Crop & Resize' : 'Card Preview'}
          </DialogTitle>
          {/* Step indicator for wizard mode */}
          {isWizard && (
            <div className="flex items-center gap-2 mt-3">
              <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'crop' ? 'bg-primary' : 'bg-primary/30'}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'preview' ? 'bg-primary' : 'bg-border'}`} />
            </div>
          )}
        </div>

        {step === 'crop' ? (
          <>
            {/* Instructions Banner */}
            <div className="px-5 pt-4">
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="font-medium text-foreground">Image guidelines</p>
                    <p>Professional headshot · at least 200×200px · well-lit</p>
                    <p>Output: {maxOutputSize}×{maxOutputSize}px</p>
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

            {/* Cinematic Canvas Area */}
            <div className="bg-black/90 mx-5 mt-4 rounded-xl overflow-hidden relative shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]">
              <div 
                ref={containerRef}
                className="flex justify-center py-4"
              >
                <canvas
                  ref={canvasRef}
                  className={`rounded-lg ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] text-white/50 flex items-center gap-1">
                <Move className="h-2.5 w-2.5" />
                Drag to reposition
              </div>
            </div>

            {/* Controls Section */}
            <div className="mx-5 mt-3 mb-1 rounded-xl bg-muted/30 border border-border/30 p-4 space-y-4">
              {/* Shape toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Shape</Label>
                <TogglePill
                  options={shapeOptions}
                  value={cropShape}
                  onChange={(v) => setCropShape(v as 'circle' | 'square')}
                  size="sm"
                  variant="solid"
                />
              </div>

              {/* Zoom control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Zoom</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFitToView}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <Maximize2 className="h-2.5 w-2.5" />
                      Fit
                    </button>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(zoom * 100)}%</span>
                  </div>
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

              {/* Rotation control */}
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

            {/* Footer - Crop Step */}
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
                <Button type="button" size="sm" onClick={handleCropComplete}>
                  Apply Crop
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
                onClick={() => setStep('crop')}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Crop
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
