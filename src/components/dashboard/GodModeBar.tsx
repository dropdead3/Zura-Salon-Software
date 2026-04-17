import { motion } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';

const SPRING = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

export function GodModeBar() {
  const { selectedOrganization, isImpersonating, clearSelection } = useOrganizationContext();
  const { clearViewAs } = useViewAs();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!isImpersonating || !selectedOrganization) return null;

  const handleViewDetails = () => {
    navigate(`/platform/accounts/${selectedOrganization.id}`);
  };

  const handleExit = () => {
    // Clear BOTH org-level impersonation AND user/role-level View As
    // so platform chrome resets to the actual signed-in identity.
    clearSelection();
    clearViewAs();
    navigate('/platform/overview');
  };

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={SPRING}
      className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-violet-950 via-purple-900 to-violet-950 border-b border-violet-500/40 shadow-[0_4px_20px_-4px_rgba(139,92,246,0.3)]"
      style={{ height: isMobile ? 40 : 44 }}
    >
      <div className="h-full max-w-screen-2xl mx-auto px-4 lg:px-6 flex items-center justify-between gap-3">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <ZuraZIcon className="h-4 w-4 text-violet-300" />
            {!isMobile && (
              <span className="font-display text-[11px] tracking-[0.08em] uppercase text-violet-300">
                God Mode
              </span>
            )}
          </div>

          {!isMobile && (
            <div className="h-4 w-px bg-violet-500/40 shrink-0" />
          )}

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-sans text-violet-200/80 shrink-0">
              Viewing as:
            </span>
            <span className="text-sm font-sans font-medium text-white truncate">
              {selectedOrganization.name}
            </span>
            {!isMobile && selectedOrganization.account_number && (
              <span className="text-xs font-sans text-violet-400/70 shrink-0">
                Account ID: {selectedOrganization.account_number}
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {!isMobile && (
            <button
              onClick={handleViewDetails}
              className="h-7 px-3 rounded-lg text-xs font-sans font-medium text-violet-300 hover:text-white hover:bg-violet-500/20 transition-colors duration-200 flex items-center gap-1.5"
            >
              <ExternalLink className="h-3 w-3" />
              Account Details
            </button>
          )}

          <button
            onClick={handleExit}
            className={cn(
              "rounded-lg font-sans font-medium text-white transition-all duration-200 flex items-center gap-1.5",
              "bg-violet-500 hover:bg-violet-400 shadow-lg shadow-violet-500/30 hover:shadow-violet-400/40",
              isMobile ? "h-7 px-3 text-xs" : "h-7 px-4 text-xs"
            )}
          >
            <X className="h-3 w-3" />
            Exit View
          </button>
        </div>
      </div>
    </motion.div>
  );
}
