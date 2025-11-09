-- Drop the existing policy
DROP POLICY IF EXISTS "Employers can create organizations" ON public.organizations;

-- Create a simpler policy for testing
CREATE POLICY "Employers can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  created_by = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'employer'::app_role
  )
);