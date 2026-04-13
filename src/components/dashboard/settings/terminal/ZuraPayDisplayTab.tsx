import { CheckoutDisplayConcept } from './CheckoutDisplayConcept';

interface ZuraPayDisplayTabProps {
  businessName: string;
}

export function ZuraPayDisplayTab({ businessName }: ZuraPayDisplayTabProps) {
  return (
    <div className="space-y-6">
      <CheckoutDisplayConcept businessName={businessName} />
    </div>
  );
}
