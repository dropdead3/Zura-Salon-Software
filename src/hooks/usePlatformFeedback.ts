import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PLATFORM_NAME } from '@/lib/brand';

interface PlatformFeedbackInput {
  type: 'feature_request' | 'bug_report';
  title: string;
  description: string;
  category: string;
  screenshots?: File[];
}

export function useSubmitPlatformFeedback() {
  return useMutation({
    mutationFn: async (input: PlatformFeedbackInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload screenshots if any
      const screenshotUrls: string[] = [];
      if (input.screenshots?.length) {
        for (const file of input.screenshots) {
          const ext = file.name.split('.').pop();
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('platform-feedback')
            .upload(path, file);
          if (uploadError) throw uploadError;
          const { data: urlData } = await supabase.storage
            .from('platform-feedback')
            .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 day signed URL
          if (urlData?.signedUrl) screenshotUrls.push(urlData.signedUrl);
        }
      }

      // Capture browser info for bug reports
      const browserInfo = input.type === 'bug_report' ? {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        currentUrl: window.location.href,
        timestamp: new Date().toISOString(),
      } : {};

      // Get user's org
      const { data: orgData } = await supabase
        .from('employee_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const { error } = await supabase
        .from('platform_feedback' as any)
        .insert({
          type: input.type,
          title: input.title,
          description: input.description,
          category: input.category,
          screenshot_urls: screenshotUrls,
          browser_info: browserInfo,
          submitted_by: user.id,
          organization_id: orgData?.organization_id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Feedback submitted successfully', {
        description: `Thank you — the ${PLATFORM_NAME} team will review your submission.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to submit feedback', { description: error.message });
    },
  });
}
