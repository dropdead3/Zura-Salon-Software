import { useState } from 'react';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Mail, Phone, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

export interface AtRiskClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lastVisit: string | null;
  daysSinceVisit: number;
  visitCount: number;
  totalSpend: number;
}

interface AtRiskClientsListProps {
  clients: AtRiskClient[];
}

export function AtRiskClientsList({ clients }: AtRiskClientsListProps) {
  const [showAll, setShowAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  
  const displayedClients = showAll ? clients : clients.slice(0, 10);

  const copyToClipboard = async (text: string, clientId: string, type: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(`${clientId}-${type}`);
      toast.success(`${type === 'email' ? 'Email' : 'Phone'} copied to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSeverityColor = (days: number) => {
    if (days >= 90) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (days >= 75) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  if (clients.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🎉</div>
        <p className="text-lg font-medium text-success-foreground">No at-risk clients!</p>
        <p className="text-sm text-muted-foreground">All your returning clients have visited recently.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
        <div className="col-span-4">Client</div>
        <div className="col-span-2">Last Visit</div>
        <div className="col-span-2">Overdue</div>
        <div className="col-span-2">Contact</div>
        <div className="col-span-1 text-right">Visits</div>
        <div className="col-span-1 text-right">Spend</div>
      </div>

      {/* Client Rows */}
      <div className="space-y-2">
        {displayedClients.map(client => (
          <div 
            key={client.id}
            className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 rounded-lg bg-card-inner hover:bg-muted/50 dark:hover:bg-card/80 transition-colors"
          >
            {/* Client Name */}
            <div className="col-span-1 md:col-span-4 flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{client.name}</p>
                <p className="text-xs text-muted-foreground md:hidden">
                  {client.visitCount} visits · {formatCurrencyWhole(client.totalSpend)}
                </p>
              </div>
            </div>

            {/* Last Visit */}
            <div className="col-span-1 md:col-span-2 flex items-center">
              <span className="md:hidden text-xs text-muted-foreground mr-2">Last visit:</span>
              <span className="text-sm">
                {client.lastVisit ? formatDate(parseISO(client.lastVisit), 'MMM d, yyyy') : 'Unknown'}
              </span>
            </div>

            {/* Days Overdue */}
            <div className="col-span-1 md:col-span-2 flex items-center">
              <Badge className={cn('font-medium', getSeverityColor(client.daysSinceVisit))}>
                {client.daysSinceVisit} days
              </Badge>
            </div>

            {/* Contact */}
            <div className="col-span-1 md:col-span-2 flex items-center gap-2">
              {client.email && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(client.email!, client.id, 'email'}
                  title={client.email}
                >
                  {copiedId === `${client.id}-email` ? (
                    <Check className="h-4 w-4 text-success-foreground" />
                  ) : (
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              )}
              {client.phone && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(client.phone!, client.id, 'phone'}
                  title={client.phone}
                >
                  {copiedId === `${client.id}-phone` ? (
                    <Check className="h-4 w-4 text-success-foreground" />
                  ) : (
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              )}
              {!client.email && !client.phone && (
                <span className="text-xs text-muted-foreground">No contact info</span>
              )}
            </div>

            {/* Visits - Desktop only */}
            <div className="hidden md:flex col-span-1 items-center justify-end">
              <span className="text-sm">{client.visitCount}</span>
            </div>

            {/* Spend - Desktop only */}
            <div className="hidden md:flex col-span-1 items-center justify-end">
              <span className="text-sm font-medium">{formatCurrencyWhole(client.totalSpend)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {clients.length > 10 && (
        <div className="text-center pt-2">
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="gap-2"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show All ({clients.length} clients)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
