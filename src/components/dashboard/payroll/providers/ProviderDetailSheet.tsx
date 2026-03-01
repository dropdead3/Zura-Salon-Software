import { Check, ExternalLink, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Separator } from '@/components/ui/separator';
import { PayrollProviderConfig } from './providerConfig';

interface ProviderDetailSheetProps {
  provider: PayrollProviderConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (providerId: string) => void;
  isConnecting?: boolean;
}

export function ProviderDetailSheet({
  provider,
  open,
  onOpenChange,
  onConnect,
  isConnecting = false,
}: ProviderDetailSheetProps) {
  if (!provider) return null;

  const Icon = provider.icon;
  const isAvailable = provider.status === 'available';

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="560px">
      <div className="p-5 pb-4 border-b border-border/40 space-y-4">
        <div className="flex items-start gap-4">
          <div 
            className="p-4 rounded-2xl"
            style={{ 
              background: `linear-gradient(135deg, ${provider.gradientFrom}25, ${provider.gradientTo}15)`,
              color: provider.brandColor 
            }}
          >
            <Icon className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-sm tracking-wide uppercase">{provider.name}</h2>
            <p className="text-muted-foreground font-medium mt-1">{provider.tagline}</p>
          </div>
        </div>
        
        {!isAvailable && (
          <Badge variant="outline" className="w-fit text-amber-600 border-amber-600/40">
            Coming Soon
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div>
          <p className="text-muted-foreground leading-relaxed">
            {provider.description}
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium uppercase text-xs tracking-wider text-muted-foreground">
            Key Features
          </h4>
          <div className="space-y-3">
            {provider.features.map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <div 
                  className="p-1 rounded-full mt-0.5"
                  style={{ 
                    background: `linear-gradient(135deg, ${provider.gradientFrom}, ${provider.gradientTo})` 
                  }}
                >
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium uppercase text-xs tracking-wider text-muted-foreground">
            Best For
          </h4>
          <div className="space-y-2">
            {provider.bestFor.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium uppercase text-xs tracking-wider text-muted-foreground">
            Integrations
          </h4>
          <div className="flex flex-wrap gap-2">
            {provider.integrations.map((integration) => (
              <Badge key={integration} variant="secondary" className="font-normal">
                {integration}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium uppercase text-xs tracking-wider text-muted-foreground">
            Pricing
          </h4>
          <div 
            className="p-4 rounded-xl"
            style={{ 
              background: `linear-gradient(135deg, ${provider.gradientFrom}10, ${provider.gradientTo}05)` 
            }}
          >
            <p className="text-2xl font-medium" style={{ color: provider.brandColor }}>
              {provider.pricing.pricingModel}
            </p>
            {provider.pricing.basePrice !== null && (
              <p className="text-sm text-muted-foreground mt-1">
                Base fee + per-employee pricing
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Button
            className="w-full font-medium h-12 text-base"
            style={isAvailable ? {
              background: `linear-gradient(135deg, ${provider.gradientFrom}, ${provider.gradientTo})`,
              color: 'white',
            } : {}}
            onClick={() => onConnect(provider.id)}
            disabled={isConnecting || !isAvailable}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : isAvailable ? (
              <>
                Connect {provider.name}
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            ) : (
              'Request Early Access'
            )}
          </Button>
          
          {!isAvailable && (
            <p className="text-xs text-center text-muted-foreground">
              We'll notify you when {provider.name} integration is available.
            </p>
          )}
        </div>
      </div>
    </PremiumFloatingPanel>
  );
}
