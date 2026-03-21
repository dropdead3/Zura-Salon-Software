import { format, parseISO } from 'date-fns';
import { Calendar, Clock, User, Scissors, ArrowRight, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AIAction } from '@/hooks/team-chat/useAIAgentChat';

interface AIActionPreviewProps {
  action: AIAction;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'EEEE, MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}

const actionTypeConfig = {
  reschedule: {
    icon: Calendar,
    label: 'Reschedule Appointment',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  cancel: {
    icon: X,
    label: 'Cancel Appointment',
    color: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  create_booking: {
    icon: Calendar,
    label: 'Create Booking',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
};

export function AIActionPreview({ action, onConfirm, onCancel, isExecuting }: AIActionPreviewProps) {
  const config = actionTypeConfig[action.type] || actionTypeConfig.reschedule;
  const Icon = config.icon;
  const { preview } = action;

  return (
    <Card className="w-full max-w-md border-2 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg", config.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm">{preview.title}</h3>
            <p className="text-xs text-muted-foreground">{preview.description}</p>
          </div>
          <Badge variant="outline" className={config.color}>
            Pending
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Before state */}
        {preview.before && (
          <div className="space-y-2">
            {action.type !== 'cancel' && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Current
              </p>
            )}
            <div className={cn(
              "p-3 rounded-lg border space-y-2",
              action.type === 'cancel' ? "bg-destructive/5 border-destructive/20" : "bg-muted/50"
            )}>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{preview.before.client}</span>
              </div>
              {preview.before.service && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Scissors className="h-4 w-4" />
                  <span>{preview.before.service}</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(preview.before.date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(preview.before.time)}</span>
                </div>
              </div>
              {preview.before.stylist && (
                <div className="text-xs text-muted-foreground">
                  with {preview.before.stylist}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Arrow for reschedule */}
        {action.type === 'reschedule' && preview.after && (
          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* After state */}
        {preview.after && action.type !== 'cancel' && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              New
            </p>
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{preview.after.client}</span>
              </div>
              {preview.after.service && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Scissors className="h-4 w-4" />
                  <span>{preview.after.service}</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-primary">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{formatDate(preview.after.date)}</span>
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{formatTime(preview.after.time)}</span>
                </div>
              </div>
              {preview.after.stylist && (
                <div className="text-xs text-muted-foreground">
                  with {preview.after.stylist}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-0">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isExecuting}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={onConfirm}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Confirm
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
