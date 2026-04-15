import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface GeneratedHuddleContent {
  focus_of_the_day: string;
  wins_from_yesterday: string;
  announcements: string;
  birthdays_celebrations: string;
  training_reminders: string;
  sales_goals: { retail: number; service: number };
}

export interface AIHuddleResponse {
  success: boolean;
  content: GeneratedHuddleContent;
  ai_generated: boolean;
  generated_at: string;
}

export function useGenerateAIHuddle() {
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async ({ 
      huddleDate, 
      locationId 
    }: { 
      huddleDate: string; 
      locationId?: string;
    }): Promise<AIHuddleResponse> => {
      if (!effectiveOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase.functions.invoke('generate-daily-huddle', {
        body: {
          organizationId: effectiveOrganization.id,
          locationId,
          huddleDate,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      return data as unknown as AIHuddleResponse;
    },
    onError: (error: Error) => {
      console.error('Failed to generate AI huddle:', error);
      if (error.message.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message.includes('credits')) {
        toast.error('AI credits exhausted. Please contact admin.');
      } else {
        toast.error('Failed to generate huddle content');
      }
    },
  });
}
