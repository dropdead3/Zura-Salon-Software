import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Trash2, Star } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useClientCardsOnFile, useDeleteClientCard, useSetDefaultCard, type ClientCard } from '@/hooks/useDepositData';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface PaymentMethodsCardProps {
  clientId?: string;
  orgId?: string;
}

function isCardExpired(card: ClientCard): boolean {
  if (!card.card_exp_month || !card.card_exp_year) return false;
  const now = new Date();
  const expYear = card.card_exp_year < 100 ? 2000 + card.card_exp_year : card.card_exp_year;
  // Card expires at the end of the exp month
  const expDate = new Date(expYear, card.card_exp_month, 0); // last day of exp month
  return now > expDate;
}

export function PaymentMethodsCard({ clientId, orgId }: PaymentMethodsCardProps) {
  const { data: cards, isLoading } = useClientCardsOnFile(clientId);
  const deleteCard = useDeleteClientCard();
  const setDefault = useSetDefaultCard();

  if (!clientId || !orgId) return null;
  if (isLoading) return null;
  if (!cards || cards.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
      <Card className="bg-card/80 backdrop-blur-xl border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-muted rounded-md flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
            </div>
            <CardTitle className={tokens.heading.subsection}>Payment Methods</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {cards.map((card) => {
            const expired = isCardExpired(card);
            return (
              <div key={card.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="capitalize">{card.card_brand || 'Card'}</span>
                  <span className="text-muted-foreground">····{card.card_last4}</span>
                  {card.card_exp_month && card.card_exp_year && (
                    <span className={cn("text-xs", expired ? "text-destructive" : "text-muted-foreground")}>
                      {String(card.card_exp_month).padStart(2, '0')}/{String(card.card_exp_year).slice(-2)}
                    </span>
                  )}
                  {expired && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Expired</Badge>
                  )}
                  {card.is_default && !expired && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Default</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!card.is_default && !expired && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground"
                      onClick={() => setDefault.mutate({ cardId: card.id, clientId: clientId!, orgId: orgId! })}
                      disabled={setDefault.isPending}
                    >
                      <Star className="w-3 h-3" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive/70 hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Card</AlertDialogTitle>
                        <AlertDialogDescription>
                          Remove the card ending in {card.card_last4}? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCard.mutate({ cardId: card.id, organizationId: orgId! })}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
