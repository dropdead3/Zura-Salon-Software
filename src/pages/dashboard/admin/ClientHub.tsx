import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import {
  Users,
  Brain,
  MessageSquarePlus,
  UserCheck,
  GitMerge,
  ChevronRight,
} from 'lucide-react';

interface HubCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function HubCard({ href, icon: Icon, title, description }: HubCardProps) {
  return (
    <Link to={href}>
      <Card className={cn(tokens.card.wrapper, "group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50")}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn(tokens.card.iconBox, "shrink-0")}>
                <Icon className={tokens.card.icon} />
              </div>
              <div className="flex-1">
                <h3 className="font-sans text-sm font-medium">{title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ClientHub() {
  return (
    <DashboardLayout>
      <div className={cn(tokens.layout.pageContainer, "max-w-[1600px] mx-auto")}>
        <DashboardPageHeader
          title="Client Hub"
          description="Client management, health tracking, and engagement"
        />

        <div className="space-y-3">
          <h2 className="font-display text-sm tracking-wide text-muted-foreground uppercase">Client Management</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <HubCard
              href="/dashboard/clients"
              icon={Users}
              title="Client Directory"
              description="Browse, search, and manage all client profiles"
            />
            <HubCard
              href="/dashboard/admin/client-health"
              icon={Brain}
              title="Client Health Hub"
              description="At-risk clients, rebooking, win-back outreach, and more"
            />
            <HubCard
              href="/dashboard/admin/feedback"
              icon={MessageSquarePlus}
              title="Feedback Hub"
              description="Client surveys, reviews, and NPS tracking"
            />
            <HubCard
              href="/dashboard/admin/reengagement"
              icon={UserCheck}
              title="Re-engagement"
              description="Win-back campaigns for inactive clients"
            />
            <HubCard
              href="/dashboard/admin/merge-clients"
              icon={GitMerge}
              title="Merge Clients"
              description="Deduplicate and consolidate client profiles safely"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
