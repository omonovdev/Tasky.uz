-- Add foreign key from task_assignments.user_id to profiles.id
-- This enables PostgREST to join task_assignments with profiles

ALTER TABLE public.task_assignments
ADD CONSTRAINT task_assignments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;