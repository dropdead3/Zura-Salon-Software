/**
 * SEO Task mutation hooks: completion, proof upload, status transitions.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { transitionTaskStatus } from '@/lib/seo-engine/seo-task-service';
import { validateCompletion, type ProofArtifact, type SystemVerificationSignals } from '@/lib/seo-engine/seo-completion-validator';
import type { SEOTaskStatus } from '@/config/seo-engine/seo-state-machine';
import { toast } from '@/hooks/use-toast';

export function useSEOTaskTransition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      newStatus,
      performedBy,
      notes,
    }: {
      taskId: string;
      newStatus: SEOTaskStatus;
      performedBy: string;
      notes?: string;
    }) => {
      const result = await transitionTaskStatus({ taskId, newStatus, performedBy, notes });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seo-tasks'] });
      toast({ title: 'Task updated', description: 'Status transition recorded.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Transition failed', description: err.message, variant: 'destructive' });
    },
  });
}

export function useSEOTaskComplete() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      templateKey,
      performedBy,
      proofArtifacts,
      systemSignals,
      managerApproved,
    }: {
      taskId: string;
      templateKey: string;
      performedBy: string;
      proofArtifacts: ProofArtifact[];
      systemSignals: SystemVerificationSignals;
      managerApproved: boolean;
    }) => {
      // 1. Validate completion
      const validation = validateCompletion({
        templateKey,
        proofArtifacts,
        systemSignals,
        managerApproved,
      });

      if (!validation.valid) {
        throw new Error(`Completion validation failed: ${validation.failures.join(' ')}`);
      }

      // 2. Store proof artifacts on the task
      const { error: proofErr } = await supabase
        .from('seo_tasks' as any)
        .update({
          proof_artifacts: proofArtifacts,
          completion_verified_at: new Date().toISOString(),
          completion_method: validation.method,
        })
        .eq('id', taskId);

      if (proofErr) throw proofErr;

      // 3. Transition to completed
      const result = await transitionTaskStatus({
        taskId,
        newStatus: 'completed',
        performedBy,
        notes: `Validated via ${validation.method}`,
      });

      if (!result.success) throw new Error(result.error);
      return { validation };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seo-tasks'] });
      toast({ title: 'Task completed', description: 'Completion validated and recorded.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Cannot complete task', description: err.message, variant: 'destructive' });
    },
  });
}

export function useSEOProofUpload() {
  return useMutation({
    mutationFn: async ({
      organizationId,
      taskId,
      file,
    }: {
      organizationId: string;
      taskId: string;
      file: File;
    }) => {
      const path = `${organizationId}/${taskId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('seo-proof-artifacts')
        .upload(path, file);

      if (error) throw error;

      // Get public URL (signed since bucket is private)
      const { data: urlData } = await supabase.storage
        .from('seo-proof-artifacts')
        .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7 day expiry

      return {
        path: data.path,
        signedUrl: urlData?.signedUrl ?? '',
        type: file.type.startsWith('image/') ? 'photo' as const : 'screenshot' as const,
      };
    },
  });
}

export function useSEOTaskImpact(taskId: string | undefined) {
  return useQuery({
    queryKey: ['seo-task-impact', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_task_impact' as any)
        .select('*')
        .eq('task_id', taskId!)
        .order('measured_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!taskId,
  });
}
