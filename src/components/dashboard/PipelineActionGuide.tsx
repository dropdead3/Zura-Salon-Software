import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DRILLDOWN_DIALOG_CONTENT_CLASS, DRILLDOWN_OVERLAY_CLASS } from '@/components/dashboard/drilldownDialogStyles';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Tag, UserCheck, Globe, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipelineActionGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forwardCount?: number;
}

const ACTIONS = [
  {
    icon: Megaphone,
    title: 'Run a Campaign',
    description: 'Launch targeted ads to attract new clients and fill open slots.',
    path: '/admin/analytics?tab=marketing',
  },
  {
    icon: Tag,
    title: 'Create a Promotion',
    description: 'Offer a limited-time deal to drive bookings during slow periods.',
    path: '/campaigns',
  },
  {
    icon: UserCheck,
    title: 'Activate Rebooking',
    description: 'Re-engage past clients who have not returned recently.',
    path: '/admin/client-hub',
  },
  {
    icon: Globe,
    title: 'Boost Online Presence',
    description: 'Strengthen your digital footprint to capture more search traffic.',
    path: '/admin/seo-workshop',
  },
];

export function PipelineActionGuide({ open, onOpenChange, forwardCount }: PipelineActionGuideProps) {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DRILLDOWN_DIALOG_CONTENT_CLASS} overlayClassName={DRILLDOWN_OVERLAY_CLASS}>
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="font-display text-base tracking-wide">GROW YOUR PIPELINE</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {forwardCount !== undefined
              ? `${forwardCount} appointments in the next 14 days. Here's how to fill your pipeline.`
              : "Here's how to fill your pipeline."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-3 overflow-y-auto">
          {ACTIONS.map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate(dashPath(action.path));
              }}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-muted/30',
                'text-left transition-all hover:bg-muted/60 hover:border-border hover:-translate-y-0.5',
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <action.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm tracking-wide">{action.title.toUpperCase()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
