import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, Banknote, Gift, Wallet } from 'lucide-react';

type PaymentMethod = 'card' | 'cash' | 'credit' | 'giftcard';

interface PaymentMethodSelectProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const paymentMethods = [
  { value: 'card' as const, label: 'Card', icon: CreditCard },
  { value: 'cash' as const, label: 'Cash', icon: Banknote },
  { value: 'credit' as const, label: 'Salon Credit', icon: Wallet },
  { value: 'giftcard' as const, label: 'Gift Card', icon: Gift },
];

export function PaymentMethodSelect({ value, onChange }: PaymentMethodSelectProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Payment Method
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={value} 
          onValueChange={(v) => onChange(v as PaymentMethod)}
          className="grid grid-cols-2 gap-2"
        >
          {paymentMethods.map((method) => (
            <Label
              key={method.value}
              htmlFor={method.value}
              className={`
                flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors
                ${value === method.value 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:bg-muted/50'
                }
              `}
            >
              <RadioGroupItem value={method.value} id={method.value} className="sr-only" />
              <method.icon className={`h-4 w-4 ${value === method.value ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">{method.label}</span>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
