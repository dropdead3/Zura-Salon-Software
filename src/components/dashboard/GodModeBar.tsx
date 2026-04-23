import { motion } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';

const SPRING = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

export function GodModeBar() {
  const { selectedOrganization, isImpersonating, clearSelection } = useOrganizationContext();
  const { clearViewAs } = useViewAs();
  const { resolvedTheme } = useDashboardTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [detailsHover, setDetailsHover] = useState(false);
  const [exitHover, setExitHover] = useState(false);

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

  // Theme-aware bar — branches on dashboard light/dark mode.
  // Invariant: org's --primary is always the accent; bar always reads as a
  // distinct system-chrome layer over the dashboard.
  const isDark = resolvedTheme === 'dark';

  const chrome = isDark
    ? {
        // Dark: near-black sandwich with primary accent wash — slightly translucent for glass effect.
        background:
          'linear-gradient(to right, hsl(0 0% 6% / 0.78), hsl(var(--primary) / 0.78), hsl(0 0% 6% / 0.78))',
        borderBottomColor: 'hsl(var(--primary) / 0.4)',
        boxShadow: '0 4px 20px -4px hsl(var(--primary) / 0.35)',
        // Z icon matches the bar's primary accent (hot pink in Neon, etc.).
        iconColor: 'hsl(var(--primary))',
        // Text uses near-white — primary-foreground resolves to near-black under
        // accent-on-light themes (Neon, etc.) and would disappear on the dark sandwich.
        labelColor: 'hsl(0 0% 95%)',
        dividerBg: 'hsl(var(--primary) / 0.4)',
        viewingAsColor: 'hsl(0 0% 95% / 0.75)',
        orgNameColor: 'hsl(0 0% 100%)',
        accountIdColor: 'hsl(0 0% 95% / 0.6)',
        detailsIdle: 'hsl(0 0% 95% / 0.85)',
        detailsHover: 'hsl(0 0% 100%)',
        detailsHoverBg: 'hsl(var(--primary) / 0.25)',
      }
    : {
        // Light: clean white base with soft primary wash — slightly translucent for glass effect.
        background:
          'linear-gradient(to right, hsl(0 0% 100% / 0.82), hsl(var(--primary) / 0.42), hsl(0 0% 100% / 0.82))',
        borderBottomColor: 'hsl(var(--primary) / 0.35)',
        boxShadow: '0 2px 12px -4px hsl(var(--primary) / 0.25)',
        iconColor: 'hsl(0 0% 8%)',
        labelColor: 'hsl(0 0% 8%)',
        dividerBg: 'hsl(var(--primary) / 0.35)',
        viewingAsColor: 'hsl(0 0% 8% / 0.7)',
        orgNameColor: 'hsl(0 0% 8%)',
        accountIdColor: 'hsl(0 0% 8% / 0.6)',
        detailsIdle: 'hsl(0 0% 8% / 0.8)',
        detailsHover: 'hsl(0 0% 8%)',
        detailsHoverBg: 'hsl(var(--primary) / 0.10)',
      };

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={SPRING}
      className="fixed top-0 left-0 right-0 z-[60] border-b"
      style={{
        height: isMobile ? 40 : 44,
        background: chrome.background,
        borderBottomColor: chrome.borderBottomColor,
        boxShadow: chrome.boxShadow,
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
    >
      <div className="h-full max-w-screen-2xl mx-auto px-4 lg:px-6 flex items-center justify-between gap-3">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex" style={{ color: chrome.iconColor }}>
              <ZuraZIcon className="h-4 w-4" />
            </span>
            {!isMobile && (
              <span
                className="font-display text-[11px] tracking-[0.08em] uppercase"
                style={{ color: chrome.labelColor }}
              >
                God Mode
              </span>
            )}
          </div>

          {!isMobile && (
            <div
              className="h-4 w-px shrink-0"
              style={{ background: chrome.dividerBg }}
            />
          )}

          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-sm font-sans shrink-0"
              style={{ color: chrome.viewingAsColor }}
            >
              Viewing as:
            </span>
            <span
              className="text-sm font-sans font-medium truncate"
              style={{ color: chrome.orgNameColor }}
            >
              {selectedOrganization.name}
            </span>
            {!isMobile && selectedOrganization.account_number && (
              <span
                className="text-xs font-sans shrink-0"
                style={{ color: chrome.accountIdColor }}
              >
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
              onMouseEnter={() => setDetailsHover(true)}
              onMouseLeave={() => setDetailsHover(false)}
              className="h-7 px-3 rounded-lg text-xs font-sans font-medium transition-colors duration-200 flex items-center gap-1.5"
              style={{
                color: detailsHover ? chrome.detailsHover : chrome.detailsIdle,
                background: detailsHover ? chrome.detailsHoverBg : 'transparent',
              }}
            >
              <ExternalLink className="h-3 w-3" />
              Account Details
            </button>
          )}

          <button
            onClick={handleExit}
            onMouseEnter={() => setExitHover(true)}
            onMouseLeave={() => setExitHover(false)}
            className={cn(
              "rounded-lg font-sans font-medium transition-all duration-200 flex items-center gap-1.5",
              isMobile ? "h-7 px-3 text-xs" : "h-7 px-4 text-xs"
            )}
            style={{
              background: exitHover
                ? 'hsl(var(--primary) / 0.85)'
                : 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              boxShadow: exitHover
                ? '0 8px 20px -4px hsl(var(--primary) / 0.45)'
                : '0 4px 12px -2px hsl(var(--primary) / 0.35)',
            }}
          >
            <X className="h-3 w-3" />
            Exit View
          </button>
        </div>
      </div>
    </motion.div>
  );
}
