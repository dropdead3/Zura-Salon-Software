import { useState } from 'react';
import { Sparkles, Building2, Wallet, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProviderCard } from './ProviderCard';
import { ProviderDetailSheet } from './ProviderDetailSheet';
import { 
  PAYROLL_PROVIDERS, 
  getProvidersByTier, 
  PayrollProviderConfig,
  PayrollProvider 
} from './providerConfig';
import { usePayrollConnection } from '@/hooks/usePayrollConnection';
import { cn } from '@/lib/utils';

function SectionHeader({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description?: string;
}) {
  return (
    <div className="relative py-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border/40" />
      </div>
      <div className="relative flex justify-center">
        <div className="bg-background px-6 flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium font-display uppercase tracking-[0.15em] text-muted-foreground">
            {title}
          </span>
        </div>
      </div>
      {description && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          {description}
        </p>
      )}
    </div>
  );
}

export function PayrollProviderHub() {
  const [selectedProvider, setSelectedProvider] = useState<PayrollProviderConfig | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const { 
    providerStatus, 
    initiateConnection, 
    isConnecting 
  } = usePayrollConnection();

  const recommendedProviders = getProvidersByTier('recommended');
  const enterpriseProviders = getProvidersByTier('enterprise');
  const budgetProviders = getProvidersByTier('budget');

  const handleConnect = (providerId: PayrollProvider) => {
    initiateConnection(providerId);
  };

  const handleLearnMore = (provider: PayrollProviderConfig) => {
    setSelectedProvider(provider);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Payroll Integration Hub</span>
        </div>
        
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight">
          Select Your Payroll Provider
        </h2>
        
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Connect your preferred payroll service to automate compensation, 
          taxes, and compliance for your entire team.
        </p>
      </div>

      {/* Recommended Section */}
      <section>
        <SectionHeader 
          icon={Sparkles} 
          title="Recommended for Beauty Businesses"
          description="Top-rated providers with features tailored for salons and spas"
        />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recommendedProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isConfigured={providerStatus[provider.id as keyof typeof providerStatus] || false}
              isConnecting={isConnecting}
              onConnect={() => handleConnect(provider.id)}
              onLearnMore={() => handleLearnMore(provider)}
              variant="full"
            />
          ))}
        </div>
      </section>

      {/* Enterprise Section */}
      <section>
        <SectionHeader 
          icon={Building2} 
          title="Enterprise & Accounting"
          description="Robust solutions for larger operations and complex accounting needs"
        />
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {enterpriseProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isConfigured={providerStatus[provider.id as keyof typeof providerStatus] || false}
              isConnecting={isConnecting}
              onConnect={() => handleConnect(provider.id)}
              onLearnMore={() => handleLearnMore(provider)}
              variant="compact"
            />
          ))}
        </div>
      </section>

      {/* Budget Section */}
      <section>
        <SectionHeader 
          icon={Wallet} 
          title="Budget-Friendly"
          description="Great options for new salons and smaller teams"
        />
        
        <div className="grid gap-4 md:grid-cols-2">
          {budgetProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isConfigured={providerStatus[provider.id as keyof typeof providerStatus] || false}
              isConnecting={isConnecting}
              onConnect={() => handleConnect(provider.id)}
              onLearnMore={() => handleLearnMore(provider)}
              variant="compact"
            />
          ))}
        </div>
      </section>

      {/* Request Integration */}
      <div className="relative py-10">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-dashed border-border/60" />
        </div>
        <div className="relative flex justify-center">
          <div className="bg-background px-8">
            <Button variant="outline" className="gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Don't see your provider? Request Integration
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Sheet */}
      <ProviderDetailSheet
        provider={selectedProvider}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onConnect={handleConnect}
        isConnecting={isConnecting}
      />
    </div>
  );
}
