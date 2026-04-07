
-- Database function to get unread message counts for multiple channels in one call
-- Replaces the N+1 sequential loop in useUnreadMessages
CREATE OR REPLACE FUNCTION public.get_unread_counts(
  p_user_id uuid,
  p_channel_ids uuid[]
)
RETURNS TABLE(channel_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.channel_id,
    COUNT(*) AS unread_count
  FROM chat_messages m
  JOIN chat_channel_members cm
    ON cm.channel_id = m.channel_id
    AND cm.user_id = p_user_id
  WHERE m.channel_id = ANY(p_channel_ids)
    AND m.is_deleted = false
    AND m.parent_message_id IS NULL
    AND m.sender_id != p_user_id
    AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01'::timestamptz)
  GROUP BY m.channel_id;
$$;
