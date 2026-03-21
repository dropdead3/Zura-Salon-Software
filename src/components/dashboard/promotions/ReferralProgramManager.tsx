import { useState } from 'react';
import { 
  useReferralLinks, 
  useReferralConversions, 
  useCreateReferralLink, 
  useDeactivateReferralLink,
  useReferralLeaderboard,
  ReferralLink,
  CreateReferralLinkData 
} from '@/hooks/useReferralProgram';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { format } from 'date-fns';
import { Plus, Link2, Users, Trophy, Copy, Check, ExternalLink, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';

interface ReferralProgramManagerProps {
  organizationId: string;
}

export function ReferralProgramManager({ organizationId }: ReferralProgramManagerProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { data: referralLinks, isLoading } = useReferralLinks(organizationId);
  const { data: leaderboard } = useReferralLeaderboard(organizationId);
  const createLink = useCreateReferralLink();
  const deactivateLink = useDeactivateReferralLink();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<ReferralLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { register, handleSubmit, control, reset } = useForm<CreateReferralLinkData>({
    defaultValues: {
      organization_id: organizationId,
      reward_type: 'credit',
      referrer_reward_value: 25,
      referee_reward_value: 25,
    },
  });

  const handleCopyLink = (code: string, id: string) => {
    const referralUrl = `${window.location.origin}/refer/${code}`;
    navigator.clipboard.writeText(referralUrl);
    setCopiedId(id);
    toast.success('Referral link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Referral code copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const onSubmit = async (data: CreateReferralLinkData) => {
    await createLink.mutateAsync(data);
    setIsCreateOpen(false);
    reset();
  };

  const handleDeactivate = async (linkId: string) => {
    if (confirm('Are you sure you want to deactivate this referral link?')) {
      await deactivateLink.mutateAsync(linkId);
    }
  };

  const activeLinks = referralLinks?.filter(l => l.is_active) || [];
  const inactiveLinks = referralLinks?.filter(l => !l.is_active) || [];

  const totalConversions = referralLinks?.reduce((sum, l) => sum + (l.conversions_count || 0), 0) || 0;
  const totalRevenue = referralLinks?.reduce((sum, l) => sum + (l.total_revenue || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-medium">{activeLinks.length}</div>
            <p className="text-sm text-muted-foreground">Active Links</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-medium">{totalConversions}</div>
            <p className="text-sm text-muted-foreground">Total Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-medium">{formatCurrencyWhole(totalRevenue)}</div>
            <p className="text-sm text-muted-foreground">Revenue Generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-medium">
              {totalConversions > 0 ? formatCurrencyWhole(totalRevenue / totalConversions) : formatCurrencyWhole(0)}
            </div>
            <p className="text-sm text-muted-foreground">Avg. Referral Value</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="links" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="links" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Referral Links
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Referral Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Referral Link</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Campaign Name (Optional)</Label>
                  <Input {...register('campaign_name')} placeholder="e.g., Summer 2024 Referral Program" />
                </div>

                <div className="space-y-2">
                  <Label>Reward Type</Label>
                  <Controller
                    name="reward_type"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Salon Credit</SelectItem>
                          <SelectItem value="voucher">Gift Voucher</SelectItem>
                          <SelectItem value="discount">Discount Code</SelectItem>
                          <SelectItem value="points">Loyalty Points</SelectItem>
                          <SelectItem value="free_service">Free Service</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Referrer Reward</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        className="pl-7"
                        {...register('referrer_reward_value', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>New Client Reward</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        className="pl-7"
                        {...register('referee_reward_value', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Referrer Reward Description</Label>
                  <Input 
                    {...register('referrer_reward_description')} 
                    placeholder="e.g., $25 credit on your next visit"
                  />
                </div>

                <div className="space-y-2">
                  <Label>New Client Reward Description</Label>
                  <Input 
                    {...register('referee_reward_description')} 
                    placeholder="e.g., $25 off your first service"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Uses (Optional)</Label>
                  <Input
                    type="number"
                    {...register('max_uses', { valueAsNumber: true })}
                    placeholder="Unlimited if left empty"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Terms & Conditions</Label>
                  <Textarea
                    {...register('terms_conditions')}
                    placeholder="Enter any terms and conditions..."
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLink.isPending}>
                    Create Link
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="links" className="space-y-4">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {activeLinks.map((link) => (
                <Card key={link.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                            {link.referral_code}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => handleCopyCode(link.referral_code, link.id)}
                          >
                            {copiedId === link.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                          <Badge variant="outline">{link.reward_type}</Badge>
                        </div>
                        {link.campaign_name && (
                          <p className="text-sm font-medium">{link.campaign_name}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{link.uses} uses</span>
                          {link.max_uses && <span>/ {link.max_uses} max</span>}
                          <span>•</span>
                          <span>{link.conversions_count || 0} conversions</span>
                          <span>•</span>
                          <span>{formatCurrencyWhole(link.total_revenue || 0)} revenue</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyLink(link.referral_code, link.id)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Copy Link
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeactivate(link.id)}
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {activeLinks.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Link2 className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No active referral links</p>
                    <Button size={tokens.button.inline} variant="link" onClick={() => setIsCreateOpen(true)}>
                      Create your first referral link
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top Referrers
              </CardTitle>
              <CardDescription>Clients who have brought in the most referrals</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard && leaderboard.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Referrer</TableHead>
                      <TableHead className="text-right">Referrals</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry, index) => (
                      <TableRow key={entry.referrer_id}>
                        <TableCell>
                          {index === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                          {index === 1 && <Trophy className="h-4 w-4 text-gray-400" />}
                          {index === 2 && <Trophy className="h-4 w-4 text-amber-700" />}
                          {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {entry.type === 'client' ? 'Client' : 'Staff'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{entry.count}</TableCell>
                        <TableCell className="text-right">{formatCurrencyWhole(entry.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No referral data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
