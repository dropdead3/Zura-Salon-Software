import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';

interface AssistantBlockActionsProps {
  blockId: string;
  requestingUserId: string;
  /** Current user is the assigned assistant */
  isAssistant?: boolean;
  onActionComplete?: () => void;
  compact?: boolean;
}

export function AssistantBlockActions({
  blockId,
  requestingUserId,
  isAssistant = true,
  onActionComplete,
  compact = false,
}: AssistantBlockActionsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['assistant-time-blocks'] });
    queryClient.invalidateQueries({ queryKey: ['assistant-time-blocks-range'] });
    queryClient.invalidateQueries({ queryKey: ['assistant-pending-blocks'] });
    queryClient.invalidateQueries({ queryKey: ['assistant-conflicts'] });
  };

  const handleAccept = async () => {
    if (!user?.id) return;
    setIsAccepting(true);
    try {
      // Only set assistant_user_id if not already pre-assigned (admin accepting on behalf)
      const updatePayload: Record<string, unknown> = { status: 'confirmed' };
      if (isAssistant) {
        // Current user is the assistant — only set if not already assigned
        updatePayload.assistant_user_id = user.id;
      }

      const { error } = await supabase
        .from('assistant_time_blocks')
        .update(updatePayload)
        .eq('id', blockId);

      if (error) throw error;

      // Notify requesting stylist
      await supabase.from('notifications').insert({
        user_id: requestingUserId,
        type: 'assistant_time_block',
        title: 'Assistant Confirmed',
        message: 'Your assistant coverage request has been accepted.',
        metadata: { time_block_id: blockId, assistant_user_id: user.id },
      });

      invalidateAll();
      toast.success('Coverage accepted');

      // Push + email notification
      supabase.functions.invoke('notify-assistant-block', {
        body: { block_id: blockId, event_type: 'accepted', actor_user_id: user.id },
      }).catch(err => console.warn('[NotifyEdge] Failed:', err));

      onActionComplete?.();
    } catch {
      toast.error('Failed to accept');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!user?.id) return;
    setIsDeclining(true);
    try {
      // Clear assistant and return to pool so someone else can pick it up
      const { error } = await supabase
        .from('assistant_time_blocks')
        .update({ status: 'requested', assistant_user_id: null })
        .eq('id', blockId);

      if (error) throw error;

      // Notify requesting stylist
      await supabase.from('notifications').insert({
        user_id: requestingUserId,
        type: 'assistant_time_block',
        title: 'Assistant Unavailable',
        message: 'Your assistant declined — the request is back in the pool for another assistant.',
        metadata: { time_block_id: blockId, declined_by: user.id },
      });

      invalidateAll();
      toast.success('Coverage declined — returned to pool');

      // Push + email notification
      supabase.functions.invoke('notify-assistant-block', {
        body: { block_id: blockId, event_type: 'declined', actor_user_id: user.id },
      }).catch(err => console.warn('[NotifyEdge] Failed:', err));

      onActionComplete?.();
    } catch {
      toast.error('Failed to decline');
    } finally {
      setIsDeclining(false);
    }
  };

  const size = compact ? 'icon' : tokens.button.inline;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size={size}
        onClick={handleAccept}
        disabled={isAccepting || isDeclining}
        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
      >
        {isAccepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {!compact && <span className="ml-1">Accept</span>}
      </Button>
      <Button
        variant="outline"
        size={size}
        onClick={handleDecline}
        disabled={isAccepting || isDeclining}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        {isDeclining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        {!compact && <span className="ml-1">Decline</span>}
      </Button>
    </div>
  );
}
