import { useState } from 'react';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Percent, Ticket, Sparkles, BarChart3, Tag } from 'lucide-react';
import { PromotionsList } from './PromotionsList';
import { VouchersList } from './VouchersList';
import { PromotionalServicesManager } from './PromotionalServicesManager';
import { PromoAnalyticsSummary } from './PromoAnalyticsSummary';
import { ServiceDiscountsManager } from './ServiceDiscountsManager';

interface PromotionsConfiguratorProps {
  organizationId?: string;
}

export function PromotionsConfigurator({ organizationId }: PromotionsConfiguratorProps) {
  const [activeTab, setActiveTab] = useState('promotions');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ResponsiveTabsList onTabChange={setActiveTab}>
          <TabsTrigger value="promotions" className="gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Promotions</span>
          </TabsTrigger>
          <TabsTrigger value="discounts" className="gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Discounts</span>
          </TabsTrigger>
          <TabsTrigger value="vouchers" className="gap-2">
            <Ticket className="h-4 w-4" />
            <span className="hidden sm:inline">Vouchers</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Promo Services</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </ResponsiveTabsList>

        <TabsContent value="promotions" className="mt-6">
          <PromotionsList organizationId={organizationId} />
        </TabsContent>
        <TabsContent value="discounts" className="mt-6">
          <ServiceDiscountsManager organizationId={organizationId} />
        </TabsContent>
        <TabsContent value="vouchers" className="mt-6">
          <VouchersList organizationId={organizationId} />
        </TabsContent>
        <TabsContent value="services" className="mt-6">
          <PromotionalServicesManager organizationId={organizationId} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <PromoAnalyticsSummary organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
