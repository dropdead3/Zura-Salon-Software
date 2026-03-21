import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PlatformCard, PlatformCardContent } from '../ui/PlatformCard';
import { PlatformBadge } from '../ui/PlatformBadge';
import { cn } from '@/lib/utils';
import type { PlatformIntegration } from '@/config/platformIntegrations';

interface PlatformIntegrationCardProps {
  integration: PlatformIntegration;
  stats?: {
    primary: { label: string; value: number };
    secondary?: { label: string; value: number };
  };
  status?: 'connected' | 'not_configured' | 'coming_soon';
}

export function PlatformIntegrationCard({ 
  integration, 
  stats,
  status: overrideStatus 
}: PlatformIntegrationCardProps) {
  const navigate = useNavigate();
  const Icon = integration.icon;
  const status = overrideStatus ?? integration.status;
  const isComingSoon = status === 'coming_soon';
  const isConnected = status === 'connected';

  const statusConfig = {
    connected: { label: 'Ready', variant: 'success' as const },
    not_configured: { label: 'Not Configured', variant: 'default' as const },
    coming_soon: { label: 'Coming Soon', variant: 'default' as const },
  };

  const handleClick = () => {
    if (!isComingSoon) {
      navigate(integration.configPath);
    }
  };

  return (
    <PlatformCard
      variant={isComingSoon ? 'default' : 'interactive'}
      className={cn(
        'relative cursor-pointer transition-all duration-300',
        isComingSoon && 'opacity-60 cursor-not-allowed',
        isConnected && 'border-violet-500/30'
      )}
      onClick={handleClick}
    >
      <PlatformCardContent className="p-5">
        {/* Header with icon and status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              isConnected 
                ? 'bg-violet-500/20 text-violet-400' 
                : 'bg-slate-700/50 text-slate-400'
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-white">{integration.name}</h3>
            </div>
          </div>
          <PlatformBadge variant={statusConfig[status].variant}>
            {statusConfig[status].label}
          </PlatformBadge>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-400 mb-4">
          {integration.description}
        </p>

        {/* Stats row (only for connected integrations) */}
        {stats && !isComingSoon && (
          <div className="flex items-center gap-4 text-sm border-t border-slate-700/50 pt-3 mb-3">
            <div>
              <span className="text-white font-medium">{stats.primary.value}</span>
              <span className="text-slate-500 ml-1">{stats.primary.label}</span>
            </div>
            {stats.secondary && (
              <>
                <div className="h-4 w-px bg-slate-700" />
                <div>
                  <span className="text-white font-medium">{stats.secondary.value}</span>
                  <span className="text-slate-500 ml-1">{stats.secondary.label}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Action indicator */}
        {!isComingSoon && (
          <div className="flex items-center text-sm text-violet-400 group-hover:text-violet-300">
            <span>Configure</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        )}
      </PlatformCardContent>
    </PlatformCard>
  );
}
