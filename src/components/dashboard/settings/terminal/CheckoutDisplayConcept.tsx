import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Monitor, Palette, Play, Pause, Pencil, Plus, Trash2, X } from 'lucide-react';
import { S710CheckoutSimulator, SimCartItem } from './S710CheckoutSimulator';
import { cn } from '@/lib/utils';

const S710_SPECS = [
  { label: 'Display', value: '5.5" touchscreen · 1080×1920' },
  { label: 'Connectivity', value: 'Ethernet · WiFi · Cellular failover' },
  { label: 'Payments', value: 'Tap · Chip · Swipe' },
  { label: 'Offline', value: 'Store & forward when disconnected' },
];

const DEFAULT_CART: SimCartItem[] = [
  { label: 'Balayage Full Head', amount: 18500 },
  { label: 'Olaplex Treatment', amount: 4500 },
  { label: 'Blowout & Style', amount: 6500 },
];

interface CheckoutDisplayConceptProps {
  businessName?: string;
}

export function CheckoutDisplayConcept({ businessName = 'Your Salon' }: CheckoutDisplayConceptProps) {
  const [autoPlay, setAutoPlay] = useState(true);
  const [editing, setEditing] = useState(false);
  const [previewName, setPreviewName] = useState(businessName);
  const [cartItems, setCartItems] = useState<SimCartItem[]>(DEFAULT_CART);

  const updateItem = (index: number, field: keyof SimCartItem, value: string) => {
    setCartItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (field === 'amount') {
        const cents = Math.round(parseFloat(value || '0') * 100);
        return { ...item, amount: isNaN(cents) ? 0 : cents };
      }
      return { ...item, [field]: value };
    }));
  };

  const addItem = () => {
    setCartItems(prev => [...prev, { label: 'New Item', amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Monitor className={tokens.card.icon} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>CHECKOUT DISPLAY</CardTitle>
                <MetricInfoTooltip description="Preview the branded Zura Pay checkout experience that appears on your S710 readers during transactions." />
              </div>
              <CardDescription>What your clients see on the S710 touchscreen at checkout.</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/30 text-[10px]">
            S710 · 5.5" DISPLAY
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simulator + specs side by side, stacks on narrow */}
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Simulator */}
          <div className="flex flex-col items-center shrink-0">
            <S710CheckoutSimulator
              businessName={previewName}
              autoPlay={autoPlay}
              cartItems={cartItems}
            />
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors font-sans uppercase tracking-wider"
            >
              {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {autoPlay ? 'Pause' : 'Auto-play'}
            </button>
          </div>

          {/* Right panel: edit + specs + experience */}
          <div className="flex-1 w-full space-y-4">
            {/* Editable preview section */}
            <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase font-sans">Customize Preview</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-muted-foreground/50 font-sans tracking-wider uppercase">Preview only</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(!editing)}
                    className="h-7 px-2.5 text-[10px] font-sans rounded-full"
                  >
                    {editing ? <><X className="w-3 h-3 mr-1" /> Close</> : <><Pencil className="w-3 h-3 mr-1" /> Edit</>}
                  </Button>
                </div>
              </div>

              {editing && (
                <div className="space-y-3 pt-1">
                  {/* Business name */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-sans">Business Name</label>
                    <Input
                      value={previewName}
                      onChange={(e) => setPreviewName(e.target.value)}
                      className="h-8 text-xs rounded-lg"
                      autoCapitalize="none"
                    />
                  </div>

                  {/* Cart items */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground font-sans">Cart Items</label>
                    {cartItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={item.label}
                          onChange={(e) => updateItem(i, 'label', e.target.value)}
                          className="h-7 text-[11px] flex-1 rounded-lg"
                          autoCapitalize="none"
                        />
                        <div className="relative w-24 shrink-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={(item.amount / 100).toFixed(2)}
                            onChange={(e) => updateItem(i, 'amount', e.target.value)}
                            className="h-7 text-[11px] pl-6 rounded-lg font-mono"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <button
                          onClick={() => removeItem(i)}
                          className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addItem}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors font-sans mt-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add item
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Device specs */}
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase font-sans">S710 Reader Specifications</p>
              {S710_SPECS.map((spec) => (
                <div key={spec.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-sans">{spec.label}</span>
                  <span className="font-mono text-foreground text-[10px]">{spec.value}</span>
                </div>
              ))}
            </div>

            {/* Checkout experience summary */}
            <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase font-sans">Your Checkout Experience</p>
              </div>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                Your readers display a branded checkout flow with your business name, itemized cart details, totals, and payment prompts. The experience updates automatically across all your readers — no manual device configuration needed.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Branded splash screen', 'Itemized cart display', 'Tap / chip / swipe prompts', 'Real-time status updates'].map((cap) => (
                  <span key={cap} className={cn(
                    'text-[9px] px-2 py-0.5 rounded-full bg-muted border text-muted-foreground font-sans',
                    'transition-colors hover:text-foreground hover:border-foreground/20'
                  )}>
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
