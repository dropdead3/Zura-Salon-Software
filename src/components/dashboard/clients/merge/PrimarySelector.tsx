import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Crown, Mail, Phone } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useClientRecordCounts } from '@/hooks/useClientMerge';
import type { MergeClient } from './MergeWizard';

interface PrimarySelectorProps {
  clients: MergeClient[];
  primaryClientId: string | null;
  onSelectPrimary: (id: string) => void;
}

export function PrimarySelector({ clients, primaryClientId, onSelectPrimary }: PrimarySelectorProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { data: recordCounts } = useClientRecordCounts(clients.map(c => c.id));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The primary client keeps their ID. All records from secondary profiles will be merged into this client.
      </p>

      <RadioGroup value={primaryClientId || ''} onValueChange={onSelectPrimary}>
        <div className="grid gap-3">
          {clients.map(client => {
            const counts = recordCounts?.[client.id];
            const isPrimary = primaryClientId === client.id;

            return (
              <Label
                key={client.id}
                htmlFor={`primary-${client.id}`}
                className="cursor-pointer"
              >
                <Card className={`transition-all ${isPrimary ? 'border-primary ring-1 ring-primary' : 'hover:border-muted-foreground/30'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value={client.id} id={`primary-${client.id}`} className="mt-1" />
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="font-display text-sm bg-primary/10">
                          {client.first_name?.[0]}{client.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {client.first_name} {client.last_name}
                          </p>
                          {isPrimary && (
                            <Badge className="gap-1 bg-primary/10 text-primary border-0">
                              <Crown className="w-3 h-3" /> Primary
                            </Badge>
                          )}
                          {client.is_vip && (
                            <Badge variant="secondary" className="text-xs">VIP</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {client.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {client.email}
                            </span>
                          )}
                          {(client.mobile || client.phone) && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {client.mobile || client.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span>{formatCurrencyWhole(Number(client.total_spend || 0))} total spend</span>
                          <span>{client.visit_count || 0} visits</span>
                          {counts && (
                            <span>{counts.appointments} appointments</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
}
