-- Add foreign key constraint from organization_ideas to profiles
ALTER TABLE public.organization_ideas
ADD CONSTRAINT organization_ideas_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;