-- Create organization_chat table for group chat
CREATE TABLE public.organization_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_chat ENABLE ROW LEVEL SECURITY;

-- Create policies for organization chat
CREATE POLICY "Members can view chat in their organizations"
ON public.organization_chat
FOR SELECT
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can send messages in their organizations"
ON public.organization_chat
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND public.is_organization_member(auth.uid(), organization_id)
);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_chat;