import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { WaitlistTable } from '@/components/dashboard/waitlist/WaitlistTable';
import { AddWaitlistEntryDialog } from '@/components/dashboard/waitlist/AddWaitlistEntryDialog';
import { useWaitlistEntries, type WaitlistFilters } from '@/hooks/useWaitlist';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';

export default function Waitlist() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const filters: WaitlistFilters = {
    status: statusFilter === 'active' ? undefined : statusFilter,
  };

  const { data: entries = [], isLoading } = useWaitlistEntries(orgId, filters);

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Cancellation Waitlist"
          actions={
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="offered">Offered</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button size={tokens.button.page} onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add to Waitlist
              </Button>
            </div>
          }
        />

        <WaitlistTable entries={entries} isLoading={isLoading} />

        {orgId && (
          <AddWaitlistEntryDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            organizationId={orgId}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
