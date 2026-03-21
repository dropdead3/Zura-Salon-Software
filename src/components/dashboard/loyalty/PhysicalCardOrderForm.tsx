import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Package, Truck, Loader2 } from 'lucide-react';
import { useCreateGiftCardOrder, CARD_STOCK_PRICING, SHIPPING_PRICING } from '@/hooks/useGiftCardOrders';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface PhysicalCardOrderFormProps {
  organizationId?: string;
}

const CARD_DESIGNS = [
  { value: 'elegant', label: 'Elegant', description: 'Classic black with gold accents' },
  { value: 'modern', label: 'Modern', description: 'Clean lines, minimal design' },
  { value: 'minimal', label: 'Minimal', description: 'Simple and understated' },
];

const CARD_STOCKS = [
  { value: 'standard' as const, label: 'Standard Cardstock', price: CARD_STOCK_PRICING.standard, description: 'Thick paper stock' },
  { value: 'premium' as const, label: 'Premium Matte', price: CARD_STOCK_PRICING.premium, description: 'Soft-touch finish' },
  { value: 'plastic' as const, label: 'Plastic PVC', price: CARD_STOCK_PRICING.plastic, description: 'Credit card quality' },
];

const QUANTITIES = [50, 100, 250, 500, 1000];

export function PhysicalCardOrderForm({ organizationId }: PhysicalCardOrderFormProps) {
  const { formatCurrency } = useFormatCurrency();
  const createOrder = useCreateGiftCardOrder();

  const [cardDesign, setCardDesign] = useState('elegant');
  const [cardStock, setCardStock] = useState<'standard' | 'premium' | 'plastic'>('premium');
  const [quantity, setQuantity] = useState(100);
  const [cardPrefix, setCardPrefix] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'overnight'>('standard');
  
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
  });

  const unitPrice = CARD_STOCK_PRICING[cardStock];
  const shippingPrice = SHIPPING_PRICING[shippingMethod];
  const subtotal = quantity * unitPrice;
  const total = subtotal + shippingPrice;

  const handleSubmit = async () => {
    if (!organizationId) return;
    
    await createOrder.mutateAsync({
      organization_id: organizationId,
      quantity,
      card_design: cardDesign,
      card_stock: cardStock,
      card_number_prefix: cardPrefix || null,
      shipping_address: shippingAddress,
      shipping_method: shippingMethod,
      custom_logo_url: null,
      custom_message: null,
      notes: null,
      unit_price: unitPrice,
      total_price: total,
      ordered_by: '',
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Card Design */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Card Design
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={cardDesign} onValueChange={setCardDesign} className="grid grid-cols-3 gap-4">
              {CARD_DESIGNS.map((design) => (
                <Label
                  key={design.value}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-colors",
                    cardDesign === design.value 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem value={design.value} className="sr-only" />
                  <div className="w-full aspect-[1.6/1] bg-muted rounded mb-3" />
                  <span className="font-medium text-sm">{design.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{design.description}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Card Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5" />
              Card Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={cardStock} onValueChange={(v) => setCardStock(v as typeof cardStock)} className="space-y-3">
              {CARD_STOCKS.map((stock) => (
                <Label
                  key={stock.value}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors",
                    cardStock === stock.value 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={stock.value} />
                    <div>
                      <span className="font-medium">{stock.label}</span>
                      <p className="text-xs text-muted-foreground">{stock.description}</p>
                    </div>
                  </div>
                  <span className="font-medium">{formatCurrency(stock.price)}/card</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Quantity & Customization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quantity & Customization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Quantity</Label>
              <div className="flex gap-2 mt-2">
                {QUANTITIES.map((q) => (
                  <Button
                    key={q}
                    variant={quantity === q ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuantity(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="cardPrefix">Card Number Prefix (Optional)</Label>
              <Input
                id="cardPrefix"
                placeholder="e.g., DD-"
                value={cardPrefix}
                onChange={(e) => setCardPrefix(e.target.value.toUpperCase())}
                className="w-40"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cards will be numbered: {cardPrefix || 'GC-'}0001, {cardPrefix || 'GC-'}0002, etc.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Business Name</Label>
                <Input
                  value={shippingAddress.name}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Street Address</Label>
                <Input
                  value={shippingAddress.street}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>State</Label>
                  <Input
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                  />
                </div>
                <div>
                  <Label>ZIP</Label>
                  <Input
                    value={shippingAddress.zip}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <RadioGroup value={shippingMethod} onValueChange={(v) => setShippingMethod(v as typeof shippingMethod)} className="space-y-2">
              <Label className={cn(
                "flex items-center justify-between p-3 rounded-lg border cursor-pointer",
                shippingMethod === 'standard' && "border-primary bg-primary/5"
              )}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="standard" />
                  <div>
                    <span className="font-medium">Standard (5-7 days)</span>
                  </div>
                </div>
                <span className="font-medium text-primary">FREE</span>
              </Label>
              <Label className={cn(
                "flex items-center justify-between p-3 rounded-lg border cursor-pointer",
                shippingMethod === 'express' && "border-primary bg-primary/5"
              )}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="express" />
                  <div>
                    <span className="font-medium">Express (2-3 days)</span>
                  </div>
                </div>
                <span className="font-medium">$15.00</span>
              </Label>
              <Label className={cn(
                "flex items-center justify-between p-3 rounded-lg border cursor-pointer",
                shippingMethod === 'overnight' && "border-primary bg-primary/5"
              )}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="overnight" />
                  <div>
                    <span className="font-medium">Overnight</span>
                  </div>
                </div>
                <span className="font-medium">$35.00</span>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {/* Order Summary */}
      <div>
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{quantity} × {CARD_STOCKS.find(s => s.value === cardStock)?.label}</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shippingPrice === 0 ? 'FREE' : formatCurrency(shippingPrice)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-medium text-lg">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <Button 
              className="w-full" 
              size={tokens.button.hero}
              onClick={handleSubmit}
              disabled={createOrder.isPending || !shippingAddress.name || !shippingAddress.street}
            >
              {createOrder.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Submit Order
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Orders typically ship within 3-5 business days
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
