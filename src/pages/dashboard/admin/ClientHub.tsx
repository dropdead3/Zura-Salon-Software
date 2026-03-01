import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
  colorClass?: string;
}

function HubCard({ href, icon: Icon, title, description, colorClass = 'bg-primary/10 text-primary' }: HubCardProps) {
  return (
    <Link to={href}>
      <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn("p-2.5 rounded-xl shrink-0", colorClass)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate">{title}</h3>
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
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
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
              colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <HubCard
              href="/dashboard/admin/client-health"
              icon={Brain}
              title="Client Health Hub"
              description="At-risk clients, rebooking, win-back outreach, and more"
              colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            />
            <HubCard
              href="/dashboard/admin/feedback"
              icon={MessageSquarePlus}
              title="Feedback Hub"
              description="Client surveys, reviews, and NPS tracking"
              colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <HubCard
              href="/dashboard/admin/reengagement"
              icon={UserCheck}
              title="Re-engagement"
              description="Win-back campaigns for inactive clients"
              colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
            />
            <HubCard
              href="/dashboard/admin/merge-clients"
              icon={GitMerge}
              title="Merge Clients"
              description="Deduplicate and consolidate client profiles safely"
              colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
