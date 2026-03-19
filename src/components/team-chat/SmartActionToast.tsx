import { useState } from 'react';
import { Check, X, Clock, User, Calendar, Scissors, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SmartAction } from '@/hooks/team-chat/useSmartActions';

interface SmartActionToastProps {
  action: SmartAction;
  onAccept: (actionId: string) => void;
  onDecline: (actionId: string, note?: string) => void;
  onDismiss: (actionId: string) => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}

const ACTION_TYPE_CONFIG = {
  client_handoff: {
    icon: User,
    label: 'Client Handoff',
    color: 'bg-blue-500/10 text-blue-600 border-blue-200',
    description: 'asked you to take a client',
  },
  assistant_request: {
    icon: Scissors,
    label: 'Assist Request',
    color: 'bg-purple-500/10 text-purple-600 border-purple-200',
    description: 'needs your help assisting',
  },
  shift_cover: {
    icon: Calendar,
    label: 'Shift Cover',
    color: 'bg-orange-500/10 text-orange-600 border-orange-200',
    description: 'asked you to cover',
  },
  availability_check: {
    icon: Clock,
    label: 'Availability',
    color: 'bg-green-500/10 text-green-600 border-green-200',
    description: 'is checking your availability',
  },
  product_request: {
    icon: MessageSquare,
    label: 'Product Request',
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    description: 'asked for a product',
  },
};

export function SmartActionToast({
  action,
  onAccept,
  onDecline,
  onDismiss,
  isAccepting,
  isDeclining,
}: SmartActionToastProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = ACTION_TYPE_CONFIG[action.action_type];
  const Icon = config.icon;

  const senderName = action.sender?.display_name || action.sender?.full_name || 'Someone';
  const { time, date, client_name, service } = action.extracted_data;

  // Build detail string
  const details: string[] = [];
  if (time) details.push(time);
  if (date) details.push(date);
  if (client_name) details.push(`for ${client_name}`);
  if (service) details.push(`(${service})`);

  return (
    <Card className="w-full max-w-sm p-4 bg-card/80 backdrop-blur-xl rounded-lg shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)] border border-border/40 animate-in slide-in-from-right-5 duration-300">
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', config.color)}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn('text-xs', config.color)}>
              {config.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {Math.round(action.confidence * 100)}% confident
            </span>
          </div>
          
          <p className="text-sm font-medium">
            <span className="text-primary">{senderName}</span>{' '}
            <span className="text-muted-foreground">{config.description}</span>
          </p>
          
          {details.length > 0 && (
            <p className="text-sm text-foreground mt-0.5">
              {details.join(' ')}
            </p>
          )}
          
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            "{action.detected_intent}"
          </p>
          
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => onAccept(action.id)}
              disabled={isAccepting || isDeclining}
              className="flex-1 rounded-full"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDecline(action.id)}
              disabled={isAccepting || isDeclining}
              className="flex-1 rounded-full"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Decline
            </Button>
          </div>
          
          <button
            onClick={() => onDismiss(action.id)}
            className="text-xs text-muted-foreground hover:text-foreground mt-2 w-full text-center"
          >
            Dismiss
          </button>
        </div>
      </div>
    </Card>
  );
}

// Container component that shows all pending actions
interface SmartActionContainerProps {
  actions: SmartAction[];
  onAccept: (actionId: string) => void;
  onDecline: (actionId: string, note?: string) => void;
  onDismiss: (actionId: string) => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}

export function SmartActionContainer({
  actions,
  onAccept,
  onDecline,
  onDismiss,
  isAccepting,
  isDeclining,
}: SmartActionContainerProps) {
  if (actions.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-h-[calc(100vh-8rem)] overflow-y-auto">
      {actions.slice(0, 3).map((action) => (
        <SmartActionToast
          key={action.id}
          action={action}
          onAccept={onAccept}
          onDecline={onDecline}
          onDismiss={onDismiss}
          isAccepting={isAccepting}
          isDeclining={isDeclining}
        />
      ))}
      {actions.length > 3 && (
        <div className="text-center text-sm text-muted-foreground">
          +{actions.length - 3} more actions
        </div>
      )}
    </div>
  );
}
