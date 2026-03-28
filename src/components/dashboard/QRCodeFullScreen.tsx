import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogoWhite from '@/assets/brand-logo-secondary-white.svg';

interface QRCodeFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export function QRCodeFullScreen({ isOpen, onClose, url }: QRCodeFullScreenProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const displayUrl = url.replace('https://', '').replace('http://', '');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={onClose}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-6 text-white/70 hover:text-white hover:bg-white/10 z-10"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Content container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col items-center gap-8 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Branding */}
            <div className="text-center space-y-2">
              <img 
                src={BrandLogoWhite} 
                alt="Staff Portal" 
                className="h-8 mx-auto"
              />
              <p className="text-[hsl(40,30%,70%)] text-sm tracking-[0.3em] font-display uppercase font-medium">
                Staff Portal
              </p>
            </div>

            {/* QR Code */}
            <div className="p-6 bg-white rounded-2xl shadow-2xl">
              <QRCodeCanvas 
                value={url} 
                size={300} 
                level="H" 
                marginSize={1} 
                fgColor="#141414"
              />
            </div>

            {/* Instructions */}
            <div className="text-center space-y-3">
              <p className="text-white text-xl font-medium">
                Scan to create your staff account
              </p>
              <p className="text-white/50 text-sm">
                Or visit: <span className="text-white/70">{displayUrl}</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
