-- Drop the constraint if it exists (in case it's in an invalid state)
DO $$ 
BEGIN
    ALTER TABLE public.organization_members 
    DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add foreign key constraint between organization_members and profiles
ALTER TABLE public.organization_members
ADD CONSTRAINT organization_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;