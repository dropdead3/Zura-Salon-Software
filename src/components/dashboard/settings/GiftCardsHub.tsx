import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { tokens } from '@/lib/design-tokens';
import {
  Gift, Plus, Search, Copy, Check, Loader2, Edit2, X, 
  CreditCard, Package, Settings, Palette, Ban, CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useGiftCards, useCreateGiftCard, useUpdateGiftCard, useDeactivateGiftCard, useGiftCardTransactions, type GiftCard } from '@/hooks/useGiftCards';
import { useGiftCardSettings, useUpdateGiftCardSettings } from '@/hooks/useGiftCardSettings';
import { GiftCardDesignEditor } from '@/components/dashboard/loyalty/GiftCardDesignEditor';
import { PhysicalCardOrderForm } from '@/components/dashboard/loyalty/PhysicalCardOrderForm';
import { PhysicalCardOrderHistory } from '@/components/dashboard/loyalty/PhysicalCardOrderHistory';
import { BlurredAmount } from '@/contexts/HideNumbersContext';

// ─── Active Cards Sub-Tab ───
function ActiveCardsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCard, setEditCard] = useState<GiftCard | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [purchaserName, setPurchaserName] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { formatDate } = useFormatDate();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: giftCards = [], isLoading } = useGiftCards(effectiveOrganization?.id);
  const createGiftCard = useCreateGiftCard();
  const { formatCurrency, currency } = useFormatCurrency();

  const filteredCards = searchCode
    ? giftCards.filter(gc =>
        gc.code.toLowerCase().includes(searchCode.toLowerCase().replace(/[^a-z0-9]/gi, ''))
      )
    : giftCards;

  const handleCreate = async () => {
    if (!effectiveOrganization) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;

    await createGiftCard.mutateAsync({
      organizationId: effectiveOrganization.id,
      amount,
      purchaserName: purchaserName || undefined,
      recipientName: recipientName || undefined,
    });

    setIsCreateOpen(false);
    setNewAmount('');
    setPurchaserName('');
    setRecipientName('');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const totalValue = giftCards
    .filter(gc => gc.is_active)
    .reduce((sum, gc) => sum + Number(gc.current_balance), 0);

  const activeCount = giftCards.filter(gc => gc.is_active && Number(gc.current_balance) > 0).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Cards</p>
          <p className="text-xl font-display tracking-wide">{giftCards.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-xl font-display tracking-wide">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          <p className="text-xl font-display tracking-wide"><BlurredAmount>{formatCurrency(totalValue)}</BlurredAmount></p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search by code..." value={searchCode} onChange={(e) => setSearchCode(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size={tokens.button.card} className="gap-1.5"><Plus className="w-4 h-4" /> Create Gift Card</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Create Gift Card</DialogTitle>
              <DialogDescription>Generate a new gift card with a unique code</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currency}</span>
                  <Input type="number" step="0.01" min="1" placeholder="0.00" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="pl-7" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Purchaser Name (optional)</Label>
                <Input placeholder="Who purchased this?" value={purchaserName} onChange={(e) => setPurchaserName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Recipient Name (optional)</Label>
                <Input placeholder="Who is this for?" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createGiftCard.isPending || !newAmount || parseFloat(newAmount) <= 0}>
                {createGiftCard.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Initial</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Purchaser</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : filteredCards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Gift className={tokens.empty.icon} />
                  <p className={tokens.empty.description}>{searchCode ? 'No cards match your search' : 'No gift cards created yet'}</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{card.code}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(card.code)}>
                        {copiedCode === card.code ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums"><BlurredAmount>{formatCurrency(Number(card.initial_amount))}</BlurredAmount></TableCell>
                  <TableCell className={cn("text-sm tabular-nums font-medium", Number(card.current_balance) === 0 && "text-muted-foreground")}>
                    <BlurredAmount>{formatCurrency(Number(card.current_balance))}</BlurredAmount>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{card.purchaser_name || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{card.recipient_name || '—'}</TableCell>
                  <TableCell>
                    {!card.is_active ? (
                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                    ) : Number(card.current_balance) === 0 ? (
                      <Badge variant="outline" className="text-muted-foreground text-[10px]">Redeemed</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[10px]">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(new Date(card.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditCard(card)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editCard && <EditGiftCardDialog card={editCard} onClose={() => setEditCard(null)} />}
    </div>
  );
}

// ─── Edit Gift Card Dialog ───
function EditGiftCardDialog({ card, onClose }: { card: GiftCard; onClose: () => void }) {
  const { formatCurrency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const updateGiftCard = useUpdateGiftCard();
  const deactivateGiftCard = useDeactivateGiftCard();
  const { data: transactions = [], isLoading: txLoading } = useGiftCardTransactions(card.id);
  const [balanceAdjust, setBalanceAdjust] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [expiresAt, setExpiresAt] = useState(card.expires_at ? card.expires_at.split('T')[0] : '');

  const handleSave = () => {
    const updates: Record<string, any> = {};
    if (expiresAt !== (card.expires_at ? card.expires_at.split('T')[0] : '')) {
      updates.expires_at = expiresAt || null;
    }
    if (Object.keys(updates).length > 0) {
      updateGiftCard.mutate({ giftCardId: card.id, updates });
    }
    onClose();
  };

  const handleDeactivate = () => {
    deactivateGiftCard.mutate(card.id);
    onClose();
  };

  const handleBalanceAdjust = () => {
    const amount = parseFloat(balanceAdjust);
    if (isNaN(amount) || amount === 0) return;
    const newBalance = Math.max(0, Number(card.current_balance) + amount);
    updateGiftCard.mutate({
      giftCardId: card.id,
      updates: { current_balance: newBalance },
    });
    setBalanceAdjust('');
    setAdjustReason('');
    toast.success(`Balance adjusted by ${amount > 0 ? '+' : ''}${formatCurrency(amount)}`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Gift Card</DialogTitle>
          <DialogDescription>
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{card.code}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current balance */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <span className="text-sm text-muted-foreground">Current Balance</span>
            <span className="font-display text-lg tracking-wide"><BlurredAmount>{formatCurrency(Number(card.current_balance))}</BlurredAmount></span>
          </div>

          {/* Balance adjustment */}
          <div className="space-y-2">
            <Label className="text-xs">Adjust Balance</Label>
            <div className="flex gap-2">
              <Input type="number" step="0.01" placeholder="+50 or -25" value={balanceAdjust} onChange={e => setBalanceAdjust(e.target.value)} className="h-9" />
              <Button size={tokens.button.inline} onClick={handleBalanceAdjust} disabled={!balanceAdjust || parseFloat(balanceAdjust) === 0}>
                Apply
              </Button>
            </div>
            <Input placeholder="Reason (optional)" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="h-8 text-xs" />
          </div>

          {/* Expiry */}
          <div className="space-y-2">
            <Label className="text-xs">Expiration Date</Label>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="h-9" />
          </div>

          {/* Redemption history */}
          <div className="space-y-2">
            <Label className="text-xs">Redemption History</Label>
            {txLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No redemptions yet</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30 border border-border/40">
                    <span className="text-muted-foreground">{formatDate(new Date(tx.created_at), 'MMM d, yyyy')}</span>
                    <span className="font-medium tabular-nums"><BlurredAmount>{formatCurrency(Number(tx.amount))}</BlurredAmount></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {card.is_active && (
            <Button variant="destructive" size={tokens.button.inline} onClick={handleDeactivate} className="gap-1.5">
              <Ban className="w-3.5 h-3.5" /> Deactivate
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Gift Card Settings Sub-Tab ───
function GiftCardSettingsTab() {
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;
  const { data: settings, isLoading } = useGiftCardSettings(organizationId);
  const updateSettings = useUpdateGiftCardSettings();
  const [newDenomination, setNewDenomination] = useState('');
  const { formatCurrency } = useFormatCurrency();

  if (isLoading || !settings) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const denominations = settings.suggested_amounts || [25, 50, 100, 150, 200];

  const handleAddDenomination = () => {
    const val = parseFloat(newDenomination);
    if (isNaN(val) || val <= 0 || denominations.includes(val)) return;
    const updated = [...denominations, val].sort((a, b) => a - b);
    updateSettings.mutate({ organizationId: organizationId!, settings: { suggested_amounts: updated } });
    setNewDenomination('');
  };

  const handleRemoveDenomination = (amount: number) => {
    const updated = denominations.filter(d => d !== amount);
    updateSettings.mutate({ organizationId: organizationId!, settings: { suggested_amounts: updated } });
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Default expiry */}
      <div className="space-y-2">
        <Label>Default Expiration (months)</Label>
        <Input
          type="number"
          min="1"
          max="120"
          value={settings.default_expiration_months}
          onChange={e => {
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val > 0) {
              updateSettings.mutate({ organizationId: organizationId!, settings: { default_expiration_months: val } });
            }
          }}
          className="h-9 w-32"
        />
        <p className="text-xs text-muted-foreground">New gift cards will expire this many months after creation</p>
      </div>

      {/* Suggested denominations */}
      <div className="space-y-2">
        <Label>Suggested Denominations</Label>
        <div className="flex flex-wrap gap-2">
          {denominations.map(amount => (
            <Badge key={amount} variant="secondary" className="gap-1 pr-1">
              {formatCurrency(amount)}
              <button onClick={() => handleRemoveDenomination(amount)} className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input type="number" placeholder="Add amount" value={newDenomination} onChange={e => setNewDenomination(e.target.value)} className="h-9 w-32" />
          <Button size={tokens.button.inline} variant="outline" onClick={handleAddDenomination} disabled={!newDenomination}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Terms */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Include Terms on Card</Label>
          <Switch
            checked={settings.include_terms}
            onCheckedChange={v => updateSettings.mutate({ organizationId: organizationId!, settings: { include_terms: v } })}
          />
        </div>
        {settings.include_terms && (
          <Input
            value={settings.terms_text || ''}
            onChange={e => updateSettings.mutate({ organizationId: organizationId!, settings: { terms_text: e.target.value } })}
            placeholder="Terms and conditions text"
            className="h-9 text-sm"
          />
        )}
      </div>

      {/* QR code */}
      <div className="flex items-center justify-between">
        <Label>Include QR Code</Label>
        <Switch
          checked={settings.include_qr_code}
          onCheckedChange={v => updateSettings.mutate({ organizationId: organizationId!, settings: { include_qr_code: v } })}
        />
      </div>
    </div>
  );
}

// ─── Main Hub ───
export function GiftCardsHub() {
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList>
        <TabsTrigger value="active" className="gap-1.5"><Gift className="w-3.5 h-3.5" /> Active Cards</TabsTrigger>
        <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Settings</TabsTrigger>
        <TabsTrigger value="design" className="gap-1.5"><Palette className="w-3.5 h-3.5" /> Design & Print</TabsTrigger>
        <TabsTrigger value="orders" className="gap-1.5"><Package className="w-3.5 h-3.5" /> Orders</TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-4">
        <ActiveCardsTab />
      </TabsContent>

      <TabsContent value="settings" className="mt-4">
        <GiftCardSettingsTab />
      </TabsContent>

      <TabsContent value="design" className="mt-4">
        <GiftCardDesignEditor organizationId={organizationId} />
      </TabsContent>

      <TabsContent value="orders" className="mt-4">
        <div className="space-y-6">
          <PhysicalCardOrderForm organizationId={organizationId} />
          <PhysicalCardOrderHistory organizationId={organizationId} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
