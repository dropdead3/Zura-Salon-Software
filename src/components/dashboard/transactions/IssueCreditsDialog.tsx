import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Gift, Loader2, Search, User } from 'lucide-react';
import { useIssueCredit } from '@/hooks/useClientBalances';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useClientsData } from '@/hooks/useClientsData';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface IssueCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
}

export function IssueCreditsDialog({ open, onOpenChange, preselectedClientId }: IssueCreditsDialogProps) {
  const [balanceType, setBalanceType] = useState<'salon_credit' | 'gift_card'>('salon_credit');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(preselectedClientId || null);
  const [showClientSearch, setShowClientSearch] = useState(!preselectedClientId);

  const { effectiveOrganization } = useOrganizationContext();
  const issueCredit = useIssueCredit();
  const { formatCurrency, currency } = useFormatCurrency();
  
  // Use clients data hook for search
  const { data: clients = [] } = useClientsData({ limit: 200 });
  
  const filteredClients = clientSearch.length >= 2
    ? clients.filter(c => {
        const name = `${c.first_name} ${c.last_name}`.toLowerCase();
        return name.includes(clientSearch.toLowerCase()) ||
          c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
          c.phone?.includes(clientSearch) ||
          c.mobile?.includes(clientSearch);
      }).slice(0, 10)
    : [];

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setAmount('');
      setNotes('');
      setBalanceType('salon_credit');
      setClientSearch('');
      setSelectedClientId(preselectedClientId || null);
      setShowClientSearch(!preselectedClientId);
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!selectedClientId || !effectiveOrganization) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    await issueCredit.mutateAsync({
      organizationId: effectiveOrganization.id,
      clientId: selectedClientId,
      amount: amountNum,
      balanceType,
      notes: notes || undefined,
    });

    onOpenChange(false);
  };

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Credits</DialogTitle>
          <DialogDescription>
            Add salon credits or gift card balance to a client's account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Client</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedClient.first_name} {selectedClient.last_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedClient.email || selectedClient.phone || selectedClient.mobile}</p>
                  </div>
                </div>
                <Button variant="ghost" size={tokens.button.inline} onClick={() => {
                  setSelectedClientId(null);
                  setShowClientSearch(true);
                }}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {filteredClients.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setShowClientSearch(false);
                          setClientSearch('');
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left border-b last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{client.first_name} {client.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {client.email || client.phone || client.mobile || 'No contact info'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Credit Type */}
          <div className="space-y-3">
            <Label>Credit Type</Label>
            <RadioGroup value={balanceType} onValueChange={(v) => setBalanceType(v as typeof balanceType)}>
              <div 
                className={cn(
                  "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50",
                  balanceType === 'salon_credit' && "border-primary bg-primary/5"
                )}
                onClick={() => setBalanceType('salon_credit')}
              >
                <RadioGroupItem value="salon_credit" id="salon_credit" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="salon_credit" className="cursor-pointer flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Salon Credit
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Can be used for any services or products
                  </p>
                </div>
              </div>

              <div 
                className={cn(
                  "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50",
                  balanceType === 'gift_card' && "border-primary bg-primary/5"
                )}
                onClick={() => setBalanceType('gift_card')}
              >
                <RadioGroupItem value="gift_card" id="gift_card" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="gift_card" className="cursor-pointer flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    Gift Card Balance
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Add to client's gift card balance
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="credit-amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
              <Input
                id="credit-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="credit-notes">Notes (optional)</Label>
            <Textarea
              id="credit-notes"
              placeholder="Reason for issuing credit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={issueCredit.isPending || !selectedClientId || !isValidAmount}
          >
            {issueCredit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Issue {formatCurrency(amountNum)} Credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
