-- Fix the RLS policy for creating organizations
DROP POLICY IF EXISTS "Employers can create organizations" ON public.organizations;

CREATE POLICY "Employers can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  auth.uid() = created_by 
  AND has_role(auth.uid(), 'employer'::app_role)
);