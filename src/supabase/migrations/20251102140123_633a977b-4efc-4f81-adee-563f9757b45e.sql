-- Drop constraint if it exists (in case of partial creation)
ALTER TABLE public.organization_invitations
DROP CONSTRAINT IF EXISTS organization_invitations_employee_id_fkey;

-- Add foreign key relationship between organization_invitations and profiles
ALTER TABLE public.organization_invitations
ADD CONSTRAINT organization_invitations_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;