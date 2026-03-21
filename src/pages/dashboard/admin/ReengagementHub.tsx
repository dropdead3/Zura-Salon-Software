import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  Plus, 
  Users, 
  TrendingUp, 
  Mail, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { 
  useReengagementCampaigns, 
  useCreateCampaign,
  useUpdateCampaign,
  useAtRiskClients,
  useCampaignStats,
  type ReengagementCampaign
} from '@/hooks/useReengagementCampaigns';
import { useFormatDate } from '@/hooks/useFormatDate';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function CampaignCard({ campaign }: { campaign: ReengagementCampaign }) {
  const { data: stats } = useCampaignStats(campaign.id);
  const updateCampaign = useUpdateCampaign();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{campaign.name}</CardTitle>
            <CardDescription className="text-xs">
              Inactive for {campaign.inactivity_days}+ days
            </CardDescription>
          </div>
          <Switch 
            checked={campaign.is_active}
            onCheckedChange={(checked) => 
              updateCampaign.mutate({ id: campaign.id, updates: { is_active: checked } })
            }
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {campaign.offer_type && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{campaign.offer_type}</Badge>
            <span className="text-sm text-muted-foreground">{campaign.offer_value}</span>
          </div>
        )}
        
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="font-medium">{stats.totalOutreach}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <div>
              <p className="font-medium">{stats.converted}</p>
              <p className="text-xs text-muted-foreground">Converted</p>
            </div>
            <div>
              <p className="font-medium text-green-600">{stats.conversionRate}%</p>
              <p className="text-xs text-muted-foreground">Rate</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewCampaignDialog({ organizationId }: { organizationId?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [inactivityDays, setInactivityDays] = useState(60);
  const [offerType, setOfferType] = useState('');
  const [offerValue, setOfferValue] = useState('');
  
  const createCampaign = useCreateCampaign();

  const handleSubmit = async () => {
    if (!organizationId || !name) return;
    
    await createCampaign.mutateAsync({
      organization_id: organizationId,
      name,
      inactivity_days: inactivityDays,
      offer_type: offerType || null,
      offer_value: offerValue || null,
    });
    
    setOpen(false);
    setName('');
    setInactivityDays(60);
    setOfferType('');
    setOfferValue('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Re-engagement Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input 
              id="name" 
              placeholder="e.g., 60-Day Win Back" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="days">Inactivity Threshold (days)</Label>
            <Input 
              id="days" 
              type="number" 
              value={inactivityDays}
              onChange={(e) => setInactivityDays(parseInt(e.target.value) || 60)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="offerType">Offer Type (optional)</Label>
            <Input 
              id="offerType" 
              placeholder="e.g., discount, bonus_points" 
              value={offerType}
              onChange={(e) => setOfferType(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="offerValue">Offer Value (optional)</Label>
            <Input 
              id="offerValue" 
              placeholder="e.g., 15% off, 100 bonus points" 
              value={offerValue}
              onChange={(e) => setOfferValue(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={!name || createCampaign.isPending}
            className="w-full"
          >
            {createCampaign.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create Campaign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ReengagementHub() {
  const { formatDate } = useFormatDate();
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;
  const [activeTab, setActiveTab] = useState('campaigns');
  const [inactivityThreshold, setInactivityThreshold] = useState(60);

  const { data: campaigns, isLoading: campaignsLoading } = useReengagementCampaigns(organizationId);
  const { data: atRiskClients, isLoading: clientsLoading } = useAtRiskClients(organizationId, inactivityThreshold);

  const activeCampaigns = campaigns?.filter(c => c.is_active) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
              <Link to="/dashboard/admin/management">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-2xl font-medium flex items-center gap-2">
                <RefreshCw className="h-6 w-6 text-primary" />
                Client Re-engagement
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Win back inactive clients with automated outreach
              </p>
            </div>
          </div>
          <NewCampaignDialog organizationId={organizationId} />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Active Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-medium">{activeCampaigns.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                At-Risk Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-medium">{atRiskClients?.length || 0}</p>
              <p className="text-xs text-muted-foreground">
                Inactive 60+ days
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-medium">--</p>
              <p className="text-xs text-muted-foreground">
                Across all campaigns
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="campaigns" className="gap-2">
              <Mail className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="at-risk" className="gap-2">
              <Users className="h-4 w-4" />
              At-Risk Clients
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-6">
            {campaignsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns?.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map(campaign => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No campaigns yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first re-engagement campaign to start winning back clients
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="at-risk" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Clients Inactive {inactivityThreshold}+ Days
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="threshold" className="text-xs">Threshold:</Label>
                    <Input 
                      id="threshold"
                      type="number"
                      className="w-20 h-8"
                      value={inactivityThreshold}
                      onChange={(e) => setInactivityThreshold(parseInt(e.target.value) || 60)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {clientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : atRiskClients?.length ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {atRiskClients.map((client: any) => (
                        <div 
                          key={client.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {client.email || 'No email'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {client.last_visit ? formatDate(new Date(client.last_visit), 'MMM d, yyyy') : 'Never'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {client.visit_count} total visits
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No at-risk clients found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All clients have visited within the last {inactivityThreshold} days
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
