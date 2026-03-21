import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, CheckCircle2, Clock, AlertTriangle, Trash2, X } from 'lucide-react';
import { isPast, isToday } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useMeetingAccountabilityItems, useCreateAccountabilityItem, useUpdateAccountabilityItem, useCompleteAccountabilityItem, useDeleteAccountabilityItem, type ItemStatus, type ItemPriority, type AccountabilityItem } from '@/hooks/useAccountabilityItems';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const priorityConfig: Record<ItemPriority, { label: string; color: string; icon?: React.ReactNode }> = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', color: 'bg-chart-5/10 text-chart-5' },
  high: { label: 'High', color: 'bg-destructive/10 text-destructive', icon: <AlertTriangle className="h-3 w-3" /> },
};

const statusConfig: Record<ItemStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: 'In Progress', color: 'bg-primary/10 text-primary', icon: <Clock className="h-3 w-3" /> },
  completed: { label: 'Completed', color: 'bg-chart-2/10 text-chart-2', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground line-through', icon: <X className="h-3 w-3" /> },
};

interface AccountabilityItemsProps {
  meetingId: string;
  teamMemberId: string;
  isCoach: boolean;
}

export function AccountabilityItems({ meetingId, teamMemberId, isCoach }: AccountabilityItemsProps) {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { data: items, isLoading } = useMeetingAccountabilityItems(meetingId);
  const createItem = useCreateAccountabilityItem();
  const updateItem = useUpdateAccountabilityItem();
  const completeItem = useCompleteAccountabilityItem();
  const deleteItem = useDeleteAccountabilityItem();

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [priority, setPriority] = useState<ItemPriority>('medium');

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setReminderDate('');
    setPriority('medium');
    setIsAdding(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;

    await createItem.mutateAsync({
      meeting_id: meetingId,
      team_member_id: teamMemberId,
      title,
      description: description || undefined,
      due_date: dueDate || undefined,
      reminder_date: reminderDate || undefined,
      priority,
    });
    resetForm();
  };

  const handleStatusChange = async (item: AccountabilityItem, newStatus: ItemStatus) => {
    if (newStatus === 'completed') {
      setCompletingId(item.id);
    } else {
      await updateItem.mutateAsync({ id: item.id, status: newStatus });
    }
  };

  const handleComplete = async () => {
    if (!completingId) return;
    await completeItem.mutateAsync({ id: completingId, completion_notes: completionNotes });
    setCompletingId(null);
    setCompletionNotes('');
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const isOverdue = isPast(date) && !isToday(date);
    const isDueToday = isToday(date);

    return (
      <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-destructive' : isDueToday ? 'text-chart-5' : 'text-muted-foreground'}`}>
        <Calendar className="h-3 w-3" />
        {formatDate(date, 'MMM d')}
        {isOverdue && ' (overdue)'}
        {isDueToday && ' (today)'}
      </span>
    );
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading items...</div>;
  }

  const activeItems = items?.filter(i => i.status !== 'completed' && i.status !== 'cancelled') || [];
  const completedItems = items?.filter(i => i.status === 'completed' || i.status === 'cancelled') || [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Action Items</CardTitle>
          {isCoach && !isAdding && (
            <Button size={tokens.button.card} onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdding && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reminder Date</Label>
                  <Input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as ItemPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={!title.trim() || createItem.isPending}>
                  Create Item
                </Button>
                <Button variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {activeItems.length === 0 && !isAdding && (
            <p className="text-muted-foreground text-sm text-center py-4">
              No active items. {isCoach && 'Create action items to track follow-ups.'}
            </p>
          )}

          <div className="space-y-3">
            {activeItems.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant="outline" className={priorityConfig[item.priority].color}>
                        {priorityConfig[item.priority].icon}
                        {priorityConfig[item.priority].label}
                      </Badge>
                      <Badge variant="outline" className={statusConfig[item.status].color}>
                        {statusConfig[item.status].icon}
                        {statusConfig[item.status].label}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                    {getDueDateDisplay(item.due_date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={item.status}
                      onValueChange={(v) => handleStatusChange(item, v as ItemStatus)}
                    >
                      <SelectTrigger className="h-8 w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            <span className="flex items-center gap-1">
                              {config.icon}
                              {config.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isCoach && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteItem.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {completedItems.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Completed ({completedItems.length})</h4>
              <div className="space-y-2">
                {completedItems.map((item) => (
                  <div key={item.id} className="p-3 border rounded-lg bg-muted/20 opacity-70">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-chart-2" />
                      <span className="text-sm line-through">{item.title}</span>
                      {item.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(new Date(item.completed_at), 'MMM d')}
                        </span>
                      )}
                    </div>
                    {item.completion_notes && (
                      <p className="text-xs text-muted-foreground mt-1 pl-6">{item.completion_notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!completingId} onOpenChange={(open) => !open && setCompletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Completion Notes (optional)</Label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Any notes about how this was completed..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setCompletingId(null)}>
                Cancel
              </Button>
              <Button onClick={handleComplete} disabled={completeItem.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
