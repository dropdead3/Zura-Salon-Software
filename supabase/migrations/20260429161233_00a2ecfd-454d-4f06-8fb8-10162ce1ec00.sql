
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user_org_recent
  ON public.ai_conversations (user_id, organization_id, last_message_at DESC);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own AI conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users insert own AI conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users update own AI conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own AI conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_conversation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL DEFAULT '',
  action JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conv_messages_conv_created
  ON public.ai_conversation_messages (conversation_id, created_at);

ALTER TABLE public.ai_conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own AI conversation messages"
  ON public.ai_conversation_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_conversation_messages.conversation_id
      AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users insert own AI conversation messages"
  ON public.ai_conversation_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_conversation_messages.conversation_id
      AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users delete own AI conversation messages"
  ON public.ai_conversation_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_conversation_messages.conversation_id
      AND c.user_id = auth.uid()
  ));
