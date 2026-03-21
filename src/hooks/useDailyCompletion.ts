import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface Enrollment {
  id: string;
  current_day: number;
  streak_count: number;
  status: string;
  weekly_wins_due_day: number | null;
  last_completion_date: string | null;
  restart_count: number;
  start_date: string;
  forgive_credits_remaining: number;
  forgive_credits_used: number;
  last_credit_used_at: string | null;
}

interface DailyCompletion {
  id: string;
  day_number: number;
  is_complete: boolean;
  all_tasks_done: boolean;
  metrics_logged: boolean;
  proof_url: string | null;
  tasks_completed: Json;
}

interface TasksState {
  content_posted: boolean;
  dms_responded: boolean;
  follow_ups: boolean;
  metrics_logged: boolean;
}

export function useDailyCompletion(userId: string | undefined) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [todayCompletion, setTodayCompletion] = useState<DailyCompletion | null>(null);
  const [tasks, setTasks] = useState<TasksState>({
    content_posted: false,
    dms_responded: false,
    follow_ups: false,
    metrics_logged: false,
  });
  const [loading, setLoading] = useState(true);
  const [hasMissedDay, setHasMissedDay] = useState(false);
  const [daysMissed, setDaysMissed] = useState(0);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    const { data: enrollmentData, error } = await supabase
      .from('stylist_program_enrollment')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching enrollment:', error);
      setLoading(false);
      return;
    }

    if (enrollmentData) {
      setEnrollment(enrollmentData as Enrollment);

      // Check for today's completion record
      const today = new Date().toISOString().split('T')[0];
      const { data: completionData } = await supabase
        .from('daily_completions')
        .select('*')
        .eq('enrollment_id', enrollmentData.id)
        .eq('day_number', enrollmentData.current_day)
        .maybeSingle();

      if (completionData) {
        setTodayCompletion(completionData as DailyCompletion);
        const tasksData = completionData.tasks_completed as unknown as TasksState | null;
        if (tasksData && typeof tasksData === 'object') {
          setTasks({
            content_posted: Boolean(tasksData.content_posted),
            dms_responded: Boolean(tasksData.dms_responded),
            follow_ups: Boolean(tasksData.follow_ups),
            metrics_logged: Boolean(tasksData.metrics_logged),
          });
        }
      }
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateTask = async (taskKey: keyof TasksState, value: boolean) => {
    if (!enrollment) return;

    const newTasks = { ...tasks, [taskKey]: value };
    setTasks(newTasks);

    const allTasksDone = Object.values(newTasks).every(Boolean);

    try {
      if (todayCompletion) {
        await supabase
          .from('daily_completions')
          .update({
            tasks_completed: newTasks as unknown as Json,
            all_tasks_done: allTasksDone,
          })
          .eq('id', todayCompletion.id);
      } else {
        const { data } = await supabase
          .from('daily_completions')
          .insert({
            enrollment_id: enrollment.id,
            day_number: enrollment.current_day,
            tasks_completed: newTasks as unknown as Json,
            all_tasks_done: allTasksDone,
          })
          .select()
          .single();

        if (data) {
          setTodayCompletion(data as DailyCompletion);
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const uploadProof = async (file: File): Promise<string | null> => {
    if (!enrollment || !userId) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${enrollment.current_day}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('proof-uploads')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to upload proof');
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('proof-uploads')
      .getPublicUrl(fileName);

    // Update completion record
    if (todayCompletion) {
      await supabase
        .from('daily_completions')
        .update({ proof_url: urlData.publicUrl })
        .eq('id', todayCompletion.id);
    }

    return urlData.publicUrl;
  };

  const submitDay = async (): Promise<boolean> => {
    if (!enrollment || !todayCompletion) {
      toast.error('Please complete your tasks first');
      return false;
    }

    // Check if all tasks are done
    const allTasksDone = Object.values(tasks).every(Boolean);
    if (!allTasksDone) {
      toast.error('Please complete all tasks before submitting');
      return false;
    }

    // Check if proof is uploaded
    if (!todayCompletion.proof_url) {
      toast.error('Please upload proof of work');
      return false;
    }

    try {
      // Mark completion as complete
      await supabase
        .from('daily_completions')
        .update({
          is_complete: true,
          completion_date: new Date().toISOString(),
        })
        .eq('id', todayCompletion.id);

      // Update enrollment - advance day and update streak
      const nextDay = enrollment.current_day + 1;
      const newStreak = enrollment.streak_count + 1;

      // Check if next day is a weekly wins due day
      const needsWeeklyWins = enrollment.weekly_wins_due_day === nextDay;

      await supabase
        .from('stylist_program_enrollment')
        .update({
          current_day: nextDay,
          streak_count: newStreak,
          last_completion_date: new Date().toISOString(),
          status: needsWeeklyWins ? 'paused' : 'active',
        })
        .eq('id', enrollment.id);

      toast.success(`Day ${enrollment.current_day} complete! 🎉`);
      
      // Refresh data
      await fetchData();
      
      return true;
    } catch (error) {
      console.error('Error submitting day:', error);
      toast.error('Failed to submit day. Please try again.');
      return false;
    }
  };

  const checkMissedDay = useCallback(() => {
    if (!enrollment || enrollment.status === 'completed') return;

    const lastCompletion = enrollment.last_completion_date;
    
    // If no completion yet but they started the program, check start date
    if (!lastCompletion) {
      const startDate = new Date(enrollment.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // If more than 1 day since start without any completion
      if (diffDays > 1 && enrollment.current_day === 1) {
        setHasMissedDay(true);
        setDaysMissed(diffDays - 1);
      }
      return;
    }

    const lastDate = new Date(lastCompletion);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // If more than 1 day has passed, they missed a day
    if (diffDays > 1) {
      setHasMissedDay(true);
      setDaysMissed(diffDays - 1);
    }
  }, [enrollment]);

  const acknowledgeMissedDay = async () => {
    if (!enrollment) return;

    await supabase
      .from('stylist_program_enrollment')
      .update({
        current_day: 1,
        streak_count: 0,
        restart_count: enrollment.restart_count + 1,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        last_completion_date: null,
        weekly_wins_due_day: 7,
      })
      .eq('id', enrollment.id);

    setHasMissedDay(false);
    setDaysMissed(0);
    toast.success("Program restarted. Let's go - Day 1 starts now!");
    await fetchData();
  };

  const useForgiveCredit = async (): Promise<boolean> => {
    if (!enrollment || !userId) return false;
    
    if (enrollment.forgive_credits_remaining <= 0) {
      toast.error('No Life Happens Passes remaining');
      return false;
    }

    // Check if within 24 hours of miss (default grace period)
    const lastCompletion = enrollment.last_completion_date;
    if (lastCompletion) {
      const lastDate = new Date(lastCompletion);
      const now = new Date();
      const hoursSinceMiss = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
      
      // Default 48 hours = 24 hours after the day was missed
      if (hoursSinceMiss > 48) {
        toast.error('Pass expired. You have 24 hours after missing a day to use a Life Happens Pass.');
        return false;
      }
    }

    // Update enrollment
    const { error } = await supabase
      .from('stylist_program_enrollment')
      .update({
        forgive_credits_remaining: enrollment.forgive_credits_remaining - 1,
        forgive_credits_used: enrollment.forgive_credits_used + 1,
        last_credit_used_at: new Date().toISOString(),
        last_completion_date: new Date().toISOString().split('T')[0],
        status: 'active',
      })
      .eq('id', enrollment.id);

    if (error) {
      console.error('Error using Life Happens Pass:', error);
      toast.error('Failed to use pass');
      return false;
    }

    // Log pass usage to history
    await supabase
      .from('pass_usage_history')
      .insert({
        enrollment_id: enrollment.id,
        user_id: userId,
        day_missed: enrollment.current_day,
        current_day_at_use: enrollment.current_day,
      });

    // Notify leadership (create notification)
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'manager']);

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.user_id,
        type: 'pass_used',
        title: 'Life Happens Pass Used',
        message: `A team member used a Life Happens Pass on Day ${enrollment.current_day}`,
        link: '/dashboard/admin/client-engine',
      }));

      await supabase.from('notifications').insert(notifications);
    }

    setHasMissedDay(false);
    setDaysMissed(0);
    const remaining = enrollment.forgive_credits_remaining - 1;
    toast.success(`Life Happens Pass used! You have ${remaining} ${remaining === 1 ? 'pass' : 'passes'} left. Keep going!`);
    await fetchData();
    return true;
  };

  // Calculate when credit expires (24 hours after the day was technically missed)
  const getCreditExpirationTime = (): Date | null => {
    if (!enrollment?.last_completion_date) return null;
    const lastDate = new Date(enrollment.last_completion_date);
    // Credit expires 48 hours after last completion (which is 24 hours after the missed day)
    lastDate.setHours(lastDate.getHours() + 48);
    return lastDate;
  };

  useEffect(() => {
    if (enrollment && !loading) {
      checkMissedDay();
    }
  }, [enrollment, loading, checkMissedDay]);

  return {
    enrollment,
    todayCompletion,
    tasks,
    loading,
    hasMissedDay,
    daysMissed,
    updateTask,
    uploadProof,
    submitDay,
    acknowledgeMissedDay,
    useForgiveCredit,
    creditExpiresAt: getCreditExpirationTime(),
    refetch: fetchData,
  };
}
