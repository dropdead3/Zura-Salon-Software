import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, Image as ImageIcon, Info, AlertTriangle, RefreshCw, ArrowLeft, ArrowRight, Eye, Save, Crosshair, User } from 'lucide-react';
import { DRILLDOWN_OVERLAY_CLASS } from '@/components/dashboard/drilldownDialogStyles';
import { StylistFlipCard } from '@/components/home/StylistFlipCard';
import type { Location } from '@/data/stylists';

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
  /** Called with the resized blob and both focal point pairs (0-100) */
  onCropComplete: (blob: Blob, focalX: number, focalY: number, cardFocalX: number, cardFocalY: number) => void;
  aspectRatio?: number;
  maxOutputSize?: number;
  cardPreviewProps?: CardPreviewProps;
  /** Initial avatar focal point from the database */
  initialFocalX?: number;
  initialFocalY?: number;
  /** Initial card focal point from the database */
  initialCardFocalX?: number;
  initialCardFocalY?: number;
}

const MAX_RESIZE = 1200;

type WizardStep = 'avatar' | 'card' | 'review';

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  open,
  onClose,
  imageFile,
  imageUrl,
  onCropComplete,
  cardPreviewProps,
  initialFocalX = 50,
  initialFocalY = 50,
  initialCardFocalX = 50,
  initialCardFocalY = 50,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [cardZoom, setCardZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.5);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [cardRotation, setCardRotation] = useState(0);
  // Avatar focal point
  const [focalX, setFocalX] = useState(initialFocalX);
  const [focalY, setFocalY] = useState(initialFocalY);
  // Card focal point
  const [cardFocalX, setCardFocalX] = useState(initialCardFocalX);
  const [cardFocalY, setCardFocalY] = useState(initialCardFocalY);
  const [isDragging, setIsDragging] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);

  // Wizard state
  const isWizard = !!cardPreviewProps;
  const [step, setStep] = useState<WizardStep>('avatar');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const effectiveFile = localFile || imageFile;

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setLocalFile(null);
      setStep('avatar');
      setPreviewBlob(null);
      setFocalX(initialFocalX);
      setFocalY(initialFocalY);
      setCardFocalX(initialCardFocalX);
      setCardFocalY(initialCardFocalY);
      setAvatarZoom(1);
      setCardZoom(1);
      setAvatarRotation(0);
      setCardRotation(0);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
    }
  }, [open]);

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
      const calculatedMinZoom = Math.max(0.1, 0.5);
      setMinZoom(calculatedMinZoom);
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
      setCardFocalX(50);
      setCardFocalY(50);
    }
    e.target.value = '';
  };

  // Current focal point getters/setters based on step
  const currentFocalX = step === 'card' ? cardFocalX : focalX;
  const currentFocalY = step === 'card' ? cardFocalY : focalY;
  const setCurrentFocalX = step === 'card' ? setCardFocalX : setFocalX;
  const setCurrentFocalY = step === 'card' ? setCardFocalY : setFocalY;
  const currentZoom = step === 'card' ? cardZoom : avatarZoom;
  const setCurrentZoom = step === 'card' ? setCardZoom : setAvatarZoom;
  const currentRotation = step === 'card' ? cardRotation : avatarRotation;
  const setCurrentRotation = step === 'card' ? setCardRotation : setAvatarRotation;

  // Handle focal point click/drag on the compose frame
  const handleFrameInteraction = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    if (step === 'card') {
      setCardFocalX(Math.round(x));
      setCardFocalY(Math.round(y));
    } else {
      setFocalX(Math.round(x));
      setFocalY(Math.round(y));
    }
  }, [step]);

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

      const isRotated90 = avatarRotation % 180 !== 0;
      const srcW = isRotated90 ? imageElement.height : imageElement.width;
      const srcH = isRotated90 ? imageElement.width : imageElement.height;

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

      ctx.save();
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((avatarRotation * Math.PI) / 180);

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
  }, [imageElement, avatarRotation]);

  // Non-wizard: direct save from avatar step
  const handleApply = useCallback(async () => {
    const blob = await generateResizedBlob();
    if (blob) {
      onCropComplete(blob, focalX, focalY, focalX, focalY);
      onClose();
    }
  }, [generateResizedBlob, onCropComplete, onClose, focalX, focalY]);

  // Wizard: go to review step and generate blob
  const handleGoToReview = useCallback(async () => {
    const blob = await generateResizedBlob();
    if (blob) {
      setPreviewBlob(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setStep('review');
    }
  }, [generateResizedBlob, previewUrl]);

  // Wizard: final save from review step
  const handleSaveFromReview = useCallback(() => {
    if (previewBlob) {
      onCropComplete(previewBlob, focalX, focalY, cardFocalX, cardFocalY);
      onClose();
    }
  }, [previewBlob, onCropComplete, onClose, focalX, focalY, cardFocalX, cardFocalY]);

  const handleZoomIn = () => setCurrentZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setCurrentZoom(prev => Math.max(prev / 1.2, minZoom));
  const handleRotate = () => setCurrentRotation(prev => (prev + 90) % 360);

  const handleResetFocal = () => {
    setCurrentFocalX(50);
    setCurrentFocalY(50);
  };

  const stepIndex = step === 'avatar' ? 0 : step === 'card' ? 1 : 2;
  const totalSteps = isWizard ? 3 : 1;

  const stepTitle = step === 'avatar' ? 'Profile Avatar' : step === 'card' ? 'Website Card' : 'Final Review';
  const stepIcon = step === 'review' ? <Eye className="h-4 w-4 text-primary" /> : <ImageIcon className="h-4 w-4 text-primary" />;

  // Compose frame (avatar = circle, card = 3:4 rect)
  const renderComposeFrame = () => {
    const isCircle = step === 'avatar';
    const frameSize = isCircle
      ? { width: 200, height: 200 }
      : { width: 210, height: 280 };

    return (
      <div className="bg-black/90 mx-5 mt-4 rounded-xl overflow-hidden relative shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]">
        <div className="flex justify-center py-4">
          <div
            ref={frameRef}
            className={`relative overflow-hidden cursor-crosshair ${isCircle ? 'rounded-full' : 'rounded-lg'}`}
            style={frameSize}
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
                  objectPosition: `${currentFocalX}% ${currentFocalY}%`,
                  transform: `scale(${currentZoom}) rotate(${currentRotation}deg)`,
                  transformOrigin: `${currentFocalX}% ${currentFocalY}%`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease',
                }}
                draggable={false}
              />
            )}
            {/* Focal point indicator */}
            <div
              className="absolute w-6 h-6 pointer-events-none"
              style={{
                left: `${currentFocalX}%`,
                top: `${currentFocalY}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Crosshair className="w-6 h-6 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
            </div>
            {/* Border overlay */}
            <div className={`absolute inset-0 border-2 border-white/20 pointer-events-none ${isCircle ? 'rounded-full' : 'rounded-lg'}`} />
          </div>
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] text-white/50 flex items-center gap-1">
          <Crosshair className="h-2.5 w-2.5" />
          Click to set focal point
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div className="mx-5 mt-3 mb-1 rounded-xl bg-muted/30 border border-border/40 p-4 space-y-4">
      {/* Focal point display + reset */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Focal Point</Label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground tabular-nums">{currentFocalX}%, {currentFocalY}%</span>
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
          <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(currentZoom * 100)}%</span>
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
            value={[currentZoom]}
            min={minZoom}
            max={3}
            step={0.01}
            onValueChange={([v]) => setCurrentZoom(v)}
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
          {currentRotation}°
        </button>
      </div>
    </div>
  );

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
              {stepIcon}
            </div>
            {stepTitle}
          </DialogTitle>
          {isWizard && (
            <div className="flex items-center gap-2 mt-3">
              <div className={`h-1 flex-1 rounded-full transition-colors ${stepIndex >= 0 ? 'bg-primary' : 'bg-border'}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${stepIndex >= 1 ? 'bg-primary' : 'bg-border'}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${stepIndex >= 2 ? 'bg-primary' : 'bg-border'}`} />
            </div>
          )}
        </div>

        {/* Step: Avatar or Card compose */}
        {(step === 'avatar' || step === 'card') && (
          <>
            {/* Instructions */}
            <div className="px-5 pt-4">
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="font-medium text-foreground">
                      {step === 'avatar' ? 'Avatar composition' : 'Website card composition'}
                    </p>
                    <p>
                      {step === 'avatar'
                        ? 'Set the focal point for your circular avatar used across the platform (sidebar, team directory, chat).'
                        : 'Set the focal point for your 3:4 website card. This may need different positioning than the circle avatar.'}
                    </p>
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

            {renderComposeFrame()}
            {renderControls()}

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border/40 flex items-center gap-2">
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReplacePhoto}
              />
              {step === 'avatar' ? (
                <>
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
                    <Button type="button" size="sm" onClick={() => setStep('card')} className="gap-1.5">
                      Next
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button type="button" size="sm" onClick={handleApply}>
                      Save Photo
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mr-auto gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setStep('avatar')}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>
                  <Button type="button" size="sm" onClick={handleGoToReview} className="gap-1.5">
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <>
            <div className="px-5 pt-4">
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Eye className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Final review</p>
                    <p>Review how your photo will appear as both your avatar and on the website card.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-side preview */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex gap-6 justify-center items-start">
                {/* Avatar preview */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-display tracking-wide uppercase">Avatar</span>
                  <div className="w-[120px] h-[120px] rounded-full overflow-hidden bg-muted border-2 border-border/40">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${focalX}% ${focalY}%` }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card preview */}
                {cardPreviewProps && (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-display tracking-wide uppercase">Card</span>
                    <div className="transform scale-[0.55] origin-top w-64">
                      <StylistFlipCard
                        stylist={{
                          id: 'preview',
                          name: cardPreviewProps.name || 'Your Name',
                          displayName: cardPreviewProps.displayName || undefined,
                          level: cardPreviewProps.level || 'LEVEL 1 STYLIST',
                          imageUrl: previewUrl || '',
                          instagram: cardPreviewProps.instagram || '',
                          tiktok: cardPreviewProps.tiktok || undefined,
                          preferred_social_handle: cardPreviewProps.preferredSocialHandle,
                          specialties: cardPreviewProps.specialties,
                          highlighted_services: cardPreviewProps.highlightedServices,
                          bio: cardPreviewProps.bio || undefined,
                          isBooking: cardPreviewProps.isBooking,
                          locations: (cardPreviewProps.locations || []).map(l => l.id as Location),
                        }}
                        index={0}
                        selectedLocation="all"
                        isPreview
                        photoFocalX={cardFocalX}
                        photoFocalY={cardFocalY}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Review Step */}
            <div className="px-5 py-4 border-t border-border/40 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mr-auto gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl('');
                  setPreviewBlob(null);
                  setStep('card');
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button type="button" size="sm" onClick={handleSaveFromReview} className="gap-1.5">
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
