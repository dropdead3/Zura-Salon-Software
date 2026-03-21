import { useState } from 'react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import { 
  useMarketingCampaigns, 
  useCreateCampaign, 
  useUpdateCampaign, 
  useDeleteCampaign,
  MarketingCampaign,
  CreateCampaignInput
} from '@/hooks/useMarketingCampaigns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CampaignBudgetManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORMS = [
  { value: 'google', label: 'Google Ads' },
  { value: 'meta', label: 'Meta (FB/IG)' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'yelp', label: 'Yelp' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
];

export function CampaignBudgetManager({ open, onOpenChange }: CampaignBudgetManagerProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { data: campaigns = [], isLoading } = useMarketingCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateCampaignInput>({
    campaign_name: '',
    utm_campaign: '',
    platform: '',
    budget: undefined,
    spend_to_date: 0,
    is_active: true,
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      campaign_name: '',
      utm_campaign: '',
      platform: '',
      budget: undefined,
      spend_to_date: 0,
      is_active: true,
      notes: '',
    });
    setEditingCampaign(null);
    setShowForm(false);
  };

  const handleEdit = (campaign: MarketingCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      campaign_name: campaign.campaign_name,
      utm_campaign: campaign.utm_campaign,
      platform: campaign.platform || '',
      budget: campaign.budget || undefined,
      spend_to_date: campaign.spend_to_date || 0,
      is_active: campaign.is_active,
      notes: campaign.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.campaign_name || !formData.utm_campaign) {
      return;
    }

    if (editingCampaign) {
      await updateCampaign.mutateAsync({
        id: editingCampaign.id,
        ...formData,
      });
    } else {
      await createCampaign.mutateAsync(formData);
    }
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteCampaign.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend_to_date || 0), 0);

  return (
    <>
      <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="720px">
        <div className="p-5 pb-3 border-b border-border/40">
          <h2 className="font-display text-sm tracking-wide uppercase">Manage Campaigns</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track budgets and spend for your marketing campaigns. Link campaigns to UTM parameters for ROI tracking.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Budget</span>
                </div>
                <p className="text-2xl font-medium tabular-nums mt-1">
                  {formatCurrencyWhole(totalBudget)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Spend</span>
                </div>
                <p className="text-2xl font-medium tabular-nums mt-1">
                  {formatCurrencyWhole(totalSpend)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Add/Edit Form */}
          {showForm ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {editingCampaign ? 'Edit Campaign' : 'Add Campaign'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign_name">Campaign Name *</Label>
                    <Input
                      id="campaign_name"
                      value={formData.campaign_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, campaign_name: e.target.value }))}
                      placeholder="Summer Promo 2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utm_campaign">UTM Campaign *</Label>
                    <Input
                      id="utm_campaign"
                      value={formData.utm_campaign}
                      onChange={(e) => setFormData(prev => ({ ...prev, utm_campaign: e.target.value }))}
                      placeholder="summer_promo_2025"
                      disabled={!!editingCampaign}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select 
                      value={formData.platform} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, platform: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label>Active</Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget ($)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget ?? ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        budget: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      placeholder="5000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spend_to_date">Spend to Date ($)</Label>
                    <Input
                      id="spend_to_date"
                      type="number"
                      value={formData.spend_to_date ?? ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        spend_to_date: e.target.value ? parseFloat(e.target.value) : 0 
                      }))}
                      placeholder="1250"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Campaign details, targeting info, etc."
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.campaign_name || !formData.utm_campaign || createCampaign.isPending || updateCampaign.isPending}
                  >
                    {editingCampaign ? 'Update' : 'Create'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Campaign
            </Button>
          )}

          {/* Campaigns List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaigns ({campaigns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading campaigns...</p>
              ) : campaigns.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No campaigns yet. Add one to start tracking budgets.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead className="text-right">Spend</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{campaign.campaign_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {campaign.utm_campaign}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {campaign.platform ? (
                              <Badge variant="secondary">
                                {PLATFORMS.find(p => p.value === campaign.platform)?.label || campaign.platform}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {campaign.budget ? formatCurrencyWhole(campaign.budget) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrencyWhole(campaign.spend_to_date || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEdit(campaign)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirm(campaign.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="p-5 pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </PremiumFloatingPanel>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the campaign from tracking. Lead data associated with this UTM campaign will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
