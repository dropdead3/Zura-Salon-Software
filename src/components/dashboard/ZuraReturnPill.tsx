import { useZuraNavigationSafe } from '@/contexts/ZuraNavigationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import { X, ArrowLeft } from 'lucide-react';

export function ZuraReturnPill() {
  const ctx = useZuraNavigationSafe();
  const navigate = useNavigate();
  const location = useLocation();

  // Only show when there's saved state AND we're not on the main dashboard
  const isVisible = ctx?.savedState && location.pathname !== '/dashboard';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card shadow-lg pl-1.5 pr-1 py-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-full hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="w-3 h-3 text-muted-foreground" />
              <ZuraAvatar size="sm" />
              <span className="text-xs font-medium whitespace-nowrap">Return to Zura</span>
            </button>
            <button
              onClick={() => ctx?.dismiss()}
              className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
