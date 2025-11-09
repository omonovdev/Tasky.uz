-- Add policy for employers to view members in their organizations
CREATE POLICY "Employers can view members in their organizations"
ON public.organization_members
FOR SELECT
USING (
  has_role(auth.uid(), 'employer'::app_role) 
  AND EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = organization_members.organization_id
    AND organizations.created_by = auth.uid()
  )
);