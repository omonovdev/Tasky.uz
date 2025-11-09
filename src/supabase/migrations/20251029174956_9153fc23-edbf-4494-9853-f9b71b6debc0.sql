-- Fix RLS policy for organization creation
DROP POLICY IF EXISTS "Employers can create organizations" ON public.organizations;

CREATE POLICY "Employers can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'employer'::app_role
  )
);