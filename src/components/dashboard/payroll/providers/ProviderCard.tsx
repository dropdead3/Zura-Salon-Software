import { useState } from 'react';
import { Check, Clock, Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PayrollProviderConfig } from './providerConfig';

interface ProviderCardProps {
  provider: PayrollProviderConfig;
  isConfigured?: boolean;
  isConnecting?: boolean;
  onConnect: () => void;
  onLearnMore: () => void;
  variant?: 'full' | 'compact';
}

export function ProviderCard({
  provider,
  isConfigured = false,
  isConnecting = false,
  onConnect,
  onLearnMore,
  variant = 'full',
}: ProviderCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = provider.icon;
  
  const isAvailable = provider.status === 'available';
  const isComingSoon = provider.status === 'coming_soon';

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'group relative overflow-hidden rounded-xl border-2 p-5 transition-all duration-300',
          'bg-gradient-to-br from-card/80 to-card',
          'hover:shadow-xl hover:-translate-y-1 hover:border-primary/30',
          !isAvailable && 'opacity-70'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Brand accent line */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
          style={{ 
            background: `linear-gradient(90deg, ${provider.gradientFrom}, ${provider.gradientTo})`,
            opacity: isHovered ? 1 : 0.6 
          }}
        />

        <div className="flex items-center gap-4">
          <div 
            className="p-3 rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{ 
              background: `linear-gradient(135deg, ${provider.gradientFrom}20, ${provider.gradientTo}10)`,
              color: provider.brandColor 
            }}
          >
            <Icon className="h-6 w-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{provider.name}</h3>
              {isComingSoon && (
                <Badge variant="outline" className="text-amber-600 border-amber-600/30 text-[10px] px-1.5">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                  Soon
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{provider.tagline}</p>
          </div>

          <Button
            size="sm"
            variant={isAvailable ? 'default' : 'outline'}
            onClick={isAvailable ? onConnect : onLearnMore}
            disabled={isConnecting}
            className="shrink-0"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isAvailable ? (
              'Connect'
            ) : (
              'Notify Me'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 transition-all duration-300',
        'bg-gradient-to-br from-card/90 via-card to-card/80',
        'hover:shadow-2xl hover:-translate-y-2 hover:border-primary/40',
        'backdrop-blur-sm',
        !isAvailable && 'opacity-75'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient overlay on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ 
          background: `linear-gradient(135deg, ${provider.gradientFrom}08, transparent 50%, ${provider.gradientTo}05)` 
        }}
      />

      {/* Top accent bar */}
      <div 
        className="h-1.5 transition-all duration-300"
        style={{ 
          background: `linear-gradient(90deg, ${provider.gradientFrom}, ${provider.gradientTo})`,
          opacity: isHovered ? 1 : 0.7
        }}
      />

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div 
            className="p-4 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
            style={{ 
              background: `linear-gradient(135deg, ${provider.gradientFrom}25, ${provider.gradientTo}15)`,
              color: provider.brandColor,
              boxShadow: isHovered ? `0 8px 24px ${provider.brandColor}20` : 'none'
            }}
          >
            <Icon className="h-7 w-7" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-medium">{provider.name}</h3>
              {provider.tier === 'recommended' && isAvailable && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px]">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  Top Pick
                </Badge>
              )}
              {isComingSoon && (
                <Badge variant="outline" className="text-amber-600 border-amber-600/40 animate-pulse">
                  <Clock className="h-3 w-3 mr-1" />
                  Coming Soon
                </Badge>
              )}
              {isConfigured && isAvailable && (
                <Badge variant="outline" className="text-green-600 border-green-600/40">
                  <Check className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-muted-foreground mt-0.5">{provider.tagline}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {provider.description}
        </p>

        {/* Features */}
        <div className="space-y-2.5">
          {provider.features.slice(0, 4).map((feature) => (
            <div key={feature} className="flex items-center gap-2.5 text-sm">
              <div 
                className="p-0.5 rounded-full"
                style={{ background: `linear-gradient(135deg, ${provider.gradientFrom}, ${provider.gradientTo})` }}
              >
                <Check className="h-3 w-3 text-white" />
              </div>
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">From</span>
            <span className="text-lg font-medium">{provider.pricing.pricingModel}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            className="flex-1 font-medium transition-all duration-300"
            style={isAvailable && isHovered ? {
              background: `linear-gradient(135deg, ${provider.gradientFrom}, ${provider.gradientTo})`,
              color: 'white',
            } : {}}
            onClick={isAvailable ? onConnect : onLearnMore}
            disabled={isConnecting || (!isAvailable && !isComingSoon)}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : isAvailable ? (
              `Connect ${provider.name}`
            ) : (
              'Request Early Access'
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={onLearnMore}
            className="shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
