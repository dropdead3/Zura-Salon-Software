import { useState } from 'react';
import { Lightbulb, Bug, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PlatformFeedbackDialog } from './PlatformFeedbackDialog';
import { cn } from '@/lib/utils';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


type FeedbackType = 'feature_request' | 'bug_report';

interface SidebarFeedbackButtonsProps {
  isCollapsed?: boolean;
}

export function SidebarFeedbackButtons({
  isCollapsed = false }: SidebarFeedbackButtonsProps) {
  const { dashPath } = useOrgDashboardPath();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<FeedbackType>('feature_request');

  const openDialog = (type: FeedbackType) => {
    setDialogType(type);
    setDialogOpen(true);
  };

  return (
    <>
      <div className={cn("flex gap-1", isCollapsed && "flex-col")}>
        <Tooltip>
          <TooltipTrigger asChild>
            {isCollapsed ? (
              <div className="relative flex justify-center">
                <button
                  onClick={() => openDialog('feature_request')}
                  className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-200 ease-out"
                >
                  <Lightbulb className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openDialog('feature_request')}
                className="flex flex-1 items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-200 ease-out"
              >
                <Lightbulb className="h-4 w-4" />
              </button>
            )}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="font-sans">Request a Feature</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            {isCollapsed ? (
              <div className="relative flex justify-center">
                <button
                  onClick={() => openDialog('bug_report')}
                  className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-200 ease-out"
                >
                  <Bug className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openDialog('bug_report')}
                className="flex flex-1 items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-200 ease-out"
              >
                <Bug className="h-4 w-4" />
              </button>
            )}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="font-sans">Report a Bug</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            {isCollapsed ? (
              <div className="relative flex justify-center">
                <Link
                  to={dashPath('/help')}
                  className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-200 ease-out"
                >
                  <HelpCircle className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <Link
                to={dashPath('/help')}
                className="flex flex-1 items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-200 ease-out"
              >
                <HelpCircle className="h-4 w-4" />
              </Link>
            )}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="font-sans">Help Center</TooltipContent>
        </Tooltip>
      </div>

      <PlatformFeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={dialogType}
      />
    </>
  );
}
