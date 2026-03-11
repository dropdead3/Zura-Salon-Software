import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Camera, X, Loader2, ScanLine } from 'lucide-react';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(true);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    setError(null);

    // Check BarcodeDetector support
    if (!('BarcodeDetector' in window)) {
      setSupported(false);
      setError('Barcode scanning is not supported in this browser. Please use Chrome or Edge, or enter the barcode manually.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      // @ts-ignore - BarcodeDetector exists in supported browsers
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });

      const detect = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            stopCamera();
            onScan(code);
            onOpenChange(false);
            return;
          }
        } catch {
          // detection frame error, continue
        }
        animFrameRef.current = requestAnimationFrame(detect);
      };
      animFrameRef.current = requestAnimationFrame(detect);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions and try again.');
      } else {
        setError('Could not access camera. Please enter the barcode manually.');
      }
    }
  }, [onScan, onOpenChange, stopCamera]);

  useEffect(() => {
    if (open) startScanning();
    return () => stopCamera();
  }, [open, startScanning, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopCamera(); onOpenChange(v); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="font-display tracking-wide text-sm">Scan Barcode</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4">
          {error ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <ScanLine className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-[260px]">{error}</p>
              {supported && (
                <Button size={tokens.button.card} variant="outline" onClick={startScanning}>
                  Try Again
                </Button>
              )}
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {scanning && (
                <>
                  {/* Scanning overlay guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[70%] h-20 border-2 border-primary/60 rounded-lg relative">
                      <div className="absolute inset-x-0 top-1/2 h-px bg-primary/80 animate-pulse" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 inset-x-0 text-center">
                    <span className="text-xs text-white/80 bg-black/50 px-3 py-1 rounded-full">
                      Point camera at barcode
                    </span>
                  </div>
                </>
              )}
              {!scanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white/60" />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
