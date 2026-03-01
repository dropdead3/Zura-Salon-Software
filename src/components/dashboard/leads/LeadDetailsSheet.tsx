import { useState } from 'react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Send,
  ExternalLink,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { LeadWithAssignee } from '@/hooks/useLeadInbox';
import { InquiryStatus, formatSourceName } from '@/hooks/useLeadAnalytics';
import { formatDistanceToNow } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  action: string;
  notes: string | null;
  performer_name: string | null;
  created_at: string;
}

interface LeadDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadWithAssignee | null;
  activity: ActivityItem[];
  isLoadingActivity: boolean;
  onUpdateStatus: (status: InquiryStatus, additionalData?: any) => Promise<void>;
  onAddNote: (note: string) => Promise<void>;
  isUpdating: boolean;
}

const STATUS_OPTIONS: { value: InquiryStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'assigned', label: 'Assigned', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'consultation_booked', label: 'Consultation Booked', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'converted', label: 'Converted', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800 border-red-200' },
];

export function LeadDetailsSheet({
  open,
  onOpenChange,
  lead,
  activity,
  isLoadingActivity,
  onUpdateStatus,
  onAddNote,
  isUpdating,
}: LeadDetailsSheetProps) {
  const { formatDate } = useFormatDate();
  const { formatCurrency } = useFormatCurrency();
  const [newNote, setNewNote] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);

  if (!lead) return null;

  const handleStatusChange = async (status: string) => {
    await onUpdateStatus(status as InquiryStatus);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSendingNote(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
    } finally {
      setIsSendingNote(false);
    }
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-muted';
  };

  const formatActionName = (action: string) => {
    return action
      .replace('status_changed_to_', 'Status → ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const responseTimeDisplay = lead.response_time_seconds
    ? lead.response_time_seconds < 60
      ? `${lead.response_time_seconds}s`
      : lead.response_time_seconds < 3600
        ? `${Math.round(lead.response_time_seconds / 60)}m`
        : `${Math.round(lead.response_time_seconds / 3600)}h`
    : null;

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="560px">
      <div className="p-5 pb-4 border-b border-border/40">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-sm tracking-wide uppercase">{lead.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={cn("text-xs", getStatusColor(lead.status))}>
                {STATUS_OPTIONS.find(s => s.value === lead.status)?.label || lead.status}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {formatSourceName(lead.source)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5">
          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{lead.email}</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{lead.phone}</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            )}
            {lead.preferred_location_name && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{lead.preferred_location_name}</span>
              </div>
            )}
            {lead.preferred_service && (
              <div className="flex items-center gap-3 text-sm">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span>{lead.preferred_service}</span>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Timestamps & Assignment */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Calendar className="w-3 h-3" />
                Created
              </div>
              <p className="text-sm font-medium">
                {formatDate(new Date(lead.created_at), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              </p>
            </div>

            {responseTimeDisplay && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3 h-3" />
                  Response Time
                </div>
                <p className="text-sm font-medium">{responseTimeDisplay}</p>
              </div>
            )}

            {lead.assignee_name && (
              <div className="p-3 bg-muted/30 rounded-lg col-span-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <User className="w-3 h-3" />
                  Assigned To
                </div>
                <p className="text-sm font-medium">{lead.assignee_name}</p>
                {lead.assigned_at && (
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.assigned_at), { addSuffix: true })}
                    {lead.assigner_name && ` by ${lead.assigner_name}`}
                  </p>
                )}
              </div>
            )}

            {lead.first_service_revenue && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg col-span-2">
                <div className="flex items-center gap-2 text-xs text-green-600 mb-1">
                  <TrendingUp className="w-3 h-3" />
                  First Service Revenue
                </div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  {formatCurrency(lead.first_service_revenue)}
                </p>
              </div>
            )}
          </div>

          {/* Message */}
          {lead.message && (
            <>
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </h4>
                <div className="p-3 bg-muted/30 rounded-lg text-sm">
                  {lead.message}
                </div>
              </div>
              <Separator className="my-4" />
            </>
          )}

          {/* Status Update */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2">Update Status</h4>
            <Select
              value={lead.status}
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", option.color.split(' ')[0])} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-4" />

          {/* Activity Log */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3">Activity</h4>

            {/* Add Note */}
            <div className="flex gap-2 mb-4">
              <Textarea
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px] resize-none"
              />
              <Button
                size="icon"
                onClick={handleAddNote}
                disabled={!newNote.trim() || isSendingNote}
                className="flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Activity Items */}
            {isLoadingActivity ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Loading activity...
              </p>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity yet
              </p>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="relative pl-4 border-l-2 border-muted pb-3 last:pb-0"
                  >
                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-muted-foreground/50" />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {formatActionName(item.action)}
                        </p>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.notes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.performer_name || 'System'} • {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </PremiumFloatingPanel>
  );
}
