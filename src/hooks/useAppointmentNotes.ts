import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState, useCallback, useEffect } from 'react';

export interface AppointmentNote {
  id: string;
  phorest_appointment_id: string;
  author_id: string;
  note: string;
  is_private: boolean;
  created_at: string;
  author?: {
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
  };
}

const isDemoId = (id: string | null) => id?.startsWith('demo-') ?? false;

function getDemoStorageKey(appointmentId: string) {
  return `dock-demo-notes::${appointmentId}`;
}

function loadDemoNotes(appointmentId: string): AppointmentNote[] {
  try {
    const stored = sessionStorage.getItem(getDemoStorageKey(appointmentId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveDemoNotes(appointmentId: string, notes: AppointmentNote[]) {
  sessionStorage.setItem(getDemoStorageKey(appointmentId), JSON.stringify(notes));
}

export function useAppointmentNotes(appointmentId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isDemo = isDemoId(appointmentId);

  // Demo mode: sessionStorage-backed notes
  const [demoNotes, setDemoNotes] = useState<AppointmentNote[]>(() =>
    appointmentId && isDemo ? loadDemoNotes(appointmentId) : []
  );

  useEffect(() => {
    if (appointmentId && isDemo) {
      saveDemoNotes(appointmentId, demoNotes);
    }
  }, [demoNotes, appointmentId, isDemo]);

  // Listen for demo reset to clear in-memory demo notes
  useEffect(() => {
    if (!isDemo) return;
    const handleReset = () => setDemoNotes([]);
    window.addEventListener('dock-demo-reset', handleReset);
    return () => window.removeEventListener('dock-demo-reset', handleReset);
  }, [isDemo]);

  // Real mode query
  const { data: realNotes = [], isLoading: realLoading } = useQuery({
    queryKey: ['appointment-notes', appointmentId],
    enabled: !!appointmentId && !isDemo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_notes')
        .select(`
          *,
          author:employee_profiles!appointment_notes_author_id_fkey(
            display_name,
            full_name,
            photo_url
          )
        `)
        .eq('phorest_appointment_id', appointmentId!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as AppointmentNote[];
    },
  });

  const addNote = useMutation({
    mutationFn: async ({ note, isPrivate = false }: { note: string; isPrivate?: boolean }) => {
      if (!appointmentId) throw new Error('Missing appointment ID');

      if (isDemo) {
        const newNote: AppointmentNote = {
          id: `demo-note-${Date.now()}`,
          phorest_appointment_id: appointmentId,
          author_id: 'dev-bypass-000',
          note,
          is_private: isPrivate,
          created_at: new Date().toISOString(),
          author: { display_name: 'Jenna B.', full_name: 'Jenna B.', photo_url: null },
        };
        setDemoNotes(prev => [newNote, ...prev]);
        return newNote;
      }

      if (!user?.id) throw new Error('Missing required data');
      
      const { data, error } = await supabase
        .from('appointment_notes')
        .insert({
          phorest_appointment_id: appointmentId,
          author_id: user.id,
          note,
          is_private: isPrivate,
        })
        .select(`
          *,
          author:employee_profiles!appointment_notes_author_id_fkey(
            display_name,
            full_name,
            photo_url
          )
        `)
        .single();
      
      if (error) throw error;
      return data as unknown as AppointmentNote;
    },
    onSuccess: () => {
      if (!isDemo) {
        queryClient.invalidateQueries({ queryKey: ['appointment-notes', appointmentId] });
      }
      toast.success('Note added');
    },
    onError: (error: Error) => {
      toast.error('Failed to add note', { description: error.message });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      if (isDemo) {
        setDemoNotes(prev => prev.filter(n => n.id !== noteId));
        return;
      }
      const { error } = await supabase
        .from('appointment_notes')
        .delete()
        .eq('id', noteId)
        .eq('author_id', user!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      if (!isDemo) {
        queryClient.invalidateQueries({ queryKey: ['appointment-notes', appointmentId] });
      }
      toast.success('Note deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete note', { description: error.message });
    },
  });

  return {
    notes: isDemo ? demoNotes : realNotes,
    isLoading: isDemo ? false : realLoading,
    addNote: addNote.mutate,
    deleteNote: deleteNote.mutate,
    isAdding: addNote.isPending,
  };
}
