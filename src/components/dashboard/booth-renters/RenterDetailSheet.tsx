import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBoothRenter, useUpdateBoothRenter, type BoothRenterProfile } from '@/hooks/useBoothRenters';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFormatDate } from '@/hooks/useFormatDate';
import { tokens } from '@/lib/design-tokens';
import {
  User,
  FileText,
  CreditCard,
  Shield,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Edit2,
  Save,
  X,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  inactive: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  terminated: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface RenterDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renterId: string | null;
  onIssueContract: () => void;
}

export function RenterDetailSheet({
  open,
  onOpenChange,
  renterId,
  onIssueContract,
}: RenterDetailSheetProps) {
  const { formatDate } = useFormatDate();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<BoothRenterProfile>>({});

  const { data: renter, isLoading } = useBoothRenter(renterId || undefined);
  const updateRenter = useUpdateBoothRenter();

  // Fetch contracts
  const { data: contracts = [] } = useQuery({
    queryKey: ['renter-contracts', renterId],
    queryFn: async () => {
      const { data } = await supabase
        .from('booth_rental_contracts' as any)
        .select('*')
        .eq('booth_renter_id', renterId!)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!renterId && activeTab === 'contracts',
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ['renter-payments', renterId],
    queryFn: async () => {
      const { data } = await supabase
        .from('rent_invoices' as any)
        .select('*')
        .eq('booth_renter_id', renterId!)
        .order('due_date', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!renterId && activeTab === 'payments',
  });

  const handleSaveProfile = async () => {
    if (!renterId) return;
    await updateRenter.mutateAsync({
      id: renterId,
      ...editData,
    });
    setIsEditing(false);
    setEditData({});
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (!renterId) return null;

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="640px">
      <div className="p-5 pb-4 border-b border-border/40">
        {isLoading ? (
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ) : renter ? (
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={renter.photo_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                {(renter.display_name || renter.full_name || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="flex items-center gap-2 font-display text-sm tracking-wide uppercase">
                {renter.display_name || renter.full_name || 'Unknown'}
                <Badge variant="outline" className={statusColors[renter.status]}>
                  {renter.status}
                </Badge>
              </h2>
              <p className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                {renter.business_name && (
                  <>
                    <Building2 className="h-3.5 w-3.5" />
                    {renter.business_name}
                  </>
                )}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-1.5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Contracts</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="insurance" className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Insurance</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            {renter && (
              <>
                <div className="flex justify-end">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size={tokens.button.card}
                        onClick={() => {
                          setIsEditing(false);
                          setEditData({});
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size={tokens.button.card}
                        onClick={handleSaveProfile}
                        disabled={updateRenter.isPending}
                      >
                        {updateRenter.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size={tokens.button.card} onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Business Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isEditing ? (
                      <>
                        <div className="space-y-2">
                          <Label>Business Name</Label>
                          <Input
                            defaultValue={renter.business_name || ''}
                            onChange={(e) => setEditData({ ...editData, business_name: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>License Number</Label>
                            <Input
                              defaultValue={renter.business_license_number || ''}
                              onChange={(e) => setEditData({ ...editData, business_license_number: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>License State</Label>
                            <Input
                              defaultValue={renter.license_state || ''}
                              onChange={(e) => setEditData({ ...editData, license_state: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>EIN Number</Label>
                          <Input
                            defaultValue={renter.ein_number || ''}
                            onChange={(e) => setEditData({ ...editData, ein_number: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            defaultValue={renter.status}
                            onValueChange={(value) => setEditData({ ...editData, status: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="terminated">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">License #</p>
                          <p>{renter.business_license_number || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">State</p>
                          <p>{renter.license_state || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">EIN</p>
                          <p>{renter.ein_number || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Start Date</p>
                          <p>{renter.start_date ? formatDate(new Date(renter.start_date), 'MMM d, yyyy') : '—'}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Billing Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{renter.billing_email || renter.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{renter.billing_phone || '—'}</span>
                    </div>
                    {renter.billing_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p>{renter.billing_address.street}</p>
                          <p>
                            {renter.billing_address.city}, {renter.billing_address.state} {renter.billing_address.zip}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button size={tokens.button.card} onClick={onIssueContract}>
                <FileText className="h-4 w-4 mr-1" />
                Issue Contract
              </Button>
            </div>

            {contracts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No contracts found
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {contracts.map((contract: any) => (
                  <Card key={contract.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{contract.contract_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(new Date(contract.start_date), 'MMM d, yyyy')}
                            {contract.end_date && ` - ${formatDate(new Date(contract.end_date), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                        <Badge variant="outline" className={statusColors[contract.status] || statusColors.pending}>
                          {contract.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1 text-primary">
                          <DollarSign className="h-3.5 w-3.5" />
                          {formatCurrency(contract.rent_amount)}/{contract.rent_frequency === 'monthly' ? 'mo' : 'wk'}
                        </span>
                        {contract.security_deposit && (
                          <span className="text-muted-foreground">
                            Deposit: {formatCurrency(contract.security_deposit)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4 mt-4">
            {payments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No payment history
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {payments.map((payment: any) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {formatDate(new Date(payment.due_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          payment.status === 'paid'
                            ? statusColors.active
                            : payment.status === 'overdue'
                            ? statusColors.terminated
                            : statusColors.pending
                        }
                      >
                        {payment.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance" className="space-y-4 mt-4">
            {renter && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Liability Insurance
                  </CardTitle>
                  <CardDescription>
                    Insurance verification status for booth renter
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    {(renter as any).insurance_verified ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                        Not Verified
                      </Badge>
                    )}
                  </div>
                  {/* Additional insurance UI would go here */}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PremiumFloatingPanel>
  );
}
