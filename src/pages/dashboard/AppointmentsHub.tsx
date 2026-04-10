import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { tokens } from '@/lib/design-tokens';

import { AppointmentsList } from '@/components/dashboard/appointments-hub/AppointmentsList';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { PageExplainer } from '@/components/ui/PageExplainer';

export default function AppointmentsHub() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  return (
    <DashboardLayout>
      <div className={tokens.layout.pageContainer}>
        <DashboardPageHeader
          title="Appointments"
          description="View, filter, and manage appointment records. Use batch actions to update statuses or export data."
        />
        <PageExplainer pageId="appointments-hub" />

        <AppointmentsList search={search} onSearchChange={setSearch} />
      </div>
    </DashboardLayout>
  );
}
