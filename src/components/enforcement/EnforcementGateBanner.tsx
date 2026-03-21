import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import { useEnforcementGate, type EnforcementGateConfig } from '@/hooks/useEnforcementGate';
import { cn } from '@/lib/utils';

interface EnforcementGateBannerProps {
  /** The gate key to check */
  gateKey: string;
  /** Content to render when gate is completed */
  children: React.ReactNode;
  /** If true, show children alongside the banner instead of blocking */
  advisory?: boolean;
  /** Custom class for the banner */
  className?: string;
}

/**
 * EnforcementGateBanner
 * 
 * Blocks or overlays content until a structural prerequisite is completed.
 * Uses advisory-first copy — no shame language.
 * 
 * Usage:
 * ```tsx
 * <EnforcementGateBanner gateKey="gate_commission_model">
 *   <PayrollPage />
 * </EnforcementGateBanner>
 * ```
 */
export function EnforcementGateBanner({
  gateKey,
  children,
  advisory = false,
  className,
}: EnforcementGateBannerProps) {
  const { isCompleted, isLoading, config } = useEnforcementGate(gateKey);
  const navigate = useNavigate();

  if (isLoading) return <>{children}</>;
  if (isCompleted) return <>{children}</>;

  const banner = (
    <div
      className={cn(
        'rounded-xl border border-[hsl(var(--platform-border))] bg-[hsl(var(--platform-card))] p-6 sm:p-8',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--platform-accent))]/10">
          <Shield className="h-5 w-5 text-[hsl(var(--platform-accent))]" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-base font-medium tracking-tight text-[hsl(var(--platform-foreground))]">
              {config?.label || 'Setup Required'}
            </h3>
            <p className="mt-1 text-sm text-[hsl(var(--platform-foreground-muted))]">
              {config?.description || 'A structural prerequisite must be completed before this feature is available.'}
            </p>
          </div>
          {config?.ctaPath && (
            <button
              onClick={() => navigate(config.ctaPath)}
              className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--platform-accent))] px-4 py-2 text-sm font-medium text-[hsl(var(--platform-accent-foreground))] transition-colors hover:bg-[hsl(var(--platform-accent))]/90"
            >
              {config.ctaLabel || 'Complete Setup'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (advisory) {
    return (
      <>
        {banner}
        {children}
      </>
    );
  }

  return banner;
}

export default EnforcementGateBanner;
