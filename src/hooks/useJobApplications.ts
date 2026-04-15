import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface JobApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagram: string | null;
  experience: string;
  client_book: string;
  specialties: string;
  why_join_us: string;
  message: string | null;
  source: string;
  source_detail: string | null;
  pipeline_stage: string;
  rating: number | null;
  is_starred: boolean;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
  is_archived: boolean;
}

export interface JobApplicationNote {
  id: string;
  application_id: string;
  author_id: string;
  note: string;
  note_type: string;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    photo_url: string | null;
  };
}

export interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  color: string;
  display_order: number;
  is_active: boolean;
}

export function useJobApplications(includeArchived = false) {
  return useQuery({
    queryKey: ["job-applications", includeArchived],
    queryFn: async () => {
      let query = supabase
        .from("job_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (!includeArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as JobApplication[];
    },
  });
}

export function useJobApplication(id: string) {
  return useQuery({
    queryKey: ["job-application", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as JobApplication;
    },
    enabled: !!id,
  });
}

export function useApplicationNotes(applicationId: string) {
  return useQuery({
    queryKey: ["application-notes", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_application_notes")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as JobApplicationNote[];
    },
    enabled: !!applicationId,
  });
}

export function usePipelineStages() {
  return useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruiting_pipeline_stages")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as unknown as PipelineStage[];
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<JobApplication>;
    }) => {
      const { data, error } = await supabase
        .from("job_applications")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["job-application"] });
    },
    onError: (error) => {
      toast.error("Failed to update application");
      console.error(error);
    },
  });
}

export function useAddApplicationNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      note,
      noteType = "general",
    }: {
      applicationId: string;
      note: string;
      noteType?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("job_application_notes")
        .insert({
          application_id: applicationId,
          author_id: user.id,
          note,
          note_type: noteType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["application-notes", variables.applicationId] 
      });
      toast.success("Note added");
    },
    onError: (error) => {
      toast.error("Failed to add note");
      console.error(error);
    },
  });
}

export function useCreateApplication() {
  return useMutation({
    mutationFn: async (application: {
      name: string;
      email: string;
      phone: string;
      instagram?: string;
      experience: string;
      client_book: string;
      specialties: string;
      why_join_us: string;
      message?: string;
      source?: string;
      source_detail?: string;
    }) => {
      const { data, error } = await supabase
        .from("job_applications")
        .insert(application)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}
