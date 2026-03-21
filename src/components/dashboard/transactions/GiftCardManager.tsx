import { useState } from 'react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Gift, 
  Plus, 
  Search, 
  Copy, 
  Check,
  Loader2,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { useGiftCards, useCreateGiftCard, GiftCard } from '@/hooks/useGiftCards';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

export function GiftCardManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

    const result = await createGiftCard.mutateAsync({
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
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Gift Cards</p>
          <p className="text-2xl font-display font-medium">{giftCards.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Cards</p>
          <p className="text-2xl font-display font-medium">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Outstanding Balance</p>
          <p className="text-2xl font-display font-medium">{formatCurrency(totalValue)}</p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by gift card code..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="pl-9"
          />
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Gift Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Gift Card</DialogTitle>
              <DialogDescription>
                Generate a new gift card with a unique code
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="gc-amount">Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
                  <Input
                    id="gc-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaser">Purchaser Name (optional)</Label>
                <Input
                  id="purchaser"
                  placeholder="Who purchased this gift card?"
                  value={purchaserName}
                  onChange={(e) => setPurchaserName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Name (optional)</Label>
                <Input
                  id="recipient"
                  placeholder="Who is this gift card for?"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={createGiftCard.isPending || !newAmount || parseFloat(newAmount) <= 0}
              >
                {createGiftCard.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Gift Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Gift Cards Table */}
      <Card className="overflow-hidden">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredCards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {searchCode ? 'No gift cards match your search' : 'No gift cards created yet'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {card.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyCode(card.code)}
                      >
                        {copiedCode === card.code ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(Number(card.initial_amount))}
                  </TableCell>
                  <TableCell className={cn(
                    "font-medium",
                    Number(card.current_balance) === 0 && "text-muted-foreground"
                  )}>
                    {formatCurrency(Number(card.current_balance))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {card.purchaser_name || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {card.recipient_name || '-'}
                  </TableCell>
                  <TableCell>
                    {!card.is_active ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : Number(card.current_balance) === 0 ? (
                      <Badge variant="outline" className="text-muted-foreground">Redeemed</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(new Date(card.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
