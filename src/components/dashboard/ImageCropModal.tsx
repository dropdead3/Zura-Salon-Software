import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, Move, Crop, Info, AlertTriangle, Maximize2, RefreshCw } from 'lucide-react';

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  imageFile: File | null;
  imageUrl?: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number;
  maxOutputSize?: number;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  open,
  onClose,
  imageFile,
  imageUrl,
  onCropComplete,
  aspectRatio,
  maxOutputSize = 400,
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

  // Determine the effective file (prop or locally replaced)
  const effectiveFile = localFile || imageFile;

  // Reset local file when modal closes
  useEffect(() => {
    if (!open) {
      setLocalFile(null);
    }
  }, [open]);

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

  const handleCropComplete = useCallback(() => {
    if (!imageElement) return;

    const outputCanvas = document.createElement('canvas');
    const outputSize = maxOutputSize;
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    const previewSize = 280;
    const cropSize = previewSize * 0.75;
    const cropOffset = (previewSize - cropSize) / 2;

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
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          onClose();
        }
      },
      'image/jpeg',
      0.9
    );
  }, [imageElement, zoom, rotation, position, cropShape, maxOutputSize, onCropComplete, onClose]);

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

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5" />
            Crop & Resize Signature Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions Banner */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-foreground space-y-1">
                <p className="font-medium">Recommended image guidelines:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5 ml-1">
                  <li>Professional headshot or signature graphic</li>
                  <li>High-quality image (at least 200×200px)</li>
                  <li>Well-lit with clear facial features</li>
                  <li>Output will be {maxOutputSize}×{maxOutputSize}px</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Warning for small images */}
          {imageElement && (imageElement.width < 200 || imageElement.height < 200) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Image is small ({imageElement.width}×{imageElement.height}px). For best quality, use an image at least 200×200px.
              </p>
            </div>
          )}

          {/* Warning for large file size */}
          {effectiveFile && effectiveFile.size > 5 * 1024 * 1024 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Large file ({(effectiveFile.size / (1024 * 1024)).toFixed(1)}MB). For better performance, consider using an image under 5MB.
              </p>
            </div>
          )}

          {/* Canvas preview */}
          <div 
            ref={containerRef}
            className="relative flex justify-center"
          >
            <canvas
              ref={canvasRef}
              className={`rounded-lg border border-border ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground flex items-center gap-1">
              <Move className="h-3 w-3" />
              Drag to reposition
            </div>
          </div>

          {/* Shape toggle */}
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant={cropShape === 'circle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCropShape('circle')}
            >
              Circle
            </Button>
            <Button
              type="button"
              variant={cropShape === 'square' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCropShape('square')}
            >
              Square
            </Button>
          </div>

          {/* Zoom control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Zoom</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFitToView}
                  className="h-6 text-xs gap-1 px-2"
                >
                  <Maximize2 className="h-3 w-3" />
                  Fit to View
                </Button>
                <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Slider
                value={[zoom]}
                min={minZoom}
                max={3}
                step={0.01}
                onValueChange={([v]) => setZoom(v)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Rotation control */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">Rotation</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRotate}
              className="gap-1"
            >
              <RotateCw className="h-4 w-4" />
              {rotation}°
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {/* Hidden file input for replace */}
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
            className="mr-auto gap-1"
            onClick={() => replaceInputRef.current?.click()}
          >
            <RefreshCw className="h-4 w-4" />
            Replace Photo
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCropComplete}>
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
