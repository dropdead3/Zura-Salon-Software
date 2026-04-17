import { differenceInDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Star, 
  Calendar, 
  Clock, 
  TrendingUp,
  User,
  MapPin,
  CheckCircle,
  Cake,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VisitHistoryTimeline } from '@/components/dashboard/VisitHistoryTimeline';
import { ClientNotesSection } from '@/components/dashboard/ClientNotesSection';
import { useClientVisitHistory } from '@/hooks/useClientVisitHistory';
import { ClientAffinityBadges } from '@/components/dashboard/clients/ClientAffinityBadges';
import { ClientAboutCard } from '@/components/dashboard/clients/ClientAboutCard';
import { ClientCallbacksPanel } from '@/components/dashboard/clients/ClientCallbacksPanel';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ExtendedPhorestClient {
  id: string;
  phorest_client_id: string;
  name: string;
  first_name?: string | null;
  email: string | null;
  phone: string | null;
  preferred_stylist_id: string | null;
  visit_count?: number;
  last_visit?: string | null;
  total_spend?: number | null;
  is_vip?: boolean;
  branch_name?: string | null;
  birthday?: string | null;
  client_since?: string | null;
}

interface ClientProfileViewProps {
  client: ExtendedPhorestClient;
  onBack: () => void;
  onSelect: (client: ExtendedPhorestClient) => void;
}

export function ClientProfileView({ client, onBack, onSelect }: ClientProfileViewProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { selectedOrganization } = useOrganizationContext();
  const organizationId = selectedOrganization?.id;
  const clientFirstName = client.first_name || client.name?.split(' ')[0] || null;
  const { data: visitHistory = [], isLoading: historyLoading } = useClientVisitHistory(client.phorest_client_id);

  const initials = client.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const daysSinceVisit = client.last_visit 
    ? differenceInDays(new Date(), new Date(client.last_visit))
    : null;

  // Get last visit details from history
  const lastVisit = visitHistory.length > 0 ? visitHistory[0] : null;

  return (
    <div className="flex flex-col" style={{ height: '400px' }}>
      {/* Client Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 bg-primary/10">
            <AvatarFallback className="text-sm font-medium text-primary bg-primary/10">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{client.name}</span>
              {client.is_vip && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-[10px] px-1.5 py-0">
                  <Star className="w-2.5 h-2.5 mr-0.5" /> VIP
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {client.phone || client.email || 'No contact info'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-border">
        <Card className="p-2 text-center bg-muted/30 border-0">
          <Calendar className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
          <p className="font-medium text-sm">{client.visit_count ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Visits</p>
        </Card>
        <Card className="p-2 text-center bg-muted/30 border-0">
          <TrendingUp className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
          <p className="font-medium text-sm">{formatCurrencyWhole(client.total_spend ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground">Spent</p>
        </Card>
        <Card className="p-2 text-center bg-muted/30 border-0">
          <Clock className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
          <p className={cn(
            "font-medium text-sm",
            daysSinceVisit && daysSinceVisit > 60 && "text-destructive",
            daysSinceVisit && daysSinceVisit > 30 && daysSinceVisit <= 60 && "text-amber-600"
          )}>
            {daysSinceVisit !== null ? `${daysSinceVisit}d` : 'N/A'}
          </p>
          <p className="text-[10px] text-muted-foreground">Since Visit</p>
        </Card>
      </div>

      {/* Product Affinity */}
      <div className="px-4 py-2 border-b border-border">
        <ClientAffinityBadges phorestClientId={client.phorest_client_id} compact />
      </div>

      {/* Hospitality: callbacks + about */}
      <div className="px-4 py-3 border-b border-border space-y-3">
        <ClientCallbacksPanel
          organizationId={organizationId}
          clientId={client.phorest_client_id}
          clientFirstName={clientFirstName}
          hidePast
          compact
        />
        <ClientAboutCard
          organizationId={organizationId}
          clientId={client.phorest_client_id}
          clientFirstName={clientFirstName}
          compact
        />
      </div>

      {/* Last Visit & Personal Info */}
      {(lastVisit || client.birthday || client.client_since) && (
        <div className="px-4 py-2 border-b border-border bg-muted/20">
          {lastVisit && (
            <>
              <p className="text-[10px] font-display uppercase font-medium text-muted-foreground mb-1">Last Visit</p>
              <div className="flex items-center gap-3 text-xs mb-1.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  {formatDate(new Date(lastVisit.appointment_date), 'MMM d, yyyy')}
                </span>
                {lastVisit.stylist_name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-muted-foreground" />
                    {lastVisit.stylist_name}
                  </span>
                )}
                {client.branch_name && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {client.branch_name}
                  </span>
                )}
              </div>
            </>
          )}
          <div className="flex items-center gap-3 text-xs">
            {client.birthday && (
              <span className="flex items-center gap-1">
                <Cake className="w-3 h-3 text-muted-foreground" />
                {formatDate(new Date(client.birthday + 'T00:00:00'), 'MMM d')}
              </span>
            )}
            {client.client_since && (
              <span className="flex items-center gap-1">
                <Award className="w-3 h-3 text-muted-foreground" />
                Since {formatDate(new Date(client.client_since + 'T00:00:00'), 'MMM yyyy')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabs for History and Notes */}
      <Tabs defaultValue="history" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="history" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs"
          >
            History
          </TabsTrigger>
          <TabsTrigger 
            value="notes" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs"
          >
            Notes
          </TabsTrigger>
        </TabsList>
        
        <ScrollArea className="flex-1">
          <TabsContent value="history" className="mt-0 p-3">
            <VisitHistoryTimeline 
              visits={visitHistory.slice(0, 10)} 
              isLoading={historyLoading} 
            />
          </TabsContent>
          
          <TabsContent value="notes" className="mt-0 p-3">
            <ClientNotesSection clientId={client.id} />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Select Button */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <Button 
          className="w-full" 
          onClick={() => onSelect(client)}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Select This Client
        </Button>
      </div>
    </div>
  );
}
