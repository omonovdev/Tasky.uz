-- Add foreign key constraint for organization_chat
ALTER TABLE public.organization_chat
ADD CONSTRAINT organization_chat_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;