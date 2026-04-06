import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProgramWeek {
  id: string;
  week_number: number;
  title: string;
  description: string | null;
  objective: string | null;
  start_day: number;
  end_day: number;
  video_url: string | null;
  resources_json: unknown;
  is_active: boolean;
  display_order: number;
}

export interface WeeklyAssignment {
  id: string;
  week_id: string;
  title: string;
  description: string | null;
  assignment_type: string;
  proof_type: string;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
}

export interface WeeklyAssignmentCompletion {
  id: string;
  enrollment_id: string;
  assignment_id: string;
  is_complete: boolean;
  completed_at: string | null;
  proof_url: string | null;
  notes: string | null;
}

export interface WeekResource {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  week_id: string | null;
  is_active: boolean;
}

interface WeekWithAssignments extends ProgramWeek {
  assignments: WeeklyAssignment[];
  resources: WeekResource[];
}

export function useWeeklyAssignments(enrollmentId: string | undefined, currentDay: number) {
  const [weeks, setWeeks] = useState<WeekWithAssignments[]>([]);
  const [currentWeek, setCurrentWeek] = useState<WeekWithAssignments | null>(null);
  const [completions, setCompletions] = useState<WeeklyAssignmentCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!enrollmentId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all active weeks with their assignments and resources
      const { data: weeksData, error: weeksError } = await supabase
        .from('program_weeks')
        .select('*')
        .eq('is_active', true)
        .order('week_number', { ascending: true });

      if (weeksError) throw weeksError;

      // Fetch all active assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('weekly_assignments')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (assignmentsError) throw assignmentsError;

      // Fetch all active resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('program_resources')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (resourcesError) throw resourcesError;

      // Fetch completions for this enrollment
      const { data: completionsData, error: completionsError } = await supabase
        .from('weekly_assignment_completions')
        .select('*')
        .eq('enrollment_id', enrollmentId);

      if (completionsError) throw completionsError;

      // Map assignments and resources to their weeks
      const weeksWithAssignments: WeekWithAssignments[] = (weeksData || []).map((week) => ({
        ...week,
        assignments: (assignmentsData || []).filter((a) => a.week_id === week.id),
        resources: (resourcesData || []).filter((r) => r.week_id === week.id),
      }));

      setWeeks(weeksWithAssignments);
      setCompletions(completionsData || []);

      // Determine current week based on current day
      const current = weeksWithAssignments.find(
        (w) => currentDay >= w.start_day && currentDay <= w.end_day
      );
      setCurrentWeek(current || null);
    } catch (error) {
      console.error('Error fetching weekly assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, currentDay]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleAssignmentCompletion = async (assignmentId: string): Promise<boolean> => {
    if (!enrollmentId) return false;

    const existing = completions.find((c) => c.assignment_id === assignmentId);

    try {
      if (existing) {
        // Toggle completion status
        const newStatus = !existing.is_complete;
        const { error } = await supabase
          .from('weekly_assignment_completions')
          .update({
            is_complete: newStatus,
            completed_at: newStatus ? new Date().toISOString() : null,
          })
          .eq('id', existing.id);

        if (error) throw error;

        setCompletions((prev) =>
          prev.map((c) =>
            c.id === existing.id
              ? { ...c, is_complete: newStatus, completed_at: newStatus ? new Date().toISOString() : null }
              : c
          )
        );
      } else {
        // Create new completion record
        const { data, error } = await supabase
          .from('weekly_assignment_completions')
          .insert({
            enrollment_id: enrollmentId,
            assignment_id: assignmentId,
            is_complete: true,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        setCompletions((prev) => [...prev, data]);
      }

      return true;
    } catch (error) {
      console.error('Error toggling assignment completion:', error);
      toast.error('Failed to update assignment');
      return false;
    }
  };

  const uploadProof = async (assignmentId: string, file: File, userId: string): Promise<string | null> => {
    if (!enrollmentId) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/weekly_${assignmentId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('proof-uploads')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to upload proof');
      return null;
    }

    const { data: urlData } = await supabase.storage
      .from('proof-uploads')
      .createSignedUrl(fileName, 60 * 60 * 24 * 30); // 30 day signed URL

    // Update or create completion record with proof URL
    const existing = completions.find((c) => c.assignment_id === assignmentId);

    if (existing) {
      await supabase
        .from('weekly_assignment_completions')
        .update({ proof_url: urlData?.signedUrl || '' })
        .eq('id', existing.id);
    } else {
      const { data } = await supabase
        .from('weekly_assignment_completions')
        .insert({
          enrollment_id: enrollmentId,
          assignment_id: assignmentId,
          is_complete: false,
          proof_url: urlData?.signedUrl || '',
        })
        .select()
        .single();

      if (data) {
        setCompletions((prev) => [...prev, data]);
      }
    }

    return urlData?.signedUrl || '';
  };

  const getAssignmentCompletion = (assignmentId: string): WeeklyAssignmentCompletion | undefined => {
    return completions.find((c) => c.assignment_id === assignmentId);
  };

  const getCurrentWeekProgress = (): { completed: number; total: number; percentage: number } => {
    if (!currentWeek) return { completed: 0, total: 0, percentage: 0 };

    // Count ALL assignments, not just required ones
    const allAssignments = currentWeek.assignments;
    const completedCount = allAssignments.filter((a) => {
      const completion = getAssignmentCompletion(a.id);
      return completion?.is_complete;
    }).length;

    return {
      completed: completedCount,
      total: allAssignments.length,
      percentage: allAssignments.length > 0 ? Math.round((completedCount / allAssignments.length) * 100) : 0,
    };
  };

  return {
    weeks,
    currentWeek,
    completions,
    loading,
    toggleAssignmentCompletion,
    uploadProof,
    getAssignmentCompletion,
    getCurrentWeekProgress,
    refetch: fetchData,
  };
}
