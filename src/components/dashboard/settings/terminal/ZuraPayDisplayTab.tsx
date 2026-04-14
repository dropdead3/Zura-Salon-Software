import { CheckoutDisplayConcept } from './CheckoutDisplayConcept';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

interface ZuraPayDisplayTabProps {
  businessName: string;
}

export function ZuraPayDisplayTab({ businessName }: ZuraPayDisplayTabProps) {
  const { data: business } = useBusinessSettings();

  return (
    <div className="space-y-6">
      <CheckoutDisplayConcept businessName={businessName} orgLogoUrl={business?.logo_dark_url} />
    </div>
  );
}
