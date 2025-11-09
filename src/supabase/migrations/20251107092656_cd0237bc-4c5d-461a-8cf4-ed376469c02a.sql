-- Add columns for message editing and deletion
ALTER TABLE organization_chat
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create table for message replies
CREATE TABLE IF NOT EXISTS organization_chat_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES organization_chat(id) ON DELETE CASCADE,
  reply_to_message_id UUID NOT NULL REFERENCES organization_chat(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for message reactions
CREATE TABLE IF NOT EXISTS organization_chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES organization_chat(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, reaction)
);

-- Create table for chat attachments
CREATE TABLE IF NOT EXISTS organization_chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES organization_chat(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for typing indicators
CREATE TABLE IF NOT EXISTS organization_chat_typing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_typed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE organization_chat_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_chat_typing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for replies
CREATE POLICY "Members can view replies in their organizations"
ON organization_chat_replies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_chat
    WHERE organization_chat.id = organization_chat_replies.message_id
    AND is_organization_member(auth.uid(), organization_chat.organization_id)
  )
);

CREATE POLICY "Members can create replies in their organizations"
ON organization_chat_replies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_chat
    WHERE organization_chat.id = organization_chat_replies.message_id
    AND is_organization_member(auth.uid(), organization_chat.organization_id)
  )
);

-- RLS Policies for reactions
CREATE POLICY "Members can view reactions in their organizations"
ON organization_chat_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_chat
    WHERE organization_chat.id = organization_chat_reactions.message_id
    AND is_organization_member(auth.uid(), organization_chat.organization_id)
  )
);

CREATE POLICY "Members can manage their own reactions"
ON organization_chat_reactions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for attachments
CREATE POLICY "Members can view attachments in their organizations"
ON organization_chat_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_chat
    WHERE organization_chat.id = organization_chat_attachments.message_id
    AND is_organization_member(auth.uid(), organization_chat.organization_id)
  )
);

CREATE POLICY "Members can create attachments in their organizations"
ON organization_chat_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_chat
    WHERE organization_chat.id = organization_chat_attachments.message_id
    AND is_organization_member(auth.uid(), organization_chat.organization_id)
  )
);

-- RLS Policies for typing indicators
CREATE POLICY "Members can view typing in their organizations"
ON organization_chat_typing FOR SELECT
USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can manage their own typing status"
ON organization_chat_typing FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update chat policy to allow users to update/delete their own messages
CREATE POLICY "Users can update their own messages"
ON organization_chat FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON organization_chat FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE organization_chat_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE organization_chat_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE organization_chat_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE organization_chat_typing;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat attachments
CREATE POLICY "Members can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Members can view chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);