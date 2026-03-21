import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useNavigate } from 'react-router-dom';
import { useBoothRenters, type BoothRenterProfile } from '@/hooks/useBoothRenters';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Building2, DollarSign, Calendar } from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { RenterDetailSheet } from './RenterDetailSheet';
import { IssueContractDialog } from './IssueContractDialog';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  inactive: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  terminated: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface RentersTabContentProps {
  organizationId: string;
}

export function RentersTabContent({
  organizationId }: RentersTabContentProps) {
  const { dashPath } = useOrgDashboardPath();
  const { formatDate } = useFormatDate();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedRenter, setSelectedRenter] = useState<BoothRenterProfile | null>(null);
  
  const { data: renters, isLoading } = useBoothRenters(organizationId);

  const handleViewRenter = (renter: BoothRenterProfile) => {
    setSelectedRenter(renter);
    setDetailSheetOpen(true);
  };

  const handleIssueContract = () => {
    setDetailSheetOpen(false);
    setContractDialogOpen(true);
  };

  const filteredRenters = renters?.filter(renter => {
    const matchesSearch = !searchQuery || 
      renter.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      renter.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      renter.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || renter.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const formatRent = (contract: any) => {
    if (!contract) return 'No active contract';
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(contract.rent_amount);
    const freq = contract.rent_frequency === 'monthly' ? '/mo' : '/wk';
    return `${amount}${freq}`;
  };

  const getDueDay = (contract: any) => {
    if (!contract) return '';
    if (contract.rent_frequency === 'monthly') {
      return `Due: ${contract.due_day_of_month}${getOrdinalSuffix(contract.due_day_of_month)} of month`;
    }
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Due: ${days[contract.due_day_of_week]}`;
  };

  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search renters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-2" onClick={() => navigate(dashPath('/admin/onboard-renter'))}>
          <Plus className="h-4 w-4" />
          Onboard Renter
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Renters</p>
            <p className="text-2xl font-medium mt-1">{renters?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
            <p className="text-2xl font-medium mt-1 text-emerald-400">
              {renters?.filter(r => r.status === 'active').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-medium mt-1 text-amber-400">
              {renters?.filter(r => r.status === 'pending').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Revenue</p>
            <p className="text-2xl font-medium mt-1 text-primary">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                renters?.reduce((sum, r) => sum + (r.active_contract?.rent_amount || 0), 0) || 0
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Renters List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredRenters.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchQuery || statusFilter !== 'all' 
              ? 'No renters match your filters'
              : 'No booth renters yet. Add your first renter to get started.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRenters.map((renter) => (
            <Card key={renter.id} className="bg-card/50 hover:bg-card/70 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={renter.photo_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {(renter.display_name || renter.full_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground">
                        {renter.display_name || renter.full_name || 'Unknown'}
                      </h3>
                      <Badge variant="outline" className={statusColors[renter.status]}>
                        {renter.status}
                      </Badge>
                    </div>
                    
                    {renter.business_name && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        {renter.business_name}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-primary">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatRent(renter.active_contract)}
                      </span>
                      {renter.active_contract && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {getDueDay(renter.active_contract)}
                        </span>
                      )}
                      {renter.start_date && (
                        <span className="text-muted-foreground">
                          Started: {formatDate(new Date(renter.start_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size={tokens.button.inline} onClick={() => handleViewRenter(renter)}>
                      View
                    </Button>
                    <Button variant="outline" size={tokens.button.inline} onClick={() => handleViewRenter(renter)}>
                      Payments
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}

      <RenterDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        renterId={selectedRenter?.id || null}
        onIssueContract={handleIssueContract}
      />

      {selectedRenter && (
        <IssueContractDialog
          open={contractDialogOpen}
          onOpenChange={setContractDialogOpen}
          renterId={selectedRenter.id}
          renterName={selectedRenter.display_name || selectedRenter.full_name || 'Renter'}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
