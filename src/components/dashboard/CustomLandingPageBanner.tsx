import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLandingPagePreference, LANDING_PAGE_OPTIONS } from '@/hooks/useLandingPagePreference';
import { cn } from '@/lib/utils';

interface CustomLandingPageBannerProps {
  sidebarCollapsed?: boolean;
}

export function CustomLandingPageBanner({ sidebarCollapsed }: CustomLandingPageBannerProps) {
  const { hasCustomLandingPage, customLandingPage, resetToDefault, isUpdating } = useLandingPagePreference();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if no custom landing page or dismissed
  if (!hasCustomLandingPage || dismissed) return null;

  const currentPageLabel = LANDING_PAGE_OPTIONS.find(o => o.path === customLandingPage)?.label || customLandingPage;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "bg-primary/5 border-b border-primary/20 transition-[padding-left] duration-200 ease-in-out",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
          <div className="flex items-center gap-2 text-primary">
            <Home className="w-4 h-4" />
            <span>
              Custom landing page: <strong>{currentPageLabel}</strong>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Link to="/dashboard/profile">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-primary hover:text-primary/80"
              >
                <Settings className="w-3 h-3 mr-1" />
                Change
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => resetToDefault()}
              disabled={isUpdating}
            >
              Reset to Default
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setDismissed(true)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
