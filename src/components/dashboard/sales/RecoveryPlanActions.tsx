import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Bookmark, Bell, Rocket, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { addDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { ImplementPlanDialog } from './ImplementPlanDialog';

interface SelectedTask {
  title: string;
  description: string;
  dueDays: number;
}

interface RecoveryPlanActionsProps {
  title: string;
  content: string;
  planType?: 'recovery' | 'card_insight' | 'guidance';
  goalPeriod?: string;
  targetRevenue?: number;
  currentRevenue?: number;
  shortfall?: number;
  selectedTasks?: SelectedTask[];
}

export function RecoveryPlanActions({
  title,
  content,
  planType = 'recovery',
  goalPeriod,
  targetRevenue,
  currentRevenue,
  shortfall,
  selectedTasks,
}: RecoveryPlanActionsProps) {
  const { user } = useAuth();
  const { formatDate } = useFormatDate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [implementOpen, setImplementOpen] = useState(false);

  const handleSavePlan = async () => {
    if (!user?.id || !content) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('saved_recovery_plans').insert({
        user_id: user.id,
        title,
        content,
        plan_type: planType,
        goal_period: goalPeriod || 'general',
        target_revenue: targetRevenue,
        current_revenue: currentRevenue,
        shortfall,
      });
      if (error) throw error;

      // Also convert key action items to tasks
      const actionItems = extractActionItems(content);
      if (actionItems.length > 0) {
        const tasks = actionItems.map((item) => ({
          user_id: user.id,
          title: item,
          description: `From recovery plan: ${title}`,
          source: 'ai_insights',
          priority: 'high',
        }));
        await supabase.from('tasks').insert(tasks);
      }

      setSaved(true);
      toast.success('Plan saved & action items added to your tasks');
    } catch (err) {
      console.error('Save plan error:', err);
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleSetReminder = async (date: Date) => {
    if (!user?.id || !content) return;
    setReminderSaving(true);
    setShowCalendar(false);
    try {
      const { error } = await supabase.from('saved_recovery_plans').insert({
        user_id: user.id,
        title,
        content,
        plan_type: planType,
        goal_period: goalPeriod || 'general',
        target_revenue: targetRevenue,
        current_revenue: currentRevenue,
        shortfall,
        reminder_date: date.toISOString(),
      });
      if (error) throw error;
      setReminderSet(true);
      toast.success(`Reminder set for ${formatDate(date, 'MMM d, yyyy')}`);
    } catch (err) {
      console.error('Reminder error:', err);
      toast.error('Failed to set reminder');
    } finally {
      setReminderSaving(false);
    }
  };


  return (
    <div className="flex items-center gap-2 pt-3 border-t border-border/40">
      {/* Save Plan */}
      <Button
        variant="outline"
        size={tokens.button.card}
        onClick={handleSavePlan}
        disabled={saving || saved || !content}
        className="flex-1 gap-1.5 text-xs border-border/50"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : saved ? (
          <Check className="w-3.5 h-3.5 text-chart-2" />
        ) : (
          <Bookmark className="w-3.5 h-3.5" />
        )}
        {saved ? 'Saved' : 'Save Plan'}
      </Button>

      {/* Remind Me */}
      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size={tokens.button.card}
            disabled={reminderSaving || reminderSet || !content}
            className="flex-1 gap-1.5 text-xs border-border/50"
          >
            {reminderSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : reminderSet ? (
              <Check className="w-3.5 h-3.5 text-chart-2" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            {reminderSet ? 'Reminder Set' : 'Remind Me'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <div className="p-2 space-y-1 border-b border-border/40">
            <p className="text-xs font-medium px-1">Quick reminders</p>
            <div className="flex gap-1">
              {[1, 3, 7].map((days) => (
                <Button
                  key={days}
                  variant="ghost"
                  size={tokens.button.inline}
                  className="text-xs h-7"
                  onClick={() => handleSetReminder(addDays(new Date(), days))}
                >
                  {days === 1 ? 'Tomorrow' : `${days} days`}
                </Button>
              ))}
            </div>
          </div>
          <CalendarComponent
            mode="single"
            selected={undefined}
            onSelect={(date) => date && handleSetReminder(date)}
            disabled={(date) => date < new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Let's Implement */}
      <Button
        variant="outline"
        size={tokens.button.card}
        disabled={!content}
        onClick={() => setImplementOpen(true)}
        className="flex-1 gap-1.5 text-xs border-border/50"
      >
        <Rocket className="w-3.5 h-3.5" />
        Let's Implement
      </Button>

      {/* Implement Plan Dialog */}
      <ImplementPlanDialog
        open={implementOpen}
        onOpenChange={setImplementOpen}
        planTitle={title}
        planContent={content}
        goalPeriod={goalPeriod}
        preSelectedSteps={selectedTasks}
      />
    </div>
  );
}

/** Extract bold action items from markdown content */
function extractActionItems(content: string): string[] {
  const items: string[] = [];
  const boldPattern = /\*\*([^*]+?):\*\*/g;
  let match;
  while ((match = boldPattern.exec(content)) !== null) {
    const item = match[1].trim();
    if (item.length > 5 && item.length < 80) {
      items.push(item);
    }
  }
  return items.slice(0, 5); // Max 5 tasks
}
