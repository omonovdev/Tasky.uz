-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Employers can create organizations" ON public.organizations;

-- Create a new permissive policy for organization creation
CREATE POLICY "Employers can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'employer'::app_role));